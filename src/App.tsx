import { useEffect, useMemo, useRef, useState } from "react";
import { forbiddenClaims, objections, specialtyCopy } from "./content";
import type { CallLog, CallScript, Lead, LeadPriority, LeadStatus, OfferMode, Specialty } from "./types";

type Page = "dashboard" | "leads" | "playbook" | "offer";
type LeadSort = "score" | "city" | "webOpportunity" | "followUp";
type LeadSignal = "Vše" | "contactable" | "noWeb" | "hasHours" | "medvision";

const STORAGE_KEY = "velyos-doctors-crm-v1";
const PROFILE_KEY = "velyos-doctors-profile-v1";

const statuses: LeadStatus[] = [
  "Nevoláno",
  "Nedovoláno",
  "Zavolat znovu",
  "Poslat informace",
  "Schůzka",
  "Nezájem",
  "Špatný kontakt",
  "Nevolat",
];
const leadPriorities: LeadPriority[] = ["A", "B", "C"];
const specialtySegments: Record<Specialty, string[]> = {
  Praktik: ["VPL"],
  Pediatrie: ["PLDD"],
  Gynekologie: ["GYN"],
  Stomatologie: ["ZUB", "ORTO"],
  ORL: ["ORL"],
};

function leadMatchesSpecialty(lead: Lead, specialty: Specialty | "Vše") {
  return specialty === "Vše" || specialtySegments[specialty].some((segment) => lead.segments.includes(segment));
}

function mergeCanonicalLeads(canonical: Lead[], saved: Lead[] = []) {
  const savedById = new Map(saved.filter((lead) => lead?.id).map((lead) => [String(lead.id), lead]));
  const unique = new Map<string, Lead>();
  for (const lead of canonical) {
    const id = String(lead.id);
    if (unique.has(id)) continue;
    const previous = savedById.get(id);
    unique.set(id, previous ? {
      ...lead,
      status: previous.status || "Nevoláno",
      notes: previous.notes || "",
      nextFollowUp: previous.nextFollowUp || "",
      meetingAt: previous.meetingAt || "",
      meetingChannel: previous.meetingChannel,
      lastContact: previous.lastContact || "",
      attempts: Number(previous.attempts) || 0,
      logs: Array.isArray(previous.logs) ? previous.logs : [],
      offerMode: previous.offerMode || "auto",
      scriptOverrides: previous.scriptOverrides || {},
    } : lead);
  }
  return Array.from(unique.values());
}

const outcomeHelp: Record<LeadStatus, string> = {
  "Nevoláno": "Kontakt zatím nemá výsledek hovoru.",
  "Nedovoláno": "Telefon nebyl zvednutý.",
  "Zavolat znovu": "Je potřeba naplánovat další pokus o hovor.",
  "Poslat informace": "Po hovoru se odešle krátký relevantní e-mail.",
  "Schůzka": "Je domluvený osobní nebo online termín.",
  "Nezájem": "Nabídka teď není pro kontakt relevantní.",
  "Špatný kontakt": "Telefonní číslo nebo kontaktní osoba nepatří ke správné ordinaci.",
  "Nevolat": "Kontakt se už dál neoslovuje.",
};

