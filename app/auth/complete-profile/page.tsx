"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Loader2, LogOut, Phone } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import AlertModal, { type AlertTone } from "@/components/ui/AlertModal";
import {
  hasRequiredPhone,
  hasValidPhoneInput,
  normalizePhoneInput,
} from "@/lib/auth/phone";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function CompleteProfilePage() {
  const { pick } = useLanguage();
  const router = useRouter();
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const nextPath = useMemo(() => {
    if (typeof window === "undefined") {
      return "/dashboard";
    }

    const params = new URLSearchParams(window.location.search);
    return sanitizeNextPath(params.get("next"));
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    tone: AlertTone;
  }>({
    isOpen: false,
    title: "",
    message: "",
    tone: "info",
  });

  const showAlert = useCallback(
    (title: string, message: string, tone: AlertTone = "info") => {
      setAlertModal({ isOpen: true, title, message, tone });
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (!supabase) {
        if (!isMounted) return;
        showAlert(
          pick({
            ru: "Сервис недоступен",
            en: "Service unavailable",
            uz: "Xizmat mavjud emas",
          }),
          pick({
            ru: "Сервис профиля временно недоступен. Попробуйте позже.",
            en: "The profile service is temporarily unavailable. Please try again later.",
            uz: "Profil xizmati vaqtincha mavjud emas. Keyinroq urinib ko'ring.",
          }),
          "error",
        );
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace(`/auth/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      if (hasRequiredPhone(session.user)) {
        router.replace(nextPath);
        return;
      }

      if (!isMounted) return;
      setPhone(
        typeof session.user.user_metadata?.phone === "string"
          ? session.user.user_metadata.phone
          : "",
      );
      setLoading(false);
    };

    void init();

    return () => {
      isMounted = false;
    };
  }, [nextPath, pick, router, showAlert, supabase]);

  const handleSavePhone = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      showAlert(
        pick({
          ru: "Сервис недоступен",
          en: "Service unavailable",
          uz: "Xizmat mavjud emas",
        }),
        pick({
          ru: "Сервис профиля временно недоступен. Попробуйте позже.",
          en: "The profile service is temporarily unavailable. Please try again later.",
          uz: "Profil xizmati vaqtincha mavjud emas. Keyinroq urinib ko'ring.",
        }),
        "error",
      );
      return;
    }

    const normalizedPhone = normalizePhoneInput(phone);
    if (!hasValidPhoneInput(normalizedPhone)) {
      showAlert(
        pick({
          ru: "Проверьте номер",
          en: "Check the phone number",
          uz: "Telefonni tekshiring",
        }),
        pick({
          ru: "Введите рабочий номер телефона, чтобы участвовать в событиях и публиковать объявления.",
          en: "Enter a valid phone number to join events and publish listings.",
          uz: "Tadbirlarda qatnashish va e'lon berish uchun ishlaydigan telefon raqamini kiriting.",
        }),
        "warning",
      );
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        data: { phone: normalizedPhone },
      });

      if (error) {
        throw error;
      }

      await supabase.auth.refreshSession();
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      showAlert(
        pick({
          ru: "Не удалось сохранить номер",
          en: "Could not save the number",
          uz: "Raqamni saqlab bo'lmadi",
        }),
        error instanceof Error
          ? error.message
          : pick({
              ru: "Попробуйте снова через пару секунд.",
              en: "Please try again in a few seconds.",
              uz: "Bir necha soniyadan keyin yana urinib ko'ring.",
            }),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.replace("/auth/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm text-slate-500">
            {pick({
              ru: "Проверяем профиль...",
              en: "Checking your profile...",
              uz: "Profil tekshirilmoqda...",
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12">
        {/* Логотип */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 hover:bg-emerald-600 transition-colors">
              <Heart className="text-white w-6 h-6 fill-current" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {pick({
              ru: "Добавьте номер телефона",
              en: "Add your phone number",
              uz: "Telefon raqamingizni kiriting",
            })}
          </h1>
          <p className="text-slate-500 mt-2 text-sm text-center max-w-xs">
            {pick({
              ru: "Номер нужен организаторам для связи по заявкам. После этого вы сможете откликаться на события.",
              en: "Organizers need your number to contact you about applications. After this, you can apply to events.",
              uz: "Tashkilotchilar siz bilan bog'lanish uchun raqamingizni talab qiladi. Shundan so'ng tadbirlarga ariza yuborishingiz mumkin.",
            })}
          </p>
        </div>

        {/* Карточка формы */}
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8">
          <form className="space-y-5" onSubmit={handleSavePhone}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {pick({ ru: "Телефон", en: "Phone", uz: "Telefon" })}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {pick({
                    ru: "Сохраняем...",
                    en: "Saving...",
                    uz: "Saqlanmoqda....",
                  })}
                </>
              ) : (
                pick({
                  ru: "Сохранить и продолжить",
                  en: "Save and continue",
                  uz: "Saqlash va davom etish",
                })
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              {pick({ ru: "Выйти", en: "Sign out", uz: "Chiqish" })}
            </button>
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        tone={alertModal.tone}
        closeLabel={pick({ ru: "Понятно", en: "Got it", uz: "Tushunarli" })}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
