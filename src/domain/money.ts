const AMOUNT_PATTERN = /^\$?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/;

export type ParsedAmount = { ok: true; cents: number; text: string } | { ok: false };

export function parseAmount(raw: string): ParsedAmount {
  const trimmed = raw.trim();
  if (!AMOUNT_PATTERN.test(trimmed)) {
    return { ok: false };
  }
  const normalized = trimmed.replace(/^\$/, "").replace(/,/g, "");
  const [whole = "0", fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    return { ok: false };
  }
  const dollars = Math.trunc(cents / 100);
  const remainder = cents % 100;
  return {
    ok: true,
    cents,
    text: `${dollars}.${String(remainder).padStart(2, "0")}`,
  };
}

export function centsOfStoredAmount(amount: string): number {
  const parsed = parseAmount(amount);
  if (!parsed.ok) {
    throw new Error(`Stored amount is not a positive two-decimal value: ${amount}`);
  }
  return parsed.cents;
}
