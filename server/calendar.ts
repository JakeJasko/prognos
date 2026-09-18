/**
 * RFC 5545 Compliant iCalendar (.ics) Generator for Prognos Observatory
 * Produces calendar feeds compatible with Google Calendar, Apple Calendar, and Outlook.
 */

export interface IcsCalendarOptions {
  title: string;
  description?: string;
  questions: any[];
  baseUrl: string;
}

function escapeIcsText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatIcsDate(date: Date): string {
  // Returns YYYYMMDDTHHMMSSZ format
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function generateIcsFeed({
  title,
  description = "Prediction resolution deadlines on Prognos Observatory",
  questions,
  baseUrl,
}: IcsCalendarOptions): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Prognos Observatory//Forecasting Ledger//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(title)}`,
    "X-WR-TIMEZONE:UTC",
    `X-WR-CALDESC:${escapeIcsText(description)}`,
  ];

  const now = new Date();
  const dtstamp = formatIcsDate(now);

  for (const q of questions) {
    try {
      const resolveDate = new Date(q.resolve_by);
      if (isNaN(resolveDate.getTime())) continue;

      const dtstart = formatIcsDate(resolveDate);
      // Default event duration: 1 hour
      const endDate = new Date(resolveDate.getTime() + 60 * 60 * 1000);
      const dtend = formatIcsDate(endDate);

      const resolveUrl = `${baseUrl}/?resolve=${q.id}`;
      const viewUrl = `${baseUrl}/?prediction=${q.id}`;

      let desc = `Prognos Observatory Forecast Resolution Deadline\n\n`;
      desc += `Claim: ${q.title}\n`;
      if (q.household_name) {
        desc += `Circle: ${q.household_name}\n`;
      }
      if (q.creator_name) {
        desc += `Observer: ${q.creator_name}\n`;
      }
      if (q.notes) {
        desc += `\nObservation Notes & Falsification:\n${q.notes}\n`;
      }
      desc += `\nStatus: ${q.resolved ? `Resolved (${q.resolution})` : "Active (Pending Resolution)"}\n`;
      desc += `\n👉 Click here to resolve this prediction in Prognos:\n${resolveUrl}\n`;
      desc += `\nObservatory Ledger:\n${viewUrl}`;

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:prognos-pred-${q.id}@nebulous.space`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART:${dtstart}`);
      lines.push(`DTEND:${dtend}`);
      lines.push(`SUMMARY:${escapeIcsText(`🔭 Resolve: ${q.title}`)}`);
      lines.push(`DESCRIPTION:${escapeIcsText(desc)}`);
      lines.push(`URL:${resolveUrl}`);
      lines.push(`LOCATION:Prognos Observatory (${baseUrl})`);
      lines.push(q.resolved ? "STATUS:COMPLETED" : "STATUS:CONFIRMED");
      lines.push("TRANSP:TRANSPARENT");

      // 1-day reminder notification before deadline
      lines.push("BEGIN:VALARM");
      lines.push("TRIGGER:-P1D");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${escapeIcsText(`Reminder: ${q.title} resolves tomorrow!`)}`);
      lines.push("END:VALARM");

      lines.push("END:VEVENT");
    } catch (err) {
      console.error("Error formatting calendar event for question:", q.id, err);
    }
  }

  lines.push("END:VCALENDAR");

  // RFC 5545 requires CRLF line endings
  return lines.join("\r\n") + "\r\n";
}
