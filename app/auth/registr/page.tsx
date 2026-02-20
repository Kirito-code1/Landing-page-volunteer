"use client";
import React, { useState } from 'react';
import { Eye, EyeOff, Mail, User, Heart, ArrowRight, AlertCircle, Phone, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function RegisterPage() {
  const router = useRouter();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: ''
  });

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return setErrorModal({
        isOpen: true,
        title: 'Ошибка пароля',
        message: 'Пароли не совпадают. Пожалуйста, проверьте правильность ввода.'
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
        }
      },
    });

    if (error) {
      setLoading(false);
      let message = error.message;
      if (message.includes("User already registered")) {
        message = "Пользователь с таким Email уже существует.";
      }
      setErrorModal({
        isOpen: true,
        title: 'Ошибка регистрации',
        message: message
      });
    } else {
      // Так как подтверждение почты отключено, Supabase создаст сессию сразу
      if (data.user) {
        // Успех! Перенаправляем сразу в Dashboard
        router.push("/dashboard");
        router.refresh();
      } else {
        setLoading(false);
      }
    }
  };

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
              ПОПРОБОВАТЬ СНОВА
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
        <h1 className="text-4xl font-black text-gray-900 mb-2 uppercase italic italic tracking-tighter">Создать профиль</h1>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">Присоединяйтесь к нам</p>
      </div>

      <div className="w-full max-w-[500px] bg-white rounded-[48px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-50 p-8 md:p-12">
        <form className="space-y-5" onSubmit={handleRegister}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest">Ваше имя</label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#10b981]" />
                <input 
                  type="text" required value={name} onChange={(e) => setName(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-[24px] focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-bold text-gray-900" 
                  placeholder="Имя" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest">Телефон</label>
              <div className="relative group">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#10b981]" />
                <input 
                  type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-[24px] focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-bold text-gray-900" 
                  placeholder="+7..." 
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest">Email</label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#10b981]" />
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)} 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-[24px] focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-bold text-gray-900" 
                placeholder="mail@example.com" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest">Пароль</label>
              <div className="relative group">
                <input 
                  type={showPass ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} 
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[24px] focus:outline-none focus:border-[#10b981] transition-all font-bold text-gray-900" 
                  placeholder="••••" 
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest">Повтор</label>
              <div className="relative group">
                <input 
                  type={showConfirm ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[24px] focus:outline-none focus:border-[#10b981] transition-all font-bold text-gray-900" 
                  placeholder="••••" 
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full bg-[#10b981] hover:bg-[#0da975] text-white py-5 rounded-[26px] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-green-100/50 transition-all active:scale-[0.98] mt-6 disabled:bg-gray-300 uppercase tracking-wider"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                Начать помогать
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <div className="text-center pt-4">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">Уже зарегистрированы?</span>{" "}
            <Link href="/auth/login" className="text-[#10b981] font-black hover:underline uppercase text-[12px] ml-1">
              Войти
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}