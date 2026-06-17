"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Heart,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import { hasRequiredPhone } from "@/lib/auth/phone";
import { buildCompleteProfilePath, sanitizeNextPath } from "@/lib/auth/redirect";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const { pick } = useLanguage();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });

  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    message: "",
  });

  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const nextPath = useMemo(() => {
    if (typeof window === "undefined") {
      return "/dashboard";
    }

    const params = new URLSearchParams(window.location.search);
    return sanitizeNextPath(params.get("next"));
  }, []);
  
  const supabaseUnavailableMessage = pick({
    ru: "Сервис входа временно недоступен. Попробуйте позже.",
    en: "Sign-in is temporarily unavailable. Please try again later.",
    uz: "Kirish xizmati vaqtincha mavjud emas. Keyinroq urinib ko'ring.",
  });

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) {
      setErrorModal({
        isOpen: true,
        title: pick({ ru: "Ошибка входа", en: "Login Error", uz: "Kirish xatosi" }),
        message: supabaseUnavailableMessage,
      });
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      const msg = pick({
        ru: "Неверный email или пароль. Пожалуйста, проверьте данные.",
        en: "Invalid email or password. Please check your credentials.",
        uz: "Email yoki parol noto'g'ri. Ma'lumotlaringizni tekshiring.",
      });
      
      setErrorModal({
        isOpen: true,
        title: pick({ ru: "Ошибка входа", en: "Login Error", uz: "Kirish xatosi" }),
        message: msg,
      });
    } else {
      if (data?.session) {
        const destination = hasRequiredPhone(data.session.user)
          ? nextPath
          : buildCompleteProfilePath(nextPath);
        router.push(destination);
        router.refresh();
      } else {
        setLoading(false);
      }
    }
  };

  const handleResetPassword = async () => {
    if (!supabase) {
      setErrorModal({
        isOpen: true,
        title: pick({ ru: "Ошибка", en: "Error", uz: "Xatolik" }),
        message: supabaseUnavailableMessage,
      });
      return;
    }

    if (!email) {
      setErrorModal({
        isOpen: true,
        title: pick({ ru: "Внимание", en: "Attention", uz: "Diqqat" }),
        message: pick({
          ru: "Пожалуйста, введите ваш Email для получения ссылки на сброс пароля.",
          en: "Please enter your email to receive the password reset link.",
          uz: "Parolni tiklash havolasini olish uchun emailingizni kiriting.",
        }),
      });
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    setResetLoading(false);

    if (error) {
      setErrorModal({
        isOpen: true,
        title: pick({ ru: "Ошибка", en: "Error", uz: "Xatolik" }),
        message: error.message,
      });
    } else {
      setSuccessModal({
        isOpen: true,
        message: pick({
          ru: "Инструкции по сбросу пароля отправлены на вашу почту!",
          en: "Password reset instructions were sent to your email!",
          uz: "Parolni tiklash bo'yicha ko'rsatmalar emailingizga yuborildi!",
        }),
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4 py-12">
      
      {/* Модалка ошибки */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-8 text-center">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{errorModal.title}</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">{errorModal.message}</p>
            <button
              onClick={() => setErrorModal({ ...errorModal, isOpen: false })}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
            >
              {pick({ ru: "Попробовать снова", en: "Try again", uz: "Qayta urinish" })}
            </button>
          </div>
        </div>
      )}

      {/* Модалка успеха */}
      {successModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-8 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {pick({ ru: "Готово!", en: "Done!", uz: "Tayyor!" })}
            </h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">{successModal.message}</p>
            <button
              onClick={() => setSuccessModal({ ...successModal, isOpen: false })}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
            >
              {pick({ ru: "Закрыть", en: "Close", uz: "Yopish" })}
            </button>
          </div>
        </div>
      )}

      {/* Логотип и заголовок */}
      <div className="flex flex-col items-center mb-8">
        <Link href="/">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 hover:bg-emerald-600 transition-colors">
            <Heart className="text-white w-6 h-6 fill-current" />
          </div>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {pick({ ru: "С возвращением!", en: "Welcome Back!", uz: "Yana xush kelibsiz!" })}
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          {pick({
            ru: "Войдите, чтобы продолжить",
            en: "Sign in to continue",
            uz: "Davom etish uchun tizimga kiring",
          })}
        </p>
      </div>

      {/* Карточка формы */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8">
        <SocialAuthButtons
          mode="login"
          nextPath={nextPath}
          onError={(title, message) => {
            setErrorModal({
              isOpen: true,
              title,
              message,
            });
          }}
        />

        <form className="space-y-5 mt-6" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {pick({ ru: "Email", en: "Email", uz: "Email" })}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">
                {pick({ ru: "Пароль", en: "Password", uz: "Parol" })}
              </label>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50"
              >
                {resetLoading
                  ? pick({ ru: "Загрузка...", en: "Loading...", uz: "Yuklanmoqda..." })
                  : pick({ ru: "Забыли пароль?", en: "Forgot Password?", uz: "Parolni unutdingizmi?" })}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            disabled={loading || !supabase}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : pick({ ru: "Войти", en: "Sign In", uz: "Kirish" })}
          </button>

          <div className="text-center text-sm text-slate-500 pt-2">
            {pick({ ru: "Впервые у нас?", en: "New here?", uz: "Bizda birinchimisiz?" })}{" "}
            <Link href="/auth/registr" className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
              {pick({ ru: "Создать профиль", en: "Create Profile", uz: "Profil yaratish" })}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}