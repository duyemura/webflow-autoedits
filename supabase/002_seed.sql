-- Grow Platform — Seed Data
-- Two demo gyms: Iron Forge CrossFit (Austin TX) + Peak Performance (Denver CO)

-- ─────────────────────────────────────────
-- TEMPLATES
-- ─────────────────────────────────────────
insert into templates (id, name, slug, description) values
  ('00000000-0000-0000-0000-000000000001', 'Bold', 'bold', 'High-energy, full-bleed hero, strong typography. Great for CrossFit and HIIT gyms.'),
  ('00000000-0000-0000-0000-000000000002', 'Clean', 'clean', 'Minimal, white-space-heavy, professional. Great for personal training and yoga studios.');

-- ─────────────────────────────────────────
-- SITES
-- ─────────────────────────────────────────
insert into sites (id, name, slug, subdomain, custom_domain, template_id, published) values
  (
    '00000000-0000-0000-0001-000000000001',
    'Iron Forge CrossFit',
    'iron-forge',
    'ironforge',
    null,
    '00000000-0000-0000-0000-000000000001',
    true
  ),
  (
    '00000000-0000-0000-0001-000000000002',
    'Peak Performance',
    'peak-performance',
    'peakperformance',
    null,
    '00000000-0000-0000-0000-000000000001',
    true
  );

-- ─────────────────────────────────────────
-- SITE CONFIG — Iron Forge
-- ─────────────────────────────────────────
insert into site_config (
  site_id, name, tagline,
  primary_color, secondary_color, accent_color, bg_color, text_color,
  font_heading, font_body,
  phone, email, address, city, state, zip, google_maps_url,
  hours,
  facebook_url, instagram_url, tiktok_url,
  booking_url
) values (
  '00000000-0000-0000-0001-000000000001',
  'Iron Forge CrossFit',
  'Forged in Austin. Built to Last.',
  '#C0392B', '#1A1A2E', '#E74C3C', '#0D0D0D', '#F5F5F5',
  'Bebas Neue', 'Inter',
  '(512) 555-0142', 'hello@ironforge.com',
  '2401 E Cesar Chavez St', 'Austin', 'TX', '78702',
  'https://maps.google.com/?q=2401+E+Cesar+Chavez+St+Austin+TX',
  '{"mon": "5:30am–8pm", "tue": "5:30am–8pm", "wed": "5:30am–8pm", "thu": "5:30am–8pm", "fri": "5:30am–7pm", "sat": "8am–11am", "sun": "9am–11am"}',
  'https://facebook.com/ironforge', 'https://instagram.com/ironforge', 'https://tiktok.com/@ironforge',
  'https://calendly.com/ironforge/discovery'
);

-- ─────────────────────────────────────────
-- SITE CONFIG — Peak Performance
-- ─────────────────────────────────────────
insert into site_config (
  site_id, name, tagline,
  primary_color, secondary_color, accent_color, bg_color, text_color,
  font_heading, font_body,
  phone, email, address, city, state, zip, google_maps_url,
  hours,
  instagram_url,
  booking_url
) values (
  '00000000-0000-0000-0001-000000000002',
  'Peak Performance',
  'Train High. Live Higher.',
  '#2980B9', '#1C1C3A', '#27AE60', '#FAFAFA', '#1A1A1A',
  'Montserrat', 'Source Sans Pro',
  '(720) 555-0198', 'info@peakperformancegym.com',
  '1600 Wazee St', 'Denver', 'CO', '80202',
  'https://maps.google.com/?q=1600+Wazee+St+Denver+CO',
  '{"mon": "6am–9pm", "tue": "6am–9pm", "wed": "6am–9pm", "thu": "6am–9pm", "fri": "6am–8pm", "sat": "7am–12pm", "sun": "8am–12pm"}',
  'https://instagram.com/peakperformancegym',
  'https://calendly.com/peakperformance/discovery'
);

-- ─────────────────────────────────────────
-- NAV ITEMS — Iron Forge
-- ─────────────────────────────────────────
insert into nav_items (site_id, label, url, "order", is_cta, cta_style) values
  ('00000000-0000-0000-0001-000000000001', 'Programs', '/programs', 1, false, null),
  ('00000000-0000-0000-0001-000000000001', 'About', '/about', 2, false, null),
  ('00000000-0000-0000-0001-000000000001', 'Schedule', '/schedule', 3, false, null),
  ('00000000-0000-0000-0001-000000000001', 'Pricing', '/pricing', 4, false, null),
  ('00000000-0000-0000-0001-000000000001', 'Try Free', '/free-trial', 5, true, 'primary');

-- NAV ITEMS — Peak Performance
insert into nav_items (site_id, label, url, "order", is_cta, cta_style) values
  ('00000000-0000-0000-0001-000000000002', 'Training', '/training', 1, false, null),
  ('00000000-0000-0000-0001-000000000002', 'Coaches', '/coaches', 2, false, null),
  ('00000000-0000-0000-0001-000000000002', 'Schedule', '/schedule', 3, false, null),
  ('00000000-0000-0000-0001-000000000002', 'Pricing', '/pricing', 4, false, null),
  ('00000000-0000-0000-0001-000000000002', 'Book a Call', '/book', 5, true, 'primary');

