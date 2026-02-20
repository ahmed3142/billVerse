export const APP_TIME_ZONE = "Asia/Dhaka";

function getDhakaYearMonthParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit"
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    throw new Error("Could not compute year/month for Asia/Dhaka.");
  }

  return { year, month };
}

export function getCurrentMonthStart(date = new Date()) {
  const { year, month } = getDhakaYearMonthParts(date);
  return `${year}-${month}-01`;
}

export function parseMonthParam(param: string) {
  if (/^\d{4}-\d{2}$/.test(param)) {
    return `${param}-01`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(param)) {
    return param;
  }

  return null;
}

export function formatMonthLabel(monthDate: string) {
  const [year, month] = monthDate.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}
