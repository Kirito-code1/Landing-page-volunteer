"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-regular-svg-icons";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

export default function Navbar() {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState("Русский");

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

  return (
    <>
      <nav className="bg-white sticky w-full z-20 top-0 start-0 border-b border-gray-100 shadow-sm">
        <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
          {/* Логотип */}
          <Link href="/" className="flex items-center space-x-3 group">
             <div className="w-8 h-8 bg-[#10b981] rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
             </div>
            <span className="self-center text-xl font-bold text-gray-900 tracking-tight">
              Волонтёр
            </span>
          </Link>

          <div className="flex items-center md:order-2 space-x-3">
            {/* ВЫБОР ЯЗЫКА */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="inline-flex items-center font-bold justify-center px-3 py-2 text-sm text-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <img
                  src={languages.find((l) => l.name === currentLang)?.flag}
                  className="w-5 h-5 rounded-full me-2 object-cover border border-gray-100"
                  alt=""
                />
                {currentLang === "Русский" ? "RU" : currentLang === "Deutsch" ? "DE" : "EN"}
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`ms-2 w-3 h-3 text-gray-400 transition-transform ${isLangOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-2 z-50 bg-white border border-gray-100 rounded-2xl shadow-xl w-40 overflow-hidden">
                  <ul className="py-1 text-sm font-medium text-gray-700">
                    {languages.map((lang) => (
                      <li key={lang.name}>
                        <button
                          onClick={() => {
                            setCurrentLang(lang.name);
                            setIsLangOpen(false);
                          }}
                          className="flex items-center w-full px-4 py-3 hover:bg-green-50 hover:text-[#10b981] transition-colors"
                        >
                          <img
                            src={lang.flag}
                            className="w-4 h-4 me-3 rounded-full object-cover border border-gray-100"
                            alt=""
                          />
                          {lang.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* КНОПКА ВОЙТИ */}
            <Link href="/login">
              <button className="hidden sm:flex items-center bg-[#10b981] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#0da975] transition-all hover:shadow-lg hover:shadow-green-100 active:scale-95">
                <FontAwesomeIcon icon={faUser} className="me-2" />
                Войти
              </button>
            </Link>

            {/* Гамбургер */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center p-2 w-10 h-10 justify-center text-gray-500 rounded-xl md:hidden hover:bg-gray-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>

          {/* Ссылки меню */}
          <div
            className={`${isMenuOpen ? "block" : "hidden"} items-center justify-between w-full md:flex md:w-auto md:order-1 transition-all`}
          >
            <ul className="flex flex-col p-4 md:p-0 mt-4 font-bold md:space-x-8 md:flex-row md:mt-0 md:bg-white bg-gray-50 rounded-2xl md:border-0 border border-gray-100">
              <li>
                <Link
                  href="/"
                  className="block py-2 px-4 md:p-0 text-gray-900 hover:text-[#10b981] transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Главная
                </Link>
              </li>
              <li>
                <Link
                  href="/#about"
                  className="block py-2 px-4 md:p-0 text-gray-900 hover:text-[#10b981] transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  О нас
                </Link>
              </li>
              <li>
                <Link
                  href="/#events"
                  className="block py-2 px-4 md:p-0 text-gray-900 hover:text-[#10b981] transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  События
                </Link>
              </li>
              <li>
                <Link
                  href="/#directions"
                  className="block py-2 px-4 md:p-0 text-gray-900 hover:text-[#10b981] transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Направления
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}