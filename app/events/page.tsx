"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  Search,
  MapPin,
  Calendar,
  Clock3,
  ArrowRight,
  Flame,
  FilterX,
  Crown,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/providers/LanguageProvider";
import EventVisual from "@/components/events/EventVisual";
import {
  getEventCategoryLabel,
  getEventCategoryOptions,
  normalizeEventCategory,
  normalizeVolunteerCount,
} from "@/components/events/eventMeta";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

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

  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const supabaseUnavailableMessage = pick({
    ru: "Сервис временно недоступен. Попробуйте позже.",
    en: "The service is temporarily unavailable. Please try again later.",
    uz: "Xizmat vaqtincha mavjud emas. Keyinroq urinib ko'ring.",
  });

  useEffect(() => {
    async function getEvents() {
      if (!supabase) {
        setEvents([]);
        setError(supabaseUnavailableMessage);
        setLoading(false);
        return;
      }

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
  }, [supabase, pick, supabaseUnavailableMessage]);

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
  const urgentEventsCount = useMemo(
    () => visibleEvents.filter((event) => getUrgencyTag(event.date) === "urgent").length,
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
    <div className="min-h-screen bg-[linear-gradient(180deg,_#eefaf5_0%,_#fcfdfd_18%,_#fcfdfd_100%)] py-10 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 rounded-[38px] border border-white/90 bg-white/90 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(320px,430px)_minmax(0,1fr)] xl:items-start">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                {pick({
                  ru: "Каталог событий",
                  en: "Event catalog",
                  uz: "Tadbirlar katalogi",
                })}
              </div>
              <h1 className="mt-5 text-[clamp(2.7rem,10vw,5.1rem)] font-black italic tracking-[-0.07em] text-slate-950 leading-[0.86]">
                {pick({
                  ru: (
                    <>
                      <span className="block">Найди</span>
                      <span className="block text-[#10b981]">героя</span>
                    </>
                  ),
                  en: (
                    <>
                      <span className="block">Find a</span>
                      <span className="block text-[#10b981]">hero</span>
                    </>
                  ),
                  uz: (
                    <>
                      <span className="block">Yordamchi</span>
                      <span className="block text-[#10b981]">qahramonni</span>
                      <span className="block">toping</span>
                    </>
                  ),
                })}
              </h1>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1 xl:gap-4">
                <div className="rounded-[26px] border border-emerald-100 bg-[linear-gradient(180deg,_#ecfdf5_0%,_#ffffff_100%)] px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">
                    {pick({ ru: "Найдено событий", en: "Events found", uz: "Topilgan tadbirlar" })}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{visibleEvents.length}</p>
                </div>
                <div className="rounded-[26px] border border-slate-100 bg-slate-50 px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    {pick({ ru: "Нужно волонтёров", en: "Volunteers needed", uz: "Kerakli volontyorlar" })}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{selectedVolunteers}</p>
                </div>
                <div className="rounded-[26px] border border-red-100 bg-[linear-gradient(180deg,_#fff1f2_0%,_#ffffff_100%)] px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-500">
                    {pick({ ru: "Срочные события", en: "Urgent events", uz: "Shoshilinch tadbirlar" })}
                  </p>
                  <p className="mt-2 text-3xl font-black text-red-500">{urgentEventsCount}</p>
                </div>
              </div>
            </div>

            <div className="w-full min-w-0 rounded-[32px] border border-slate-100 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    {pick({
                      ru: "Поиск и фильтрация",
                      en: "Search and filters",
                      uz: "Qidiruv va filtrlar",
                    })}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {pick({
                      ru: "Подберите события по категории, срочности и размеру команды.",
                      en: "Narrow events by category, urgency, and team size.",
                      uz: "Tadbirlarni toifa, shoshilinchlik va jamoa hajmi bo'yicha tanlang.",
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#10b981] hover:text-[#10b981]"
                >
                  <FilterX className="h-4 w-4" />
                  {pick({ ru: "Сбросить", en: "Reset", uz: "Tozalash" })}
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
                    className="w-full min-w-0 rounded-[24px] border border-slate-200 bg-white py-4 pl-14 pr-6 text-sm font-medium text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#10b981]"
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
              </div>
            </div>
          </div>
        </header>

        {/* {error && (
          <div className="mb-8 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-600">
            {error}
          </div>
        )} */}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleEvents.map((event) => {
            const urgency = getUrgencyTag(event.date);
            const isPremiumEvent = event.premium_priority === true;
            const volunteersNeeded = normalizeVolunteerCount(event.volunteers_needed);
            const categoryLabel = getEventCategoryLabel(event.category, pick);

            return (
              <Link
                href={`/events/${event.id}`}
                key={event.id}
                className={`group overflow-hidden rounded-[34px] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition-all duration-500 flex flex-col ${
                  isPremiumEvent
                    ? "border border-amber-200/80 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(245,158,11,0.18)]"
                    : "border border-white/90 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(16,185,129,0.12)]"
                }`}
              >
                <div className="relative h-72 overflow-hidden">
                  <EventVisual
                    title={event.title}
                    category={event.category}
                    categoryLabel={categoryLabel}
                    imageUrl={event.image_url}
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.05)_0%,rgba(15,23,42,0.78)_100%)]" />
                  {isPremiumEvent && (
                    <div className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-400/95 px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-sm">
                      <Crown className="w-3.5 h-3.5" />
                      {pick({ ru: "Premium", en: "Premium", uz: "Premium" })}
                    </div>
                  )}
                  <div className="absolute right-5 top-5 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
                    {categoryLabel}
                  </div>
                  {urgency !== "none" && (
                    <div
                      className={`absolute right-5 top-16 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-sm backdrop-blur-md ${
                        urgency === "urgent" ? "bg-red-500/95" : "bg-amber-500/95"
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5" />
                      {urgency === "urgent"
                        ? pick({ ru: "Срочно", en: "Urgent", uz: "Shoshilinch" })
                        : pick({ ru: "Скоро", en: "Soon", uz: "Tez orada" })}
                    </div>
                  )}
                  <div className="absolute inset-x-5 bottom-5">
                    <h3 className="max-w-[92%] text-2xl font-black italic tracking-[-0.04em] text-white transition-colors group-hover:text-emerald-200 line-clamp-2">
                      {event.title}
                    </h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-md">
                        <MapPin className="h-3.5 w-3.5 text-emerald-300" />
                        {event.location?.split(",")[0] || pick({ ru: "Локация", en: "Location", uz: "Joylashuv" })}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-md">
                        <Calendar className="h-3.5 w-3.5 text-emerald-300" />
                        {formatDate(event.date, dateLocale)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {pick({ ru: "Нужно людей", en: "Need people", uz: "Kerakli odamlar" })}
                      </p>
                      <p className="mt-2 text-lg font-black text-slate-950">
                        {volunteersNeeded ?? pick({ ru: "не указано", en: "not set", uz: "kiritilmagan" })}
                      </p>
                    </div>
                    <div className="rounded-[22px] bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {pick({ ru: "Опубликовано", en: "Published", uz: "E'lon qilingan" })}
                      </p>
                      <p className="mt-2 text-lg font-black text-slate-950">{formatDate(event.created_at, dateLocale)}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-start gap-3 rounded-[22px] border border-slate-100 bg-white px-4 py-4">
                    <Clock3 className="mt-0.5 h-4 w-4 text-[#10b981]" />
                    <p className="text-sm font-semibold leading-7 text-slate-500">
                      {urgency === "urgent"
                        ? pick({
                            ru: "Событие скоро начинается, поэтому лучше откликнуться как можно раньше.",
                            en: "This event starts soon, so it is better to apply as early as possible.",
                            uz: "Tadbir tez orada boshlanadi, shuning uchun imkon qadar tezroq ariza yuborgan ma'qul.",
                          })
                        : pick({
                            ru: "Откройте карточку, чтобы увидеть полные детали, статус участия и рейтинг организатора.",
                            en: "Open the card to see full details, participation status, and organizer rating.",
                            uz: "To'liq ma'lumotlar, ishtirok holati va tashkilotchi reytingini ko'rish uchun kartani oching.",
                          })}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-900 transition-transform group-hover:translate-x-1 flex items-center gap-2">
                      {pick({ ru: "Открыть событие", en: "Open event", uz: "Tadbirni ochish" })}
                      <ArrowRight size={14} />
                    </span>
                    {isPremiumEvent ? (
                      <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-amber-700">
                        {pick({ ru: "Выше в каталоге", en: "Pinned higher", uz: "Katalogda yuqorida" })}
                      </span>
                    ) : null}
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
