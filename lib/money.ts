export const CURRENCY = "BDT";

export function roundMoney(value: number | string) {
  return Math.round(Number(value) * 100) / 100;
}

export function formatMoney(value: number | string, currency = CURRENCY) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(roundMoney(value));
}
