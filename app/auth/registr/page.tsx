"use client";
import React, { useMemo, useState } from 'react';
import { Heart, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function RegisterPage() {
  const { pick } = useLanguage();
  const nextPath = useMemo(() => {
    if (typeof window === "undefined") {
      return "/dashboard";
    }

    const params = new URLSearchParams(window.location.search);
    return sanitizeNextPath(params.get("next"));
  }, []);

  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: ''
  });

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4 py-12">
      
      {/* МОДАЛКА ОШИБКИ */}
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

      {/* Логотип и Заголовок */}
      <div className="flex flex-col items-center mb-8">
        <Link href="/">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 hover:bg-emerald-600 transition-colors">
            <Heart className="text-white w-6 h-6 fill-current" />
          </div>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {pick({ ru: "Создать профиль", en: "Create Profile", uz: "Profil yaratish" })}
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          {pick({ ru: "Регистрация через Google", en: "Google registration", uz: "Google orqali ro'yxatdan o'tish" })}
        </p>
      </div>

      {/* Карточка формы */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8">
        <div className="space-y-6">
          
          {/* Информационный блок (объединенный) */}
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-2">
            <p className="font-semibold text-slate-900">
              {pick({ ru: "Как это работает", en: "How it works", uz: "Bu qanday ishlaydi" })}
            </p>
            <p>
              {pick({
                ru: "Вход через Google создаёт профиль автоматически — никаких длинных форм и паролей.",
                en: "Signing in with Google creates your profile automatically — no long forms or passwords.",
                uz: "Google orqali kirish profilingizni avtomatik yaratadi — uzun forma va parollar kerak emas.",
              })}
            </p>
            <p>
              {pick({
                ru: "После этого нужно будет только добавить номер телефона, чтобы откликаться на события и публиковать объявления.",
                en: "After that, you'll only need to add a phone number to respond to events and publish listings.",
                uz: "Shundan so'ng, tadbirlarga javob berish va e'lonlar chop etish uchun faqat telefon raqamini qo'shish kifoya.",
              })}
            </p>
          </div>

          {/* Кнопки авторизации */}
          <SocialAuthButtons
            mode="register"
            nextPath={nextPath}
            showSeparator={false}
            onError={(title, message) => {
              setErrorModal({
                isOpen: true,
                title,
                message,
              });
            }}
          />

          {/* Ссылка на вход */}
          <div className="text-center text-sm text-slate-500">
            {pick({ ru: "Уже есть аккаунт?", en: "Already have an account?", uz: "Akkauntingiz bormi?" })}{' '}
            <Link href="/auth/login" className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
              {pick({ ru: "Войти", en: "Login", uz: "Kirish" })}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}