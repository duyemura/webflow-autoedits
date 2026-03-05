# PushPress Platform API — Reference

Base URL: `https://api.pushpressdev.com`
Docs: `https://api.pushpressdev.com/platform/docs/`
OpenAPI spec: `https://api.pushpressdev.com/platform/docs/openapi.json`

## Authentication

All requests require:
- `API-KEY` header — your PushPress API key (stored in `site_config.pp_api_key`)
- `company-id` header — your company/gym UUID (stored in `site_config.pp_company_id`)

```
API-KEY: sk_live_...
company-id: abc123-...
```

---

## Classes

### GET /classes
Get a paginated list of scheduled classes.

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 10 | Results per page (max unknown, use 100) |
| `startsAfter` | number | — | Unix timestamp (seconds) — filter classes starting after this time |
| `access` | string | — | `"invite_only"` or `"open"` |
| `order` | string | `"ascending"` | Sort by start time: `"ascending"` or `"descending"` |

**Headers:**
- `company-id` (string) — required for multi-tenant API keys

**Response:**
```json
[
  {
    "id": "cls_abc123",
    "coachUuid": "usr_xyz" | null,
    "assistantCoachUuid": "usr_xyz" | null,
    "company": "company_abc" | null,
    "title": "CrossFit" | null,
    "classTypeName": "CrossFit" | null,
    "locationUuid": "loc_abc" | null,
    "location": { "name": "Main Gym" },
    "reservations": [],
    "start": 1741200000,
    "end": 1741203600
  }
]
```

**Notes:**
- `start` and `end` are Unix timestamps in **seconds**
- `title` may be null — fall back to `classTypeName`
- `location.name` is available by default (no `expand` needed)
- `reservations` is empty by default — use `expand=reservations` to get enrolled members

### GET /classes/{id}
Get details for a single class.

**Query params:**
- `expand` (array) — `"location"` | `"reservations"` (default: `[]`)

---

## Class Types

### GET /classes/types
Get all class types for a company. Used to get colors and descriptions per class type.

**Headers:**
- `company-id` (string) — required

**Response:**
```json
[
  {
    "id": "ct_abc123",
    "companyId": "company_abc",
    "name": "CrossFit",
    "color": "#E63946" | null,
    "description": "Our signature group class" | null,
    "active": true
  }
]
```

**Notes:**
- `color` is a hex string like `"#E63946"` or null
- Build a name→color map to colorize class cards: `classTypeName → color`

---

## Events

### GET /events
Same shape as `/classes` but for special events (workshops, challenges, etc.).

**Additional field:**
- `isAllDay: boolean`

---

## Reservations

### GET /reservations
Get reservations for a specific class or event.

**Required query param:**
- `calendarItemId` (string) — the class or event ID

**Response fields:**
- `id`, `customerId`, `status`: `"reserved"` | `"waitlisted"` | `"checked-in"` | `"canceled"` | `"late-canceled"`

---

## Our Integration Pattern

### Schedule endpoint: `GET /api/sites/:siteId/schedule`

Fetches the next 7 days of classes. Cached 15 minutes.

1. Read `pp_api_key` + `pp_company_id` from `site_config`
2. Fetch `GET /classes?startsAfter=${now}&limit=100&order=ascending`
3. Fetch `GET /classes/types` → build `nameToColor` map
4. Filter to next 7 days, transform to clean JSON
5. Return `{ classes: ScheduleClass[], cached: boolean }`

**ScheduleClass shape:**
```typescript
{
  id: string;
  title: string;          // class title or classTypeName
  typeName: string | null;
  typeColor: string;      // from class types, fallback to primary_color
  date: string;           // "2026-03-06"
  dayLabel: string;       // "Thu, Mar 6"
  timeStart: string;      // "6:00 AM"
  timeEnd: string;        // "7:00 AM"
  durationMin: number;
  location: string | null;
}
```

### Schedule widget: `section_type: "schedule"`

The schedule section in the templates renders a client-side JS widget that:
- Fetches `/api/sites/{siteId}/schedule` on page load
- Displays a 7-day tab selector
- Renders class cards with color-coded type badges
- Shows booking CTA on each class (links to `site_config.booking_url`)

### Site config fields

| Field | Purpose |
|-------|---------|
| `pp_api_key` | PushPress API key |
| `pp_company_id` | PushPress company UUID |

Set via chat: "Set my PushPress API key to sk_live_... and company ID to abc123"
Or via `/sync-schedule` skill.

---

## Connecting a Gym

1. Get API key from PushPress dashboard → Settings → API
2. Get company ID from PushPress dashboard or API response
3. Run `/sync-schedule [siteId]` or tell the AI assistant: "Connect PushPress — my API key is X and company ID is Y"
4. The schedule page will automatically show live classes from PushPress
