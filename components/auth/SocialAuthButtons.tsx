"use client";

import { useMemo, useState } from "react";
import type { OAuthProvider } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { buildAuthCallbackUrl } from "@/lib/auth/redirect";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

type SocialAuthButtonsProps = {
  mode: "login" | "register";
  nextPath: string;
  onError: (title: string, message: string) => void;
  showSeparator?: boolean;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5A9.5 9.5 0 0 0 2.5 12 9.5 9.5 0 0 0 12 21.5c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.9H12Z"
      />
      <path
        fill="#34A853"
        d="M2.5 12c0 1.5.4 2.9 1.2 4.1l3.4-2.6c-.2-.5-.3-1-.3-1.5s.1-1 .3-1.5L3.7 7.9A9.4 9.4 0 0 0 2.5 12Z"
      />
      <path
        fill="#FBBC05"
        d="M12 21.5c2.6 0 4.7-.9 6.3-2.4l-3.1-2.4c-.9.6-2 .9-3.2.9-2.5 0-4.7-1.7-5.4-4l-3.4 2.6A9.5 9.5 0 0 0 12 21.5Z"
      />
      <path
        fill="#4285F4"
        d="M18.3 19.1c1.8-1.7 2.9-4.2 2.9-7.1 0-.6-.1-1.1-.2-1.9H12v3.9h5.5c-.2 1.1-.8 2.1-1.7 2.8l2.5 2.3Z"
      />
    </svg>
  );
}

export default function SocialAuthButtons({
  mode,
  nextPath,
  onError,
  showSeparator = true,
}: SocialAuthButtonsProps) {
  const { pick } = useLanguage();
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);

  const unavailableMessage = pick({
    ru: "Сервис входа через соцсети временно недоступен. Попробуйте позже.",
    en: "Social sign-in is temporarily unavailable. Please try again later.",
    uz: "Ijtimoiy tarmoq orqali kirish vaqtincha mavjud emas. Keyinroq urinib ko'ring.",
  });

  const buttonCopy = {
    google: pick({
      ru: mode === "login" ? "Войти через Google" : "Регистрация через Google",
      en: mode === "login" ? "Continue with Google" : "Sign up with Google",
      uz: mode === "login" ? "Google orqali kirish" : "Google orqali ro'yxatdan o'tish",
    }),
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    if (!supabase) {
      onError(
        pick({
          ru: mode === "login" ? "Ошибка входа" : "Ошибка регистрации",
          en: mode === "login" ? "Login Error" : "Registration Error",
          uz: mode === "login" ? "Kirish xatosi" : "Ro'yxatdan o'tish xatosi",
        }),
        unavailableMessage,
      );
      return;
    }

    setLoadingProvider(provider);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: buildAuthCallbackUrl(window.location.origin, nextPath),
      },
    });

    if (error) {
      setLoadingProvider(null);
      onError(
        pick({
          ru: mode === "login" ? "Ошибка входа" : "Ошибка регистрации",
          en: mode === "login" ? "Login Error" : "Registration Error",
          uz: mode === "login" ? "Kirish xatosi" : "Ro'yxatdan o'tish xatosi",
        }),
        error.message,
      );
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void handleOAuth("google")}
        disabled={loadingProvider !== null}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-[11px] font-black uppercase tracking-[0.08em] text-slate-800 transition-colors hover:border-[#10b981] hover:text-[#10b981] disabled:cursor-not-allowed disabled:opacity-60 sm:tracking-[0.14em]"
      >
        {loadingProvider === "google" ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <GoogleIcon />}
        <span className="min-w-0">{buttonCopy.google}</span>
      </button>

      {showSeparator ? (
        <div className="relative py-2">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-200" />
          <div className="relative mx-auto w-fit rounded-full bg-white px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {pick({
              ru: mode === "login" ? "Или через email" : "Или заполните форму",
              en: mode === "login" ? "Or use email" : "Or fill the form",
              uz: mode === "login" ? "Yoki email orqali" : "Yoki formani to'ldiring",
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
