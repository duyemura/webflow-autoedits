// Lightweight hand-written types matching our schema.
// No codegen needed for MVP.

export interface Database {
  public: {
    Tables: {
      templates: { Row: Template; Insert: Omit<Template, 'id' | 'created_at'>; Update: Partial<Template> };
      sites: { Row: Site; Insert: Omit<Site, 'id' | 'created_at'>; Update: Partial<Site> };
      site_config: { Row: SiteConfig; Insert: Omit<SiteConfig, 'id'>; Update: Partial<SiteConfig> };
      nav_items: { Row: NavItem; Insert: Omit<NavItem, 'id'>; Update: Partial<NavItem> };
      pages: { Row: Page; Insert: Omit<Page, 'id'>; Update: Partial<Page> };
      sections: { Row: Section; Insert: Omit<Section, 'id'>; Update: Partial<Section> };
      items: { Row: Item; Insert: Omit<Item, 'id'>; Update: Partial<Item> };
    };
  };
}

export interface Template {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  preview_image_url: string | null;
  created_at: string;
}

export interface Site {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  custom_domain: string | null;
  template_id: string | null;
  published: boolean;
  created_at: string;
}

export interface SiteConfig {
  id: string;
  site_id: string;
  name: string | null;
  tagline: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  bg_color: string | null;
  text_color: string | null;
  font_heading: string | null;
  font_body: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  google_maps_url: string | null;
  hours: Record<string, string> | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  twitter_url: string | null;
  booking_url: string | null;
  schedule_embed_url: string | null;
  social_proof_embed: string | null;
  pp_api_key: string | null;
  pp_company_id: string | null;
}

export interface NavItem {
  id: string;
  site_id: string;
  label: string;
  url: string;
  parent_id: string | null;
  order: number;
  visible: boolean;
  is_cta: boolean;
  cta_style: string | null;
}

export interface Page {
  id: string;
  site_id: string;
  slug: string;
  title: string | null;
  meta_description: string | null;
  hero_headline: string | null;
  hero_subheading: string | null;
  hero_image_url: string | null;
  hero_cta_text: string | null;
  hero_cta_url: string | null;
  hero_secondary_cta_text: string | null;
  hero_secondary_cta_url: string | null;
  published: boolean;
}

export interface Section {
  id: string;
  site_id: string;
  page_slug: string;
  section_type: string;
  order: number;
  visible: boolean;
  heading: string | null;
  subheading: string | null;
  config: Record<string, unknown> | null;
}

export interface Item {
  id: string;
  site_id: string;
  section_id: string | null;
  type: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  short_body: string | null;
  image_url: string | null;
  icon_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  order: number;
  visible: boolean;
  metadata: Record<string, unknown> | null;
  pp_id: string | null;
}
