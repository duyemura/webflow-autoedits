---
name: page-free-trial
description: Build a Free Trial landing page — the highest-converting page on any gym site. No navbar distractions, one CTA, pure conversion. Every ad campaign should link here, not the homepage.
argument-hint: [siteId]
allowed-tools: Bash
---

You are building the most important page on this gym's website. This is where ads land, where referral links go, where the decision gets made. One goal: get them to book a free trial.

## Why this page is different from everything else

The homepage has nav links, multiple CTAs, lots of content. This page has ONE job. The prospect is already interested (they clicked an ad or a referral link). Don't give them reasons to leave and "think about it." Remove all exits except the booking CTA.

**Key differences from other pages:**
- **No navbar links** — nav stays but links are removed or disabled so they can't wander off
- **No footer nav** — minimal footer, just copyright
- **Single CTA repeated 3–4 times** — same button, every section
- **Social proof is specific** — numbers, names, results, not vague claims
- **Risk reversal everywhere** — "free", "no contract", "no obligation" in every section

## Section order and reasoning

### 1. Page Hero (full-bleed, high energy)
- Headline: The biggest promise you can honestly make
- Good: "Your First Class Is Free. Your Last Excuse Isn't."
- Good: "Stop Starting Over. Start Building a Habit That Sticks."
- Good: "Try [Gym Name] Free — No Credit Card, No Commitment"
- Bad: "Welcome to [Gym Name]'s Free Trial Page"
- Subheading: "Join [X] members who showed up once and never looked back. Book your free class — takes 60 seconds."
- hero_cta_text: "Book My Free Class Now" → booking_url
- hero_secondary_cta_text: "See What to Expect ↓" (anchor link to steps section — use #what-to-expect)

### 2. Highlights — Social Proof
- heading: "What Members Say After Their First Month"
- 3 cards styled as mini testimonials or specific results:
  - Title: "Lost 18 lbs, kept it off" — body: "I tried 4 gyms before this one. The difference is the coaches actually notice if you're struggling."
  - Title: "First pull-up at 42" — body: "I told them my goal on day one. They built a plan around it. 6 weeks later I did my first unassisted pull-up."
  - Title: "Finally consistent" — body: "I've been a member for 8 months. Before this I couldn't stick to anything for more than 3 weeks."
- NOTE: If real testimonials aren't available, use [MEMBER NAME] and [RESULT] placeholders and flag them

### 3. Steps — What Happens When You Book
- heading: "Here's Exactly What Happens"
- Remove all mystery — anxiety kills conversions
  1. "You book a free 15-minute intro call — no gym clothes needed, just a phone"
  2. "A coach calls you, learns your goals, and sets up your first class"
  3. "You show up, we take care of everything else. First class is completely free."

### 4. Highlights — Why It's Different
- heading: "Why [Gym Name] Works When Other Gyms Don't"
- 3 cards on the real differentiators (pull from site highlights or create):
  - Coaches who scale every workout to your level
  - Class sizes that mean you're never anonymous
  - Accountability built into the format

### 5. FAQ — The Last Objections Before Booking
- heading: "Before You Book"
- Tight, 4 FAQs max:
  1. "Is it really free? What's the catch?" — no catch, be specific
  2. "I'm not fit enough yet" — counter directly
  3. "How long is the free trial class?" — be specific (45 min, 1 hour, etc.)
  4. "What if I want to join after?" — brief, don't oversell here

### 6. CTA band — Final push
- heading: "You're One Click Away. The Rest Is Just Showing Up."
- Button: "Book My Free Class" → booking_url
- Below button: small text — "No credit card. No commitment. Cancel anytime."

## Nav handling

Since we can't remove the navbar entirely (it's a partial), minimize it. In the page hero subheading include anchor text that scrolls down rather than away. In the CTA band, make the booking button prominent enough that the nav doesn't matter.

## Build instructions

1. Read site data:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"Use get_site_config and list_pages to show me gym name, booking URL, and existing highlight/feature content I can adapt for social proof\"}]}"
```

2. Build with slug `free-trial`:
```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS\", \"messages\": [{\"role\": \"user\", \"content\": \"[full build with slug free-trial]\"}]}"
```

3. After building, flag:
   - "Replace the testimonial placeholders with real member results — this is the #1 conversion driver on this page"
   - "Point all your ad campaigns to /free-trial, not your homepage"
   - "Add 'Free Trial' as a nav CTA button linking to /free-trial"
