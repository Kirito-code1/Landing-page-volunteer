"use client";
import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Heart, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] p-4 py-12">
      
      {/* Лого и Заголовок */}
      <div className="flex flex-col items-center mb-8">
        <Link href="/">
          <div className="w-16 h-16 bg-[#10b981] rounded-2xl flex items-center justify-center shadow-lg shadow-green-200 mb-6 transition-transform hover:scale-105 cursor-pointer">
            <Heart className="text-white w-10 h-10 fill-current" />
          </div>
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 text-center">
          Создайте аккаунт
        </h1>
        <p className="text-gray-500 font-medium text-center">
          Присоединяйтесь к сообществу волонтёров
        </p>
      </div>

      {/* Форма регистрации */}
      <div className="w-full max-w-[460px] bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 p-8 md:p-10">
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          
          {/* Поле: Имя */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 ml-1">Имя</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#10b981] transition-colors" />
              <input 
                type="text" 
                placeholder="Ваше имя"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-medium text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Поле: Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#10b981] transition-colors" />
              <input 
                type="email" 
                placeholder="example@email.com"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-medium text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Поле: Пароль */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 ml-1">Пароль</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#10b981] transition-colors" />
              <input 
                type={showPass ? "text" : "password"} 
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-medium text-gray-900 placeholder:text-gray-400"
              />
              <button 
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#10b981] transition-colors"
              >
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Поле: Подтверждение пароля */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 ml-1">Подтверждение пароля</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#10b981] transition-colors" />
              <input 
                type={showConfirm ? "text" : "password"} 
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-medium text-gray-900 placeholder:text-gray-400"
              />
              <button 
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#10b981] transition-colors"
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Кнопка Регистрации */}
          <button className="w-full bg-[#10b981] hover:bg-[#0da975] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-[0.98] mt-4">
            Зарегистрироваться
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Разделитель */}
          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <span className="relative px-4 bg-white text-xs font-bold text-gray-400 uppercase tracking-widest">
              или продолжите с
            </span>
          </div>

          {/* Соцсети */}
          <div className="grid grid-cols-2 gap-4">
            <button type="button" className="flex items-center justify-center gap-3 py-3 border border-gray-100 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all active:scale-95">
              <img src="https://img.icons8.com/color/1200/google-logo.jpg" className="w-5 h-5" alt="Google" />
              Google
            </button>
            <button type="button" className="flex items-center justify-center gap-3 py-3 border border-gray-100 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all active:scale-95">
              <img src="https://cdn.pixabay.com/photo/2021/06/15/12/51/facebook-6338508_1280.png" className="w-5 h-5" alt="Facebook" />
              Facebook
            </button>
          </div>

          {/* Ссылка на вход */}
          <div className="text-center text-sm font-medium text-gray-500 pt-2">
            Уже есть аккаунт? <Link href="/login" className="text-[#10b981] font-bold hover:underline">Войдите</Link>
          </div>
        </form>
      </div>

      {/* Условия */}
      <div className="mt-8 text-center max-w-[320px]">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider leading-relaxed">
          Регистрируясь, вы соглашаетесь с нашими{" "}
          <Link href="/terms" className="text-[#10b981] hover:underline">Условиями использования</Link>
          {" "}и{" "}
          <Link href="/privacy" className="text-[#10b981] hover:underline">Политикой конфиденциальности</Link>
        </p>
      </div>
    </div>
  );
}