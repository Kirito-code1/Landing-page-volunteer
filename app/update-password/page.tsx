"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck 
} from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [status, setStatus] = useState({
    type: "", // "success" | "error"
    message: ""
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  );

  const handleUpdate = async (e:any) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setStatus({
        type: "error",
        message: "Ошибка при обновлении: " + error.message,
      });
      setLoading(false);
    } else {
      setStatus({
        type: "success",
        message: "Пароль успешно изменен! Перенаправляем на вход...",
      });
      
      // Через 3 секунды отправляем на логин
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] p-4">
      <div className="w-full max-w-[440px] bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 p-8 md:p-12 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Иконка и заголовок */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-50 text-[#10b981] rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-sm">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Новый пароль</h1>
          <p className="text-gray-500 font-medium">Придумайте надежный пароль для защиты вашего аккаунта</p>
        </div>

        {/* Уведомления */}
        {status.message && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 ${
            status.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
          }`}>
            {status.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-bold">{status.message}</p>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Новый пароль</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#10b981] transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-medium text-gray-900"
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
            disabled={loading || status.type === "success"}
            className="w-full bg-[#10b981] hover:bg-[#0da975] disabled:bg-gray-200 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-green-100/50"
          >
            {loading ? (
              <Loader2 className="animate-spin w-6 h-6" />
            ) : (
              "Обновить пароль"
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => router.push("/login")}
            className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            Вернуться ко входу
          </button>
        </div>
      </div>
    </div>
  );
}