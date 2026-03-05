-- Grow Platform — MVP Schema
-- Run this in your Supabase SQL editor

-- ─────────────────────────────────────────
-- TEMPLATES
-- ─────────────────────────────────────────
create table templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  preview_image_url text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- SITES
-- ─────────────────────────────────────────
create table sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  subdomain text not null unique,
  custom_domain text unique,
  template_id uuid references templates(id),
  published boolean default false,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- SITE CONFIG
-- ─────────────────────────────────────────
create table site_config (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade unique,
  -- Branding
  name text,
  tagline text,
  logo_url text,
  logo_dark_url text,
  favicon_url text,
  -- Design tokens → compile to CSS :root vars
  primary_color text default '#E63946',
  secondary_color text default '#1D3557',
  accent_color text default '#457B9D',
  bg_color text default '#FFFFFF',
  text_color text default '#1A1A1A',
  font_heading text default 'Bebas Neue',
  font_body text default 'Inter',
  -- Contact
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip text,
  google_maps_url text,
  hours jsonb,
  -- Socials
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  youtube_url text,
  twitter_url text,
  -- Integrations
  booking_url text,
  schedule_embed_url text,
  social_proof_embed text
);

-- ─────────────────────────────────────────
-- NAV ITEMS
-- ─────────────────────────────────────────
create table nav_items (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  label text not null,
  url text not null,
  parent_id uuid references nav_items(id),
  "order" int default 0,
  visible boolean default true,
  is_cta boolean default false,
  cta_style text default 'primary'
);

-- ─────────────────────────────────────────
-- PAGES
-- ─────────────────────────────────────────
create table pages (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  slug text not null,
  title text,
  meta_description text,
  -- Hero
  hero_headline text,
  hero_subheading text,
  hero_image_url text,
  hero_cta_text text,
  hero_cta_url text,
  hero_secondary_cta_text text,
  hero_secondary_cta_url text,
  published boolean default true,
  unique(site_id, slug)
);

-- ─────────────────────────────────────────
-- SECTIONS
-- ─────────────────────────────────────────
create table sections (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  page_slug text not null,
  section_type text not null,
  "order" int default 0,
  visible boolean default true,
  heading text,
  subheading text,
  config jsonb
);

-- ─────────────────────────────────────────
-- ITEMS (universal content cards)
-- ─────────────────────────────────────────
create table items (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  section_id uuid references sections(id) on delete cascade,
  type text not null,
  title text,
  subtitle text,
  body text,
  short_body text,
  image_url text,
  icon_url text,
  cta_text text,
  cta_url text,
  "order" int default 0,
  visible boolean default true,
  metadata jsonb,
  pp_id text
);
