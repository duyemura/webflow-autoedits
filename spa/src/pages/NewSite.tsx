import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

// ── Types ─────────────────────────────────────────────────────────

interface GymInfo {
  name: string;
  tagline: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  primary_color: string;
}

interface PPCompany {
  id: string;
  name: string;
  subdomain: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  zip: string | null;
}

interface PPState {
  apiKey: string;
  company: PPCompany | null;
  error: string | null;
  verified: boolean;
}

// ── API calls ─────────────────────────────────────────────────────

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

async function createSite(payload: {
  name: string; tagline: string; city: string; state: string;
  phone: string; email: string; primary_color: string;
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

function Steps({ current }: { current: number }) {
  const labels = ["Your Gym", "PushPress", "Launch"];
  return (
    <div className="flex items-center gap-0 mb-10">
      {labels.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  done
                    ? "bg-green-500 text-white"
                    : active
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs mt-1 font-medium ${
                  active ? "text-blue-600" : done ? "text-green-600" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-1 mb-4 transition-colors ${
                  i < current ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Field component ───────────────────────────────────────────────

function Field({
  label, name, value, onChange, placeholder, type = "text", required, hint,
}: {
  label: string; name: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  type?: string; required?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ── Step 1: Gym basics ────────────────────────────────────────────

function StepGym({ data, onChange, onNext }: {
  data: GymInfo;
  onChange: (f: Partial<GymInfo>) => void;
  onNext: () => void;
}) {
  const canNext = data.name.trim().length > 0;

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Tell us about your gym</h2>
      <p className="text-sm text-gray-500 mb-6">This goes into your site — you can update anything later.</p>

      <div className="space-y-4">
        <Field label="Gym name" name="name" value={data.name} onChange={(v) => onChange({ name: v })}
          placeholder="Iron North CrossFit" required />
        <Field label="Tagline" name="tagline" value={data.tagline} onChange={(v) => onChange({ tagline: v })}
          placeholder="Where strength is built" hint="Short phrase shown in your header and footer" />

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
            <div className="relative">
              <input
                type="color"
                value={data.primary_color}
                onChange={(e) => onChange({ primary_color: e.target.value })}
                className="w-10 h-10 rounded-md cursor-pointer border border-gray-200 p-0.5 bg-white"
              />
            </div>
            <input
              type="text"
              value={data.primary_color}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange({ primary_color: v });
              }}
              className="w-28 px-3 py-2 border border-gray-200 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#E63946"
            />
            <span className="text-xs text-gray-400">Used for buttons, accents, and highlights</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          disabled={!canNext}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ── Step 2: PushPress ─────────────────────────────────────────────

function StepPushPress({ pp, onChange, onNext, onSkip }: {
  pp: PPState;
  onChange: (p: Partial<PPState>) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const verifyMutation = useMutation({
    mutationFn: () => verifyPP(pp.apiKey),
    onSuccess: (company) => {
      onChange({ company, error: null, verified: true });
    },
    onError: (err: Error) => {
      onChange({ company: null, error: err.message, verified: false });
    },
  });

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-xl font-bold">Connect PushPress</h2>
        <button onClick={onSkip} className="text-sm text-gray-400 hover:text-gray-600 mt-1">
          Skip for now →
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Optional. Connect your PushPress account to show a live class schedule on your website.
        You can add this later from your site settings.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PushPress API key</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={pp.apiKey}
              onChange={(e) => onChange({ apiKey: e.target.value, company: null, error: null, verified: false })}
              placeholder="sk_live_..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && pp.apiKey && verifyMutation.mutate()}
            />
            <button
              onClick={() => verifyMutation.mutate()}
              disabled={!pp.apiKey.trim() || verifyMutation.isPending}
              className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-900 disabled:opacity-40 transition-colors"
            >
              {verifyMutation.isPending ? "Verifying..." : "Verify"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Find this in PushPress → Settings → Integrations → API Keys
          </p>
        </div>

        {pp.error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <span className="text-red-500 text-sm">✕</span>
            <p className="text-sm text-red-600">{pp.error}</p>
          </div>
        )}

        {pp.verified && pp.company && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600 font-semibold text-sm">✓ Connected</span>
            </div>
            <p className="font-semibold text-gray-900">{pp.company.name}</p>
            {(pp.company.city || pp.company.state) && (
              <p className="text-sm text-gray-500 mt-0.5">
                {[pp.company.city, pp.company.state].filter(Boolean).join(", ")}
              </p>
            )}
            {pp.company.phone && <p className="text-sm text-gray-500">{pp.company.phone}</p>}
            <p className="text-xs text-gray-400 mt-2">
              Is this your gym? If not, check that you're using the correct API key.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={onSkip}
          className="px-4 py-2.5 text-gray-500 text-sm hover:text-gray-700"
        >
          Skip
        </button>
        <button
          onClick={onNext}
          disabled={pp.apiKey.trim().length > 0 && !pp.verified}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Template + Launch ──────────────────────────────────────

const TEMPLATES = [
  {
    slug: "bold",
    name: "Bold",
    description: "Full-width top navigation. High-energy hero section. Strong, modern gym aesthetic.",
    preview: "┌──────────────────┐\n│  LOGO  [NAV] [CTA]│\n│                  │\n│   BIG HEADLINE   │\n│   subheading     │\n│  [Button]        │\n└──────────────────┘",
  },
  {
    slug: "rail",
    name: "Rail",
    description: "Persistent left sidebar navigation. Clean, editorial layout. Works well for premium studios.",
    preview: "┌─────┬────────────┐\n│LOGO │ BIG         │\n│     │ HEADLINE   │\n│NAV  │            │\n│     │ subheading │\n│     │ [Button]   │\n└─────┴────────────┘",
  },
];

function StepLaunch({ template, onTemplate, onBack, onCreate, isCreating, gymName }: {
  template: string;
  onTemplate: (t: string) => void;
  onBack: () => void;
  onCreate: () => void;
  isCreating: boolean;
  gymName: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Choose a template</h2>
      <p className="text-sm text-gray-500 mb-6">You can switch templates at any time.</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {TEMPLATES.map((t) => (
          <button
            key={t.slug}
            onClick={() => onTemplate(t.slug)}
            className={`text-left p-4 border-2 rounded-lg transition-all ${
              template === t.slug
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{t.name}</span>
              {template === t.slug && (
                <span className="text-xs text-blue-600 font-medium">Selected</span>
              )}
            </div>
            <pre className="text-[9px] text-gray-400 font-mono leading-tight mb-2 bg-gray-50 p-2 rounded overflow-hidden">
              {t.preview}
            </pre>
            <p className="text-xs text-gray-500">{t.description}</p>
          </button>
        ))}
      </div>

      <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2">What gets built automatically:</p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>✓ Homepage with your branding and colors</li>
          <li>✓ Programs, About, Coaches, Schedule, Pricing, Contact pages</li>
          <li>✓ Free Trial landing page (no-distraction, single CTA)</li>
          <li>✓ Navigation with all pages linked</li>
          <li>✓ Live class schedule widget (if PushPress connected)</li>
        </ul>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2.5 text-gray-500 text-sm hover:text-gray-700">
          ← Back
        </button>
        <button
          onClick={onCreate}
          disabled={isCreating}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center gap-2"
        >
          {isCreating ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Creating {gymName}...
            </>
          ) : (
            `Build ${gymName || "My Site"} →`
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

const DEFAULT_GYM: GymInfo = {
  name: "", tagline: "", city: "", state: "", phone: "", email: "", primary_color: "#E63946",
};

const DEFAULT_PP: PPState = {
  apiKey: "", company: null, error: null, verified: false,
};

export function NewSite() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [gym, setGym] = useState<GymInfo>(DEFAULT_GYM);
  const [pp, setPP] = useState<PPState>(DEFAULT_PP);
  const [template, setTemplate] = useState("bold");
  const [createError, setCreateError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      createSite({
        ...gym,
        template_slug: template,
        pp_api_key: pp.verified && pp.apiKey ? pp.apiKey : undefined,
        pp_company_id: pp.verified && pp.company ? pp.company.id : undefined,
      }),
    onSuccess: ({ siteId }) => {
      navigate(`/sites/${siteId}?build=true`);
    },
    onError: (err: Error) => {
      setCreateError(err.message);
    },
  });

  // If PP was verified, pre-fill gym info from company data
  const handlePPVerified = (update: Partial<PPState>) => {
    setPP((prev) => ({ ...prev, ...update }));
    if (update.company) {
      setGym((prev) => ({
        ...prev,
        name: prev.name || update.company!.name,
        city: prev.city || update.company!.city || "",
        state: prev.state || update.company!.state || "",
        phone: prev.phone || update.company!.phone || "",
        email: prev.email || update.company!.email || "",
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">← Back</Link>
          <span className="text-sm font-semibold text-gray-700">New Site</span>
          <span className="w-12" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <Steps current={step} />

          {step === 0 && (
            <StepGym
              data={gym}
              onChange={(f) => setGym((prev) => ({ ...prev, ...f }))}
              onNext={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <StepPushPress
              pp={pp}
              onChange={handlePPVerified}
              onNext={() => setStep(2)}
              onSkip={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <>
              <StepLaunch
                template={template}
                onTemplate={setTemplate}
                onBack={() => setStep(1)}
                onCreate={() => {
                  setCreateError(null);
                  createMutation.mutate();
                }}
                isCreating={createMutation.isPending}
                gymName={gym.name}
              />
              {createError && (
                <p className="mt-3 text-sm text-red-500 text-right">{createError}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
