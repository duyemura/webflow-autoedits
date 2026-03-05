import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
// Inline type — mirrors ScrapeResult from src/api/routes/scrape.ts
interface ScrapeResult {
  name?: string; tagline?: string; city?: string; state?: string; zip?: string;
  phone?: string; email?: string; address?: string; primary_color?: string;
  instagram_url?: string; facebook_url?: string; tiktok_url?: string; youtube_url?: string;
  booking_url?: string; hours?: Record<string, string>;
  programs?: { name: string; description: string }[];
  coaches?: { name: string; role: string; bio?: string }[];
  raw_summary?: string;
}

// ── Types ─────────────────────────────────────────────────────────

type Phase = "url" | "details" | "pushpress" | "launch";

interface GymInfo {
  name: string; tagline: string; city: string; state: string;
  phone: string; email: string; primary_color: string;
}

interface PPCompany {
  id: string; name: string; subdomain: string;
  phone: string | null; email: string | null;
  city: string | null; state: string | null;
}

interface PPState {
  apiKey: string; company: PPCompany | null; error: string | null; verified: boolean;
}

// ── API helpers ───────────────────────────────────────────────────

async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const res = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Scrape failed");
  return data;
}

async function verifyPP(apiKey: string): Promise<PPCompany> {
  const res = await fetch("/api/pushpress/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Verification failed");
  return data;
}

async function createSite(payload: GymInfo & {
  template_slug: string; pp_api_key?: string; pp_company_id?: string;
}): Promise<{ siteId: string }> {
  const res = await fetch("/api/sites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to create site");
  return data;
}

// ── Step indicator ────────────────────────────────────────────────

const STEP_LABELS = ["Details", "PushPress", "Launch"];
const PHASE_INDEX: Record<Phase, number> = { url: -1, details: 0, pushpress: 1, launch: 2 };