-- ─────────────────────────────────────────
-- PAGES — Iron Forge homepage
-- ─────────────────────────────────────────
insert into pages (
  site_id, slug, title, meta_description,
  hero_headline, hero_subheading, hero_image_url,
  hero_cta_text, hero_cta_url,
  hero_secondary_cta_text, hero_secondary_cta_url
) values (
  '00000000-0000-0000-0001-000000000001',
  'home', 'Iron Forge CrossFit — Austin TX',
  'Austin''s most dedicated CrossFit gym. Expert coaching, tight-knit community, results that last.',
  'Stop Working Out. Start Training.',
  'Expert coaches. Real community. Results you can measure. Located in East Austin.',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600',
  'Start Your Free Trial', '/free-trial',
  'See Our Programs', '/programs'
);

-- PAGES — Peak Performance homepage
insert into pages (
  site_id, slug, title, meta_description,
  hero_headline, hero_subheading, hero_image_url,
  hero_cta_text, hero_cta_url,
  hero_secondary_cta_text, hero_secondary_cta_url
) values (
  '00000000-0000-0000-0001-000000000002',
  'home', 'Peak Performance — Denver CO',
  'Denver''s premier functional fitness gym. Science-backed training, elite coaching.',
  'Your Best Performance Starts Here.',
  'Science-backed programming. Elite coaching. Downtown Denver''s top training facility.',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600',
  'Book a Free Discovery Call', '/book',
  'View Training Options', '/training'
);

-- ─────────────────────────────────────────
-- SECTIONS — Iron Forge homepage
-- ─────────────────────────────────────────
with site as (select '00000000-0000-0000-0001-000000000001'::uuid as id)
insert into sections (id, site_id, page_slug, section_type, "order", heading, subheading) values
  ('10000000-0000-0000-0000-000000000001', (select id from site), 'home', 'highlights',  1, 'Why Iron Forge?', null),
  ('10000000-0000-0000-0000-000000000002', (select id from site), 'home', 'programs',    2, 'Our Programs', 'Find the right fit for your goals'),
  ('10000000-0000-0000-0000-000000000003', (select id from site), 'home', 'steps',       3, 'Getting Started is Easy', 'Three steps to your first class'),
  ('10000000-0000-0000-0000-000000000004', (select id from site), 'home', 'features',    4, 'Everything You Need', 'Included with every membership'),
  ('10000000-0000-0000-0000-000000000005', (select id from site), 'home', 'faq',         5, 'Common Questions', null),
  ('10000000-0000-0000-0000-000000000006', (select id from site), 'home', 'cta',         6, 'The hardest step is always the first step.', null);

-- SECTIONS — Peak Performance homepage
with site as (select '00000000-0000-0000-0001-000000000002'::uuid as id)
insert into sections (id, site_id, page_slug, section_type, "order", heading, subheading) values
  ('20000000-0000-0000-0000-000000000001', (select id from site), 'home', 'highlights',  1, 'The Peak Difference', null),
  ('20000000-0000-0000-0000-000000000002', (select id from site), 'home', 'programs',    2, 'Training Options', 'From beginner to elite'),
  ('20000000-0000-0000-0000-000000000003', (select id from site), 'home', 'steps',       3, 'How It Works', 'Simple onboarding, serious results'),
  ('20000000-0000-0000-0000-000000000004', (select id from site), 'home', 'features',    4, 'World-Class Facility', null),
  ('20000000-0000-0000-0000-000000000005', (select id from site), 'home', 'faq',         5, 'FAQs', null),
  ('20000000-0000-0000-0000-000000000006', (select id from site), 'home', 'cta',         6, 'Ready to find your peak?', null);

-- ─────────────────────────────────────────
-- ITEMS — Iron Forge
-- ─────────────────────────────────────────

-- Highlights
insert into items (site_id, section_id, type, title, short_body, "order") values
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000001', 'highlight', 'Coach-Led Every Class', 'No guessing, no wandering. Every session is programmed and led by a certified coach.', 1),
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000001', 'highlight', 'Scales to Any Level', 'Never done CrossFit? Perfect. Every movement can be scaled to meet you where you are.', 2),
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000001', 'highlight', 'Real Community', 'Members who know your name, coaches who track your progress. Not just a gym — a crew.', 3);

-- Programs
insert into items (site_id, section_id, type, title, short_body, image_url, cta_text, cta_url, "order") values
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000002', 'program', 'CrossFit', 'Strength, conditioning, and community in one hour. Coached classes for all levels.', 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800', 'Learn More', '/programs/crossfit', 1),
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000002', 'program', 'Bootcamp', 'High-energy circuit training. Burn more, rest less. No barbell required.', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'Learn More', '/programs/bootcamp', 2),
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000002', 'program', 'Personal Training', '1-on-1 coaching tailored to your goals, schedule, and movement history.', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800', 'Learn More', '/programs/personal-training', 3);

