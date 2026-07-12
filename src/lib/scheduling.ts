const CENTRAL_TIMEZONE = "America/Chicago";

function parseDateAndTime(date: string, time: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);

  if (!match || !timeMatch) {
    throw new Error("Expected date YYYY-MM-DD and time HH:mm");
  }

  const [year, month, day] = match.slice(1).map(Number);
  const [hour, minute] = timeMatch.slice(1).map(Number);
  const localTimestamp = Date.UTC(year, month - 1, day, hour, minute);

  if (
    hour > 23 ||
    minute > 59 ||
    new Date(localTimestamp).toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Expected a valid date and time");
  }

  return { year, month, day, hour, minute, localTimestamp };
}

function zonedTimestamp(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute);
}

/** Converts a wall-clock Central date/time into a portable ISO instant and label. */
export function scheduleOpening(date: string, time: string) {
  const { year, month, day, hour, minute, localTimestamp } = parseDateAndTime(date, time);
  let gigTimestamp = localTimestamp;

  // Correct a UTC-shaped timestamp by the Central offset observed at that instant.
  // Formatting the instant into parts avoids parsing in the browser's local timezone.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    gigTimestamp += localTimestamp - zonedTimestamp(gigTimestamp);
  }

  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
  const displayHour = hour % 12 || 12;
  const meridiem = hour < 12 ? "AM" : "PM";

  return {
    gigAt: new Date(gigTimestamp).toISOString(),
    label: `${label} · ${displayHour}:${String(minute).padStart(2, "0")} ${meridiem}`,
  };
}

export function isSelectableGigDate(date: string, today: string) {
  return date >= today;
}
