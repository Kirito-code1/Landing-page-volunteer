export const EVENT_CATEGORY_VALUES = [
  "ecology",
  "recycling",
  "animals",
  "forest",
  "community",
  "other",
] as const;

export type EventCategory = (typeof EVENT_CATEGORY_VALUES)[number];

const EVENT_CATEGORY_SET = new Set<string>(EVENT_CATEGORY_VALUES);

type LocaleTriplet<T> = {
  ru: T;
  en: T;
  uz: T;
};

type Picker = <T>(values: LocaleTriplet<T>) => T;

export function normalizeEventCategory(value: unknown): EventCategory {
  if (typeof value === "string" && EVENT_CATEGORY_SET.has(value)) {
    return value as EventCategory;
  }
  return "other";
}

export function getEventCategoryLabel(category: unknown, pick: Picker): string {
  const normalized = normalizeEventCategory(category);

  switch (normalized) {
    case "ecology":
      return pick({ ru: "Экология", en: "Ecology", uz: "Ekologiya" });
    case "recycling":
      return pick({ ru: "Переработка", en: "Recycling", uz: "Qayta ishlash" });
    case "animals":
      return pick({ ru: "Животные", en: "Animals", uz: "Hayvonlar" });
    case "forest":
      return pick({ ru: "Лес", en: "Forest", uz: "O'rmon" });
    case "community":
      return pick({ ru: "Сообщество", en: "Community", uz: "Hamjamiyat" });
    case "other":
    default:
      return pick({ ru: "Другое", en: "Other", uz: "Boshqa" });
  }
}

export function getEventCategoryOptions(pick: Picker) {
  return EVENT_CATEGORY_VALUES.map((value) => ({
    value,
    label: getEventCategoryLabel(value, pick),
  }));
}

export function normalizeVolunteerCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}
