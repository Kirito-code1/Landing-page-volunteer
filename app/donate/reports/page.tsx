"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Camera, CheckCircle2, HeartHandshake, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { DonationReportRecord, DonationReportsSummary } from "@/lib/donations/reports";

type DonationReportsResponse = {
  reports: DonationReportRecord[];
  summary: DonationReportsSummary;
  error?: string;
};

function formatAmount(value: number) {
  return value.toLocaleString("ru-RU");
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(
    locale === "uz" ? "uz-UZ" : locale === "en" ? "en-US" : "ru-RU",
    { day: "2-digit", month: "long", year: "numeric" },
  );
}

export default function DonationReportsPage() {
  const { locale, pick } = useLanguage();
  const [reports, setReports] = useState<DonationReportRecord[]>([]);
  const [summary, setSummary] = useState<DonationReportsSummary>({
    totalReports: 0,
    totalReportedAmountUzs: 0,
    latestReportDate: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/donations/reports", {
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as DonationReportsResponse | null;
        if (!response.ok || !payload) {
          throw new Error(
            payload?.error ||
              pick({
                ru: "Не удалось загрузить отчёты.",
                en: "Could not load reports.",
                uz: "Hisobotlarni yuklab bo'lmadi.",
              }),
          );
        }

        if (cancelled) {
          return;
        }

        setReports(payload.reports ?? []);
        setSummary(
          payload.summary ?? {
            totalReports: 0,
            totalReportedAmountUzs: 0,
            latestReportDate: null,
          },
        );
        setError(null);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setReports([]);
        setSummary({
          totalReports: 0,
          totalReportedAmountUzs: 0,
          latestReportDate: null,
        });
        setError(
          loadError instanceof Error
            ? loadError.message
            : pick({
                ru: "Не удалось загрузить отчёты.",
                en: "Could not load reports.",
                uz: "Hisobotlarni yuklab bo'lmadi.",
              }),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [pick]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_18%,_#dcfce7_0%,_transparent_32%),radial-gradient(circle_at_85%_10%,_#dbeafe_0%,_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_52%,_#f1f5f9_100%)] px-4 py-10 md:py-14">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-[38px] border border-white bg-white/90 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
          <div className="grid gap-8 p-7 md:p-10 xl:grid-cols-[minmax(0,1.15fr)_360px]">
            <div>
              <Link
                href="/donate"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 transition-colors hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                {pick({ ru: "К пожертвованиям", en: "Back to donate", uz: "Xayriyaga qaytish" })}
              </Link>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">
                <Camera className="h-3.5 w-3.5" />
                {pick({ ru: "Фотоотчёты и прозрачность", en: "Photo reports and transparency", uz: "Foto hisobotlar va shaffoflik" })}
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-black uppercase italic tracking-[-0.05em] text-slate-950 md:text-5xl">
                {pick({
                  ru: "Показываем, куда идут пожертвования и что уже удалось сделать",
                  en: "Showing where donations go and what has already been done",
                  uz: "Xayriyalar qayerga ketgani va nimalar amalga oshirilganini ko'rsatamiz",
                })}
              </h1>
              <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-slate-600">
                {pick({
                  ru: "Здесь собраны реальные публичные отчёты: сумма, результат, краткое описание и фотографии после закупки или выдачи помощи.",
                  en: "This page collects real public reports: amount, outcome, a short description, and photos after purchasing or distributing help.",
                  uz: "Bu yerda haqiqiy ommaviy hisobotlar jamlangan: summa, natija, qisqa tavsif va xarid yoki yordam tarqatilgandan keyingi fotosuratlar.",
                })}
              </p>
            </div>

            <aside className="rounded-[30px] border border-emerald-200 bg-[linear-gradient(180deg,_#ecfdf5_0%,_#ffffff_100%)] p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                {pick({ ru: "Сводка по отчётам", en: "Reports summary", uz: "Hisobotlar yig'indisi" })}
              </p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-[22px] bg-white px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {pick({ ru: "Опубликовано отчётов", en: "Reports published", uz: "Nashr qilingan hisobotlar" })}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{summary.totalReports}</p>
                </div>
                <div className="rounded-[22px] bg-white px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {pick({ ru: "Показано расходов", en: "Reported spending", uz: "Ko'rsatilgan xarajatlar" })}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{formatAmount(summary.totalReportedAmountUzs)} UZS</p>
                </div>
                <div className="rounded-[22px] bg-white px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {pick({ ru: "Последнее обновление", en: "Latest update", uz: "So'nggi yangilanish" })}
                  </p>
                  <p className="mt-2 text-xl font-black text-slate-950">
                    {summary.latestReportDate ? formatDate(summary.latestReportDate, locale) : "—"}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {loading ? (
          <section className="rounded-[30px] border border-white bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              {pick({ ru: "Загружаем отчёты...", en: "Loading reports...", uz: "Hisobotlar yuklanmoqda..." })}
            </div>
          </section>
        ) : error ? (
          <section className="rounded-[30px] border border-amber-200 bg-amber-50 p-6 text-sm font-semibold leading-7 text-amber-800 shadow-sm">
            {error}
          </section>
        ) : reports.length > 0 ? (
          <section className="grid gap-6">
            {reports.map((report) => (
              <article
                key={report.id}
                className="overflow-hidden rounded-[36px] border border-white bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
              >
                <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="grid gap-3 bg-slate-100 p-3 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="relative min-h-[320px] overflow-hidden rounded-[28px]">
                      <Image
                        src={report.photos[0].url}
                        alt={report.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1280px) 100vw, 50vw"
                      />
                    </div>
                    <div className="grid gap-3">
                      {report.photos.slice(1, 3).map((photo, index) => (
                        <div key={`${photo.url}-${index}`} className="relative min-h-[152px] overflow-hidden rounded-[24px]">
                          <Image
                            src={photo.url}
                            alt={`${report.title} ${index + 2}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1280px) 100vw, 25vw"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 md:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                        {formatDate(report.reportDate, locale)}
                      </span>
                      {report.location ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                          {report.location}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-4 text-3xl font-black text-slate-950">{report.title}</h2>
                    <p className="mt-4 text-base font-semibold leading-8 text-slate-600">{report.summary}</p>

                    <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        {pick({ ru: "Показано в отчёте", en: "Shown in this report", uz: "Hisobotda ko'rsatilgan" })}
                      </p>
                      <p className="mt-2 text-3xl font-black text-slate-950">
                        {formatAmount(report.amountUzs)} UZS
                      </p>
                    </div>

                    {report.metrics.length > 0 ? (
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {report.metrics.map((metric) => (
                          <div key={`${report.id}-${metric.label}`} className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                              {metric.label}
                            </p>
                            <p className="mt-2 text-2xl font-black text-slate-950">{metric.value}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {report.bullets.length > 0 ? (
                      <div className="mt-5 space-y-3">
                        {report.bullets.map((bullet, index) => (
                          <div key={`${report.id}-${index}`} className="flex gap-3 rounded-[22px] bg-slate-50 px-4 py-4">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <p className="text-sm font-semibold leading-7 text-slate-600">{bullet}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="rounded-[30px] border border-dashed border-slate-300 bg-white/90 p-6 shadow-sm">
            <p className="text-2xl font-black text-slate-950">
              {pick({
                ru: "Пока нет опубликованных отчётов",
                en: "No published reports yet",
                uz: "Hozircha e'lon qilingan hisobotlar yo'q",
              })}
            </p>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
              {pick({
                ru: "Как только команда опубликует первый подтверждённый кейс с фотографиями и результатом, он появится здесь.",
                en: "As soon as the team publishes the first confirmed case with photos and outcome, it will appear here.",
                uz: "Jamoa fotosurat va natijaga ega birinchi tasdiqlangan кейсni e'lon qilishi bilan u shu yerda paydo bo'ladi.",
              })}
            </p>
          </section>
        )}

        <section className="rounded-[30px] border border-white bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {pick({ ru: "Почему это важно", en: "Why it matters", uz: "Nega bu muhim" })}
              </p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">
                {pick({
                  ru: "Донору нужен не только сбор, но и подтверждённый результат",
                  en: "Donors need not only fundraising, but verified outcomes",
                  uz: "Donorlarga faqat yig'im emas, balki tasdiqlangan natija ham kerak",
                })}
              </h3>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
                {pick({
                  ru: "Фото, суммы и краткие результаты делают страницу пожертвований сильнее. Когда человек видит, что помощь превращается в понятный результат, доверие растёт.",
                  en: "Photos, amounts, and concise outcomes make the donation page stronger. When people see help turning into clear results, trust grows.",
                  uz: "Foto, summa va qisqa natijalar xayriya sahifasini kuchaytiradi. Odam yordam aniq natijaga aylanganini ko'rganda, ishonch oshadi.",
                })}
              </p>
            </div>
            <Link
              href="/donate"
              className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-slate-950 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-emerald-600"
            >
              <HeartHandshake className="h-4 w-4" />
              {pick({ ru: "Вернуться к пожертвованию", en: "Back to donate", uz: "Xayriyaga qaytish" })}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
