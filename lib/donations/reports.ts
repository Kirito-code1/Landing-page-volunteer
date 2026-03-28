export type DonationReportPhoto = {
  url: string;
  path?: string | null;
};

export type DonationReportMetric = {
  label: string;
  value: string;
};

export type DonationReportRecord = {
  id: string;
  title: string;
  location: string | null;
  summary: string;
  amountUzs: number;
  reportDate: string;
  bullets: string[];
  metrics: DonationReportMetric[];
  photos: DonationReportPhoto[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DonationReportsSummary = {
  totalReports: number;
  totalReportedAmountUzs: number;
  latestReportDate: string | null;
};

export type DonationReportRow = {
  id: string;
  title: string | null;
  location: string | null;
  summary: string | null;
  amount_uzs: number | null;
  report_date: string | null;
  bullets: unknown;
  metrics: unknown;
  photos: unknown;
  is_published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DonationReportPayload = {
  title: string;
  location: string | null;
  summary: string;
  amountUzs: number;
  reportDate: string;
  bullets: string[];
  metrics: DonationReportMetric[];
  photos: DonationReportPhoto[];
  isPublished: boolean;
};

export const MAX_DONATION_REPORT_PHOTOS = 4;
const MAX_BULLETS = 6;
const MAX_METRICS = 4;

function toStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function toMetrics(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const label = typeof (item as { label?: unknown }).label === "string"
        ? (item as { label: string }).label.trim()
        : "";
      const metricValue = typeof (item as { value?: unknown }).value === "string"
        ? (item as { value: string }).value.trim()
        : "";

      if (!label || !metricValue) {
        return null;
      }

      return {
        label,
        value: metricValue,
      } satisfies DonationReportMetric;
    })
    .filter((item): item is DonationReportMetric => item !== null);
}

function toPhotos(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const url = typeof (item as { url?: unknown }).url === "string"
        ? (item as { url: string }).url.trim()
        : "";
      const path = typeof (item as { path?: unknown }).path === "string"
        ? (item as { path: string }).path.trim()
        : null;

      if (!url) {
        return null;
      }

      return {
        url,
        path,
      } satisfies DonationReportPhoto;
    })
    .filter((item): item is DonationReportPhoto => item !== null)
    .slice(0, MAX_DONATION_REPORT_PHOTOS);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  return true;
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return "";
  }

  const date = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return trimmed;
}

export function normalizeDonationReport(row: DonationReportRow): DonationReportRecord | null {
  const title = typeof row.title === "string" ? row.title.trim() : "";
  const summary = typeof row.summary === "string" ? row.summary.trim() : "";
  const reportDate = typeof row.report_date === "string" ? row.report_date.trim() : "";
  const createdAt = typeof row.created_at === "string" ? row.created_at : new Date(0).toISOString();
  const updatedAt = typeof row.updated_at === "string" ? row.updated_at : createdAt;
  const amountUzs = Number.isFinite(row.amount_uzs) ? Number(row.amount_uzs) : 0;

  if (!row.id || !title || !summary || !reportDate || amountUzs <= 0) {
    return null;
  }

  return {
    id: row.id,
    title,
    location: typeof row.location === "string" && row.location.trim() ? row.location.trim() : null,
    summary,
    amountUzs,
    reportDate,
    bullets: toStringList(row.bullets),
    metrics: toMetrics(row.metrics),
    photos: toPhotos(row.photos),
    isPublished: row.is_published !== false,
    createdAt,
    updatedAt,
  };
}

export function summarizeDonationReports(reports: DonationReportRecord[]): DonationReportsSummary {
  const sortedReports = [...reports].sort((a, b) => {
    return new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime();
  });

  return {
    totalReports: reports.length,
    totalReportedAmountUzs: reports.reduce((sum, report) => sum + report.amountUzs, 0),
    latestReportDate: sortedReports[0]?.reportDate ?? null,
  };
}

export function sortDonationReports(reports: DonationReportRecord[]) {
  return [...reports].sort((a, b) => {
    const dateDiff = new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function sanitizeDonationReportPayload(input: unknown): DonationReportPayload {
  if (!isPlainObject(input)) {
    throw new Error("Некорректные данные отчёта.");
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  const location = typeof input.location === "string" && input.location.trim() ? input.location.trim() : null;
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  const reportDate = normalizeDate(input.reportDate);
  const amountUzs = Number.parseInt(String(input.amountUzs ?? "0"), 10);
  const bullets = toStringList(input.bullets).slice(0, MAX_BULLETS);
  const metrics = toMetrics(input.metrics).slice(0, MAX_METRICS);
  const photos = toPhotos(input.photos);
  const isPublished = parseBoolean(input.isPublished);

  if (!title) {
    throw new Error("Укажи название отчёта.");
  }

  if (!summary) {
    throw new Error("Добавь короткое описание результата.");
  }

  if (!reportDate) {
    throw new Error("Укажи корректную дату отчёта.");
  }

  if (!Number.isFinite(amountUzs) || amountUzs <= 0) {
    throw new Error("Сумма должна быть больше нуля.");
  }

  if (photos.length === 0) {
    throw new Error("Добавь хотя бы одну фотографию отчёта.");
  }

  return {
    title,
    location,
    summary,
    amountUzs,
    reportDate,
    bullets,
    metrics,
    photos,
    isPublished,
  };
}

export function serializeDonationReportPayload(payload: DonationReportPayload) {
  return {
    title: payload.title,
    location: payload.location,
    summary: payload.summary,
    amount_uzs: payload.amountUzs,
    report_date: payload.reportDate,
    bullets: payload.bullets,
    metrics: payload.metrics,
    photos: payload.photos,
    is_published: payload.isPublished,
  };
}
