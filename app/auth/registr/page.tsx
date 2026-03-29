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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] p-4 py-12 relative">
      
      {/* МОДАЛКА ОШИБКИ */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[400px] rounded-[40px] shadow-2xl p-8 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">{errorModal.title}</h2>
            <p className="text-gray-500 font-medium mb-8 leading-relaxed">{errorModal.message}</p>
            <button 
              onClick={() => setErrorModal({ ...errorModal, isOpen: false })}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all"
            >
              {pick({ ru: "ПОПРОБОВАТЬ СНОВА", en: "TRY AGAIN", uz: "QAYTA URINISH" })}
            </button>
          </div>
        </div>
      )}

      {/* Логотип */}
      <div className="flex flex-col items-center mb-8">
        <Link href="/">
          <div className="w-16 h-16 bg-[#10b981] rounded-[22px] flex items-center justify-center shadow-lg shadow-green-200 mb-6 hover:scale-105 transition-transform active:scale-95">
            <Heart className="text-white w-10 h-10 fill-current" />
          </div>
        </Link>
        <h1 className="text-4xl font-black text-gray-900 mb-2 uppercase italic italic tracking-tighter">
          {pick({ ru: "Создать профиль", en: "Create Profile", uz: "Profil yaratish" })}
        </h1>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.18em]">
          {pick({ ru: "Регистрация через Google", en: "Google registration", uz: "Google orqali ro'yxatdan o'tish" })}
        </p>
      </div>

      <div className="w-full max-w-[500px] bg-white rounded-[48px] shadow-[0_26px_65px_rgba(15,23,42,0.16),0_8px_26px_rgba(16,185,129,0.12)] border border-gray-100 p-8 md:p-12">
        <div className="space-y-6">
          <div className="rounded-[30px] border border-emerald-100 bg-emerald-50/70 px-5 py-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
              {pick({ ru: "Как это работает", en: "How it works", uz: "Bu qanday ishlaydi" })}
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-950">
              {pick({
                ru: "Создаём аккаунт сразу через Google",
                en: "Create your account with Google",
                uz: "Akkaunt Google orqali yaratiladi",
              })}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
              {pick({
                ru: "Никаких отдельных паролей и длинных форм. После входа через Google профиль создастся автоматически, и вы сразу попадёте в кабинет.",
                en: "No extra passwords or long forms. After signing in with Google, your profile is created automatically and you go straight to the dashboard.",
                uz: "Alohida parol va uzun forma kerak emas. Google orqali kirgandan so'ng profilingiz avtomatik yaratiladi va siz darhol kabinetga o'tasiz.",
              })}
            </p>
          </div>

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

          <div className="rounded-[26px] border border-slate-100 bg-slate-50 px-5 py-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              {pick({ ru: "После входа", en: "After sign-in", uz: "Kirishdan keyin" })}
            </p>
            <div className="mt-4 space-y-3 text-sm font-semibold leading-7 text-slate-600">
              <p>
                {pick({
                  ru: "1. Система создаст ваш профиль на основе Google-аккаунта.",
                  en: "1. The system creates your profile from your Google account.",
                  uz: "1. Tizim profilingizni Google akkauntingiz asosida yaratadi.",
                })}
              </p>
              <p>
                {pick({
                  ru: "2. Вы сразу сможете искать события, отправлять отклики и создавать свои объявления.",
                  en: "2. You can immediately browse events, send applications, and create your own listings.",
                  uz: "2. Siz darhol tadbirlarni ko'rishingiz, ariza yuborishingiz va o'z e'lonlaringizni yaratishingiz mumkin.",
                })}
              </p>
            </div>
          </div>

          <div className="text-center pt-2">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">
              {pick({ ru: "Уже есть аккаунт?", en: "Already have an account?", uz: "Akkauntingiz bormi?" })}
            </span>{" "}
            <Link href="/auth/login" className="text-[#10b981] font-black hover:underline uppercase text-[12px] ml-1">
              {pick({ ru: "Войти", en: "Login", uz: "Kirish" })}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