function Steps({ phase }: { phase: Phase }) {
  const current = PHASE_INDEX[phase];
  if (current < 0) return null;
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEP_LABELS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                done ? "bg-green-500 text-white" : active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
              }`}>
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-xs mt-1 font-medium ${
                active ? "text-blue-600" : done ? "text-green-600" : "text-gray-400"
              }`}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`w-14 h-0.5 mx-1 mb-4 transition-colors ${i < current ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────

function Field({ label, name, value, onChange, placeholder, type = "text", required, hint }: {
  label: string; name: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input type={type} name={name} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ── Phase 0: URL entry ────────────────────────────────────────────

function PhaseUrl({ onScraped, onManual }: {
  onScraped: (data: ScrapeResult) => void;
  onManual: () => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const scrapeMutation = useMutation({
    mutationFn: () => scrapeUrl(url),
    onSuccess: (data) => onScraped(data),
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    scrapeMutation.mutate();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Do you have an existing website?</h2>
      <p className="text-sm text-gray-500 mb-6">
        Enter your URL and we'll pull in your name, location, programs, coaches, and colors automatically.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            placeholder="yourgym.com"
            disabled={scrapeMutation.isPending}
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
            autoFocus
          />
          <button
            type="submit"
            disabled={!url.trim() || scrapeMutation.isPending}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            {scrapeMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                Scanning...
              </span>
            ) : "Import →"}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
            {error}
          </div>
        )}
      </form>

      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-400 mb-3">No website yet?</p>
        <button
          onClick={onManual}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Fill in details manually →
        </button>
      </div>
    </div>
  );
}

// ── Phase 1: Gym details ──────────────────────────────────────────

function PhaseDetails({ data, onChange, onNext, scraped }: {
  data: GymInfo;
  onChange: (f: Partial<GymInfo>) => void;
  onNext: () => void;
  scraped: ScrapeResult | null;
}) {
  const canNext = data.name.trim().length > 0;

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Your gym details</h2>
      <p className="text-sm text-gray-500 mb-1">
        {scraped ? "We pre-filled what we found — review and adjust anything before continuing." : "Tell us about your gym. You can update anything later."}
      </p>

      {scraped && (
        <div className="mb-5 p-3 bg-blue-50 border border-blue-100 rounded-md text-xs text-blue-700 flex items-start gap-2">
          <span>✓</span>
          <span>
            Imported from your site.
            {scraped.programs?.length ? ` Found ${scraped.programs.length} program${scraped.programs.length !== 1 ? "s" : ""}.` : ""}
            {scraped.coaches?.length ? ` Found ${scraped.coaches.length} coach${scraped.coaches.length !== 1 ? "es" : ""}.` : ""}
            {" "}All content will be used to build your pages.
          </span>
        </div>
      )}

      <div className="space-y-4">
        <Field label="Gym name" name="name" value={data.name} onChange={(v) => onChange({ name: v })}
          placeholder="Iron North CrossFit" required />
        <Field label="Tagline" name="tagline" value={data.tagline} onChange={(v) => onChange({ tagline: v })}
          placeholder="Where strength is built" hint="Short phrase used in your header and footer" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" name="city" value={data.city} onChange={(v) => onChange({ city: v })} placeholder="Minneapolis" />
          <Field label="State" name="state" value={data.state} onChange={(v) => onChange({ state: v })} placeholder="MN" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone" name="phone" value={data.phone} onChange={(v) => onChange({ phone: v })} placeholder="(612) 555-1234" type="tel" />
          <Field label="Email" name="email" value={data.email} onChange={(v) => onChange({ email: v })} placeholder="hello@gym.com" type="email" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={data.primary_color} onChange={(e) => onChange({ primary_color: e.target.value })}
              className="w-10 h-10 rounded-md cursor-pointer border border-gray-200 p-0.5 bg-white" />
            <input type="text" value={data.primary_color}
              onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange({ primary_color: e.target.value }); }}
              className="w-28 px-3 py-2 border border-gray-200 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#E63946" />
            <span className="text-xs text-gray-400">Buttons, accents, highlights</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button onClick={onNext} disabled={!canNext}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
          Next →
        </button>
      </div>
    </div>
  );
}

// ── Phase 2: PushPress ────────────────────────────────────────────

function PhasePushPress({ pp, onChange, onNext, onSkip }: {
  pp: PPState; onChange: (p: Partial<PPState>) => void; onNext: () => void; onSkip: () => void;
}) {
  const verifyMutation = useMutation({
    mutationFn: () => verifyPP(pp.apiKey),
    onSuccess: (company) => onChange({ company, error: null, verified: true }),
    onError: (err: Error) => onChange({ company: null, error: err.message, verified: false }),
  });

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-xl font-bold">Connect PushPress</h2>
        <button onClick={onSkip} className="text-sm text-gray-400 hover:text-gray-600 mt-1">Skip →</button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Optional. Your schedule page will show live classes automatically when connected.
        You can add this later from the site chat.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PushPress API key</label>
          <div className="flex gap-2">
            <input type="password" value={pp.apiKey}
              onChange={(e) => onChange({ apiKey: e.target.value, company: null, error: null, verified: false })}
              placeholder="sk_live_..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && pp.apiKey && verifyMutation.mutate()} />
            <button onClick={() => verifyMutation.mutate()}
              disabled={!pp.apiKey.trim() || verifyMutation.isPending}
              className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-900 disabled:opacity-40 transition-colors">
              {verifyMutation.isPending ? "Verifying..." : "Verify"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">PushPress → Settings → Integrations → API Keys</p>
        </div>

        {pp.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">{pp.error}</div>
        )}

        {pp.verified && pp.company && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600 font-semibold text-sm">✓ Connected</span>
            </div>
            <p className="font-semibold text-gray-900">{pp.company.name}</p>
            {(pp.company.city || pp.company.state) && (
              <p className="text-sm text-gray-500 mt-0.5">{[pp.company.city, pp.company.state].filter(Boolean).join(", ")}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">Is this your gym? If not, check you're using the correct API key.</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button onClick={onSkip} className="px-4 py-2.5 text-gray-500 text-sm hover:text-gray-700">Skip</button>
        <button onClick={onNext} disabled={pp.apiKey.trim().length > 0 && !pp.verified}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
          Next →
        </button>
      </div>
    </div>
  );
}

// ── Phase 3: Template + Launch ─────────────────────────────────────

const TEMPLATES = [
  {
    slug: "bold", name: "Bold",
    description: "Full-width top nav. High-energy hero. Strong, modern gym aesthetic.",
    preview: "┌──────────────────┐\n│ LOGO  [NAV] [CTA] │\n│                  │\n│  BIG HEADLINE    │\n│  subheading      │\n│  [Button]        │\n└──────────────────┘",
  },
  {
    slug: "rail", name: "Rail",
    description: "Persistent left sidebar nav. Clean, editorial layout. Great for premium studios.",
    preview: "┌─────┬────────────┐\n│LOGO │ BIG        │\n│     │ HEADLINE   │\n│NAV  │            │\n│     │ subheading │\n│     │ [Button]   │\n└─────┴────────────┘",
  },
];

function PhaseLaunch({ template, onTemplate, onBack, onCreate, isCreating, gymName, hasScrape }: {
  template: string; onTemplate: (t: string) => void; onBack: () => void;
  onCreate: () => void; isCreating: boolean; gymName: string; hasScrape: boolean;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Choose a template</h2>
      <p className="text-sm text-gray-500 mb-6">You can switch templates at any time.</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {TEMPLATES.map((t) => (
          <button key={t.slug} onClick={() => onTemplate(t.slug)}
            className={`text-left p-4 border-2 rounded-lg transition-all ${
              template === t.slug ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{t.name}</span>
              {template === t.slug && <span className="text-xs text-blue-600 font-medium">Selected</span>}
            </div>
            <pre className="text-[9px] text-gray-400 font-mono leading-tight mb-2 bg-gray-50 p-2 rounded overflow-hidden">{t.preview}</pre>
            <p className="text-xs text-gray-500">{t.description}</p>
          </button>
        ))}
      </div>

      <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg mb-6 text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-700 mb-1.5">What gets built:</p>
        <p>✓ Homepage with your branding and colors</p>
        <p>✓ Programs, About, Coaches, Schedule, Pricing, Contact, Free Trial pages</p>
        {hasScrape && <p>✓ Your existing programs and coaches used for real content</p>}
        <p>✓ Navigation with all pages linked</p>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2.5 text-gray-500 text-sm hover:text-gray-700">← Back</button>
        <button onClick={onCreate} disabled={isCreating}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center gap-2">
          {isCreating ? (
            <>
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Creating...
            </>
          ) : `Build ${gymName || "My Site"} →`}
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

