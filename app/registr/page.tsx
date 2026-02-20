"use client";
import React, { useState } from 'react';
import { Eye, EyeOff, Mail, User, Heart, ArrowRight, AlertCircle, CheckCircle2, Phone } from 'lucide-react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

export default function RegisterPage() {
  // Исправлено: убрали лишний слэш в конце для корректного формирования пути callback
  const MAIN_SITE_URL = "https://main-website-volunteer.vercel.app";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Ошибка пароля',
        message: 'Пароли не совпадают. Пожалуйста, введите их внимательно.'
      });
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          full_name: name,
          phone: phone 
        },
        // Формируется путь: https://main-website-volunteer.vercel.app/auth/callback
        emailRedirectTo: `${MAIN_SITE_URL}/auth/callback`, 
      },
    });

    if (error) {
      setLoading(false);
      let message = error.message;
      if (message.includes("User already registered")) {
        message = "Пользователь с таким Email уже существует.";
      }
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Ошибка регистрации',
        message: message
      });
    } else {
      if (data.session) {
        window.location.href = MAIN_SITE_URL;
      } else {
        setLoading(false);
        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Почти готово!',
          message: 'Мы отправили письмо для подтверждения на ваш Email. Пожалуйста, подтвердите его, чтобы войти.'
        });
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] p-4 py-12 relative">
      
      {/* МОДАЛЬНОЕ ОКНО СТАТУСА */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[400px] rounded-[35px] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                statusModal.type === 'success' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'
              }`}>
                {statusModal.type === 'success' ? <CheckCircle2 className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">{statusModal.title}</h2>
              <p className="text-gray-500 font-medium leading-relaxed mb-8">
                {statusModal.message}
              </p>
              <button 
                onClick={() => {
                  setStatusModal({ ...statusModal, isOpen: false });
                  if (statusModal.type === 'success') window.location.href = "/login";
                }}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all active:scale-95 shadow-lg ${
                  statusModal.type === 'success' ? 'bg-[#10b981] shadow-green-100' : 'bg-gray-900 shadow-gray-200'
                }`}
              >
                {statusModal.type === 'success' ? 'Понятно' : 'Попробовать снова'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Логотип */}
      <div className="flex flex-col items-center mb-8">
        <Link href="/">
          <div className="w-16 h-16 bg-[#10b981] rounded-2xl flex items-center justify-center shadow-lg shadow-green-200 mb-6 transition-transform hover:scale-105 cursor-pointer">
            <Heart className="text-white w-10 h-10 fill-current" />
          </div>
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Создайте аккаунт</h1>
        <p className="text-gray-500 font-medium text-center">Присоединяйтесь к сообществу помощников</p>
      </div>

      <div className="w-full max-w-[480px] bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 p-8 md:p-10">
        <form className="space-y-4" onSubmit={handleRegister}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 ml-1">Имя</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#10b981]" />
                <input 
                  type="text" required value={name} onChange={(e) => setName(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-medium text-gray-900" 
                  placeholder="Иван" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 ml-1">Телефон</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#10b981]" />
                <input 
                  type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-medium text-gray-900" 
                  placeholder="+7 (___)" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700 ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#10b981]" />
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)} 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-medium text-gray-900" 
                placeholder="example@email.com" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 ml-1">Пароль</label>
              <div className="relative group">
                <input 
                  type={showPass ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} 
                  className="w-full pl-5 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#10b981] transition-all font-medium text-gray-900" 
                  placeholder="••••" 
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 ml-1">Повтор</label>
              <div className="relative group">
                <input 
                  type={showConfirm ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="w-full pl-5 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#10b981] transition-all font-medium text-gray-900" 
                  placeholder="••••" 
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full bg-[#10b981] hover:bg-[#0da975] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-[0.98] mt-6 disabled:bg-gray-300"
          >
            {loading ? "Создание..." : "Зарегистрироваться"} 
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>

          <div className="text-center text-sm font-medium text-gray-500 pt-4">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="text-[#10b981] font-bold hover:underline">
              Войти
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}