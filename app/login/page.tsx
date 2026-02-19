"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Heart,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2, // Добавил иконку успеха
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const MAIN_SITE_URL = "https://main-website-volunteer.vercel.app";

  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });

  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    message: "",
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  );

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      let msg = "Неверный email или пароль";
      if (error.message.includes("Email not confirmed")) {
        msg = "Пожалуйста, подтвердите вашу почту перед входом.";
      }

      setErrorModal({
        isOpen: true,
        title: "Ошибка входа",
        message: msg,
      });
    } else {
      if (data?.user) {
        window.location.assign(MAIN_SITE_URL);
      }
    }
  };

  // ФУНКЦИЯ ДЛЯ СБРОСА ПАРОЛЯ
  const handleResetPassword = async () => {
    if (!email) {
      setErrorModal({
        isOpen: true,
        title: "Внимание",
        message: "Пожалуйста, введите ваш Email для сброса пароля.",
      });
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    setResetLoading(false);

    if (error) {
      setErrorModal({
        isOpen: true,
        title: "Ошибка",
        message: error.message,
      });
    } else {
      setSuccessModal({
        isOpen: true,
        message: "Ссылка для сброса пароля отправлена на вашу почту!",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] p-4 relative">
      
      {/* Модалка ошибки */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-[400px] rounded-[35px] shadow-2xl p-8 text-center border border-red-50 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">{errorModal.title}</h2>
            <p className="text-gray-500 font-medium mb-8 leading-relaxed">{errorModal.message}</p>
            <button
              onClick={() => setErrorModal({ ...errorModal, isOpen: false })}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-gray-200"
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      {/* Модалка успеха */}
      {successModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-[400px] rounded-[35px] shadow-2xl p-8 text-center border border-green-50 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Отправлено!</h2>
            <p className="text-gray-500 font-medium mb-8 leading-relaxed">{successModal.message}</p>
            <button
              onClick={() => setSuccessModal({ ...successModal, isOpen: false })}
              className="w-full py-4 bg-[#10b981] text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-green-100"
            >
              Отлично
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center mb-8">
        <Link href="/">
          <div className="w-16 h-16 bg-[#10b981] rounded-2xl flex items-center justify-center shadow-lg shadow-green-100 mb-6 transition-transform hover:scale-105">
            <Heart className="text-white w-10 h-10 fill-current" />
          </div>
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 font-black">С возвращением!</h1>
        <p className="text-gray-500 font-medium">Войдите, чтобы продолжить помогать</p>
      </div>

      <div className="w-full max-w-[440px] bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 p-8 md:p-10">
        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#10b981]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-medium text-gray-900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-sm font-bold text-gray-700">Пароль</label>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="text-xs font-bold text-gray-400 hover:text-[#10b981] transition-colors"
              >
                {resetLoading ? "Отправка..." : "Забыли пароль?"}
              </button>
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#10b981]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-medium text-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#10b981]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-[#10b981] hover:bg-[#0da975] disabled:bg-gray-300 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-green-100/50"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Войти"}
          </button>

          <div className="text-center text-sm font-medium text-gray-500 pt-2">
            Нет аккаунта?{" "}
            <Link href="/registr" className="text-[#10b981] font-black hover:underline">
              Создать сейчас
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}