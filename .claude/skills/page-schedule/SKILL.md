---
name: page-schedule
description: Build the Schedule page. Always includes a live PushPress widget (shows real classes when connected, tasteful fallback if not). Static time highlights are always present as supporting context. The page works great without PushPress and gets better with it.
argument-hint: [siteId]
allowed-tools: Bash
---

The schedule page answers one question: "Can I actually fit this into my life?"

It does this in three layers, all built together:
1. **Live schedule widget** — shows today's and this week's classes with one-click booking (needs PushPress credentials; shows a graceful "call us" message if not connected yet)
2. **General time highlights** — static cards showing which time blocks exist (useful even when PP is live — gives context before the widget loads)
3. **Gym hours** — pulled from site_config, always visible

This is progressive enhancement. The page is complete without PushPress. When PP credentials are added later via `/sync-schedule`, the widget automatically starts showing live data — no rebuild needed.

---

## Phase 1: Read site state

```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"Use get_site_config to show me: booking_url, schedule_embed_url, pp_api_key, pp_company_id, hours, phone. Also use list_pages to check if a schedule page already exists.\"}]}"
```

From this determine:
- `BOOKING_URL` — for CTAs
- `PP_CONNECTED` — true if pp_api_key AND pp_company_id are both non-null
- `HAS_HOURS` — true if site_config.hours is populated
- Page exists? If so, ask before overwriting

---

## Phase 2: Build the page

```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"[see instructions below]\"}]}"
```

### Page hero

```
Create page: slug='schedule', title='Class Schedule',
  hero_headline='Find a Time That Works for You',
  hero_subheading='Classes 6 days a week, from early morning through evening. If you can find 45 minutes, we have a class for you.',
  hero_cta_text='Book a Free Intro', hero_cta_url=BOOKING_URL
```

### Section 1 — Live schedule widget (always include)

```
Create section: page_slug='schedule', section_type='schedule',
  heading='This Week\'s Classes', order=0, visible=true
```

No items, no config needed. The widget:
- If PP is connected → shows live classes grouped by day, color-coded by class type, with "Book →" on each card
- If PP not connected yet → shows: "Check back soon — we're setting up live class booking. In the meantime, call us at [phone] or see the times below."
- If PP API is down → shows a graceful "call us" fallback

### Section 2 — Time block highlights (always include)

```
Create section: page_slug='schedule', section_type='highlights',
  heading='When We Run Classes', order=1, items:
  - title: 'Early Mornings — 5:30 & 6:30am',
    short_body: 'For the ones who need to get it done before the day starts. Consistent group, tight-knit energy.'
  - title: 'Lunch Hour — 12:00pm',
    short_body: '45-minute format. In, out, back to work. Popular with the 9-to-5 crowd.'
  - title: 'Evening Classes — 5:30, 6:30 & 7:30pm',
    short_body: 'The biggest classes. High energy. Best for burning off the day.'
  - title: 'Saturday Community — 9:00am',
    short_body: 'Open to all levels. The most fun class of the week. Bring a friend.'
```

### Section 3 — Gym hours (always include)

```
Create section: page_slug='schedule', section_type='contact',
  heading='Gym Hours', order=2
```
No items needed — renders from site_config automatically.

### Section 4 — FAQ (if relevant)

Optional. Include if there are common schedule questions to address:
```
Create section: page_slug='schedule', section_type='faq',
  heading='Schedule Questions', order=3, items:
  - title: 'Do I need to book a class ahead of time?',
    body: 'We recommend it — classes do fill up, especially evenings. You can reserve at [BOOKING_URL]. Walk-ins are welcome if space allows.'
  - title: 'What if I miss a class?',
    body: 'No problem. Come to any class during the week. There\'s no attendance requirement.'
  - title: 'Can I try a class before committing?',
    body: 'Yes — your first class is completely free. No credit card, no commitment.'
```

### Section 5 — CTA band

```
Create section: page_slug='schedule', section_type='cta',
  heading='Ready to Reserve Your Spot?', order=4
```

### Nav item

```
Create nav_item: label='Schedule', url='/schedule', order=4, is_cta=false
```

---

## Phase 3: Test PP connection (if connected)

If `PP_CONNECTED` is true:

```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"Call test_pushpress_connection to verify live classes will appear on the schedule page.\"}]}"
```

---

## Phase 4: Rebuild

```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"Call rebuild_site.\"}]}"
```

---

## Phase 5: Report

```
SCHEDULE PAGE BUILT
====================

Sections:
  ✓ Live schedule widget (section_type: schedule)
  ✓ Time block highlights
  ✓ Gym hours
  ✓ CTA band

PushPress:
  [If PP_CONNECTED]:
    ✓ Connected — widget shows live classes
    Classes found: [N] in the next 7 days
  [If not connected]:
    ○ Not connected yet
    Widget shows a "call us" fallback until credentials are added.
    To connect: /sync-schedule $ARGUMENTS [api-key] [company-id]
    Or tell the AI: "My PushPress API key is sk_live_... and company ID is abc..."

Things to update:
  - Class time highlights — update with your actual schedule if different from defaults
  [If no hours in site_config]: Add gym hours to site_config for the hours section
```
