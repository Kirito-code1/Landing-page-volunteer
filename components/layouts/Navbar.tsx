"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faCircleUser } from "@fortawesome/free-regular-svg-icons";
import { 
  faChevronDown, 
  faTableColumns, 
  faCalendarAlt,
  IconDefinition 
} from "@fortawesome/free-solid-svg-icons";
import { LogOut, Heart } from "lucide-react";

// 1. Определяем интерфейс для пунктов меню, чтобы TS не ругался на отсутствие icon
interface MenuItem {
  href: string;
  label: string;
  icon?: IconDefinition; // Знак вопроса делает поле необязательным
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState("Русский");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(Boolean(session));
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const languages = [
    { name: "Русский", code: "RU", flag: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Flag_of_Russia.svg" },
    { name: "English (US)", code: "EN", flag: "https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg" },
    { name: "Deutsch", code: "DE", flag: "https://upload.wikimedia.org/wikipedia/en/b/ba/Flag_of_Germany.svg" },
  ];

  const selectedLanguage = languages.find((l) => l.name === currentLang) || languages[0];

  // 2. Явно указываем тип MenuItem[]
  const menuItems: MenuItem[] = isLoggedIn
    ? [
        { href: "/events", label: "Все события", icon: faCalendarAlt },
        { href: "/dashboard", label: "Кабинет", icon: faTableColumns },
        { href: "/profile", label: "Профиль", icon: faCircleUser },
      ]
    : [
        { href: "/", label: "Главная" },
        { href: "/events", label: "События" },
        { href: "/#about", label: "О нас" },
      ];

  return (
    <nav className="bg-white/80 sticky w-full z-[100] top-0 border-b border-gray-100 backdrop-blur-md">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4 md:px-6">
        
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 bg-[#10b981] rounded-xl flex items-center justify-center transition-all group-hover:scale-110 shadow-lg shadow-green-100">
            <Heart className="w-6 h-6 text-white fill-current" />
          </div>
          <span className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">
            Volo<span className="text-[#10b981]">Hero</span>
          </span>
        </Link>

        {/* Right Side Tools */}
        <div className="flex items-center md:order-2 space-x-2">
          
          {/* Language Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="inline-flex items-center font-black text-[11px] px-3 py-2 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest"
            >
              <Image 
                src={selectedLanguage.flag} 
                width={18} height={18} 
                className="rounded-full me-2 object-cover border border-gray-100" 
                alt={selectedLanguage.name} 
                unoptimized 
              />
              {selectedLanguage.code}
              <FontAwesomeIcon icon={faChevronDown} className={`ms-2 w-2 h-2 transition-transform ${isLangOpen ? "rotate-180" : ""}`} />
            </button>

            {isLangOpen && (
              <div className="absolute right-0 mt-2 z-50 bg-white border border-gray-100 rounded-2xl shadow-xl w-44 overflow-hidden animate-in fade-in zoom-in-95">
                <ul className="py-2 text-[12px] font-bold text-gray-700">
                  {languages.map((lang) => (
                    <li key={lang.name}>
                      <button
                        onClick={() => { setCurrentLang(lang.name); setIsLangOpen(false); }}
                        className="flex items-center w-full px-4 py-3 hover:bg-green-50 hover:text-[#10b981] transition-colors"
                      >
                        <Image src={lang.flag} width={16} height={16} className="me-3 rounded-full border border-gray-100" alt="" unoptimized />
                        {lang.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Auth Button */}
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center bg-gray-900 text-white px-5 py-2.5 rounded-[14px] font-black text-[11px] uppercase tracking-widest hover:bg-red-500 transition-all active:scale-95 shadow-md"
            >
              <LogOut className="w-4 h-4 me-2" />
              Выйти
            </button>
          ) : (
            <Link href="/auth/login">
              <button className="hidden sm:flex items-center bg-[#10b981] text-white px-6 py-2.5 rounded-[14px] font-black text-[11px] uppercase tracking-widest hover:bg-[#0da975] transition-all hover:shadow-lg hover:shadow-green-100 active:scale-95">
                <FontAwesomeIcon icon={faUser} className="me-2" />
                Войти
              </button>
            </Link>
          )}

          {/* Mobile Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="inline-flex items-center p-2 w-10 h-10 justify-center text-gray-500 rounded-xl md:hidden hover:bg-gray-50"
          >
            <div className="w-5 h-5 flex flex-col justify-between items-center">
              <span className={`w-full h-0.5 bg-gray-900 rounded-full transition-all ${isMenuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`w-full h-0.5 bg-gray-900 rounded-full transition-all ${isMenuOpen ? "opacity-0" : ""}`} />
              <span className={`w-full h-0.5 bg-gray-900 rounded-full transition-all ${isMenuOpen ? "-rotate-45 -translate-y-2.5" : ""}`} />
            </div>
          </button>
        </div>

        {/* Menu Links */}
        <div className={`${isMenuOpen ? "block" : "hidden"} w-full md:flex md:w-auto md:order-1`}>
          <ul className="flex flex-col p-4 md:p-0 mt-4 font-black text-[11px] uppercase tracking-widest md:space-x-8 md:flex-row md:mt-0 md:border-0">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center py-3 px-4 md:p-0 transition-colors ${
                      isActive ? "text-[#10b981]" : "text-gray-900 hover:text-[#10b981]"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {/* Рендерим иконку только если она существует в объекте */}
                    {item.icon && <FontAwesomeIcon icon={item.icon} className="me-2 w-3 h-3" />}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}