const navItems: Array<{ id: Page; label: string; short: string }> = [
  { id: "dashboard", label: "Přehled", short: "01" },
  { id: "leads", label: "Kontakty", short: "02" },
  { id: "playbook", label: "Volací manuál", short: "03" },
  { id: "offer", label: "Co prodáváme", short: "04" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function dateTimeLocal(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function displayDate(value: string, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function websiteLabel(web: string) {
  try {
    const url = new URL(websiteUrl(web));
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return `${url.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return web.replace(/^https?:\/\//, "").split("?")[0].replace(/\/$/, "");
  }
}

function websiteUrl(web: string) {
  if (!web) return "";
  return /^https?:\/\//i.test(web) ? web : `https://${web}`;
}

const weekdayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const weekdayLabels = { mon: "Po", tue: "Út", wed: "St", thu: "Čt", fri: "Pá", sat: "So", sun: "Ne" } as const;

function hasOpeningHours(lead: Lead) {
  return Object.values(lead.openingHours || {}).some((intervals) => intervals.length);
}

function todayOpeningHours(lead: Lead) {
  if (!hasOpeningHours(lead)) return "Hodiny nedohledány";
  const intervals = lead.openingHours[weekdayKeys[new Date().getDay()]] || [];
  return intervals.length ? `Dnes ${intervals.join(", ")}` : "Dnes zavřeno";
}

function weeklyOpeningHours(lead: Lead) {
  return (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const)
    .filter((day) => lead.openingHours?.[day]?.length)
    .map((day) => `${weekdayLabels[day]} ${lead.openingHours[day].join(", ")}`)
    .join(" · ");
}

function pilotSentence() {
  const launch = new Date("2026-08-10T09:00:00+02:00");
  return new Date() < launch
    ? "První pilotní implementaci spouštíme 10. 8. 2026 v M3 MEDIC."
    : "První pilotní implementaci jsme zahájili 10. 8. 2026 v M3 MEDIC.";
}

const offerModeLabels: Record<OfferMode, string> = {
  auto: "Podle auditu",
  web: "Pouze web",
  medvision: "Pouze MEDVISION",
  web_medvision: "Web + MEDVISION",
};

function recommendedOfferMode(lead: Lead): Exclude<OfferMode, "auto"> {
  const offer = lead.recommendedOffer.toLocaleLowerCase("cs");
  if (offer.includes("medvision") && offer.includes("web")) return "web_medvision";
  if (offer.includes("medvision")) return "medvision";
  return "web";
}

function effectiveOfferMode(lead: Lead, selected: OfferMode): Exclude<OfferMode, "auto"> {
  return selected === "auto" ? recommendedOfferMode(lead) : selected;
}

function defaultCallScript(lead: Lead, caller: string, selected: OfferMode): CallScript {
  const copy = specialtyCopy[lead.specialty];
  const mode = effectiveOfferMode(lead, selected);
  const name = caller || "[jméno]";
  const close = `Dává vám smysl, abychom si na 20 minut sedli a podívali se konkrétně na vaši ordinaci? Můžeme osobně, nebo online. Vyhovuje vám víc začátek, nebo konec příštího týdne?`;
  if (mode === "medvision") return {
    gatekeeper: `Dobrý den, tady ${name} z VELYOS. Volám krátce kvůli tomu, jak ordinace řeší objednávání a opakované administrativní požadavky. Mohl bych prosím mluvit s člověkem, který má provoz ordinace na starosti?`,
    intro: `Dobrý den, tady ${name} z VELYOS. Budu stručný. Nevolám s hotovým univerzálním systémem — ověřujeme s ordinacemi, kde dnes vzniká nejvíc telefonní a administrativní zátěže a zda by tam MEDVISION dával smysl.`,
    questions: copy.medvisionQuestions,
    value: `Jestli tomu správně rozumím, nejvíc vás dnes trápí [zopakuj jeho slova]. ${copy.medvision} ${pilotSentence()} Na krátké ukázce bychom ověřili, zda je pro váš provoz relevantní.`,
    close,
    finalNote: "MEDVISION prezentuj jako pilot a discovery. Neslibuj hotové nasazení, konkrétní úsporu času ani automatické klinické rozhodování.",
  };
  if (mode === "web_medvision") return {
    gatekeeper: `Dobrý den, tady ${name} z VELYOS. Volám krátce kvůli webu ordinace a možnosti zjednodušit opakovanou komunikaci s pacienty. Mohl bych prosím mluvit s člověkem, který řeší web nebo provoz ordinace?`,
    intro: `Dobrý den, tady ${name} z VELYOS. Budu stručný. ${copy.hook} Vedle webu ověřujeme s ordinacemi také administrativní workflow pro MEDVISION. Nechci vám po telefonu nic prodávat — chci zjistit, která z těch oblastí je pro vás skutečně relevantní.`,
    questions: [copy.questions[0], copy.questions[1], copy.medvisionQuestions[0], copy.medvisionQuestions[1]],
    value: `Jestli tomu správně rozumím, nejvíc vás dnes trápí [zopakuj jeho slova]. ${copy.value} Kompletní web držíme do 50 tisíc korun; doména a hosting jsou zvlášť. Pokud je problém také v administrativě, ${copy.medvision.toLocaleLowerCase("cs")} ${pilotSentence()}`,
    close,
    finalNote: "Nejdřív potvrď hlavní problém. Nabídni web, MEDVISION nebo obojí podle odpovědí — neprezentuj balíček jako povinnou kombinaci.",
  };
  return {
    gatekeeper: `Dobrý den, tady ${name} z VELYOS. Volám krátce kvůli webovým stránkám ordinace. Mohl bych prosím mluvit s panem doktorem / paní doktorkou, případně s člověkem, který řeší web?`,
    intro: `Dobrý den, tady ${name} z VELYOS. Budu stručný. ${copy.hook} Nechci vám po telefonu nic prodávat — chci jen zjistit, jestli stojí za to domluvit krátkou schůzku.`,
    questions: copy.questions,
    value: `Jestli tomu správně rozumím, nejvíc vás dnes trápí [zopakuj jeho slova]. ${copy.value} Kompletní řešení držíme do 50 tisíc korun; doména a hosting jsou zvlášť.`,
    close,
    finalNote: "Drž se nabídky webu. MEDVISION zmiň jen tehdy, když se klient sám otevře tématu administrativy nebo objednávání.",
  };
}

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState<Specialty | "Vše">("Vše");
  const [status, setStatus] = useState<LeadStatus | "Vše">("Vše");
  const [leadPriority, setLeadPriority] = useState<LeadPriority | "Vše">("Vše");
  const [leadSort, setLeadSort] = useState<LeadSort>("score");
  const [leadSignal, setLeadSignal] = useState<LeadSignal>("contactable");
  const [city, setCity] = useState("Vše");
  const [profileName, setProfileName] = useState(() => localStorage.getItem(PROFILE_KEY) || "Obchodník");
  const [dataNotice, setDataNotice] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      let savedLeads: Lead[] = [];
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) try {
        const parsed = JSON.parse(saved) as Lead[];
        if (Array.isArray(parsed)) savedLeads = parsed;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
      try {
        const response = await fetch("./leads.json");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const canonical = (await response.json()) as Lead[];
        setLeads(mergeCanonicalLeads(canonical, savedLeads));
      } catch {
        setLeads(savedLeads);
        setDataNotice("Aktuální databázi se nepodařilo načíst; zobrazuji poslední lokální zálohu.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    if (!loading && leads.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }, [leads, loading]);

  const activeLead = leads.find((lead) => lead.id === activeLeadId) || null;
  const cities = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.city).filter(Boolean))).sort((a, b) => a.localeCompare(b, "cs")),
    [leads],
  );
  const filteredLeads = useMemo(() => {
    const needle = query.toLocaleLowerCase("cs").trim();
    return leads.filter((lead) => {
      const haystack = [lead.name, lead.provider, lead.city, lead.address, lead.phone, lead.email, lead.representative, lead.recommendedOffer]
        .join(" ")
        .toLocaleLowerCase("cs");
      return (
        (!needle || haystack.includes(needle)) &&
        leadMatchesSpecialty(lead, specialty) &&
        (status === "Vše" || lead.status === status) &&
        (leadPriority === "Vše" || lead.priority === leadPriority) &&
        (leadSignal === "Vše" ||
          (leadSignal === "contactable" && Boolean(lead.phone || lead.email)) ||
          (leadSignal === "noWeb" && lead.webStatus !== "Aktivní vlastní web") ||
          (leadSignal === "hasHours" && hasOpeningHours(lead)) ||
          (leadSignal === "medvision" && lead.medvisionFitScore >= 70)) &&
        (city === "Vše" || lead.city === city)
      );
    }).sort((a, b) => {
      if (leadSort === "city") return a.city.localeCompare(b.city, "cs") || b.commercialScore - a.commercialScore;
      if (leadSort === "webOpportunity") return b.webOpportunityScore - a.webOpportunityScore || b.commercialScore - a.commercialScore;
      if (leadSort === "followUp") return (a.nextFollowUp || "9999").localeCompare(b.nextFollowUp || "9999") || b.commercialScore - a.commercialScore;
      return b.commercialScore - a.commercialScore || a.city.localeCompare(b.city, "cs");
    });
  }, [leads, query, specialty, status, leadPriority, leadSignal, city, leadSort]);

  const today = todayIso();
  const metrics = useMemo(() => {
    const todayLogs = leads.flatMap((lead) => lead.logs).filter((log) => log.at.slice(0, 10) === today);
    return {
      calls: todayLogs.length,
      meetings: leads.filter((lead) => lead.status === "Schůzka").length,
      followUps: leads.filter((lead) => lead.nextFollowUp && lead.nextFollowUp.slice(0, 10) <= today).length,
      untouched: leads.filter((lead) => lead.status === "Nevoláno").length,
    };
  }, [leads, today]);

  const priority = useMemo(
    () => leads
      .filter((lead) => lead.status !== "Nevolat" && lead.status !== "Nezájem" && lead.status !== "Špatný kontakt")
      .filter((lead) => Boolean(lead.phone || lead.email))
      .sort((a, b) => {
        if (a.nextFollowUp && !b.nextFollowUp) return -1;
        if (!a.nextFollowUp && b.nextFollowUp) return 1;
        if (a.nextFollowUp && b.nextFollowUp) return a.nextFollowUp.localeCompare(b.nextFollowUp);
        if (a.commercialScore !== b.commercialScore) return b.commercialScore - a.commercialScore;
        if (a.phone && !b.phone) return -1;
        if (!a.phone && b.phone) return 1;
        return a.city.localeCompare(b.city, "cs");
      })
      .slice(0, 8),
    [leads],
  );

  function saveLead(updated: Lead) {
    setLeads((current) => current.map((lead) => (lead.id === updated.id ? updated : lead)));
    setActiveLeadId(null);
    setDataNotice("Výsledek hovoru je uložený v tomto prohlížeči.");
    window.setTimeout(() => setDataNotice(""), 3500);
  }

  function updateLead(updated: Lead, message: string) {
    setLeads((current) => current.map((lead) => (lead.id === updated.id ? updated : lead)));
    setDataNotice(message);
    window.setTimeout(() => setDataNotice(""), 3500);
  }

  function exportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 2,
      leads,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `velyos-obchod-zaloha-${today}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const columns = ["ID NRPZS", "Ordinace", "Obor", "Segmenty", "Město", "Adresa", "Ordinační hodiny", "Zdroj hodin", "Telefon", "E-mail", "Web", "Stav webu", "Online objednání", "Objednávací systém", "Pacientský portál", "Přijímá nové pacienty", "Priorita", "Obchodní skóre", "Web příležitost", "MEDVISION fit", "Doporučená nabídka", "Zvolený scénář", "Stav", "Pokusy", "Poslední kontakt", "Další krok", "Poznámky"];
    const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = leads.map((lead) => [lead.id, lead.name, lead.specialty, lead.segments.join("|"), lead.city, lead.address, weeklyOpeningHours(lead), lead.openingHoursSource, lead.phone, lead.email, lead.web, lead.webStatus, lead.onlineBooking, lead.bookingSystem, lead.patientPortal, lead.acceptsNewPatients, lead.priority, lead.commercialScore, lead.webOpportunityScore, lead.medvisionFitScore, lead.recommendedOffer, offerModeLabels[effectiveOfferMode(lead, lead.offerMode || "auto")], lead.status, lead.attempts, lead.lastContact, lead.nextFollowUp, lead.notes]);
    const csv = `\uFEFF${[columns, ...rows].map((row) => row.map(quote).join(",")).join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `velyos-obchod-${today}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as { leads?: Lead[] } | Lead[];
      const imported = Array.isArray(parsed) ? parsed : parsed.leads;
      if (!Array.isArray(imported) || !imported.length) throw new Error("Neplatná záloha");
      const merged = mergeCanonicalLeads(leads, imported);
      setLeads(merged);
      setDataNotice(`Záloha sloučena: ${merged.length} unikátních kontaktů, historie zachována.`);
    } catch {
      setDataNotice("Soubor se nepodařilo načíst. Vyberte JSON zálohu z této aplikace.");
    }
  }

  function updateProfile(value: string) {
    setProfileName(value);
    localStorage.setItem(PROFILE_KEY, value);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">V</div>
          <div><strong>VELYOS</strong><span>Obchod · lékaři</span></div>
        </div>
        <nav aria-label="Hlavní navigace">
          {navItems.map((item) => (
            <button key={item.id} className={page === item.id ? "nav-item active" : "nav-item"} onClick={() => setPage(item.id)}>
              <span>{item.short}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <label htmlFor="profile">Volá</label>
          <input id="profile" value={profileName} onChange={(event) => updateProfile(event.target.value)} />
          <p>Data se ukládají pouze do tohoto zařízení.</p>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <button className="mobile-brand" onClick={() => setPage("dashboard")}>V · VELYOS</button>
          <div className="page-kicker">VOLACÍ KOKPIT / KARLOVARSKÝ KRAJ</div>
          <div className="top-actions">
            <button className="ghost-button" onClick={exportCsv}>Export CSV</button>
            <button className="ghost-button" onClick={exportData}>Záloha</button>
            <button className="ghost-button" onClick={() => importRef.current?.click()}>Obnovit</button>
            <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(event) => event.target.files?.[0] && void importData(event.target.files[0])} />
          </div>
        </header>

        {dataNotice && <div className="toast" role="status">{dataNotice}</div>}
        {loading ? <Loading /> : (
          <>
            {page === "dashboard" && <Dashboard metrics={metrics} priority={priority} onCall={setActiveLeadId} onShowLeads={() => setPage("leads")} />}
            {page === "leads" && (
              <LeadsPage
                leads={filteredLeads}
                total={leads.length}
                query={query}
                setQuery={setQuery}
                specialty={specialty}
                setSpecialty={setSpecialty}
                status={status}
                setStatus={setStatus}
                leadPriority={leadPriority}
                setLeadPriority={setLeadPriority}
                leadSort={leadSort}
                setLeadSort={setLeadSort}
                leadSignal={leadSignal}
                setLeadSignal={setLeadSignal}
                city={city}
                setCity={setCity}
                cities={cities}
                onCall={setActiveLeadId}
              />
            )}
            {page === "playbook" && <Playbook />}
            {page === "offer" && <Offer />}
          </>
        )}
      </main>

      {activeLead && <CallWorkspace lead={activeLead} caller={profileName} onClose={() => setActiveLeadId(null)} onSave={saveLead} onUpdate={updateLead} />}
    </div>
  );
}

function Loading() {
  return <div className="loading"><span /><p>Načítám kontakty…</p></div>;
}

function Dashboard({ metrics, priority, onCall, onShowLeads }: {
  metrics: { calls: number; meetings: number; followUps: number; untouched: number };
  priority: Lead[];
  onCall: (id: string) => void;
  onShowLeads: () => void;
}) {
  return (
    <div className="page dashboard-page">
      <section className="hero">
        <div>
          <p className="eyebrow">DNEŠNÍ CÍL</p>
          <h1>Neprodávej web.<br /><em>Domluv další rozhovor.</em></h1>
          <p className="hero-copy">Buď stručný, ptej se na provoz ordinace a nabídni 20 minut, během kterých ověříme, jestli nový web dává smysl.</p>
        </div>
        <button className="primary-button large" onClick={() => priority[0] && onCall(priority[0].id)} disabled={!priority.length}>Začít volat <span>→</span></button>
      </section>

      <section className="metric-grid" aria-label="Dnešní výsledky">
        <Metric number={metrics.calls} label="dnes voláno" accent />
        <Metric number={metrics.meetings} label="domluvené schůzky" />
        <Metric number={metrics.followUps} label="čeká na další krok" />
        <Metric number={metrics.untouched} label="ještě neosloveno" />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-heading"><div><p className="eyebrow">PRIORITA</p><h2>Koho volat teď</h2></div><button className="text-button" onClick={onShowLeads}>Všechny kontakty →</button></div>
          <div className="priority-list">
            {priority.map((lead, index) => <LeadRow key={lead.id} lead={lead} index={index + 1} onCall={onCall} />)}
          </div>
        </div>
        <aside className="panel call-reminder">
          <p className="eyebrow">PŘED PRVNÍM HOVOREM</p>
          <h2>Zapamatuj si jen toto</h2>
          <ol>
            <li><strong>Buď stručný.</strong><span>„Budu stručný, volám kvůli vašemu webu…“</span></li>
            <li><strong>Ptej se.</strong><span>Zjisti, co ordinaci vadí dnes. Nemluv osm minut v kuse.</span></li>
            <li><strong>Neuzavírej zakázku.</strong><span>Cílem je osobní nebo online schůzka na 20 minut.</span></li>
            <li><strong>MEDVISION až potom.</strong><span>Je to doplněk a přední místo v pilotu, ne hotový produkt.</span></li>
          </ol>
          <div className="price-stamp"><span>Kompletní web</span><strong>do 50 000 Kč</strong><small>hosting a doména zvlášť</small></div>
        </aside>
      </section>
    </div>
  );
}

function Metric({ number, label, accent = false }: { number: number; label: string; accent?: boolean }) {
  return <div className={accent ? "metric accent" : "metric"}><strong>{number}</strong><span>{label}</span></div>;
}

function LeadRow({ lead, index, onCall }: { lead: Lead; index: number; onCall: (id: string) => void }) {
  return (
    <div className="priority-row">
      <span className="row-number">{String(index).padStart(2, "0")}</span>
      <div className="lead-main"><strong>{lead.name}</strong><span>{lead.specialty} · {lead.city} · skóre {lead.commercialScore}</span><span>{todayOpeningHours(lead)}</span></div>
      <StatusPill status={lead.status} />
      <span className="next-step">{lead.nextFollowUp ? displayDate(lead.nextFollowUp, true) : lead.phone || "Bez telefonu"}</span>
      <button className="call-button" onClick={() => onCall(lead.id)}>Volat</button>
    </div>
  );
}

function LeadsPage({ leads, total, query, setQuery, specialty, setSpecialty, status, setStatus, leadPriority, setLeadPriority, leadSort, setLeadSort, leadSignal, setLeadSignal, city, setCity, cities, onCall }: {
  leads: Lead[]; total: number; query: string; setQuery: (value: string) => void;
  specialty: Specialty | "Vše"; setSpecialty: (value: Specialty | "Vše") => void;
  status: LeadStatus | "Vše"; setStatus: (value: LeadStatus | "Vše") => void;
  leadPriority: LeadPriority | "Vše"; setLeadPriority: (value: LeadPriority | "Vše") => void;
  leadSort: LeadSort; setLeadSort: (value: LeadSort) => void;
  leadSignal: LeadSignal; setLeadSignal: (value: LeadSignal) => void;
  city: string; setCity: (value: string) => void; cities: string[]; onCall: (id: string) => void;
}) {
  const contactable = leads.filter((lead) => lead.phone || lead.email).length;
  const withoutWeb = leads.filter((lead) => lead.webStatus !== "Aktivní vlastní web").length;
  const priorityA = leads.filter((lead) => lead.priority === "A").length;
  const withHours = leads.filter(hasOpeningHours).length;
  return (
    <div className="page">
      <section className="page-title"><p className="eyebrow">DATABÁZE ORDINACÍ</p><h1>Kontakty</h1><p>{leads.length} z {total} kontaktů odpovídá filtrům.</p></section>
      <section className="filters" aria-label="Filtry kontaktů">
        <label className="search-field"><span>Hledat</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ordinace, lékař, telefon…" /></label>
        <label><span>Obor</span><select value={specialty} onChange={(event) => setSpecialty(event.target.value as Specialty | "Vše")}><option>Vše</option><option>Praktik</option><option>Pediatrie</option><option>Gynekologie</option><option>Stomatologie</option><option>ORL</option></select></label>
        <label><span>Priorita</span><select value={leadPriority} onChange={(event) => setLeadPriority(event.target.value as LeadPriority | "Vše")}><option>Vše</option>{leadPriorities.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Stav</span><select value={status} onChange={(event) => setStatus(event.target.value as LeadStatus | "Vše")}><option>Vše</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Město</span><select value={city} onChange={(event) => setCity(event.target.value)}><option>Vše</option>{cities.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Obchodní signál</span><select value={leadSignal} onChange={(event) => setLeadSignal(event.target.value as LeadSignal)}><option value="Vše">Vše</option><option value="contactable">Má kontakt</option><option value="noWeb">Bez vlastního webu</option><option value="hasHours">Má ordinační hodiny</option><option value="medvision">MEDVISION fit 70+</option></select></label>
        <label><span>Řazení</span><select value={leadSort} onChange={(event) => setLeadSort(event.target.value as LeadSort)}><option value="score">Obchodní skóre</option><option value="webOpportunity">Webová příležitost</option><option value="city">Město</option><option value="followUp">Další kontakt</option></select></label>
      </section>
      <section className="lead-overview" aria-label="Souhrn vyfiltrovaných kontaktů">
        <article><strong>{priorityA}</strong><span>priorita A</span></article>
        <article><strong>{contactable}</strong><span>má telefon nebo e-mail</span></article>
        <article><strong>{withoutWeb}</strong><span>bez aktivního vlastního webu</span></article>
        <article><strong>{withHours}</strong><span>dohledané ordinační hodiny</span></article>
      </section>
      <section className="leads-table-wrap">
        <table className="leads-table">
          <colgroup><col className="col-practice" /><col className="col-location" /><col className="col-contact" /><col className="col-hours" /><col className="col-digital" /><col className="col-opportunity" /><col className="col-crm" /><col className="col-action" /></colgroup>
          <thead><tr><th>Ordinace</th><th>Město a adresa</th><th>Kontakt</th><th>Kdy volat</th><th>Digitální stav</th><th>Příležitost</th><th>CRM stav</th><th /></tr></thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td><strong>{lead.name}</strong><span>{lead.specialty} · {lead.targetType}</span></td>
                <td><strong>{lead.city}</strong><span title={lead.address}>{lead.address || lead.district}</span>{lead.googleMapsUrl && <a className="micro-link" href={lead.googleMapsUrl} target="_blank" rel="noreferrer">Mapa ↗</a>}</td>
                <td><a href={lead.phone ? `tel:${lead.phone.replace(/\s/g, "")}` : undefined}>{lead.phone || "Bez telefonu"}</a><span>{lead.email || lead.representative || "—"}</span></td>
                <td className="hours-cell">{hasOpeningHours(lead) ? <details><summary>{todayOpeningHours(lead)}</summary><span>{weeklyOpeningHours(lead)}</span>{lead.openingHoursSource && <a href={lead.openingHoursSource} target="_blank" rel="noreferrer">Ověřit zdroj ↗</a>}</details> : <><span className="hours-missing">Nedohledáno</span>{lead.mapProfileUrl && <a className="micro-link" href={lead.mapProfileUrl} target="_blank" rel="noreferrer">Ověřit profil ↗</a>}</>}</td>
                <td className="digital-cell">{lead.web ? <a title={lead.web} href={websiteUrl(lead.web)} target="_blank" rel="noreferrer">{websiteLabel(lead.web)}</a> : <span className="web-opportunity">Bez vlastního webu</span>}<span>{lead.webStatus} · {lead.digitalStatus} {lead.digitalScore}/10</span><small>Objednání: {lead.onlineBooking}{lead.bookingSystem ? ` · ${lead.bookingSystem}` : ""}</small></td>
                <td><div className="opportunity-line"><strong className={`priority-badge priority-${lead.priority.toLowerCase()}`}>{lead.priority}</strong><b>{lead.commercialScore}/100</b></div><span title={lead.recommendedOffer}>{lead.recommendedOffer}</span><small>Web {lead.webOpportunityScore} · MEDVISION {lead.medvisionFitScore}</small></td>
                <td><StatusPill status={lead.status} /><span>{lead.nextFollowUp ? `Volat ${displayDate(lead.nextFollowUp, true)}` : lead.lastContact ? `Naposledy ${displayDate(lead.lastContact)}` : lead.recommendedNextStep}</span></td>
                <td><button className="call-button" onClick={() => onCall(lead.id)}>Otevřít</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!leads.length && <div className="empty-state"><strong>Nic jsme nenašli.</strong><span>Zkuste upravit hledání nebo filtry.</span></div>}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: LeadStatus }) {
  return <span className={`status status-${status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll(" ", "-")}`}>{status}</span>;
}

function CallWorkspace({ lead, caller, onClose, onSave, onUpdate }: { lead: Lead; caller: string; onClose: () => void; onSave: (lead: Lead) => void; onUpdate: (lead: Lead, message: string) => void }) {
  const [outcome, setOutcome] = useState<LeadStatus>(lead.status === "Nevoláno" ? "Nedovoláno" : lead.status);
  const [note, setNote] = useState(lead.notes);
  const [followUp, setFollowUp] = useState(() => lead.nextFollowUp || dateTimeLocal(new Date(Date.now() + 2 * 86_400_000)));
  const [meetingAt, setMeetingAt] = useState(lead.meetingAt);
  const [channel, setChannel] = useState<"Osobně" | "Online">(lead.meetingChannel || "Online");
  const [tab, setTab] = useState<"script" | "record" | "history">("script");
  const [offerMode, setOfferMode] = useState<OfferMode>(lead.offerMode || "auto");
  const [scriptOverrides, setScriptOverrides] = useState<Lead["scriptOverrides"]>(lead.scriptOverrides || {});
  const [editingScript, setEditingScript] = useState(false);
  const defaultScript = useMemo(() => defaultCallScript(lead, caller, offerMode), [lead, caller, offerMode]);
  const currentOverrides = scriptOverrides[offerMode] || {};
  const callScript: CallScript = {
    ...defaultScript,
    ...currentOverrides,
    questions: currentOverrides.questions || defaultScript.questions,
  };
  const effectiveMode = effectiveOfferMode(lead, offerMode);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function updateScriptField<K extends keyof CallScript>(field: K, value: CallScript[K]) {
    setScriptOverrides((current) => ({
      ...current,
      [offerMode]: { ...(current[offerMode] || {}), [field]: value },
    }));
  }

  function saveScriptSettings() {
    onUpdate({ ...lead, offerMode, scriptOverrides }, `Scénář „${offerModeLabels[effectiveMode]}“ je uložený pro tuto ordinaci.`);
    setEditingScript(false);
  }

  function resetScriptSettings() {
    setScriptOverrides((current) => {
      const next = { ...current };
      delete next[offerMode];
      return next;
    });
  }

  function submit() {
    const at = new Date().toISOString();
    const log: CallLog = { id: crypto.randomUUID(), at, outcome, note, followUp, meetingAt, channel: outcome === "Schůzka" ? channel : undefined };
    onSave({
      ...lead,
      status: outcome,
      notes: note,
      nextFollowUp: outcome === "Zavolat znovu" || outcome === "Poslat informace" ? followUp : "",
      meetingAt: outcome === "Schůzka" ? meetingAt : "",
      meetingChannel: outcome === "Schůzka" ? channel : undefined,
      lastContact: at,
      attempts: lead.attempts + 1,
      logs: [log, ...lead.logs],
      offerMode,
      scriptOverrides,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="call-workspace" role="dialog" aria-modal="true" aria-labelledby="call-title">
        <header className="call-header">
          <div><p className="eyebrow">HOVOR · {lead.specialty.toUpperCase()}</p><h2 id="call-title">{lead.name}</h2><p>{lead.address || lead.city}</p></div>
          <div className="call-contact">{lead.phone ? <a className="primary-button" href={`tel:${lead.phone.replace(/\s/g, "")}`}>{lead.phone}</a> : <span>Bez telefonu</span>}<button className="close-button" onClick={onClose} aria-label="Zavřít">×</button></div>
        </header>
        <div className="workspace-tabs" role="tablist">
          <button className={tab === "script" ? "active" : ""} onClick={() => setTab("script")}>Scénář hovoru</button>
          <button className={tab === "record" ? "active" : ""} onClick={() => setTab("record")}>Zapsat výsledek</button>
          <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>Historie ({lead.logs.length})</button>
        </div>

        <div className="workspace-body">
          {tab === "script" && (
            <div className="script-grid">
              <div className="script-flow">
                <section className="script-strategy">
                  <div><p className="eyebrow">STRATEGIE NABÍDKY</p><h3>{offerModeLabels[effectiveMode]}</h3><p>Audit doporučuje: <strong>{offerModeLabels[recommendedOfferMode(lead)]}</strong> · {lead.recommendedOffer}</p></div>
                  <div className="strategy-actions">
                    <label><span>Scénář pro tento kontakt</span><select value={offerMode} onChange={(event) => setOfferMode(event.target.value as OfferMode)}><option value="auto">Podle auditu ({offerModeLabels[recommendedOfferMode(lead)]})</option><option value="web">Pouze web</option><option value="medvision">Pouze MEDVISION</option><option value="web_medvision">Web + MEDVISION</option></select></label>
                    <button className="ghost-button" onClick={() => setEditingScript((value) => !value)}>{editingScript ? "Zavřít úpravy" : "Upravit texty"}</button>
                    <button className="primary-button" onClick={saveScriptSettings}>Uložit scénář</button>
                  </div>
                  {editingScript && <div className="script-editor">
                    <label><span>01 · Sestra / recepce</span><textarea rows={4} value={callScript.gatekeeper} onChange={(event) => updateScriptField("gatekeeper", event.target.value)} /></label>
                    <label><span>02 · Úvod lékaři</span><textarea rows={5} value={callScript.intro} onChange={(event) => updateScriptField("intro", event.target.value)} /></label>
                    <label className="wide"><span>03 · Otázky — jedna na řádek</span><textarea rows={6} value={callScript.questions.join("\n")} onChange={(event) => updateScriptField("questions", event.target.value.split("\n").map((value) => value.trim()).filter(Boolean))} /></label>
                    <label><span>04 · Hodnota nabídky</span><textarea rows={6} value={callScript.value} onChange={(event) => updateScriptField("value", event.target.value)} /></label>
                    <label><span>05 · Domluvení schůzky</span><textarea rows={5} value={callScript.close} onChange={(event) => updateScriptField("close", event.target.value)} /></label>
                    <label className="wide"><span>06 · Poznámka / hranice nabídky</span><textarea rows={4} value={callScript.finalNote} onChange={(event) => updateScriptField("finalNote", event.target.value)} /></label>
                    <div className="script-editor-actions"><button className="text-button" onClick={resetScriptSettings}>Obnovit výchozí text pro tuto variantu</button><span>Vlastní texty se ukládají pouze pro tuto ordinaci a zvolenou variantu.</span></div>
                  </div>}
                </section>
                <ScriptStep number="01" title="Když zvedne sestra / recepce">
                  <blockquote>„{callScript.gatekeeper}“</blockquote>
                </ScriptStep>
                <ScriptStep number="02" title="Prvních 20 sekund s lékařem">
                  <blockquote>„{callScript.intro}“</blockquote>
                </ScriptStep>
                <ScriptStep number="03" title="Ptej se a poslouchej">
                  <div className="question-list">{callScript.questions.map((question) => <button key={question} onClick={() => navigator.clipboard?.writeText(question)}>{question}<span>zkopírovat</span></button>)}</div>
                  <p className="tip">Použij 2–3 otázky. Po odpovědi se doptávej. Klient má mluvit víc než ty.</p>
                </ScriptStep>
                <ScriptStep number="04" title="Propoj problém s nabídkou">
                  <blockquote>„{callScript.value}“</blockquote>
                </ScriptStep>
                <ScriptStep number="05" title="Domluv schůzku">
                  <blockquote>„{callScript.close}“</blockquote>
                  <p>Neptej se jen „máte zájem?“. Nabídni dvě jednoduché možnosti.</p>
                </ScriptStep>
                <ScriptStep number="06" title="Hranice zvolené nabídky">
                  <p className="script-final-note">{callScript.finalNote}</p>
                </ScriptStep>
              </div>
              <aside className="lead-card">
                <p className="eyebrow">KONTAKT · PRIORITA {lead.priority}</p><h3>{lead.provider}</h3>
                <div className="lead-recommendation"><strong>{lead.recommendedOffer}</strong><span>Zvolený scénář: {offerModeLabels[effectiveMode]}</span><span>{lead.recommendedNextStep}</span></div>
                <dl><dt>Obor</dt><dd>{lead.specialty} <small>({lead.segments.join(" · ")})</small></dd><dt>Město</dt><dd>{lead.city}</dd><dt>Hodiny</dt><dd>{hasOpeningHours(lead) ? <><strong>{todayOpeningHours(lead)}</strong><small className="weekly-hours">{weeklyOpeningHours(lead)}</small></> : "Nedohledány"}</dd><dt>Zástupce</dt><dd>{lead.representative || "Neznámý"}</dd><dt>Skóre</dt><dd><strong>{lead.commercialScore}/100</strong> · digitální {lead.digitalScore}/10</dd><dt>Web</dt><dd>{lead.web ? <><a href={websiteUrl(lead.web)} target="_blank" rel="noreferrer">Otevřít web ↗</a><small className="weekly-hours">{lead.webStatus}</small></> : <strong className="opportunity">Vlastní web nenalezen</strong>}</dd><dt>Objednání</dt><dd>{lead.onlineBooking}{lead.bookingSystem ? ` · ${lead.bookingSystem}` : ""}</dd><dt>Portál</dt><dd>{lead.patientPortal}</dd><dt>Noví pacienti</dt><dd>{lead.acceptsNewPatients}</dd><dt>Jistota</dt><dd>{lead.contactConfidence}</dd><dt>E-mail</dt><dd>{lead.email || "—"}</dd><dt>Mapy</dt><dd>{lead.googleMapsUrl ? <a href={lead.googleMapsUrl} target="_blank" rel="noreferrer">Otevřít hledání ↗</a> : "—"}</dd><dt>Pokusy</dt><dd>{lead.attempts}</dd></dl>
                <button className="primary-button full" onClick={() => setTab("record")}>Zapsat výsledek →</button>
              </aside>
            </div>
          )}

          {tab === "record" && (
            <div className="record-form">
              <div><p className="eyebrow">VÝSLEDEK HOVORU</p><h3>Co se stalo?</h3><p>Vyber nejpřesnější stav. U dalšího kroku vždy nastav datum.</p></div>
              <div className="outcome-grid">
                {statuses.filter((value) => value !== "Nevoláno").map((value) => <button key={value} className={outcome === value ? "selected" : ""} onClick={() => setOutcome(value)}><strong>{value}</strong><span>{outcomeHelp[value]}</span></button>)}
              </div>
              {(outcome === "Zavolat znovu" || outcome === "Poslat informace") && <label className="field"><span>Další kontakt</span><input type="datetime-local" value={followUp} onChange={(event) => setFollowUp(event.target.value)} /></label>}
              {outcome === "Schůzka" && <div className="meeting-fields"><label className="field"><span>Termín schůzky</span><input type="datetime-local" value={meetingAt} onChange={(event) => setMeetingAt(event.target.value)} /></label><label className="field"><span>Forma</span><select value={channel} onChange={(event) => setChannel(event.target.value as "Osobně" | "Online")}><option>Online</option><option>Osobně</option></select></label></div>}
              <label className="field"><span>Poznámka k hovoru</span><textarea rows={5} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Co ordinaci trápí, kdo rozhoduje, co poslat, co příště připomenout…" /></label>
              <div className="form-actions"><button className="ghost-button" onClick={onClose}>Zrušit</button><button className="primary-button" onClick={submit} disabled={outcome === "Schůzka" && !meetingAt}>Uložit výsledek</button></div>
            </div>
          )}

          {tab === "history" && (
            <div className="history-list">
              {!lead.logs.length && <div className="empty-state"><strong>Zatím bez historie.</strong><span>Po prvním hovoru se zde zobrazí výsledek a poznámka.</span></div>}
              {lead.logs.map((log) => <article key={log.id}><div><StatusPill status={log.outcome} /><time>{displayDate(log.at, true)}</time></div><p>{log.note || "Bez poznámky"}</p>{log.followUp && <small>Další kontakt: {displayDate(log.followUp, true)}</small>}{log.meetingAt && <small>Schůzka: {displayDate(log.meetingAt, true)} · {log.channel}</small>}</article>)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ScriptStep({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="script-step"><div className="step-heading"><span>{number}</span><h3>{title}</h3></div>{children}</section>;
}

function Playbook() {
  const [activeSpecialty, setActiveSpecialty] = useState<Specialty>("Praktik");
  const copy = specialtyCopy[activeSpecialty];
  return (
    <div className="page content-page">
      <section className="page-title"><p className="eyebrow">UČEBNICE PRO NOVÁČKA</p><h1>Jak vést dobrý hovor</h1><p>Tvůj úkol není uzavřít zakázku po telefonu. Tvůj úkol je zjistit, zda existuje problém, a domluvit další rozhovor.</p></section>
      <section className="principles">
        <article><span>01</span><h3>Zvědavost před výřečností</h3><p>Ptej se, poslouchej a používej klientova vlastní slova. Dobrý hovor není přednáška.</p></article>
        <article><span>02</span><h3>Web jako první</h3><p>Začni konkrétní službou, kterou umíme dodat nyní. MEDVISION zmiň až po zjištění zájmu.</p></article>
        <article><span>03</span><h3>Schůzka je výhra</h3><p>Telefon slouží k domluvení 20 minut osobně nebo online. Cena a řešení se zpřesní potom.</p></article>
      </section>
      <section className="manual-section">
        <div className="section-heading"><p className="eyebrow">SCÉNÁŘ PODLE OBORU</p><h2>Jedna nabídka, jiné důvody</h2></div>
        <div className="segment-tabs">{(["Praktik", "Pediatrie", "Gynekologie", "Stomatologie", "ORL"] as Specialty[]).map((value) => <button className={activeSpecialty === value ? "active" : ""} onClick={() => setActiveSpecialty(value)} key={value}>{value}</button>)}</div>
        <div className="segment-card"><p className="eyebrow">ÚVODNÍ HÁČEK</p><blockquote>„{copy.hook}“</blockquote><h3>Otázky, které otevřou rozhovor</h3><ul>{copy.questions.map((question) => <li key={question}>{question}</li>)}</ul></div>
      </section>
      <section className="manual-section"><div className="section-heading"><p className="eyebrow">NÁMITKY</p><h2>Neodrážej je. Pochop je.</h2><p>Nejdřív potvrď, že námitce rozumíš. Pak odpověz jednou myšlenkou a vrať rozhovor otázkou.</p></div><div className="objection-grid">{objections.map((item) => <details key={item.title}><summary>{item.title}<span>+</span></summary><p>{item.answer}</p></details>)}</div></section>
      <section className="manual-section danger-section"><div className="section-heading"><p className="eyebrow">HRANICE DŮVĚRY</p><h2>Co nikdy neslibovat</h2></div><ul>{forbiddenClaims.map((claim) => <li key={claim}>{claim}</li>)}</ul></section>
      <section className="manual-section"><div className="section-heading"><p className="eyebrow">NÁSLEDNÝ E-MAIL</p><h2>Po domluveném hovoru</h2></div><div className="email-template"><p>Předmět: Navázání na dnešní hovor — web ordinace</p><p>Dobrý den, pane doktore / paní doktorko,</p><p>děkuji za dnešní krátký rozhovor. Jak jsme se domluvili, rádi s vámi probereme, jak by mohl nový web lépe představit ordinaci a zjednodušit pacientům cestu k důležitým informacím.</p><p>Kompletní řešení zahrnuje vlastní vizuální identitu a brandbook, návrh webu, texty, grafiku, mobilní verzi, kontaktní či objednávkový formulář, základní SEO a napojení na Google. Rozpočet držíme do 50 000 Kč; hosting a doména jsou zvlášť.</p><p>Termín: [datum a čas]<br />Forma: [osobně / online]</p><p>S pozdravem<br />[jméno]<br />VELYOS</p></div></section>
    </div>
  );
}

function Offer() {
  return (
    <div className="page content-page">
      <section className="page-title"><p className="eyebrow">NABÍDKA PRO ORDINACE</p><h1>Co přesně prodáváme</h1><p>Začni webem, který můžeme dodat nyní. MEDVISION je navazující příležitost pro ordinace, které chtějí jít dál.</p></section>
      <section className="offer-hero"><div><p className="eyebrow">DIGITÁLNÍ IDENTITA ORDINACE</p><h2>Profesionální web<br />od značky po spuštění.</h2><p>Ne šablona s novým logem. Navrhneme jasnou digitální tvář ordinace a převedeme ji do webu, který je srozumitelný pacientům a snadno použitelný na mobilu.</p></div><div className="offer-price"><span>kompletní realizace</span><strong>do 50 000 Kč</strong><small>hosting a doména se účtují zvlášť</small></div></section>
      <section className="deliverables"><article><span>01</span><h3>Značka a brandbook</h3><p>Vlastní vizuální identita, barvy, typografie, logo a pravidla pro jednotné používání.</p></article><article><span>02</span><h3>Obsah a struktura</h3><p>Navrhneme, co má pacient najít, připravíme texty a logickou cestu k objednání či kontaktu.</p></article><article><span>03</span><h3>Web a mobil</h3><p>Grafický návrh, technická realizace, responzivní zobrazení a kontaktní nebo objednávkový formulář.</p></article><article><span>04</span><h3>Viditelnost</h3><p>Základní SEO, technické nastavení a propojení s profilem ordinace na Googlu.</p></article></section>
      <section className="medvision-section"><div className="medvision-label">MEDVISION / PILOT</div><div><p className="eyebrow">NAVAZUJÍCÍ PŘÍLEŽITOST</p><h2>Digitální asistent, který bere ordinaci administrativu.</h2><p>MEDVISION vzniká primárně pro praktické lékaře. Směřuje k objednávání, příjmu administrativních požadavků, připomínkám, AI telefonistce a jednomu přehledu pro sestru a lékaře. Citlivé zpracování je navržené lokálně v ordinaci; online služby používají jen nezbytnou zabezpečenou bránu.</p><p><strong>{pilotSentence()}</strong> Dalším zájemcům nabízíme přední místo v pilotu. U gynekologie a stomatologie nejprve ověřujeme jejich konkrétní workflow.</p></div></section>
      <section className="truth-grid"><article><h3>Co říkat nyní</h3><ul><li>„Připravujeme pilot a hledáme ordinace, které chtějí být u vývoje včas.“</li><li>„Nejdřív pochopíme váš provoz a teprve potom řešíme vhodné moduly.“</li><li>„AI připravuje administrativu, člověk ji kontroluje.“</li></ul></article><article><h3>Co je budoucí vize</h3><ul><li>AI zápis konzultace a hlubší napojení na ambulantní systém.</li><li>Specializované workflow pro gynekologii a stomatologii.</li><li>Postupná náhrada roztříštěných nástrojů jedním systémem.</li></ul></article></section>
    </div>
  );
}

export default App;
