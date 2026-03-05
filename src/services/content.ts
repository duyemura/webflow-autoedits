// Simple Supabase content helpers used by agent tools
import { supabase } from './supabase/client.js';

const ALLOWED_TABLES = ['site_config', 'nav_items', 'pages', 'sections', 'items'] as const;
const ORDERED_TABLES = new Set(['nav_items', 'sections', 'items']);
type AllowedTable = typeof ALLOWED_TABLES[number];

function assertTable(table: string): AllowedTable {
  if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
    throw new Error(`Table "${table}" is not allowed. Must be one of: ${ALLOWED_TABLES.join(', ')}`);
  }
  return table as AllowedTable;
}

export async function getContent(siteId: string, table: string) {
  const t = assertTable(table);
  let query = supabase.from(t).select('*').eq('site_id', siteId);
  if (ORDERED_TABLES.has(t)) {
    query = query.order('order' as never, { ascending: true } as never);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function updateContent(siteId: string, table: string, id: string, fields: Record<string, unknown>) {
  const t = assertTable(table);
  const { data, error } = await supabase
    .from(t)
    .update(fields as never)
    .eq('id', id)
    .eq('site_id', siteId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Defaults applied when the AI omits required boolean/order fields
const TABLE_DEFAULTS: Partial<Record<AllowedTable, Record<string, unknown>>> = {
  nav_items: { visible: true, is_cta: false, order: 0 },
  sections:  { visible: true, order: 0 },
  items:     { visible: true, order: 0 },
};

export async function createContent(siteId: string, table: string, fields: Record<string, unknown>) {
  const t = assertTable(table);
  const defaults = TABLE_DEFAULTS[t] ?? {};
  const { data, error } = await supabase
    .from(t)
    .insert({ ...defaults, ...fields, site_id: siteId } as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteContent(siteId: string, table: string, id: string) {
  const t = assertTable(table);
  const { error } = await supabase
    .from(t)
    .delete()
    .eq('id', id)
    .eq('site_id', siteId);
  if (error) throw new Error(error.message);
  return { deleted: id };
}

export async function getSiteConfig(siteId: string) {
  const { data, error } = await supabase
    .from('site_config')
    .select('*')
    .eq('site_id', siteId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSiteConfig(siteId: string, fields: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('site_config')
    .update(fields as never)
    .eq('site_id', siteId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
