"use client";
import React, { useState } from "react";
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
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function LoginPage() {
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

  // Инициализация клиента Supabase
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      // Упрощаем сообщение об ошибке, так как подтверждение почты отключено
      let msg = "Неверный email или пароль. Пожалуйста, проверьте данные.";
      
      setErrorModal({
        isOpen: true,
        title: "Ошибка входа",
        message: msg,
      });
    } else {
      if (data?.session) {
        // Успешный вход — летим в Dashboard
        router.push("/dashboard");
        router.refresh();
      } else {
        setLoading(false);
      }
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrorModal({
        isOpen: true,
        title: "Внимание",
        message: "Пожалуйста, введите ваш Email для получения ссылки на сброс пароля.",
      });
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Убедись, что этот путь совпадает с твоим роутом для смены пароля
      redirectTo: `${window.location.origin}/auth/update-password`,
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
        message: "Инструкции по сбросу пароля отправлены на вашу почту!",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] p-4 relative">
      
      {/* Модалка ошибки */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[400px] rounded-[35px] shadow-2xl p-8 text-center border border-red-50 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">{errorModal.title}</h2>
            <p className="text-gray-500 font-medium mb-8 leading-relaxed">{errorModal.message}</p>
            <button
              onClick={() => setErrorModal({ ...errorModal, isOpen: false })}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-gray-200"
            >
              Попробовать снова
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
            <h2 className="text-2xl font-black text-gray-900 mb-2">Готово!</h2>
            <p className="text-gray-500 font-medium mb-8 leading-relaxed">{successModal.message}</p>
            <button
              onClick={() => setSuccessModal({ ...successModal, isOpen: false })}
              className="w-full py-4 bg-[#10b981] text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-green-100"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center mb-8">
        <Link href="/">
          <div className="w-16 h-16 bg-[#10b981] rounded-2xl flex items-center justify-center shadow-lg shadow-green-100 mb-6 transition-transform hover:scale-105 active:scale-95">
            <Heart className="text-white w-10 h-10 fill-current" />
          </div>
        </Link>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2 italic uppercase tracking-tighter">С возвращением!</h1>
        <p className="text-gray-500 font-bold">Войдите, чтобы творить добро</p>
      </div>

      <div className="w-full max-w-[440px] bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-50 p-8 md:p-10">
        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-400 ml-2 tracking-widest">Email адрес</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#10b981] transition-colors" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-[22px] focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-bold text-gray-900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-2">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Пароль</label>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="text-[10px] font-black text-[#10b981] uppercase hover:underline disabled:opacity-50"
              >
                {resetLoading ? "Загрузка..." : "Забыли пароль?"}
              </button>
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#10b981] transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-transparent rounded-[22px] focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-bold text-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#10b981] transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-[#10b981] hover:bg-[#0da975] disabled:bg-gray-200 text-white py-5 rounded-[22px] font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-green-100/50"
          >
            {loading ? <Loader2 className="animate-spin" /> : "ВОЙТИ В АККАУНТ"}
          </button>

          <div className="text-center text-sm font-bold text-gray-400 pt-2">
            Впервые у нас?{" "}
            <Link href="/auth/registr" className="text-[#10b981] font-black hover:underline uppercase text-[12px] ml-1">
              Создать профиль
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}