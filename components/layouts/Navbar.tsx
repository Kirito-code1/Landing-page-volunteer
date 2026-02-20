"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faCircleUser } from "@fortawesome/free-regular-svg-icons";
import { faChevronDown, faTableColumns } from "@fortawesome/free-solid-svg-icons";
import { LogOut } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState("Русский");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      ),
    [],
  );

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsLoggedIn(Boolean(session));
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const languages = [
    {
      name: "Русский",
      flag: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Flag_of_Russia.svg",
    },
    {
      name: "English (US)",
      flag: "https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg",
    },
    {
      name: "Deutsch",
      flag: "https://upload.wikimedia.org/wikipedia/en/b/ba/Flag_of_Germany.svg",
    },
  ];

  const selectedLanguage =
    languages.find((lang) => lang.name === currentLang) ?? languages[0];

  const menuItems = isLoggedIn
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/profile", label: "Profile" },
      ]
    : [
        { href: "/", label: "Главная" },
        { href: "/#about", label: "О нас" },
        { href: "/#events", label: "События" },
        { href: "/#directions", label: "Направления" },
      ];

  return (
    <>
      <nav className="bg-white sticky w-full z-20 top-0 start-0 border-b border-gray-100 shadow-sm backdrop-blur-md bg-white/90">
        <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-[#10b981] rounded-xl flex items-center justify-center transition-all group-hover:rotate-6 group-hover:scale-110 shadow-lg shadow-green-100">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <span className="self-center text-xl font-black text-gray-900 tracking-tight">
              Волонтёр
            </span>
          </Link>

          <div className="flex items-center md:order-2 space-x-2">
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="inline-flex items-center font-bold justify-center px-3 py-2 text-sm text-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Image
                  src={selectedLanguage.flag}
                  width={20}
                  height={20}
                  className="w-5 h-5 rounded-full me-2 object-cover border border-gray-100"
                  alt=""
                  unoptimized
                />
                {currentLang === "Русский"
                  ? "RU"
                  : currentLang === "Deutsch"
                    ? "DE"
                    : "EN"}
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`ms-2 w-3 h-3 text-gray-400 transition-transform duration-300 ${
                    isLangOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-2 z-50 bg-white border border-gray-100 rounded-2xl shadow-xl w-44 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <ul className="py-2 text-sm font-bold text-gray-700">
                    {languages.map((lang) => (
                      <li key={lang.name}>
                        <button
                          onClick={() => {
                            setCurrentLang(lang.name);
                            setIsLangOpen(false);
                          }}
                          className="flex items-center w-full px-4 py-3 hover:bg-green-50 hover:text-[#10b981] transition-colors"
                        >
                          <Image
                            src={lang.flag}
                            width={16}
                            height={16}
                            className="w-4 h-4 me-3 rounded-full object-cover border border-gray-100"
                            alt=""
                            unoptimized
                          />
                          {lang.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-black transition-all active:scale-95 shadow-md"
              >
                <LogOut className="w-4 h-4 me-2" />
                Выйти
              </button>
            ) : (
              <Link href="/auth/login">
                <button className="hidden sm:flex items-center bg-[#10b981] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#0da975] transition-all hover:shadow-lg hover:shadow-green-100 active:scale-95">
                  <FontAwesomeIcon icon={faUser} className="me-2" />
                  Войти
                </button>
              </Link>
            )}

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center p-2 w-10 h-10 justify-center text-gray-500 rounded-xl md:hidden hover:bg-gray-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16m-7 6h7"
                  />
                )}
              </svg>
            </button>
          </div>

          <div
            className={`${isMenuOpen ? "block" : "hidden"} items-center justify-between w-full md:flex md:w-auto md:order-1 transition-all`}
          >
            <ul className="flex flex-col p-4 md:p-0 mt-4 font-bold md:space-x-8 md:flex-row md:mt-0 md:bg-transparent bg-gray-50 rounded-2xl md:border-0 border border-gray-100">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block py-2 px-4 md:p-0 text-gray-900 hover:text-[#10b981] transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {isLoggedIn && item.label === "Dashboard" ? (
                      <>
                        <FontAwesomeIcon icon={faTableColumns} className="me-2" />
                        {item.label}
                      </>
                    ) : isLoggedIn && item.label === "Profile" ? (
                      <>
                        <FontAwesomeIcon icon={faCircleUser} className="me-2" />
                        {item.label}
                      </>
                    ) : (
                      item.label
                    )}
                  </Link>
                </li>
              ))}

              {isLoggedIn ? (
                <li className="md:hidden">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left py-2 px-4 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    Выйти
                  </button>
                </li>
              ) : (
                <li className="md:hidden">
                  <Link
                    href="/auth/login"
                    className="block py-2 px-4 text-[#10b981] hover:bg-green-50 rounded-xl transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Войти
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}
