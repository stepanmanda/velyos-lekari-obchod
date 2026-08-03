import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve("../outputs/kv-lekari-karlovarsky-kraj-2026-08-03/kv_lekari_digitalni_audit_2026-08-03.csv");
const destination = resolve("public/leads.json");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function cleanPhone(value = "") {
  return value.trim().replace(/\s+/g, " ");
}

function number(value = "") {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function canonicalUrl(value = "") {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return value.split("?")[0].split("#")[0];
  }
}

function primarySpecialty(segments) {
  if (segments.includes("VPL")) return "Praktik";
  if (segments.includes("PLDD")) return "Pediatrie";
  if (segments.includes("GYN")) return "Gynekologie";
  if (segments.includes("ORL")) return "ORL";
  return "Stomatologie";
}

const raw = (await readFile(source, "utf8")).replace(/^\uFEFF/, "");
const openingHoursByPlace = JSON.parse(await readFile(resolve("data/opening-hours.json"), "utf8"));
const [header, ...rows] = parseCsv(raw);
const at = Object.fromEntries(header.map((name, index) => [name, index]));
const required = ["lead_id", "misto_id", "poskytovatel_nazev", "segmenty", "obchodni_skore_0_100", "priorita"];
for (const column of required) {
  if (at[column] === undefined) throw new Error(`Ve vstupu chybí povinný sloupec: ${column}`);
}

const seen = new Set();
const leads = rows.map((row) => {
  const id = row[at.misto_id]?.trim();
  if (!id) throw new Error("Řádek bez stabilního ID místa NRPZS");
  if (seen.has(id)) throw new Error(`Duplicitní ID místa NRPZS: ${id}`);
  seen.add(id);
  const segments = row[at.segmenty].split("|").filter(Boolean);
  const hours = openingHoursByPlace[id] || {};
  return {
    id,
    sourceLeadId: row[at.lead_id],
    providerIco: row[at.poskytovatel_ico],
    name: row[at.zarizeni_nazev] || row[at.poskytovatel_nazev],
    provider: row[at.poskytovatel_nazev] || row[at.zarizeni_nazev],
    specialty: primarySpecialty(segments),
    segments,
    city: row[at.mesto],
    district: row[at.okres],
    address: [row[at.adresa], row[at.psc], row[at.mesto]].filter(Boolean).join(" "),
    phone: cleanPhone(row[at.telefon]),
    email: row[at.email]?.trim() || "",
    web: canonicalUrl(row[at.web]?.trim() || ""),
    webStatus: row[at.web_stav] || "",
    onlineBooking: row[at.online_objednani] || "Neověřeno",
    bookingSystem: row[at.objednavaci_system] || "",
    patientPortal: row[at.pacientsky_portal_formulare] || "Neověřeno",
    representative: row[at.odborny_zastupce]?.replace(/\s+/g, " ").trim() || "",
    targetType: row[at.typ_cile] || "",
    digitalScore: number(row[at.digitalni_skore_0_10]),
    digitalStatus: row[at.digitalni_stav] || "",
    webOpportunityScore: number(row[at.web_prilezitost_0_100]),
    medvisionFitScore: number(row[at.medvision_fit_0_100]),
    commercialScore: number(row[at.obchodni_skore_0_100]),
    priority: row[at.priorita] || "C",
    recommendedOffer: row[at.nabidka_doporucena] || "",
    priorityReason: row[at.duvod_priority] || "",
    recommendedNextStep: row[at.doporuceny_dalsi_krok] || "",
    contactConfidence: row[at.kontakt_jistota] || "",
    researchStatus: row[at.research_stav] || "",
    acceptsNewPatients: row[at.prijima_nove_pacienty] || "Nedohledáno",
    mapProfileUrl: canonicalUrl(row[at.mapy_firmy_url] || ""),
    googleMapsUrl: row[at.google_maps_hledani] || "",
    auditedAt: row[at.overeno_dne] || "",
    openingHours: hours.schedule || { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
    openingHoursSource: hours.sourceUrl || "",
    openingHoursConfidence: hours.confidence || "C",
    openingHoursAuditedAt: hours.auditedAt || "",
    offerMode: "auto",
    scriptOverrides: {},
    status: "Nevoláno",
    notes: "",
    nextFollowUp: "",
    meetingAt: "",
    lastContact: "",
    attempts: 0,
    logs: [],
  };
}).sort((a, b) => b.commercialScore - a.commercialScore || a.city.localeCompare(b.city, "cs") || a.name.localeCompare(b.name, "cs"));

if (leads.length !== rows.length || seen.size !== rows.length) {
  throw new Error(`Deduplikační kontrola selhala: ${rows.length} vstupů / ${leads.length} výstupů / ${seen.size} ID`);
}

await mkdir(resolve("public"), { recursive: true });
await writeFile(destination, `${JSON.stringify(leads, null, 2)}\n`);
console.log(`Připraveno ${leads.length} unikátních kontaktů → ${destination}`);
