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
        <section className="mb-10 grid gap-6 rounded-[32px] border border-white/15 bg-white/10 p-6 backdrop-blur-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200/90">
              {pick({ ru: "Для следующего шага", en: "For your next step", uz: "Keyingi qadam uchun" })}
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-white md:text-4xl">
              {pick({
                ru: "Найдите событие, соберите команду или усилите кабинет организатора.",
                en: "Find an event, build a team, or upgrade the organizer workspace.",
                uz: "Tadbir toping, jamoa yig'ing yoki tashkilotchi kabinetingizni kuchaytiring.",
              })}
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/70">
              {pick({
                ru: "VoloHero соединяет волонтёров и организаторов вокруг понятных действий, прозрачных метрик и живых городских инициатив.",
                en: "VoloHero connects volunteers and organizers through clear actions, transparent metrics, and real urban initiatives.",
                uz: "VoloHero volontyorlar va tashkilotchilarni aniq harakatlar, shaffof metrikalar va haqiqiy shahar tashabbuslari atrofida birlashtiradi.",
              })}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/events"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-950 transition-colors hover:bg-emerald-50"
            >
              {pick({ ru: "Смотреть события", en: "Browse events", uz: "Tadbirlarni ko'rish" })}
            </Link>
            <Link
              href="/premium"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/20"
            >
              {pick({ ru: "Для организаторов", en: "For organizers", uz: "Tashkilotchilar uchun" })}
            </Link>
          </div>
        </section>

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

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                  {pick({ ru: "Фокус", en: "Focus", uz: "Fokus" })}
                </p>
                <p className="mt-2 text-sm font-bold text-white/85">
                  {pick({
                    ru: "Городские и социальные инициативы",
                    en: "Civic and social initiatives",
                    uz: "Shahar va ijtimoiy tashabbuslar",
                  })}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                  {pick({ ru: "Инструменты", en: "Tools", uz: "Vositalar" })}
                </p>
                <p className="mt-2 text-sm font-bold text-white/85">
                  {pick({
                    ru: "Каталог, отклики, impact-отчёты",
                    en: "Catalog, applications, impact reports",
                    uz: "Katalog, arizalar, impact hisobotlar",
                  })}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                  {pick({ ru: "Рост", en: "Growth", uz: "O'sish" })}
                </p>
                <p className="mt-2 text-sm font-bold text-white/85">
                  {pick({
                    ru: "Premium для активных организаторов",
                    en: "Premium for active organizers",
                    uz: "Faol tashkilotchilar uchun Premium",
                  })}
                </p>
              </div>
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

            <div className="mt-6 rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                {pick({ ru: "Для партнёров", en: "For partners", uz: "Hamkorlar uchun" })}
              </p>
              <p className="mt-2 text-sm font-semibold leading-7 text-white/75">
                {pick({
                  ru: "Если вы НКО, команда или бренд, который хочет запустить совместные волонтёрские программы, свяжитесь с нами.",
                  en: "If you're an NGO, team, or brand planning volunteer programs, get in touch with us.",
                  uz: "Agar siz NNT, jamoa yoki volontyor dasturlarini yo'lga qo'ymoqchi bo'lgan brend bo'lsangiz, biz bilan bog'laning.",
                })}
              </p>
            </div>
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
