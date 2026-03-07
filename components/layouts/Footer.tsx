"use client";

import Link from "next/link";
import { ArrowUpRight, Heart, Mail, MapPin, Phone } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function Footer() {
  const year = new Date().getFullYear();
  const { pick } = useLanguage();

  const quickLinks = [
    { href: "/", label: pick({ ru: "Главная", en: "Home", uz: "Bosh sahifa" }) },
    { href: "/events", label: pick({ ru: "События", en: "Events", uz: "Tadbirlar" }) },
    { href: "/donate", label: pick({ ru: "Пожертвования", en: "Donations", uz: "Xayriyalar" }) },
    { href: "/dashboard", label: pick({ ru: "Кабинет", en: "Dashboard", uz: "Kabinet" }) },
  ];

  return (
    <footer className="relative mt-16 overflow-hidden bg-[linear-gradient(135deg,_#0f172a_0%,_#052e2b_45%,_#1d4ed8_100%)] text-white">
      <div className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-[#10b981] text-white flex items-center justify-center shadow-lg shadow-emerald-900/30 group-hover:scale-105 transition-transform">
                <Heart className="w-6 h-6 fill-current" />
              </div>
              <span className="text-2xl font-black tracking-tighter uppercase italic">
                Volo<span className="text-[#34d399]">Hero</span>
              </span>
            </Link>

            <p className="mt-5 max-w-xl text-white/75 font-semibold leading-relaxed">
              {pick({
                ru: "Платформа волонтерских инициатив по Узбекистану: находим полезные события, объединяем людей и превращаем добрые идеи в реальные действия.",
                en: "A volunteer platform for Uzbekistan: discover meaningful events, connect people, and turn good ideas into real action.",
                uz: "O'zbekiston uchun volontyorlik platformasi: foydali tadbirlarni topamiz, odamlarni birlashtiramiz va yaxshi g'oyalarni amaliy ishga aylantiramiz.",
              })}
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em]">
              <ArrowUpRight className="w-4 h-4" />
              {pick({
                ru: "Вместе делаем город лучше",
                en: "Building Better Cities Together",
                uz: "Birga shaharning kelajagini yaxshilaymiz",
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/60 mb-4">
              {pick({ ru: "Навигация", en: "Navigation", uz: "Navigatsiya" })}
            </p>
            <ul className="space-y-3">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="font-bold text-white/90 hover:text-[#86efac] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/60 mb-4">
              {pick({ ru: "Контакты", en: "Contacts", uz: "Kontaktlar" })}
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-white/85 font-bold">
                <MapPin className="w-4 h-4 mt-0.5 text-[#86efac]" />
                {pick({
                  ru: "Ташкент, Узбекистан",
                  en: "Tashkent, Uzbekistan",
                  uz: "Toshkent, O'zbekiston",
                })}
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 text-[#86efac]" />
                <a href="mailto:support@volohero.uz" className="font-bold text-white/90 hover:text-[#86efac] transition-colors">
                  support@volohero.uz
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-0.5 text-[#86efac]" />
                <a href="tel:+998901234567" className="font-bold text-white/90 hover:text-[#86efac] transition-colors">
                  +998 94 022 86 84
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm font-bold text-white/70">
            {pick({
              ru: `© ${year} VoloHero. Все права защищены.`,
              en: `© ${year} VoloHero. All rights reserved.`,
              uz: `© ${year} VoloHero. Barcha huquqlar himoyalangan.`,
            })}
          </p>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">
            {pick({
              ru: "Volunteer Platform Uzbekistan",
              en: "Volunteer Platform Uzbekistan",
              uz: "Volunteer Platform Uzbekistan",
            })}
          </p>
        </div>
      </div>
    </footer>
  );
}
