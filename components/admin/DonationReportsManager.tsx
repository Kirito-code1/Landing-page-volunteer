"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Camera, Eye, EyeOff, Loader2, Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";
import {
  MAX_DONATION_REPORT_PHOTOS,
  sortDonationReports,
  summarizeDonationReports,
  type DonationReportMetric,
  type DonationReportPhoto,
  type DonationReportRecord,
} from "@/lib/donations/reports";

type DonationReportsManagerProps = {
  initialReports: DonationReportRecord[];
};

type DraftState = {
  id: string | null;
  title: string;
  location: string;
  summary: string;
  amountUzs: string;
  reportDate: string;
  bulletsText: string;
  metricsText: string;
  photos: DonationReportPhoto[];
  isPublished: boolean;
};

type UploadResponse = {
  file?: DonationReportPhoto & {
    name?: string;
  };
  error?: string;
};

function formatAmount(value: number) {
  return value.toLocaleString("ru-RU");
}

function createEmptyDraft(): DraftState {
  return {
    id: null,
    title: "",
    location: "",
    summary: "",
    amountUzs: "",
    reportDate: new Date().toISOString().slice(0, 10),
    bulletsText: "",
    metricsText: "",
    photos: [],
    isPublished: true,
  };
}

function draftFromReport(report: DonationReportRecord): DraftState {
  return {
    id: report.id,
    title: report.title,
    location: report.location ?? "",
    summary: report.summary,
    amountUzs: String(report.amountUzs),
    reportDate: report.reportDate,
    bulletsText: report.bullets.join("\n"),
    metricsText: report.metrics.map((metric) => `${metric.label}: ${metric.value}`).join("\n"),
    photos: report.photos,
    isPublished: report.isPublished,
  };
}

function parseBullets(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMetrics(value: string): DonationReportMetric[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(":");
      const metricLabel = label?.trim() ?? "";
      const metricValue = rest.join(":").trim();

      if (!metricLabel || !metricValue) {
        return null;
      }

      return {
        label: metricLabel,
        value: metricValue,
      } satisfies DonationReportMetric;
    })
    .filter((item): item is DonationReportMetric => item !== null);
}

function buildPayload(draft: DraftState) {
  return {
    id: draft.id,
    title: draft.title,
    location: draft.location,
    summary: draft.summary,
    amountUzs: Number.parseInt(draft.amountUzs.replace(/\D/g, "") || "0", 10),
    reportDate: draft.reportDate,
    bullets: parseBullets(draft.bulletsText),
    metrics: parseMetrics(draft.metricsText),
    photos: draft.photos,
    isPublished: draft.isPublished,
  };
}

