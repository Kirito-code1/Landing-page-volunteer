import { NextResponse } from "next/server";
import { hasRequiredPhone } from "@/lib/auth/phone";
import { hasPremiumAccess, needsPremiumStateSync } from "@/lib/auth/premium";
import { isPastEventDateTime } from "@/lib/events/dates";
import { FREE_POST_LIMIT } from "@/lib/events/limits";
import { getFreePostQuotaByUserId, setFreePostCreditsUsed } from "@/lib/events/quota";
import { ensurePremiumEntitlementWindow } from "@/lib/payments/orders";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

type ManageEventRequestBody = {
  eventId?: string;
  title?: string;
  category?: string;
  volunteersNeeded?: number;
  location?: string;
  date?: string;
  imageUrl?: string | null;
  description?: string | null;
};

type StoredEventRow = {
  id: string;
  user_id: string;
  title: string;
  category?: string | null;
  volunteers_needed?: number | null;
  location: string;
  date: string;
  image_url: string | null;
  description: string | null;
  premium_priority?: boolean | null;
};

function isMissingNewColumnsError(message: string) {
  const hasColumnMention = /column|schema cache|does not exist|PGRST204/i.test(message);
  const hasFieldMention = /category|volunteers_needed|premium_priority/i.test(message);
  return hasColumnMention && hasFieldMention;
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeDateValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    return value.trim();
  }

  return String(time);
}

function isMajorEventChange(currentEvent: StoredEventRow, nextEvent: ManageEventRequestBody) {
  return (
    normalizeText(currentEvent.title) !== normalizeText(nextEvent.title) ||
    normalizeText(currentEvent.category) !== normalizeText(nextEvent.category) ||
    Number(currentEvent.volunteers_needed ?? 0) !== Math.round(Number(nextEvent.volunteersNeeded ?? 0)) ||
    normalizeText(currentEvent.location) !== normalizeText(nextEvent.location) ||
    normalizeDateValue(currentEvent.date) !== normalizeDateValue(nextEvent.date)
  );
}

function buildLimitError() {
  return `Free-тариф даёт ${FREE_POST_LIMIT} публикационных слотов за всё время. Удаление не возвращает слот, а изменение ключевых полей объявления использует новый слот.`;
}

