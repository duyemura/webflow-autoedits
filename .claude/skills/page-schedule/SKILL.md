---
name: page-schedule
description: Build a Schedule page for a gym site. Shows prospects the class schedule fits their life. Handles both embed-based schedules (PushPress, MindBody) and simple hours displays.
argument-hint: [siteId]
allowed-tools: Bash
---

You are building the Schedule page. The #4 reason people don't join a gym: "I'm not sure the times work for me." This page removes that objection before they have to ask.

## The job of this page

Answer: "Can I actually fit this into my life?" Show them morning classes exist. Show them evening classes exist. Make the schedule feel abundant, not restrictive.

## Two modes — check which applies

### Mode A: Schedule embed (PushPress, MindBody, Zen Planner, Mindbody)
If `schedule_embed_url` is set in site_config, the schedule page should:
- Feature section with heading "Book a Class" and an embed placeholder (link to the scheduling tool)
- We can't embed iframes in static HTML easily, so: show a prominent button linking to the scheduling tool

### Mode B: Static hours (no scheduling software)
If no embed URL, display:
- Hours from site_config
- Class types with times as text
- CTA to call/email to reserve

## Section order and reasoning

### 1. Page Hero
- Reassuring, not clinical
- Good: "Find a Time That Works for You — Not Against You"
- Good: "Morning Person or Night Owl — We've Got You Covered"
- Bad: "Class Schedule"
- Subheading: "Classes 6 days a week, 6am to 7pm. If you can find 45 minutes, we'll find a class."
- hero_cta_text: "Reserve My Spot" → booking_url OR schedule_embed_url

### 2. Highlights — When We Run Classes
- heading: "Class Times at a Glance"
- 3–4 cards showing time blocks (customize to real schedule if known):
  - "Early Mornings — 5:30am & 6:30am" — body: "For the ones who need to get it done before the day starts. Consistent attendance, tight-knit group."
  - "Lunch Hour — 12:00pm" — body: "45-minute format. In, out, back to work. Popular with the 9-to-5 crowd."
  - "Evening Classes — 5:30pm, 6:30pm & 7:30pm" — body: "The biggest classes. High energy. Best for people who need to burn off the day."
  - "Saturday Community Class — 9:00am" — body: "Open to all levels. The most fun class of the week."

### 3. Contact section — Full Weekly Hours
- heading: "Our Full Schedule"
- Renders hours from site_config automatically
- No items needed

### 4. Features — Class Types (if applicable)
- heading: "What's Running This Week"
- Cards for each class type offered:
  - Title: Class name
  - short_body: Format + duration + who it's best for
  - Example: "CrossFit — 60 min. Strength + conditioning. Scales to any level."

### 5. CTA band
- heading: "Ready to Reserve Your Spot?"
- Button: "Book a Free Intro Class" → booking_url
- If schedule_embed_url: secondary button "View Full Schedule" → schedule_embed_url

## Common mistakes to avoid
- Showing a static table of class times with no warmth — feels like a bus timetable
- Not addressing "what if I miss a class?" — mention make-up options if they exist
- No explanation of what happens in each class type — "CrossFit" means nothing to a beginner

## Build instructions

1. Read site data — specifically check for schedule_embed_url:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"Use get_site_config to show me hours, booking_url, and schedule_embed_url\"}]}"
```

2. Choose Mode A or B based on whether schedule_embed_url exists

3. Build with slug `schedule`:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"[full build]\"}]}"
```

4. After building, flag:
   - "Update the class time highlights with your actual schedule"
   - If Mode A: "Make sure schedule_embed_url in site_config points to your live PushPress/MindBody booking page"
