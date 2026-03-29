"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Loader2, LogOut, Phone } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import AlertModal, { type AlertTone } from "@/components/ui/AlertModal";
import { hasRequiredPhone, hasValidPhoneInput, normalizePhoneInput } from "@/lib/auth/phone";
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

  const showAlert = useCallback((title: string, message: string, tone: AlertTone = "info") => {
    setAlertModal({ isOpen: true, title, message, tone });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (!supabase) {
        if (!isMounted) return;
        showAlert(
          pick({ ru: "Сервис недоступен", en: "Service unavailable", uz: "Xizmat mavjud emas" }),
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
        pick({ ru: "Сервис недоступен", en: "Service unavailable", uz: "Xizmat mavjud emas" }),
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
        pick({ ru: "Проверьте номер", en: "Check the phone number", uz: "Telefonni tekshiring" }),
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
        pick({ ru: "Не удалось сохранить номер", en: "Could not save the number", uz: "Raqamni saqlab bo'lmadi" }),
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
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_55%,_#eff6ff_100%)] px-4">
        <div className="flex flex-col items-center gap-4 rounded-[34px] border border-white/80 bg-white/90 px-8 py-10 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur">
          <Loader2 className="h-10 w-10 animate-spin text-[#10b981]" />
          <p className="text-center text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
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
      <div className="min-h-screen bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_55%,_#eff6ff_100%)] px-4 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
          <div className="grid w-full gap-6 overflow-hidden rounded-[40px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.14)] lg:grid-cols-[minmax(0,1.05fr)_360px]">
            <div className="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_40%),linear-gradient(180deg,_#ffffff_0%,_#f8fcfb_100%)] p-8 sm:p-10 lg:p-12">
              <Link href="/" className="inline-flex">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#10b981] shadow-lg shadow-green-100">
                  <Heart className="h-10 w-10 fill-current text-white" />
                </div>
              </Link>

              <p className="mt-8 inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                {pick({
                  ru: "Последний шаг",
                  en: "Final step",
                  uz: "Oxirgi qadam",
                })}
              </p>

              <h1 className="mt-6 max-w-2xl text-[clamp(2.3rem,7vw,4.4rem)] font-black italic tracking-[-0.06em] text-slate-950">
                {pick({
                  ru: "Добавьте номер телефона",
                  en: "Add your phone number",
                  uz: "Telefon raqamingizni kiriting",
                })}
              </h1>

              <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-600 sm:text-lg">
                {pick({
                  ru: "Номер нужен, чтобы организаторы могли связаться с вами по заявкам и чтобы на платформе было меньше фейковых аккаунтов.",
                  en: "We need your phone number so organizers can contact you about your applications and to reduce fake accounts on the platform.",
                  uz: "Telefon raqami tashkilotchilar siz bilan bog'lana olishi va platformada soxta akkauntlar kamayishi uchun kerak.",
                })}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-slate-100 bg-white px-5 py-5 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {pick({
                      ru: "После этого",
                      en: "After that",
                      uz: "Shundan keyin",
                    })}
                  </p>
                  <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                    {pick({
                      ru: "Вы сможете отправлять отклики на события и публиковать свои объявления.",
                      en: "You will be able to apply to events and publish your own listings.",
                      uz: "Siz tadbirlarga ariza yubora va o'zingizning e'lonlaringizni joylaya olasiz.",
                    })}
                  </p>
                </div>
                <div className="rounded-[24px] border border-slate-100 bg-white px-5 py-5 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {pick({
                      ru: "Что сохраняем",
                      en: "What we save",
                      uz: "Nimani saqlaymiz",
                    })}
                  </p>
                  <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                    {pick({
                      ru: "Только номер телефона в вашем профиле. Его можно поменять позже в кабинете.",
                      en: "Only your phone number in the profile. You can change it later in the dashboard.",
                      uz: "Faqat profilingizdagi telefon raqami. Uni keyin kabinetda o'zgartirishingiz mumkin.",
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between p-6 sm:p-8">
              <div>
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-100 text-slate-500">
                  <Phone className="h-8 w-8" />
                </div>

                <h2 className="mt-6 text-2xl font-black text-slate-950">
                  {pick({
                    ru: "Телефон обязателен",
                    en: "Phone is required",
                    uz: "Telefon majburiy",
                  })}
                </h2>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
                  {pick({
                    ru: "Введите номер один раз и продолжайте пользоваться сайтом без ограничений.",
                    en: "Enter your number once and continue using the site without restrictions.",
                    uz: "Raqamni bir marta kiriting va saytni cheklovsiz ishlatishda davom eting.",
                  })}
                </p>

                <form className="mt-8 space-y-4" onSubmit={handleSavePhone}>
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {pick({ ru: "Номер телефона", en: "Phone number", uz: "Telefon raqami" })}
                    </span>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder={pick({
                          ru: "+998 90 123 45 67",
                          en: "+998 90 123 45 67",
                          uz: "+998 90 123 45 67",
                        })}
                        className="w-full rounded-[22px] border border-slate-200 bg-slate-50 px-12 py-4 text-base font-bold text-slate-950 outline-none transition-colors focus:border-[#10b981] focus:bg-white"
                      />
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center rounded-[22px] bg-[#10b981] px-6 py-4 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_40px_rgba(16,185,129,0.24)] transition-colors hover:bg-[#0da975] disabled:opacity-60"
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {pick({ ru: "Сохраняем...", en: "Saving...", uz: "Saqlanmoqda..." })}
                      </span>
                    ) : (
                      pick({ ru: "Сохранить и продолжить", en: "Save and continue", uz: "Saqlash va davom etish" })
                    )}
                  </button>
                </form>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-[20px] border border-slate-200 px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4" />
                {pick({ ru: "Выйти", en: "Sign out", uz: "Chiqish" })}
              </button>
            </div>
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
