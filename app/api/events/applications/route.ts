import { NextResponse } from "next/server";
import { hasRequiredPhone } from "@/lib/auth/phone";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

type ApplicationStatus = "pending" | "approved" | "rejected";

type EventApplicationRequestBody = {
  eventId?: string;
  action?: "submit" | "cancel";
};

type EventRow = {
  id: string;
  user_id: string;
  volunteers_needed?: number | null;
};

type EventApplicationRow = {
  id: string;
  volunteer_id: string;
  status: ApplicationStatus;
};

function normalizeVolunteerCount(value: unknown) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

export async function POST(request: Request) {
  let body: EventApplicationRequestBody;

  try {
    body = (await request.json()) as EventApplicationRequestBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON в запросе." }, { status: 400 });
  }

  const eventId = body.eventId?.trim();
  const action = body.action === "cancel" ? "cancel" : "submit";

  if (!eventId) {
    return NextResponse.json({ error: "eventId обязателен." }, { status: 400 });
  }

  try {
    const supabase = await createRouteSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: eventRow, error: eventError } = await admin
      .from("events")
      .select("id, user_id, volunteers_needed")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      throw eventError;
    }

    if (!eventRow) {
      return NextResponse.json({ error: "Событие не найдено." }, { status: 404 });
    }

    const event = eventRow as EventRow;

    if (action === "submit") {
      if (!hasRequiredPhone(user)) {
        return NextResponse.json(
          { error: "Добавьте номер телефона в профиле, чтобы участвовать в событиях." },
          { status: 403 },
        );
      }

      if (user.id === event.user_id) {
        return NextResponse.json(
          { error: "Нельзя подать заявку на собственное событие." },
          { status: 403 },
        );
      }
    }

    const { data: existingRows, error: applicationsError } = await admin
      .from("event_applications")
      .select("id, volunteer_id, status")
      .eq("event_id", eventId);

    if (applicationsError) {
      throw applicationsError;
    }

    const rows = (existingRows ?? []) as EventApplicationRow[];
    const approvedCount = rows.filter((row) => row.status === "approved").length;
    const myRow = rows.find((row) => row.volunteer_id === user.id) ?? null;

    if (action === "cancel") {
      if (!myRow || myRow.status !== "pending") {
        return NextResponse.json({ error: "Активная заявка не найдена." }, { status: 400 });
      }

      const { error: deleteError } = await admin
        .from("event_applications")
        .delete()
        .eq("id", myRow.id)
        .eq("volunteer_id", user.id)
        .eq("status", "pending");

      if (deleteError) {
        throw deleteError;
      }

      return NextResponse.json({ status: "canceled" });
    }

    const volunteersNeeded = normalizeVolunteerCount(event.volunteers_needed);
    const seatsLeft = volunteersNeeded ? Math.max(0, volunteersNeeded - approvedCount) : null;

    if (seatsLeft !== null && seatsLeft <= 0 && myRow?.status !== "rejected") {
      return NextResponse.json(
        { error: "Набор уже закрыт по количеству волонтёров." },
        { status: 409 },
      );
    }

    if (myRow) {
      const { error: updateError } = await admin
        .from("event_applications")
        .update({
          status: "pending",
          reviewed_at: null,
          volunteer_name: user.user_metadata?.full_name ?? null,
          volunteer_email: user.email ?? null,
          volunteer_phone: user.user_metadata?.phone ?? null,
        })
        .eq("id", myRow.id)
        .eq("volunteer_id", user.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      const payload = {
        event_id: event.id,
        organizer_id: event.user_id,
        volunteer_id: user.id,
        volunteer_name: user.user_metadata?.full_name ?? null,
        volunteer_email: user.email ?? null,
        volunteer_phone: user.user_metadata?.phone ?? null,
        status: "pending" as ApplicationStatus,
      };

      const { error: insertError } = await admin.from("event_applications").insert([payload]);
      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({ status: "pending" });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Не удалось обработать заявку.",
      },
      { status: 500 },
    );
  }
}
