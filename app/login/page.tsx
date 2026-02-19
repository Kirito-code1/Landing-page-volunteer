"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Используем роутер Next.js
import { Eye, EyeOff, Mail, Lock, Heart, X, AlertCircle } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const router = useRouter(); // Инициализация роутера
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: "",
    message: ""
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
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
      // ... (твой код обработки ошибок остается без изменений)
      setErrorModal({ 
        isOpen: true, 
        title: "Ошибка входа", 
        message: "Неверные данные" 
      });
    } else {
      // Если вход успешен
      if (data?.user) {
        console.log("Успешный вход, перенаправляю на 3001...");
        // Используем полный абсолютный путь
        window.location.assign("http://localhost:3001/");
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] p-4 relative">
      
      {/* Твой код модалки остается прежним */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white w-full max-w-[400px] rounded-[35px] shadow-2xl p-8 text-center border border-red-50">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">{errorModal.title}</h2>
            <p className="text-gray-500 font-medium mb-8">{errorModal.message}</p>
            <button 
              onClick={() => setErrorModal({ ...errorModal, isOpen: false })}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold transition-all active:scale-95"
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      {/* Лого и Заголовок */}
      <div className="flex flex-col items-center mb-8">
        <Link href="/">
          <div className="w-16 h-16 bg-[#10b981] rounded-2xl flex items-center justify-center shadow-lg mb-6">
            <Heart className="text-white w-10 h-10 fill-current" />
          </div>
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Добро пожаловать!</h1>
        <p className="text-gray-500 font-medium">Войдите, чтобы продолжить помогать</p>
      </div>

      <div className="w-full max-w-[440px] bg-white rounded-[32px] shadow-2xl border border-gray-100 p-8 md:p-10">
        <form className="space-y-6" onSubmit={handleLogin}>
          {/* Поля Email и Пароль такие же, как были */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#10b981]" />
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#10b981] transition-all font-medium text-gray-900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Пароль</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#10b981]" />
              <input
                type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#10b981] transition-all font-medium text-gray-900"
              />
              <button
                type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#10b981]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-[#10b981] hover:bg-[#0da975] disabled:bg-gray-400 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-100"
          >
            {loading ? "Вход..." : "Войти"}
          </button>

          <div className="text-center text-sm font-medium text-gray-500">
            Нет аккаунта? <Link href="/registr" className="text-[#10b981] font-bold hover:underline">Зарегистрируйтесь</Link>
          </div>
        </form>
      </div>
    </div>
  );
}