"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "ru" | "en" | "uz";
export type LocalizedValue<T> = Record<Locale, T>;

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  pick: <T>(values: LocalizedValue<T>) => T;
}

const STORAGE_KEY = "volohero-locale";

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") {
      return "ru";
    }
    const savedLocale = localStorage.getItem(STORAGE_KEY);
    if (savedLocale === "ru" || savedLocale === "en" || savedLocale === "uz") {
      return savedLocale;
    }
    return "ru";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const pick = useCallback(
    <T,>(values: LocalizedValue<T>) => {
      return values[locale];
    },
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      pick,
    }),
    [locale, pick],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