export default function DonationReportsManager({ initialReports }: DonationReportsManagerProps) {
  const [reports, setReports] = useState(() => sortDonationReports(initialReports));
  const [draft, setDraft] = useState<DraftState>(() => createEmptyDraft());
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const summary = useMemo(() => summarizeDonationReports(reports.filter((report) => report.isPublished)), [reports]);
  const remainingPhotos = MAX_DONATION_REPORT_PHOTOS - draft.photos.length;

  const replaceReport = (nextReport: DonationReportRecord) => {
    setReports((current) => {
      const existing = current.some((item) => item.id === nextReport.id);
      const next = existing
        ? current.map((item) => (item.id === nextReport.id ? nextReport : item))
        : [nextReport, ...current];

      return sortDonationReports(next);
    });
  };

  const resetDraft = () => {
    setDraft(createEmptyDraft());
    setError(null);
    setSuccess(null);
  };

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/donation-reports/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as UploadResponse | null;
      if (!response.ok || !payload?.file) {
        throw new Error(payload?.error || "Не удалось загрузить фото.");
      }

      setDraft((current) => ({
        ...current,
        photos: [...current.photos, { url: payload.file!.url, path: payload.file!.path ?? null }].slice(
          0,
          MAX_DONATION_REPORT_PHOTOS,
        ),
      }));
      setSuccess("Фото добавлено в отчёт.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить фото.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/admin/donation-reports", {
        method: draft.id ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload(draft)),
      });

      const payload = (await response.json().catch(() => null)) as
        | { report?: DonationReportRecord; error?: string }
        | null;

      if (!response.ok || !payload?.report) {
        throw new Error(payload?.error || "Не удалось сохранить отчёт.");
      }

      replaceReport(payload.report);
      setDraft(draftFromReport(payload.report));
      setSuccess(draft.id ? "Отчёт обновлён." : "Отчёт создан.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить отчёт.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (report: DonationReportRecord) => {
    try {
      setBusyId(report.id);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/admin/donation-reports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: report.id,
          title: report.title,
          location: report.location,
          summary: report.summary,
          amountUzs: report.amountUzs,
          reportDate: report.reportDate,
          bullets: report.bullets,
          metrics: report.metrics,
          photos: report.photos,
          isPublished: !report.isPublished,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { report?: DonationReportRecord; error?: string }
        | null;

      if (!response.ok || !payload?.report) {
        throw new Error(payload?.error || "Не удалось обновить публикацию.");
      }

      replaceReport(payload.report);
      if (draft.id === payload.report.id) {
        setDraft(draftFromReport(payload.report));
      }
      setSuccess(payload.report.isPublished ? "Отчёт опубликован." : "Отчёт снят с публикации.");
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Не удалось обновить публикацию.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (report: DonationReportRecord) => {
    const confirmed = window.confirm(`Удалить отчёт "${report.title}"?`);
    if (!confirmed) {
      return;
    }

    try {
      setBusyId(report.id);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/admin/donation-reports?id=${encodeURIComponent(report.id)}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Не удалось удалить отчёт.");
      }

      setReports((current) => current.filter((item) => item.id !== report.id));
      if (draft.id === report.id) {
        resetDraft();
      }
      setSuccess("Отчёт удалён.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить отчёт.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mt-8 rounded-[34px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600">Donation Reports</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">Публичные фотоотчёты</h2>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
            Здесь ты добавляешь реальные отчёты для страницы пожертвований: фото, сумма, краткий результат и статус публикации.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] bg-slate-50 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Опубликовано</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{summary.totalReports}</p>
          </div>
          <div className="rounded-[22px] bg-slate-50 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Показано расходов</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{formatAmount(summary.totalReportedAmountUzs)} UZS</p>
          </div>
          <div className="rounded-[22px] bg-slate-50 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Последний отчёт</p>
            <p className="mt-2 text-lg font-black text-slate-950">{summary.latestReportDate ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                {draft.id ? "Редактирование" : "Новый отчёт"}
              </p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">
                {draft.id ? "Обновить фотоотчёт" : "Добавить фотоотчёт"}
              </h3>
            </div>
            <button
              type="button"
              onClick={resetDraft}
              className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-700"
            >
              <Plus className="h-4 w-4" /> Новый
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Название</label>
              <input
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                className="mt-2 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 font-bold text-slate-900 outline-none transition-colors focus:border-emerald-500"
                placeholder="Например: Выдали продуктовые наборы для 18 семей"
              />
            </div>

            <div>
              <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Локация</label>
              <input
                value={draft.location}
                onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
                className="mt-2 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 font-bold text-slate-900 outline-none transition-colors focus:border-emerald-500"
                placeholder="Ташкент, Чиланзар"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Сумма</label>
                <input
                  inputMode="numeric"
                  value={draft.amountUzs}
                  onChange={(event) => setDraft((current) => ({ ...current, amountUzs: event.target.value.replace(/\D/g, "") }))}
                  className="mt-2 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 font-bold text-slate-900 outline-none transition-colors focus:border-emerald-500"
                  placeholder="500000"
                />
              </div>
              <div>
                <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Дата отчёта</label>
                <input
                  type="date"
                  value={draft.reportDate}
                  onChange={(event) => setDraft((current) => ({ ...current, reportDate: event.target.value }))}
                  className="mt-2 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 font-bold text-slate-900 outline-none transition-colors focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Краткий итог</label>
              <textarea
                rows={4}
                value={draft.summary}
                onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
                className="mt-2 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 font-bold text-slate-900 outline-none transition-colors focus:border-emerald-500"
                placeholder="Коротко объясни, что именно было сделано и кому помогли."
              />
            </div>

            <div>
              <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Пункты результата</label>
              <textarea
                rows={6}
                value={draft.bulletsText}
                onChange={(event) => setDraft((current) => ({ ...current, bulletsText: event.target.value }))}
                className="mt-2 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 font-bold text-slate-900 outline-none transition-colors focus:border-emerald-500"
                placeholder={"Одна строка = один пункт\nЗакупили 18 наборов\nДоставили помощь за 1 день"}
              />
            </div>

            <div>
              <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Метрики</label>
              <textarea
                rows={6}
                value={draft.metricsText}
                onChange={(event) => setDraft((current) => ({ ...current, metricsText: event.target.value }))}
                className="mt-2 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 font-bold text-slate-900 outline-none transition-colors focus:border-emerald-500"
                placeholder={"Одна строка = Label: Value\nСемей: 18\nНаборов: 18\nВолонтёров: 6"}
              />
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Фотографии</p>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                  До {MAX_DONATION_REPORT_PHOTOS} фото. Первая фотография станет главной на публичной странице.
                </p>
              </div>
              <label className={`inline-flex cursor-pointer items-center gap-2 rounded-[18px] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] transition-colors ${remainingPhotos > 0 ? "bg-slate-950 text-white hover:bg-emerald-600" : "bg-slate-200 text-slate-500"}`}>
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isUploading ? "Загрузка..." : "Добавить фото"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  disabled={isUploading || remainingPhotos <= 0}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (file) {
                      void handleUpload(file);
                    }
                  }}
                />
              </label>
            </div>

            {draft.photos.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                {draft.photos.map((photo, index) => (
                  <div key={`${photo.url}-${index}`} className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50">
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={photo.url}
                        alt={`Фото отчёта ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1280px) 50vw, 20vw"
                      />
                    </div>
                    <div className="flex items-center justify-between px-3 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {index === 0 ? "Главное" : `Фото ${index + 1}`}
                      </p>
                      <button
                        type="button"
                        onClick={() => setDraft((current) => ({
                          ...current,
                          photos: current.photos.filter((_, photoIndex) => photoIndex !== index),
                        }))}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-3 rounded-[20px] bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500">
                <Camera className="h-5 w-5 text-slate-400" />
                Пока нет фотографий. Добавь первую, чтобы отчёт можно было опубликовать.
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm font-black text-slate-900">
              <input
                type="checkbox"
                checked={draft.isPublished}
                onChange={(event) => setDraft((current) => ({ ...current, isPublished: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Опубликовать сразу после сохранения
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isUploading}
                className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-emerald-600 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {draft.id ? "Сохранить" : "Создать"}
              </button>
            </div>
          </div>

          {error ? <p className="mt-4 text-sm font-bold text-rose-600">{error}</p> : null}
          {success ? <p className="mt-4 text-sm font-bold text-emerald-600">{success}</p> : null}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Сохранённые отчёты</p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">Текущий список</h3>
            </div>
            <p className="text-sm font-semibold text-slate-500">Публично видны только опубликованные записи.</p>
          </div>

          <div className="mt-5 space-y-4">
            {reports.length > 0 ? reports.map((report) => (
              <article key={report.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                <div className="grid gap-0 md:grid-cols-[180px_1fr]">
                  <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[180px]">
                    {report.photos[0] ? (
                      <Image
                        src={report.photos[0].url}
                        alt={report.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 180px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-slate-200">
                        <Camera className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${report.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                        {report.isPublished ? "Опубликован" : "Скрыт"}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        {report.reportDate}
                      </span>
                    </div>

                    <h4 className="mt-3 text-xl font-black text-slate-950">{report.title}</h4>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{report.summary}</p>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
                      <span>{formatAmount(report.amountUzs)} UZS</span>
                      {report.location ? <span>{report.location}</span> : null}
                      <span>{report.photos.length} фото</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(draftFromReport(report));
                          setError(null);
                          setSuccess(null);
                        }}
                        className="inline-flex items-center gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-700"
                      >
                        <Pencil className="h-4 w-4" /> Редактировать
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleTogglePublish(report)}
                        disabled={busyId === report.id}
                        className="inline-flex items-center gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-700 disabled:opacity-60"
                      >
                        {busyId === report.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : report.isPublished ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        {report.isPublished ? "Скрыть" : "Опубликовать"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(report)}
                        disabled={busyId === report.id}
                        className="inline-flex items-center gap-2 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60"
                      >
                        {busyId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )) : (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-semibold leading-7 text-slate-500">
                Пока нет ни одного отчёта. Добавь первый реальный кейс с фото и суммой, и он появится на странице пожертвований.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
