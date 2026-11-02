// displayFormatters.ts — Simple helper functions to clean messy text and numbers

// 1. Fixes broken symbols like "Durham Regional Police Service â€” DRPS HQ" -> "Durham Regional Police Service — DRPS HQ"
export function cleanText(input?: string | null): string {
  if (!input) return "";
  return String(input)
    .replace(/^\uFEFF/, "")
    .replace(/â€”|â€"|â€“|\uFFFD/g, "—")
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€\x9d/g, '"')
    .replace(/Â /g, " ")
    .trim();
}

// 2. Fixes duplicate "Unit unit 18" -> "Unit 18"
export function formatUnitLabel(unit?: string | number | null): string {
  if (unit === undefined || unit === null || String(unit).trim() === "") {
    return "Unit Unassigned";
  }
  const clean = String(unit).trim().replace(/^unit\s+/i, "").trim();
  return `Unit ${clean}`;
}

// 3. Fixes lowercase vehicle names ("honda civic 2026" -> "Honda Civic 2026") while keeping GMC, CR-V, NRR, CE uppercase
const KEEP_UPPER = new Set(["GMC", "BMW", "VW", "RAM", "SUV", "NRR", "CE", "LE", "SE", "CR-V", "HR-V", "F-150", "DRPS", "HQ", "LTD"]);
export function formatVehicleName(name?: string | null): string {
  if (!name || !name.trim()) return "Unspecified Vehicle";
  return cleanText(name)
    .split(/\s+/)
    .map((word) => {
      const upper = word.toUpperCase();
      if (KEEP_UPPER.has(upper) || /^[A-Z0-9]{2,}-\d+$/i.test(word)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

// 4. Fixes Plate badge (Catches bug where vehicle name "TOYOTA COROLLA CE" was saved inside the plate field)
export function formatPlateBadge(plate?: string | null, vehicleName?: string | null): { text: string; isPlaceholder: boolean } {
  const raw = (plate || "").trim();
  if (
    !raw ||
    /^no\s*plate$/i.test(raw) ||
    /^n\/?a$/i.test(raw) ||
    (vehicleName && raw.toLowerCase() === vehicleName.trim().toLowerCase())
  ) {
    return { text: "No Plate", isPlaceholder: true };
  }
  return { text: raw.toUpperCase(), isPlaceholder: false };
}

// 5. Fixes Tire Spec badge ("TBD" -> neutral gray placeholder instead of red error badge)
export function formatTireSpecBadge(spec?: string | null): { text: string; isPlaceholder: boolean } {
  const raw = (spec || "").trim();
  if (!raw || /^tbd$/i.test(raw) || /^not\s*recorded$/i.test(raw) || /^n\/?a$/i.test(raw)) {
    return { text: "Spec TBD", isPlaceholder: true };
  }
  return { text: raw.toUpperCase(), isPlaceholder: false };
}

// 6. Fixes duplicate Region badge ("CA CA (CANADA)" -> "CA • Canada")
export function formatRegionBadge(region?: string | null): { code: string; label: string; currency: "CAD" | "USD" | "GBP" } {
  const r = (region || "CA").toUpperCase().trim();
  if (r.startsWith("US") || r.includes("UNITED STATES")) return { code: "US", label: "US • United States", currency: "USD" };
  if (r.startsWith("UK") || r.startsWith("GB") || r.includes("KINGDOM")) return { code: "GB", label: "GB • United Kingdom", currency: "GBP" };
  return { code: "CA", label: "CA • Canada", currency: "CAD" };
}

// 7. Formats money with commas ("CA$4648.73" -> "CA$4,648.73")
export function formatMoney(amount?: number | string | null, currency: "CAD" | "USD" | "GBP" = "CAD"): string {
  const num = Number(amount ?? 0);
  const safe = Number.isFinite(num) ? num : 0;
  const formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(safe);
  if (currency === "CAD") return `CA$${formatted}`;
  if (currency === "GBP") return `£${formatted}`;
  return `$${formatted}`;
}

// 8. Splits long pipe-separated "LEAD & EQUIPMENT NOTES" into clean key-value badges
export function parseLeadNotes(notes?: string | null): { key: string; value: string }[] {
  const cleaned = cleanText(notes);
  if (!cleaned) return [];
  return cleaned.split(/\s*\|\s*/).filter(Boolean).map((part) => {
    const idx = part.indexOf(":");
    if (idx > 0 && idx < 35) {
      return { key: part.slice(0, idx).trim(), value: part.slice(idx + 1).trim() };
    }
    return { key: "Detail", value: part.trim() };
  });
}
