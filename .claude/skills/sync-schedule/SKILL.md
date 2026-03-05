---
name: sync-schedule
description: Connect PushPress to the schedule page. Saves API credentials, tests the connection, ensures the schedule section exists, and rebuilds the site so live classes appear automatically.
argument-hint: [siteId] [pp_api_key] [pp_company_id?]
allowed-tools: Bash
---

You are connecting this gym's website to their live PushPress class schedule.

After setup, the schedule page will show real classes that update automatically — no rebuild required when classes change. Classes are color-coded by type, grouped by day, with a direct "Book" link on each card.

## Arguments

- `$ARGUMENTS[0]` — siteId (required)
- `$ARGUMENTS[1]` — PushPress API key (optional — if not provided, ask the AI to get it from site_config or prompt the user)
- `$ARGUMENTS[2]` — PushPress company ID (optional — same)

If arguments are missing, read from site_config first to see if they're already saved.

---

## Phase 1: Read current state

```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS[0]\", \"messages\": [{\"role\": \"user\", \"content\": \"Use get_site_config to show me: current pp_api_key, pp_company_id, booking_url, and whether a schedule page exists. Also use get_content for sections to check if there's already a section_type='schedule' on the schedule page.\"}]}"
```

From this, determine:
- Are `pp_api_key` and `pp_company_id` already set? If so, skip Phase 2.
- Does a `schedule` page exist? If not, note it — user needs to run `/build-site` first or `/page-schedule`.
- Does a `section_type: "schedule"` section exist on the schedule page? If not, create it in Phase 3.

---

## Phase 2: Save PushPress credentials (if not already saved)

If `$ARGUMENTS[1]` was provided, save them:

```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS[0]\", \"messages\": [{\"role\": \"user\", \"content\": \"Update site_config with pp_api_key='$ARGUMENTS[1]'$([ -n '$ARGUMENTS[2]' ] && echo \" and pp_company_id='$ARGUMENTS[2]'\").\"}]}"
```

If credentials were not provided as arguments, tell the user:
```
To connect PushPress, I need your API key and company ID.

Find them in your PushPress dashboard:
  API Key:    Settings → Integrations → API Keys
  Company ID: Settings → Company (or visible in the URL)

Then run: /sync-schedule [siteId] [api-key] [company-id]
Or tell the AI: "My PushPress API key is sk_live_... and company ID is abc123"
```

---

## Phase 3: Ensure the schedule section exists

Check if there's a `section_type: "schedule"` section on the schedule page. If not, add one:

```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS[0]\", \"messages\": [{\"role\": \"user\", \"content\": \"Check if a section_type='schedule' section exists on page_slug='schedule'. If not, create one: table='sections', fields={site_id: site_id, page_slug: 'schedule', section_type: 'schedule', heading: 'This Week\\'s Classes', order: 0, visible: true}. Don't duplicate if it already exists.\"}]}"
```

---

## Phase 4: Test the connection

```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS[0]\", \"messages\": [{\"role\": \"user\", \"content\": \"Call test_pushpress_connection to verify the API credentials are working.\"}]}"
```

If the test fails:
- Check that the API key is correct (not expired, right environment: live vs test)
- Check that the company ID matches the API key's account
- Common error: company ID is a display name not a UUID — get the UUID from PushPress

---

## Phase 5: Rebuild

```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS[0]\", \"messages\": [{\"role\": \"user\", \"content\": \"Call rebuild_site to publish the updated schedule page.\"}]}"
```

---

## Phase 6: Report

```
PUSHPRESS SCHEDULE CONNECTED — [Gym Name]
==========================================

✓ API credentials saved
✓ Schedule section added to /schedule
✓ Connection tested — [N] classes found in the next 7 days
✓ Site rebuilt

How it works:
  - The schedule page fetches live data from PushPress every time someone loads it
  - Classes are grouped by day with color-coded type badges
  - Each class has a "Book" button linking to your booking URL
  - No rebuild needed when classes change — it's always live

Preview your schedule: https://[render-url]/api/sites/$ARGUMENTS[0]/preview
(Navigate to /schedule)

Cache: Schedule is cached for 15 minutes. Force a refresh at:
  POST https://[render-url]/api/sites/$ARGUMENTS[0]/schedule/refresh

⚠️  If the schedule shows no classes:
  - Verify you have classes scheduled in PushPress for the next 7 days
  - Check that classes are set to "open" access (not invite_only)
  - Confirm your API key has read access to /classes
```

---

## How the widget works (for reference)

The `section_type: "schedule"` section renders a JavaScript widget that:

1. Fetches `GET /api/sites/{siteId}/schedule` on page load
2. Groups classes by date into day tabs (Mon 6, Tue 7, Wed 8...)
3. Renders each class as a card with:
   - Time range (bold start time, light end time)
   - Class name (heading font)
   - Duration + location (muted)
   - "Book →" button linking to `booking_url`
   - Left border colored by class type (from PushPress class type colors)
4. Shows a shimmer skeleton while loading
5. Falls back gracefully: "Schedule temporarily unavailable. Call us for class times."

The server-side cache (`/api/sites/:siteId/schedule`) caches PushPress responses for 15 minutes to avoid hammering the PP API on every page load.
