"use client";
import React, { useState } from "react";
import Link from "next/link"; // Импортируем компонент навигации Next.js
import { Eye, EyeOff, Mail, Lock, Heart } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] p-4">
      <div className="flex flex-col items-center mb-8">
        <Link href="/">
          {" "}
          {/* Логотип теперь ведет на главную */}
          <div className="w-16 h-16 bg-[#10b981] rounded-2xl flex items-center justify-center shadow-lg shadow-green-200 mb-6 transition-transform hover:scale-105 cursor-pointer">
            <Heart className="text-white w-10 h-10 fill-current" />
          </div>
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Добро пожаловать!
        </h1>
        <p className="text-gray-500 font-medium">
          Войдите, чтобы продолжить помогать
        </p>
      </div>

      <div className="w-full max-w-[440px] bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 p-8 md:p-10">
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">
              Email
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#10b981] transition-colors" />
              <input
                type="email"
                placeholder="example@email.com"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-medium text-gray-900 placeholder:text-gray-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">
              Пароль
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#10b981] transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-medium text-gray-900 placeholder:text-gray-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#10b981] transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-[#10b981] focus:ring-[#10b981] cursor-pointer"
              />
              <span className="text-gray-600 font-medium group-hover:text-gray-900 transition-colors">
                Запомнить меня
              </span>
            </label>
            <Link
              href="/forgot-password"
              className="text-[#10b981] font-bold hover:underline"
            >
              Забыли пароль?
            </Link>
          </div>

          <button className="w-full bg-[#10b981] hover:bg-[#0da975] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-[0.98]">
            Войти
            <svg
              className="w-5 h-5 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>

          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <span className="relative px-4 bg-white text-xs font-bold text-gray-400 uppercase tracking-widest">
              или продолжите с
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className="flex items-center justify-center gap-3 py-3 border border-gray-100 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all active:scale-95"
            >
              <img
                src="https://img.icons8.com/color/1200/google-logo.jpg"
                className="w-5 h-5"
                alt="Google"
              />
              Google
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-3 py-3 border border-gray-100 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all active:scale-95"
            >
              <img
                src="https://cdn.pixabay.com/photo/2021/06/15/12/51/facebook-6338508_1280.png"
                className="w-5 h-5"
                alt="Facebook"
              />
              Facebook
            </button>
          </div>

          <div className="text-center text-sm font-medium text-gray-500 pt-2">
            Нет аккаунта?{" "}
            <Link
              href="/registr"
              className="text-[#10b981] font-bold hover:underline"
            >
              Зарегистрируйтесь
            </Link>
          </div>
        </form>
      </div>

      <div className="mt-12 text-center space-y-2">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          Входя в систему, вы соглашаетесь с нашими
        </p>
        <div className="flex gap-2 justify-center text-xs font-bold text-[#10b981]">
          <Link href="/terms" className="hover:underline">
            Условиями использования
          </Link>
          <span className="text-gray-300">и</span>
          <Link href="/privacy" className="hover:underline">
            Политикой конфиденциальности
          </Link>
        </div>
      </div>
    </div>
  );
}
