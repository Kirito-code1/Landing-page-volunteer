"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Loader2,
  Search,
  MapPin,
  Calendar,
  Clock3,
  Users,
  ArrowRight,
  Flame,
  FilterX,
  Crown,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  getEventCategoryLabel,
  getEventCategoryOptions,
  normalizeEventCategory,
  normalizeVolunteerCount,
} from "@/components/events/eventMeta";

interface EventListItem {
  id: string;
  title: string;
  location: string;
  date: string;
  created_at: string;
  category?: string | null;
  volunteers_needed?: number | null;
  premium_priority?: boolean | null;
  image_url: string | null;
}

function formatDate(value: string, locale: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return parsed.toLocaleDateString(locale);
}

function getDaysUntil(dateValue: string): number | null {
  const parsed = new Date(dateValue).getTime();
  if (Number.isNaN(parsed)) return null;
  return (parsed - Date.now()) / (1000 * 60 * 60 * 24);
}

function getUrgencyTag(dateValue: string): "urgent" | "soon" | "none" {
  const daysUntil = getDaysUntil(dateValue);
  if (daysUntil === null || daysUntil < 0) return "none";
  if (daysUntil <= 3) return "urgent";
  if (daysUntil <= 10) return "soon";
  return "none";
}

function getTeamSizeTag(volunteers: number | null): "small" | "medium" | "large" | "unknown" {
  if (!volunteers) return "unknown";
  if (volunteers <= 10) return "small";
  if (volunteers <= 30) return "medium";
  return "large";
}

