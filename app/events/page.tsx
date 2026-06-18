"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  Search,
  MapPin,
  Calendar,
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
  if (Number.isNaN(parsed.getTime())) return "—";
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
        setError(pick({ ru: "Не удалось загрузить события. Попробуйте обновить страницу.", en: "Failed to load events. Please refresh the page.", uz: "Tadbirlarni yuklab bo'lmadi. Sahifani yangilang." }));
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

      const matchesCategory = categoryFilter === "all" || normalizeEventCategory(event.category) === categoryFilter;

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
        if (aPremium !== bPremium) return bPremium - aPremium;
      }

      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      const safeATime = Number.isNaN(aTime) ? 0 : aTime;
      const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
      return sortOrder === "new" ? safeBTime - safeATime : safeATime - safeBTime;
    });
  }, [events, searchTerm, sortOrder, categoryFilter, urgencyFilter, teamSizeFilter, pick]);

  const selectedVolunteers = useMemo(() => visibleEvents.reduce((sum, event) => sum + (normalizeVolunteerCount(event.volunteers_needed) ?? 0), 0), [visibleEvents]);
  const urgentEventsCount = useMemo(() => visibleEvents.filter((event) => getUrgencyTag(event.date) === "urgent").length, [visibleEvents]);

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setUrgencyFilter("all");
    setTeamSizeFilter("all");
    setSortOrder("new");
  };

  const selectClasses = "w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-emerald-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 md:py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[340px_1fr] lg:items-start">
            
            {/* Left Side: Title & Stats */}
            <div>
              <p className="text-sm font-medium text-emerald-600">
                {pick({ ru: "Каталог событий", en: "Event catalog", uz: "Tadbirlar katalogi" })}
              </p>
              <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                {pick({
                  ru: "Найди героя",
                  en: "Find a hero",
                  uz: "Qahramonni toping",
                })}
              </h1>
              
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">{pick({ ru: "Найдено", en: "Found", uz: "Topildi" })}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{visibleEvents.length}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">{pick({ ru: "Нужно людей", en: "Volunteers", uz: "Kerakli" })}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{selectedVolunteers}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs text-red-600">{pick({ ru: "Срочных", en: "Urgent", uz: "Shoshilinch" })}</p>
                  <p className="text-xl font-bold text-red-700 mt-1">{urgentEventsCount}</p>
                </div>
              </div>
            </div>

            {/* Right Side: Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  {pick({ ru: "Фильтры", en: "Filters", uz: "Filtrlar" })}
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  <FilterX className="h-3.5 w-3.5" />
                  {pick({ ru: "Сбросить", en: "Reset", uz: "Tozalash" })}
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={pick({ ru: "Поиск по названию, месту или категории", en: "Search by title, place or category", uz: "Nomi, joyi yoki toifasi bo'yicha qidiring" })}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectClasses}>
                    <option value="all">{pick({ ru: "Все категории", en: "All categories", uz: "Barcha kategoriyalar" })}</option>
                    {categoryOptions.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="relative">
                  <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value as "all" | "urgent" | "soon")} className={selectClasses}>
                    <option value="all">{pick({ ru: "Любая срочность", en: "Any urgency", uz: "Shoshilinchlik" })}</option>
                    <option value="urgent">{pick({ ru: "Срочные: до 3 дней", en: "Urgent: up to 3 days", uz: "Shoshilinch: 3 kungacha" })}</option>
                    <option value="soon">{pick({ ru: "Скоро: до 10 дней", en: "Soon: up to 10 days", uz: "Tez orada: 10 kungacha" })}</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="relative">
                  <select value={teamSizeFilter} onChange={(e) => setTeamSizeFilter(e.target.value as "all" | "small" | "medium" | "large")} className={selectClasses}>
                    <option value="all">{pick({ ru: "Любой размер", en: "Any team size", uz: "Jamoa hajmi" })}</option>
                    <option value="small">{pick({ ru: "Малые: 1-10", en: "Small: 1-10", uz: "Kichik: 1-10" })}</option>
                    <option value="medium">{pick({ ru: "Средние: 11-30", en: "Medium: 11-30", uz: "O'rta: 11-30" })}</option>
                    <option value="large">{pick({ ru: "Большие: 31+", en: "Large: 31+", uz: "Katta: 31+" })}</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="relative">
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "new" | "old")} className={selectClasses}>
                    <option value="new">{pick({ ru: "Сначала новые", en: "Newest first", uz: "Avval yangilari" })}</option>
                    <option value="old">{pick({ ru: "Сначала старые", en: "Oldest first", uz: "Avval eskilari" })}</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{error}</div>
        )}

        {/* Event Cards Grid */}
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
                className={`group bg-white rounded-2xl border overflow-hidden flex flex-col transition-shadow hover:shadow-lg ${
                  isPremiumEvent ? "border-amber-200" : "border-slate-200"
                }`}
              >
                <div className="relative h-56 bg-slate-100">
                  <EventVisual
                    title={event.title}
                    category={event.category}
                    categoryLabel={categoryLabel}
                    imageUrl={event.image_url}
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  <div className="absolute top-4 left-4 flex gap-2">
                    {isPremiumEvent && (
                      <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-xs font-medium px-2.5 py-1 rounded-md">
                        <Crown className="w-3 h-3" />
                        Premium
                      </span>
                    )}
                    <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-md">
                      {categoryLabel}
                    </span>
                  </div>

                  {urgency !== "none" && (
                    <span className={`absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white rounded-md ${
                      urgency === "urgent" ? "bg-red-600" : "bg-amber-500"
                    }`}>
                      <Flame className="w-3 h-3" />
                      {urgency === "urgent" ? pick({ ru: "Срочно", en: "Urgent", uz: "Shoshilinch" }) : pick({ ru: "Скоро", en: "Soon", uz: "Tez orada" })}
                    </span>
                  )}

                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-lg font-bold text-white line-clamp-2 drop-shadow-md">{event.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-white/80 text-xs">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location?.split(",")[0] || pick({ ru: "Локация", en: "Location", uz: "Joylashuv" })}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(event.date, dateLocale)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">{pick({ ru: "Нужно людей", en: "Volunteers needed", uz: "Kerakli odamlar" })}</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">{volunteersNeeded ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{pick({ ru: "Опубликовано", en: "Published", uz: "E'lon qilingan" })}</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">{formatDate(event.created_at, dateLocale)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                      {pick({ ru: "Открыть", en: "Open", uz: "Ochish" })}
                      <ArrowRight size={14} />
                    </span>
                    {isPremiumEvent && (
                      <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                        {pick({ ru: "Вверху списка", en: "Pinned", uz: "Yuqorida" })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {visibleEvents.length === 0 && (
          <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl">
            <p className="text-slate-500">
              {pick({ ru: "Ничего не найдено. Попробуйте изменить фильтры.", en: "No results found. Try adjusting your filters.", uz: "Hech narsa topilmadi. Filtrlarni o'zgartirib ko'ring." })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}