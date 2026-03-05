import type { PPClass, PPClassType, ScheduleClass } from './types.js';

const BASE = 'https://api.pushpress.com/v3';

async function ppFetch<T>(path: string, apiKey: string, companyId: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'API-KEY': apiKey,
      'company-id': companyId,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PushPress API ${path} → ${res.status}: ${text}`);
  }
  const json = await res.json();
  // PP v3 wraps responses: { data: { resultArray: [...] } }
  if (json && typeof json === 'object' && 'data' in json) {
    const d = (json as Record<string, unknown>).data;
    if (d && typeof d === 'object' && 'resultArray' in d) {
      return (d as Record<string, unknown>).resultArray as T;
    }
    return d as T;
  }
  return json as T;
}

export async function getClasses(
  apiKey: string,
  companyId: string,
  opts: { limit?: number } = {}
): Promise<PPClass[]> {
  const params = new URLSearchParams({ order: 'ascending', limit: String(opts.limit ?? 200) });
  return ppFetch<PPClass[]>(`/classes?${params}`, apiKey, companyId);
}

export async function getClassTypes(apiKey: string, companyId: string): Promise<PPClassType[]> {
  return ppFetch<PPClassType[]>('/classes/types', apiKey, companyId);
}

// ── Transform raw PP classes into display-ready ScheduleClass objects ────────

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10); // "2026-03-06"
}

function formatDayLabel(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function transformClasses(
  classes: PPClass[],
  typeColors: Map<string, string>,
  fallbackColor: string,
  daysAhead = 7
): ScheduleClass[] {
  const cutoff = Math.floor(Date.now() / 1000) + daysAhead * 86400;

  return classes
    .filter(c => c.start <= cutoff)
    .map(c => {
      const title = c.title ?? c.classTypeName ?? 'Class';
      const typeName = c.classTypeName ?? null;
      const typeColor = (typeName && typeColors.get(typeName)) ?? fallbackColor;
      const durationMin = Math.round((c.end - c.start) / 60);

      return {
        id: c.id,
        title,
        typeName,
        typeColor,
        date: formatDate(c.start),
        dayLabel: formatDayLabel(c.start),
        timeStart: formatTime(c.start),
        timeEnd: formatTime(c.end),
        durationMin,
        location: c.location?.name ?? null,
      };
    });
}

export async function getSchedule(
  apiKey: string,
  companyId: string,
  primaryColor: string,
  daysAhead = 7
): Promise<ScheduleClass[]> {
  // Fetch all classes and filter client-side — PP API startsAfter param is unreliable
  const [classes, types] = await Promise.all([
    getClasses(apiKey, companyId, { limit: 200 }),
    getClassTypes(apiKey, companyId).catch(() => [] as PPClassType[]),
  ]);

  const typeColors = new Map<string, string>(
    types.filter(t => t.color).map(t => [t.name, t.color!])
  );

  return transformClasses(classes, typeColors, primaryColor, daysAhead);
}
