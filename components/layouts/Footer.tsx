"use client";

import Link from "next/link";
import { Heart, Mail, MapPin, Phone } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  const { pick } = useLanguage();

  const quickLinks = [
    {
      href: "/",
      label: pick({ ru: "Главная", en: "Home", uz: "Bosh sahifa" }),
    },
    {
      href: "/events",
      label: pick({ ru: "События", en: "Events", uz: "Tadbirlar" }),
    },
    {
      href: "/donate",
      label: pick({ ru: "Пожертвования", en: "Donations", uz: "Xayriyalar" }),
    },
    {
      href: "/dashboard",
      label: pick({ ru: "Кабинет", en: "Dashboard", uz: "Kabinet" }),
    },
  ];

  return (
    <footer className="bg-slate-900 text-slate-300 mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* --- CTA Section --- */}
        <div className="pb-10 border-b border-slate-800 md:flex md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              {pick({
                ru: "Найдите событие или усилите кабинет организатора",
                en: "Find an event or upgrade the organizer workspace",
                uz: "Tadbir toping yoki tashkilotchi kabinetingizni kuchaytiring",
              })}
            </h2>
            <p className="mt-3 text-slate-400 max-w-xl">
              {pick({
                ru: "VoloHero соединяет волонтёров и организаторов вокруг понятных действий и живых городских инициатив.",
                en: "VoloHero connects volunteers and organizers through clear actions and real urban initiatives.",
                uz: "VoloHero volontyorlar va tashkilotchilarni aniq harakatlar va haqiqiy shahar tashabbuslari atrofida birlashtiradi.",
              })}
            </p>
          </div>

          <div className="mt-6 md:mt-0 flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/events"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-slate-900 font-medium hover:bg-slate-100 transition-colors text-sm"
            >
              {pick({
                ru: "Смотреть события",
                en: "Browse events",
                uz: "Tadbirlarni ko'rish",
              })}
            </Link>
            <Link
              href="/premium"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-slate-700 text-white font-medium hover:bg-slate-800 transition-colors text-sm"
            >
              {pick({
                ru: "Для организаторов",
                en: "For organizers",
                uz: "Tashkilotchilar uchun",
              })}
            </Link>
          </div>
        </div>

        {/* --- Main Grid --- */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand & Description */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                <Heart className="w-4 h-4 fill-current" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                VoloHero
              </span>
            </Link>

            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              {pick({
                ru: "Платформа волонтерских инициатив: находим полезные события и превращаем добрые идеи в реальные действия.",
                en: "A volunteer platform: discover meaningful events and turn good ideas into real action.",
                uz: "Volontyorlik platformasi: foydali tadbirlarni topamiz va yaxshi g'oyalarni amaliy ishga aylantiramiz.",
              })}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">
              {pick({ ru: "Навигация", en: "Navigation", uz: "Navigatsiya" })}
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacts */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">
              {pick({ ru: "Контакты", en: "Contacts", uz: "Kontaktlar" })}
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3 text-slate-400">
                <MapPin className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                {pick({
                  ru: "Ташкент, Узбекистан",
                  en: "Tashkent, Uzbekistan",
                  uz: "Toshkent, O'zbekiston",
                })}
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                <a
                  href="mailto:support@volohero.uz"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  support@volohero.uz
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                <a
                  href="tel:+998940228684"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  +998 94 022 86 84
                </a>
              </li>
            </ul>
          </div>

          {/* Partners */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">
              {pick({
                ru: "Для партнёров",
                en: "For partners",
                uz: "Hamkorlar uchun",
              })}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {pick({
                ru: "Если вы НКО, команда или бренд, который хочет запустить совместные волонтёрские программы, свяжитесь с нами.",
                en: "If you're an NGO, team, or brand planning volunteer programs, get in touch with us.",
                uz: "Agar siz NNT, jamoa yoki volontyor dasturlarini yo'lga qo'moqchi bo'lgan brend bo'lsangiz, biz bilan bog'laning.",
              })}
            </p>
          </div>
        </div>

        {/* --- Bottom Bar --- */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-slate-500">
            {pick({
              ru: `© ${CURRENT_YEAR} VoloHero. Все права защищены.`,
              en: `© ${CURRENT_YEAR} VoloHero. All rights reserved.`,
              uz: `© ${CURRENT_YEAR} VoloHero. Barcha huquqlar himoyalangan.`,
            })}
          </p>
          <p className="text-xs text-slate-600 uppercase tracking-wider">
            Volunteer Platform Uzbekistan
          </p>
        </div>
      </div>
    </footer>
  );
}
