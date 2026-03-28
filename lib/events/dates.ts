const EVENT_TIME_ZONE = "Asia/Tashkent";
const EVENT_TIME_ZONE_OFFSET = "+05:00";

function getFormatterParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: map.get("year") ?? "0000",
    month: map.get("month") ?? "01",
    day: map.get("day") ?? "01",
    hour: map.get("hour") ?? "00",
    minute: map.get("minute") ?? "00",
  };
}

function normalizeEventDateTimeValue(value: string) {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00${EVENT_TIME_ZONE_OFFSET}`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00${EVENT_TIME_ZONE_OFFSET}`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}${EVENT_TIME_ZONE_OFFSET}`;
  }

  return trimmed;
}

export function parseEventDateTime(value: string) {
  const timestamp = new Date(normalizeEventDateTimeValue(value)).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function isPastEventDateTime(value: string, now = Date.now()) {
  const timestamp = parseEventDateTime(value);
  return timestamp !== null && timestamp < now;
}

export function getTodayEventDateInputMin(now = new Date()) {
  const { year, month, day } = getFormatterParts(now);
  return `${year}-${month}-${day}`;
}

export function getCurrentEventTimeInputMin(now = new Date()) {
  const { hour, minute } = getFormatterParts(now);
  return `${hour}:${minute}`;
}