export default function AllEvents() {
  const { pick } = useLanguage();
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<"all" | "urgent" | "soon">("all");
  const [teamSizeFilter, setTeamSizeFilter] = useState<"all" | "small" | "medium" | "large">("all");
  const [sortOrder, setSortOrder] = useState<"new" | "old">("new");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dateLocale = pick({ ru: "ru-RU", en: "en-US", uz: "uz-UZ" });
  const categoryOptions = getEventCategoryOptions(pick);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  useEffect(() => {
    async function getEvents() {
      const { data, error: supabaseError } = await supabase
        .from("events")
        .select("id, title, location, date, created_at, category, volunteers_needed, premium_priority, image_url")
        .order("created_at", { ascending: false });

      if (supabaseError) {
        setError(
          pick({
            ru: "Не удалось загрузить события. Попробуйте обновить страницу.",
            en: "Failed to load events. Please refresh the page.",
            uz: "Tadbirlarni yuklab bo'lmadi. Sahifani yangilang.",
          }),
        );
        setEvents([]);
        setLoading(false);
        return;
      }

      setEvents(data ?? []);
      setError(null);
      setLoading(false);
    }
    getEvents();
  }, [supabase, pick]);

  const visibleEvents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const filtered = events.filter((event) => {
      const title = (event.title ?? "").toLowerCase();
      const location = (event.location ?? "").toLowerCase();
      const categoryText = getEventCategoryLabel(event.category, pick).toLowerCase();
      const matchesSearch = title.includes(term) || location.includes(term) || categoryText.includes(term);

      const matchesCategory =
        categoryFilter === "all" || normalizeEventCategory(event.category) === categoryFilter;

      const urgencyTag = getUrgencyTag(event.date);
      const matchesUrgency =
        urgencyFilter === "all" ||
        (urgencyFilter === "urgent" && urgencyTag === "urgent") ||
        (urgencyFilter === "soon" && (urgencyTag === "urgent" || urgencyTag === "soon"));

      const teamSizeTag = getTeamSizeTag(normalizeVolunteerCount(event.volunteers_needed));
      const matchesTeamSize =
        teamSizeFilter === "all" ||
        (teamSizeFilter === "small" && teamSizeTag === "small") ||
        (teamSizeFilter === "medium" && teamSizeTag === "medium") ||
        (teamSizeFilter === "large" && teamSizeTag === "large");

      return matchesSearch && matchesCategory && matchesUrgency && matchesTeamSize;
    });

    return [...filtered].sort((a, b) => {
      if (sortOrder === "new") {
        const aPremium = a.premium_priority === true ? 1 : 0;
        const bPremium = b.premium_priority === true ? 1 : 0;
        if (aPremium !== bPremium) {
          return bPremium - aPremium;
        }
      }

      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      const safeATime = Number.isNaN(aTime) ? 0 : aTime;
      const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
      return sortOrder === "new" ? safeBTime - safeATime : safeATime - safeBTime;
    });
  }, [events, searchTerm, sortOrder, categoryFilter, urgencyFilter, teamSizeFilter, pick]);

  const selectedVolunteers = useMemo(
    () =>
      visibleEvents.reduce((sum, event) => {
        return sum + (normalizeVolunteerCount(event.volunteers_needed) ?? 0);
      }, 0),
    [visibleEvents],
  );

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setUrgencyFilter("all");
    setTeamSizeFilter("all");
    setSortOrder("new");
  };
  const filterSelectClassName =
    "min-w-0 w-full appearance-none rounded-[24px] border border-slate-200 bg-[#f8fafc] px-5 py-4 pr-12 text-sm font-semibold tracking-[0.02em] text-slate-700 outline-none transition-colors focus:border-[#10b981] focus:bg-white";

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfdfd]">
        <Loader2 className="animate-spin text-[#10b981] w-10 h-10" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#fcfdfd] py-12 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 grid grid-cols-1 xl:grid-cols-[minmax(340px,430px)_minmax(0,1fr)] items-start gap-8 xl:gap-12">
          <div className="min-w-0 max-w-[440px] text-center xl:text-left">
            <h1 className="text-[clamp(3.1rem,7vw,5.4rem)] font-black italic tracking-[-0.07em] text-slate-900 leading-[0.86]">
              {pick({
                ru: (
                  <>
                    <span className="block whitespace-nowrap">Найди</span>
                    <span className="block whitespace-nowrap text-[#10b981]">героя</span>
                  </>
                ),
                en: (
                  <>
                    <span className="block whitespace-nowrap">Find a</span>
                    <span className="block whitespace-nowrap text-[#10b981]">hero</span>
                  </>
                ),
                uz: (
                  <>
                    <span className="block whitespace-nowrap">Yordamchi</span>
                    <span className="block whitespace-nowrap text-[#10b981]">qahramonni</span>
                    <span className="block whitespace-nowrap">toping</span>
                  </>
                ),
              })}
            </h1>
            <p className="mt-4 max-w-md text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400 xl:ml-1">
              {pick({
                ru: "Все актуальные задачи города",
                en: "All current city tasks",
                uz: "Shahardagi dolzarb vazifalar",
              })}
            </p>
          </div>

          <div className="w-full min-w-0 rounded-[32px] border border-white bg-white/95 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                {pick({
                  ru: "Поиск и фильтрация событий",
                  en: "Search and filter events",
                  uz: "Tadbirlarni qidirish va saralash",
                })}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-[#f8fafc] px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#10b981] hover:text-[#10b981]"
              >
                <FilterX className="h-4 w-4" />
                {pick({ ru: "Сбросить фильтры", en: "Reset filters", uz: "Filtrlarni tozalash" })}
              </button>
            </div>

            <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={pick({
                  ru: "Поиск по названию, месту или категории",
                  en: "Search by title, place or category",
                  uz: "Nomi, joyi yoki toifasi bo'yicha qidiring",
                })}
                className="w-full min-w-0 rounded-[24px] border border-slate-200 bg-[#f8fafc] py-4 pl-14 pr-6 text-sm font-medium text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#10b981] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={filterSelectClassName}
                >
                  <option value="all">
                    {pick({ ru: "Все категории", en: "All categories", uz: "Barcha kategoriyalar" })}
                  </option>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="relative">
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value as "all" | "urgent" | "soon")}
                  className={filterSelectClassName}
                >
                  <option value="all">
                    {pick({ ru: "Срочность", en: "Urgency", uz: "Shoshilinchlik" })}
                  </option>
                  <option value="urgent">
                    {pick({ ru: "Срочные: до 3 дней", en: "Urgent: up to 3 days", uz: "Shoshilinch: 3 kungacha" })}
                  </option>
                  <option value="soon">
                    {pick({ ru: "Скоро: до 10 дней", en: "Soon: up to 10 days", uz: "Tez orada: 10 kungacha" })}
                  </option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="relative">
                <select
                  value={teamSizeFilter}
                  onChange={(e) => setTeamSizeFilter(e.target.value as "all" | "small" | "medium" | "large")}
                  className={filterSelectClassName}
                >
                  <option value="all">
                    {pick({ ru: "Размер команды", en: "Team size", uz: "Jamoa hajmi" })}
                  </option>
                  <option value="small">{pick({ ru: "Малые: 1-10", en: "Small: 1-10", uz: "Kichik: 1-10" })}</option>
                  <option value="medium">
                    {pick({ ru: "Средние: 11-30", en: "Medium: 11-30", uz: "O'rta: 11-30" })}
                  </option>
                  <option value="large">{pick({ ru: "Большие: 31+", en: "Large: 31+", uz: "Katta: 31+" })}</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="relative">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "new" | "old")}
                  className={filterSelectClassName}
                >
                  <option value="new">
                    {pick({
                      ru: "Сначала новые",
                      en: "Newest first",
                      uz: "Avval yangilari",
                    })}
                  </option>
                  <option value="old">
                    {pick({
                      ru: "Сначала старые",
                      en: "Oldest first",
                      uz: "Avval eskilari",
                    })}
                  </option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <p className="text-sm text-slate-500">
                {pick({
                  ru: "Подберите события по категории, срочности и размеру команды.",
                  en: "Filter events by category, urgency and team size.",
                  uz: "Tadbirlarni toifa, shoshilinchlik va jamoa hajmi bo'yicha tanlang.",
                })}
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {pick({
                  ru: `${visibleEvents.length} событий`,
                  en: `${visibleEvents.length} events`,
                  uz: `${visibleEvents.length} ta tadbir`,
                })}
              </p>
            </div>
            </div>
          </div>
        </header>

        <section className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white bg-white px-5 py-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              {pick({ ru: "Найдено событий", en: "Events found", uz: "Topilgan tadbirlar" })}
            </p>
            <p className="text-2xl font-black text-gray-900 mt-1">{visibleEvents.length}</p>
          </div>
          <div className="rounded-2xl border border-white bg-white px-5 py-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              {pick({ ru: "Нужно волонтёров", en: "Volunteers needed", uz: "Kerakli volontyorlar" })}
            </p>
            <p className="text-2xl font-black text-gray-900 mt-1">{selectedVolunteers}</p>
          </div>
          <div className="rounded-2xl border border-white bg-white px-5 py-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              {pick({ ru: "Срочные события", en: "Urgent events", uz: "Shoshilinch tadbirlar" })}
            </p>
            <p className="text-2xl font-black text-red-500 mt-1">
              {visibleEvents.filter((event) => getUrgencyTag(event.date) === "urgent").length}
            </p>
          </div>
        </section>

        {error && (
          <div className="mb-8 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {visibleEvents.map((event) => {
            const urgency = getUrgencyTag(event.date);
            const isPremiumEvent = event.premium_priority === true;

            return (
              <Link
                href={`/events/${event.id}`}
                key={event.id}
                className={`group bg-white rounded-[45px] overflow-hidden shadow-sm transition-all duration-500 flex flex-col ${
                  isPremiumEvent
                    ? "border-2 border-amber-300/80 hover:shadow-2xl hover:shadow-amber-100/60"
                    : "border border-gray-100 hover:shadow-2xl hover:shadow-green-100/40"
                }`}
              >
                <div className="h-64 overflow-hidden relative">
                  <Image
                    src={event.image_url || "/placeholder.jpg"}
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    alt={event.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                    unoptimized
                  />
                  {isPremiumEvent && (
                    <div className="absolute top-6 left-6 bg-amber-500/95 backdrop-blur-md px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest text-white shadow-sm inline-flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5" />
                      {pick({ ru: "Premium", en: "Premium", uz: "Premium" })}
                    </div>
                  )}
                  <div className={`absolute left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest text-gray-900 shadow-sm ${isPremiumEvent ? "top-[4.15rem]" : "top-6"}`}>
                    {event.location?.split(",")[0] || pick({ ru: "Локация", en: "Location", uz: "Joylashuv" })}
                  </div>
                  <div className="absolute top-6 right-6 bg-emerald-500/95 backdrop-blur-md px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest text-white shadow-sm">
                    {getEventCategoryLabel(event.category, pick)}
                  </div>
                  {urgency !== "none" && (
                    <div
                      className={`absolute bottom-6 right-6 backdrop-blur-md px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest text-white shadow-sm inline-flex items-center gap-1.5 ${
                        urgency === "urgent" ? "bg-red-500/95" : "bg-amber-500/95"
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5" />
                      {urgency === "urgent"
                        ? pick({ ru: "Срочно", en: "Urgent", uz: "Shoshilinch" })
                        : pick({ ru: "Скоро", en: "Soon", uz: "Tez orada" })}
                    </div>
                  )}
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter mb-4 leading-tight group-hover:text-[#10b981] transition-colors line-clamp-2">
                      {event.title}
                    </h3>

                    <div className="flex flex-col gap-2 mb-6">
                      <div className="flex items-center gap-2 text-gray-400">
                        <MapPin size={14} className="text-[#10b981]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar size={14} className="text-[#10b981]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {formatDate(event.date, dateLocale)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock3 size={14} className="text-[#10b981]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {pick({ ru: "Опубликовано", en: "Published", uz: "E'lon qilingan" })}:{" "}
                          {formatDate(event.created_at, dateLocale)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Users size={14} className="text-[#10b981]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {pick({ ru: "Волонтёров нужно", en: "Volunteers Needed", uz: "Kerakli volontyorlar" })}:{" "}
                          {normalizeVolunteerCount(event.volunteers_needed) ??
                            pick({ ru: "не указано", en: "not set", uz: "kiritilmagan" })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 py-5 border-t border-gray-50">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900 group-hover:translate-x-1 transition-transform flex items-center gap-2">
                      {pick({ ru: "Подробнее", en: "Details", uz: "Batafsil" })} <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {visibleEvents.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 font-black uppercase text-xs tracking-widest italic">
              {pick({
                ru: "Ничего не найдено...",
                en: "No results found...",
                uz: "Hech narsa topilmadi...",
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