-- Steps
insert into items (site_id, section_id, type, title, short_body, "order", metadata) values
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000003', 'step', 'Book a Free Call', 'A 15-minute chat with a coach to answer your questions and find the right program.', 1, '{"step_number": 1}'),
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000003', 'step', 'Try Your First Class', 'Come in, meet the team, get moving. No commitment, no pressure.', 2, '{"step_number": 2}'),
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000003', 'step', 'Pick Your Membership', 'Choose the plan that fits. Month-to-month, no long-term contracts.', 3, '{"step_number": 3}');

-- Features
insert into items (site_id, section_id, type, title, short_body, "order") values
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000004', 'feature', 'Members App', 'Book classes, track PRs, and stay connected — all from your phone.', 1),
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000004', 'feature', 'Open Gym Hours', 'Early mornings, evenings, weekends. Fit training into your life.', 2),
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000004', 'feature', 'Nutrition Guidance', 'Coaches available for basic nutrition support — no fad diets, just real food.', 3),
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000004', 'feature', 'Progress Tracking', 'We log your lifts, your times, your results. See how far you''ve come.', 4);

-- FAQs
insert into items (site_id, section_id, type, title, body, "order") values
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000005', 'faq', 'Do I need experience to start CrossFit?', 'No experience required. Every class is coached and every movement can be scaled to your current level. Most of our members started from zero.', 1),
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000005', 'faq', 'How many days a week should I train?', 'We recommend 3–4 days for most beginners. Your coach will help you build a schedule that drives results without burning you out.', 2),
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000005', 'faq', 'What does a typical class look like?', 'A 60-minute coached session: warm-up, skill or strength work, the WOD (workout of the day), and a cool-down. No two days are the same.', 3),
  ('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000005', 'faq', 'How much does membership cost?', 'Memberships start at $149/month for unlimited classes. We also offer drop-in passes and trial packages. See our pricing page for full details.', 4);

-- ─────────────────────────────────────────
-- ITEMS — Peak Performance
-- ─────────────────────────────────────────

-- Highlights
insert into items (site_id, section_id, type, title, short_body, "order") values
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000001', 'highlight', 'Science-Backed Programming', 'Every workout is built on periodization principles — not random. Your body adapts, your results compound.', 1),
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000001', 'highlight', 'Elite Coaches', 'Our coaches hold advanced certifications and treat continuing education as non-negotiable.', 2),
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000001', 'highlight', 'Downtown Denver Location', 'Prime LoDo location. Walk, bike, or hop off the light rail. Easy parking after 5pm.', 3);

-- Programs
insert into items (site_id, section_id, type, title, short_body, image_url, cta_text, cta_url, "order") values
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000002', 'program', 'Group Fitness', 'Structured classes for all fitness levels. Community energy, individualized coaching.', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800', 'Learn More', '/training/group', 1),
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000002', 'program', 'Strength & Conditioning', 'Barbell-focused programming for athletes who want to move more weight and move better.', 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800', 'Learn More', '/training/strength', 2),
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000002', 'program', '1-on-1 Coaching', 'Your schedule, your goals, your coach. The most direct path to your peak.', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800', 'Learn More', '/training/private', 3);

-- Steps
insert into items (site_id, section_id, type, title, short_body, "order", metadata) values
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000003', 'step', 'Schedule a Discovery Call', 'Tell us your goals, history, and schedule. We''ll map out the right program together.', 1, '{"step_number": 1}'),
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000003', 'step', 'Complete Your Assessment', 'Movement screen with a coach. Takes 45 minutes. Tells us everything we need to build your plan.', 2, '{"step_number": 2}'),
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000003', 'step', 'Start Training', 'Your program is ready. Show up, do the work, track the results.', 3, '{"step_number": 3}');

-- Features
insert into items (site_id, section_id, type, title, short_body, "order") values
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000004', 'feature', '10,000 sq ft Facility', 'Full rig, competition platform, turf lane, sled track, and dedicated recovery zone.', 1),
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000004', 'feature', 'Performance Tracking', 'Integrated app logs every lift, every WOD, every PR. Data you can actually use.', 2),
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000004', 'feature', 'Recovery Suite', 'Cold plunge, sauna, and massage gun station. Recovery is part of the program.', 3),
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000004', 'feature', 'Flexible Scheduling', 'Classes from 5:30am to 8pm weekdays. Weekend morning sessions. Life happens — we flex with you.', 4);

-- FAQs
insert into items (site_id, section_id, type, title, body, "order") values
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000005', 'faq', 'Is Peak Performance right for beginners?', 'Absolutely. We train everyone from first-timers to competitive athletes. Your starting point doesn''t matter — your commitment does.', 1),
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000005', 'faq', 'What makes your programming different?', 'We follow proven periodization models — not random daily WODs. You build strength, conditioning, and skill systematically over 12-week cycles.', 2),
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000005', 'faq', 'Do I need to do the assessment?', 'Yes. It''s not optional and it''s not a test — it''s how we make sure your program is right for your body. Takes 45 minutes and it''s free.', 3),
  ('00000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000005', 'faq', 'What are your membership options?', 'Group memberships start at $159/month. Private coaching packages are available. All memberships are month-to-month.', 4);
