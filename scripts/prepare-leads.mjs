import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve("../outputs/kv-lekari-karlovarsky-kraj-2026-08-03/kv_lekari_nrpzs_raw_2026-08-03.csv");
const destination = resolve("public/leads.json");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
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
  const compact = value.trim().replace(/\s+/g, " ");
  return compact;
}

const raw = (await readFile(source, "utf8")).replace(/^\uFEFF/, "");
const [header, ...rows] = parseCsv(raw);
const at = Object.fromEntries(header.map((name, index) => [name, index]));
const specialtyByCode = {
  "320": "Praktik",
  "322": "Stomatologie",
  "323": "Gynekologie",
};

const seen = new Set();
const leads = rows
  .filter((row) => specialtyByCode[row[at.ZZ_druh_kod]])
  .map((row) => {
    const id = row[at.ZZ_misto_poskytovani_ID] || row[at.ZZ_ID];
    const street = row[at.ZZ_ulice];
    const number = row[at.ZZ_cislo_domovni_orientacni];
    return {
      id,
      name: row[at.ZZ_nazev] || row[at.poskytovatel_nazev],
      provider: row[at.poskytovatel_nazev] || row[at.ZZ_nazev],
      specialty: specialtyByCode[row[at.ZZ_druh_kod]],
      city: row[at.ZZ_obec],
      district: row[at.ZZ_okres_nazev],
      address: [street, number, row[at.ZZ_PSC], row[at.ZZ_obec]].filter(Boolean).join(" "),
      phone: cleanPhone(row[at.poskytovatel_telefon]),
      email: row[at.poskytovatel_email]?.trim() || "",
      web: row[at.poskytovatel_web]?.trim() || "",
      representative: row[at.poskytovatel_odborny_zastupce]?.replace(/\s+/g, " ").trim() || "",
      status: "Nevoláno",
      notes: "",
      nextFollowUp: "",
      meetingAt: "",
      lastContact: "",
      attempts: 0,
      logs: [],
    };
  })
  .filter((lead) => {
    if (!lead.id || seen.has(lead.id)) return false;
    seen.add(lead.id);
    return true;
  })
  .sort((a, b) => a.city.localeCompare(b.city, "cs") || a.name.localeCompare(b.name, "cs"));

await mkdir(resolve("public"), { recursive: true });
await writeFile(destination, `${JSON.stringify(leads, null, 2)}\n`);
console.log(`Připraveno ${leads.length} kontaktů → ${destination}`);