export async function POST(request: Request) {
  let body: ManageEventRequestBody;

  try {
    body = (await request.json()) as ManageEventRequestBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON в запросе." }, { status: 400 });
  }

  const title = body.title?.trim();
  const location = body.location?.trim();
  const date = body.date?.trim();
  const volunteersNeeded = Math.round(Number(body.volunteersNeeded));

  if (!title || !location || !date || !Number.isFinite(volunteersNeeded) || volunteersNeeded < 1) {
    return NextResponse.json(
      { error: "title, location, date и volunteersNeeded обязательны." },
      { status: 400 },
    );
  }

  if (isPastEventDateTime(date)) {
    return NextResponse.json(
      { error: "Нельзя публиковать или обновлять события с датой в прошлом." },
      { status: 400 },
    );
  }

  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
  }

  if (!body.eventId && !hasRequiredPhone(user)) {
    return NextResponse.json(
      { error: "Добавьте номер телефона в профиле, чтобы публиковать объявления." },
      { status: 403 },
    );
  }

  let effectiveUser = user;
  if (needsPremiumStateSync(user)) {
    const premiumState = await ensurePremiumEntitlementWindow(user.id);
    effectiveUser = {
      ...user,
      app_metadata: {
        ...(user.app_metadata ?? {}),
        is_premium: premiumState.isPremium,
        subscription_plan: premiumState.isPremium ? "premium" : "free",
        premium_expires_at: premiumState.expiresAt,
      },
      user_metadata: {
        ...(user.user_metadata ?? {}),
        is_premium: premiumState.isPremium,
        subscription_plan: premiumState.isPremium ? "premium" : "free",
        premium_expires_at: premiumState.expiresAt,
      },
    };
  }

  const admin = getSupabaseAdmin();
  const isPremium = hasPremiumAccess(effectiveUser);
  const payload = {
    title,
    category: body.category?.trim() || "other",
    volunteers_needed: volunteersNeeded,
    location,
    date,
    image_url: body.imageUrl?.trim() || null,
    description: body.description?.trim() || null,
    user_id: user.id,
    premium_priority: isPremium,
  };
  const basePayload = {
    title,
    location,
    date,
    image_url: body.imageUrl?.trim() || null,
    description: body.description?.trim() || null,
    user_id: user.id,
  };

  let quotaBefore: Awaited<ReturnType<typeof getFreePostQuotaByUserId>> | null = null;
  let consumedFreePostCredit = false;
  let majorChange = false;

  try {
    if (body.eventId) {
      const { data: currentEvent, error: currentEventError } = await admin
        .from("events")
        .select("id, user_id, title, category, volunteers_needed, location, date, image_url, description, premium_priority")
        .eq("id", body.eventId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (currentEventError) {
        throw currentEventError;
      }

      if (!currentEvent) {
        return NextResponse.json({ error: "Событие не найдено." }, { status: 404 });
      }

      majorChange = !isPremium && isMajorEventChange(currentEvent as StoredEventRow, body);

      if (majorChange) {
        quotaBefore = await getFreePostQuotaByUserId(user.id);
        if (quotaBefore.reachedLimit) {
          return NextResponse.json({ error: buildLimitError() }, { status: 403 });
        }

        await setFreePostCreditsUsed(user.id, quotaBefore.freePostsUsed + 1);
        consumedFreePostCredit = true;
      }

      const { data: updatedEvent, error: updateError } = await admin
        .from("events")
        .update(payload)
        .eq("id", body.eventId)
        .eq("user_id", user.id)
        .select("id, title, location, date, category, volunteers_needed, premium_priority, image_url, description")
        .single();

      if (updateError) {
        if (isMissingNewColumnsError(updateError.message)) {
          const retry = await admin
            .from("events")
            .update(basePayload)
            .eq("id", body.eventId)
            .eq("user_id", user.id)
            .select("id, title, location, date, image_url, description")
            .single();

          if (retry.error) {
            throw retry.error;
          }

          return NextResponse.json({
            event: retry.data,
            quota: consumedFreePostCredit
              ? {
                  freePostsUsed: (quotaBefore?.freePostsUsed ?? 0) + 1,
                  postsLeft: Math.max(0, FREE_POST_LIMIT - ((quotaBefore?.freePostsUsed ?? 0) + 1)),
                }
              : quotaBefore
                ? {
                    freePostsUsed: quotaBefore.freePostsUsed,
                    postsLeft: quotaBefore.postsLeft,
                  }
                : null,
            consumedFreePostCredit,
            majorChange,
            missingColumnsFallback: true,
          });
        }

        throw updateError;
      }

      const quota = consumedFreePostCredit
        ? {
            freePostsUsed: (quotaBefore?.freePostsUsed ?? 0) + 1,
            postsLeft: Math.max(0, FREE_POST_LIMIT - ((quotaBefore?.freePostsUsed ?? 0) + 1)),
          }
        : await getFreePostQuotaByUserId(user.id);

      return NextResponse.json({
        event: updatedEvent,
        quota: {
          freePostsUsed: quota.freePostsUsed,
          postsLeft: quota.postsLeft,
        },
        consumedFreePostCredit,
        majorChange,
        missingColumnsFallback: false,
      });
    }

    if (!isPremium) {
      quotaBefore = await getFreePostQuotaByUserId(user.id);
      if (quotaBefore.reachedLimit) {
        return NextResponse.json({ error: buildLimitError() }, { status: 403 });
      }

      await setFreePostCreditsUsed(user.id, quotaBefore.freePostsUsed + 1);
      consumedFreePostCredit = true;
    }

    const { data: createdEvent, error: insertError } = await admin
      .from("events")
      .insert([payload])
      .select("id, title, location, date, category, volunteers_needed, premium_priority, image_url, description")
      .single();

    if (insertError) {
      if (isMissingNewColumnsError(insertError.message)) {
        const retry = await admin
          .from("events")
          .insert([basePayload])
          .select("id, title, location, date, image_url, description")
          .single();

        if (retry.error) {
          throw retry.error;
        }

        return NextResponse.json({
          event: retry.data,
          quota: consumedFreePostCredit
            ? {
                freePostsUsed: (quotaBefore?.freePostsUsed ?? 0) + 1,
                postsLeft: Math.max(0, FREE_POST_LIMIT - ((quotaBefore?.freePostsUsed ?? 0) + 1)),
              }
            : null,
          consumedFreePostCredit,
          majorChange: false,
          missingColumnsFallback: true,
        });
      }

      throw insertError;
    }

    return NextResponse.json({
      event: createdEvent,
      quota: consumedFreePostCredit
        ? {
            freePostsUsed: (quotaBefore?.freePostsUsed ?? 0) + 1,
            postsLeft: Math.max(0, FREE_POST_LIMIT - ((quotaBefore?.freePostsUsed ?? 0) + 1)),
          }
        : null,
      consumedFreePostCredit,
      majorChange: false,
      missingColumnsFallback: false,
    });
  } catch (error) {
    if (consumedFreePostCredit && quotaBefore) {
      try {
        await setFreePostCreditsUsed(user.id, quotaBefore.freePostsUsed);
      } catch (rollbackError) {
        console.error("Could not roll back free post quota:", rollbackError);
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Не удалось сохранить событие.",
      },
      { status: 500 },
    );
  }
}
