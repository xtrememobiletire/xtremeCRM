// formatters.ts — Shared display formatters for Landingpage

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

export function formatUnitLabel(unit?: string | number | null): string {
  if (unit === undefined || unit === null || String(unit).trim() === "") {
    return "Unit Unassigned";
  }
  const clean = String(unit).trim().replace(/^unit\s+/i, "").trim();
  return `Unit ${clean}`;
}

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

export function formatTireSpecBadge(spec?: string | null): { text: string; isPlaceholder: boolean } {
  const raw = (spec || "").trim();
  if (!raw || /^tbd$/i.test(raw) || /^not\s*recorded$/i.test(raw) || /^n\/?a$/i.test(raw)) {
    return { text: "Spec TBD", isPlaceholder: true };
  }
  return { text: raw.toUpperCase(), isPlaceholder: false };
}

export function formatRegionBadge(region?: string | null): { code: string; label: string; currency: "CAD" | "USD" | "GBP" } {
  const r = (region || "CA").toUpperCase().trim();
  if (r.startsWith("US") || r.includes("UNITED STATES")) return { code: "US", label: "US • United States", currency: "USD" };
  if (r.startsWith("UK") || r.startsWith("GB") || r.includes("KINGDOM")) return { code: "GB", label: "GB • United Kingdom", currency: "GBP" };
  return { code: "CA", label: "CA • Canada", currency: "CAD" };
}

export function formatMoney(amount?: number | string | null, currency: "CAD" | "USD" | "GBP" = "CAD"): string {
  const num = Number(amount ?? 0);
  const safe = Number.isFinite(num) ? num : 0;
  const formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(safe);
  if (currency === "CAD") return `CA$${formatted}`;
  if (currency === "GBP") return `£${formatted}`;
  return `$${formatted}`;
}

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