const DEFAULT_GYM: GymInfo = { name: "", tagline: "", city: "", state: "", phone: "", email: "", primary_color: "#E63946" };
const DEFAULT_PP: PPState = { apiKey: "", company: null, error: null, verified: false };

function scrapedToGym(s: ScrapeResult): Partial<GymInfo> {
  return {
    name: s.name ?? "",
    tagline: s.tagline ?? "",
    city: s.city ?? "",
    state: s.state ?? "",
    phone: s.phone ?? "",
    email: s.email ?? "",
    primary_color: s.primary_color ?? "#E63946",
  };
}

function buildScrapeSummary(s: ScrapeResult): string {
  const parts: string[] = [];
  if (s.raw_summary) parts.push(s.raw_summary);
  if (s.programs?.length) {
    parts.push(`Programs offered: ${s.programs.map(p => `${p.name}${p.description ? ` — ${p.description}` : ""}`).join("; ")}`);
  }
  if (s.coaches?.length) {
    parts.push(`Coaches: ${s.coaches.map(c => `${c.name} (${c.role})${c.bio ? `: ${c.bio}` : ""}`).join("; ")}`);
  }
  if (s.hours && Object.keys(s.hours).length) {
    parts.push(`Hours: ${Object.entries(s.hours).map(([d, h]) => `${d} ${h}`).join(", ")}`);
  }
  if (s.booking_url) parts.push(`Booking URL: ${s.booking_url}`);
  return parts.join("\n\n");
}

export function NewSite() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("url");
  const [gym, setGym] = useState<GymInfo>(DEFAULT_GYM);
  const [pp, setPP] = useState<PPState>(DEFAULT_PP);
  const [template, setTemplate] = useState("bold");
  const [scraped, setScraped] = useState<ScrapeResult | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleScraped = (data: ScrapeResult) => {
    setScraped(data);
    setGym((prev) => ({ ...DEFAULT_GYM, ...prev, ...scrapedToGym(data) }));
    // Pre-fill social links from scraped data if PP not yet set
    setPhase("details");
  };

  const createMutation = useMutation({
    mutationFn: () => createSite({
      ...gym,
      template_slug: template,
      pp_api_key: pp.verified && pp.apiKey ? pp.apiKey : undefined,
      pp_company_id: pp.verified && pp.company ? pp.company.id : undefined,
    }),
    onSuccess: ({ siteId }) => {
      const scrapeSummary = scraped ? buildScrapeSummary(scraped) : null;
      navigate(`/sites/${siteId}?build=true`, { state: { scrapeSummary } });
    },
    onError: (err: Error) => setCreateError(err.message),
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">← Back</Link>
          <span className="text-sm font-semibold text-gray-700">New Site</span>
          <span className="w-12" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <Steps phase={phase} />

          {phase === "url" && (
            <PhaseUrl onScraped={handleScraped} onManual={() => setPhase("details")} />
          )}

          {phase === "details" && (
            <PhaseDetails
              data={gym}
              onChange={(f) => setGym((p) => ({ ...p, ...f }))}
              onNext={() => setPhase("pushpress")}
              scraped={scraped}
            />
          )}

          {phase === "pushpress" && (
            <PhasePushPress
              pp={pp}
              onChange={(u) => setPP((p) => ({ ...p, ...u }))}
              onNext={() => setPhase("launch")}
              onSkip={() => setPhase("launch")}
            />
          )}

          {phase === "launch" && (
            <>
              <PhaseLaunch
                template={template}
                onTemplate={setTemplate}
                onBack={() => setPhase("pushpress")}
                onCreate={() => { setCreateError(null); createMutation.mutate(); }}
                isCreating={createMutation.isPending}
                gymName={gym.name}
                hasScrape={!!scraped?.programs?.length}
              />
              {createError && <p className="mt-3 text-sm text-red-500 text-right">{createError}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
