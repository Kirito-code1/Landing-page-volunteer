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
      <nav className="bg-white sticky w-full z-20 top-0 start-0 border-b border-gray-200">
        <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
          {/* Логотип */}
          <a href="/" className="flex items-center space-x-3">
            <img src="/logo.svg" alt="Логотип" />
            <span className="self-center text-xl font-bold text-gray-900">
              Волонтёр
            </span>
          </a>

          <div className="flex items-center md:order-2 space-x-3">
            {/* ВЫБОР ЯЗЫКА */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="inline-flex items-center font-medium justify-center px-4 py-2 text-sm text-gray-900 rounded-lg cursor-pointer hover:bg-gray-100"
              >
                <img
                  src={languages.find((l) => l.name === currentLang)?.flag}
                  className="w-5 h-5 rounded-full me-2"
                  alt=""
                />
                {currentLang}
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className="ms-2 w-3 h-3 text-gray-500"
                />
              </button>

              {/* Выпадающий список языков */}
              {isLangOpen && (
                <div className="absolute right-0 mt-2 z-50 bg-white border border-gray-100 rounded-lg shadow-lg w-40">
                  <ul className="py-2 text-sm text-gray-700">
                    {languages.map((lang) => (
                      <li key={lang.name}>
                        <button
                          onClick={() => {
                            setCurrentLang(lang.name);
                            setIsLangOpen(false);
                          }}
                          className="flex items-center w-full px-4 py-2 hover:bg-gray-100"
                        >
                          <img
                            src={lang.flag}
                            className="w-4 h-4 me-2 rounded-sm"
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

            {/* КНОПКА ВОЙТИ (Ваш FontAwesome) */}
            <Link href="/login">
              <button className="hidden sm:flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                <FontAwesomeIcon icon={faUser} className="me-2" />
                Войти
              </button>
            </Link>

            {/* Гамбургер для мобилок */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 17 14">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M1 1h15M1 7h15M1 13h15"
                />
              </svg>
            </button>
          </div>

          {/* Ссылки меню */}
          <div
            className={`${isMenuOpen ? "block" : "hidden"} items-center justify-between w-full md:flex md:w-auto md:order-1`}
          >
            <ul className="flex flex-col p-4 md:p-0 mt-4 font-medium border border-gray-100 rounded-lg bg-gray-50 md:space-x-8 md:flex-row md:mt-0 md:border-0 md:bg-white">
              <li>
                <a
                  href="#"
                  className="block py-2 px-3 text-gray-900 hover:text-blue-700 md:p-0"
                >
                  Главная
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block py-2 px-3 text-gray-900 hover:text-blue-700 md:p-0"
                >
                  О нас
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block py-2 px-3 text-gray-900 hover:text-blue-700 md:p-0"
                >
                  Проекты
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}
