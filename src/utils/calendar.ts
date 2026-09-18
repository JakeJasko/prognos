import { Prediction } from "../types";

/**
 * Generates absolute HTTP URL for iCal feed
 */
export function getCalendarFeedUrl(type: "household" | "user", id: string): string {
  const origin = window.location.origin;
  return `${origin}/api/calendar/${type}/${encodeURIComponent(id)}/feed.ics`;
}

/**
 * Generates Webcal (webcal://) subscription URL for calendar clients
 */
export function getWebcalFeedUrl(type: "household" | "user", id: string): string {
  const host = window.location.host;
  return `webcal://${host}/api/calendar/${type}/${encodeURIComponent(id)}/feed.ics`;
}

/**
 * Generates 1-click Google Calendar subscription link for a live feed
 */
export function getGoogleCalendarSubscribeUrl(type: "household" | "user", id: string): string {
  const webcalUrl = getWebcalFeedUrl(type, id);
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;
}

/**
 * Formats a Date object to YYYYMMDDTHHMMSSZ
 */
function formatIcsDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Generates Google Calendar web intent link for an individual prediction event
 */
export function getGoogleCalendarEventUrl(prediction: Prediction): string {
  const origin = window.location.origin;
  const resolveUrl = `${origin}/?resolve=${prediction.id}`;
  const title = `🔭 Resolve: ${prediction.title}`;

  const resolveDate = new Date(prediction.resolve_by);
  const isValidDate = !isNaN(resolveDate.getTime());
  const startDate = isValidDate ? resolveDate : new Date();
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const startStr = formatIcsDateTime(startDate);
  const endStr = formatIcsDateTime(endDate);

  const lines = [
    `Prognos Forecast Resolution Deadline`,
    ``,
    `Claim: ${prediction.title}`,
  ];

  if (prediction.notes) {
    lines.push(`Observation Criteria: ${prediction.notes}`);
  }

  lines.push(
    ``,
    `👉 Record outcome & resolve this claim in Prognos:`,
    resolveUrl,
    ``,
    `Ledger Overview: ${origin}/?prediction=${prediction.id}`
  );

  const details = lines.join("\n");
  const location = `Prognos Observatory (${origin})`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startStr}/${endStr}`,
    details,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
