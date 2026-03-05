---
name: build-site
description: Build a complete gym website from scratch — all standard pages in one pass. Use when onboarding a new gym client or building a full site for the first time. Builds homepage content + 7 subpages: programs, about, coaches, schedule, pricing, contact, and a free trial landing page.
argument-hint: [siteId] [offer-type?]
allowed-tools: Bash
---

You are the site build orchestrator. Your job is to take a gym's basic info (already in site_config) and build a complete, conversion-optimized website — all pages, all sections, all nav links — in one coordinated pass.

This is the most important skill in the system. When you finish, the site should be genuinely ready to receive traffic.

## Arguments

- `$ARGUMENTS[0]` — siteId (required)
- `$ARGUMENTS[1]` — offer type for the free trial landing page (optional, default: `free-trial-class`)

**Offer types:**
- `free-trial-class` — Try a class free, no commitment
- `free-week` — 7-day free pass
- `intro-pt` — Free personal training intro session
- `lead-gen` — Leave your info, we'll reach out
- `no-sweat-intro` — Free 20-min no-sweat intro / consult
- `discovery-call` — Schedule a discovery call

## Phase 1: Read the site

First, understand what you're working with:

```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS[0]\", \"messages\": [{\"role\": \"user\", \"content\": \"Use get_site_config, list_pages, and get_content for items to show me everything: gym name, tagline, city, state, phone, booking_url, schedule_embed_url, existing pages, and any existing programs or other content\"}]}"
```

From this, extract:
- `GYM_NAME` — config.name
- `CITY` — config.city
- `BOOKING_URL` — config.booking_url (used in every CTA)
- `SCHEDULE_URL` — config.schedule_embed_url (used in schedule page)
- `PP_CONNECTED` — true if both `pp_api_key` and `pp_company_id` are non-null (live schedule widget will show real classes)
- `EXISTING_PAGES` — list of slugs already built (skip those)
- `EXISTING_PROGRAMS` — reuse on programs page

## Phase 2: Build pages in order

Build each page that doesn't already exist. For each, make ONE chat API call that does everything: create_page + all create_content for sections + nav_item. Do NOT call rebuild_site between pages — save it for the final step.

### Page build order and nav labels

| # | Slug | Nav Label | Notes |
|---|------|-----------|-------|
| 1 | `programs` | Programs | Most important subpage |
| 2 | `about` | About Us | |
| 3 | `coaches` | Coaches | |
| 4 | `schedule` | Schedule | |
| 5 | `pricing` | Pricing | |
| 6 | `contact` | Contact | |
| 7 | `free-trial` | Free Trial ← | **is_landing: true**, nav is_cta: true, cta_style: primary |

### For each page, call the chat API:

```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS[0]\", \"messages\": [{\"role\": \"user\", \"content\": \"[page build instructions — see below]\"}]}"
```

---

### Page 1: Programs (`/programs`)

```
Create a page: slug='programs', title='Our Programs', hero_headline='Find the Program Built for Your Goals', hero_subheading='Every class is coached, scaled, and designed to get you results — whatever your starting point.'

Then create these sections for page_slug='programs':

Section 1 — type: programs, heading: 'What We Offer', order: 0
[If existing programs exist, reuse their titles/descriptions rewritten to outcome-first format]
[If no programs exist, create 3 placeholder program items:
  - title: 'CrossFit / Group Training', short_body: 'For people who want to get genuinely strong in a coached class environment. Scales to every level.'
  - title: 'Personal Training', short_body: 'One-on-one coaching built entirely around your goals, your schedule, and your body.'
  - title: 'Open Gym / Foundations', short_body: 'For members who want to train at their own pace with coach support available.']

Section 2 — type: steps, heading: 'How to Get Into Any Program', order: 1, items:
  - title: 'Book a Free Intro', short_body: '15 minutes with a coach. No gym clothes required. We learn your goals and map out a plan.'
  - title: 'Get Matched to the Right Program', short_body: 'Your coach recommends the program that fits your goals, schedule, and fitness level.'
  - title: 'Show Up and Track It', short_body: 'Most members feel a difference in week one. We track your progress so you can see it.'

Section 3 — type: faq, heading: 'Program Questions', order: 2, items:
  - title: 'I haven\'t worked out in years — can I keep up?', body: 'Yes. Every workout is scaled to your level. You\'ll never be thrown into something you can\'t handle. Our coaches will check in with you personally during your first week.'
  - title: 'How long until I see results?', body: 'Most members notice energy changes in weeks 1–2. Visible physical changes typically happen between weeks 6–10 with consistent attendance (3x/week).'
  - title: 'Can I switch programs if it\'s not the right fit?', body: 'Absolutely. Your coach will help you find the right fit — and switching is always free.'

Section 4 — type: cta, heading: 'Not sure which program is right for you?', order: 3

Create nav_item: label='Programs', url='/programs', order=1, is_cta=false
```

---

### Page 2: About (`/about`)

```
Create a page: slug='about', title='Our Story', hero_headline='We Built the Gym We Couldn\'t Find', hero_subheading='[GYM_NAME] exists because we got tired of gyms that treated members like numbers.'

Then create these sections for page_slug='about':

Section 1 — type: highlights, heading: 'What We Stand For', order: 0, items:
  - title: 'Coaches Who Stay', short_body: 'Our coaches aren\'t seasonal. They know your name, your goals, and your injury history.'
  - title: 'No One Gets Lost', short_body: 'Small class sizes mean your coach sees every rep. If you\'re struggling, they\'ll know before you do.'
  - title: 'Progress Over Performance', short_body: 'We don\'t care if you\'re the fittest person in the room. We care if you\'re fitter than you were last month.'
  - title: 'Built for Real Life', short_body: 'Early mornings, lunch hours, evenings — we built the schedule around real people with real jobs.'

Section 2 — type: features, heading: 'The People You\'ll Train With', order: 1, items:
  - title: '[Head Coach Name]', short_body: '[Head Coach bio — placeholder: This is your head coach. Add their story here: background, why they coach, what members say about them.]'
  - title: '[Coach 2 Name]', short_body: '[Coach 2 bio placeholder]'
  - title: '[Coach 3 Name]', short_body: '[Coach 3 bio placeholder]'

Section 3 — type: cta, heading: 'Come meet us. No gym clothes required.', order: 2

Create nav_item: label='About Us', url='/about', order=2, is_cta=false
```

---

### Page 3: Coaches (`/coaches`)

```
Create a page: slug='coaches', title='Our Coaches', hero_headline='The Right Coach Changes Everything. Meet Ours.', hero_subheading='Every coach at [GYM_NAME] was hired for one thing: making you better than you were yesterday.'

Then create these sections for page_slug='coaches':

Section 1 — type: highlights, heading: 'How We Coach', order: 0, items:
  - title: 'We Scale Everything', short_body: 'No workout is too advanced or too easy. Every coach modifies in real time, for every body in the room.'
  - title: 'We Remember Your Goals', short_body: 'Your coaches know why you\'re here. They\'ll remind you on the days you forget.'
  - title: 'We Coach, Not Just Count', short_body: 'There\'s a difference between counting reps and watching movement. Our coaches watch movement.'

Section 2 — type: features, heading: 'Your Coaches', order: 1, items:
  [Same coach placeholders as about page — or pull from about page if already created]

Section 3 — type: cta, heading: 'Want to meet the team before you commit?', order: 2

Create nav_item: label='Coaches', url='/coaches', order=3, is_cta=false
```

---

### Page 4: Schedule (`/schedule`)

The schedule page uses progressive enhancement:
- **Always**: a `section_type: "schedule"` live widget (shows real PP classes when connected, or a tasteful "call us" fallback if not)
- **Always**: static highlights showing general time blocks (context that's useful even when PP is live)
- **Always**: contact section for hours from site_config
- **If PP connected**: widget auto-shows live classes — no extra steps needed

```
Create a page: slug='schedule', title='Class Schedule', hero_headline='Find a Time That Works for You', hero_subheading='Classes 6 days a week. If you can find 45 minutes, we have a class for you.'
[If schedule_embed_url or PP_CONNECTED, set hero_cta_text='Book a Class', hero_cta_url=BOOKING_URL]
[If neither, set hero_cta_text='Contact Us to Reserve', hero_cta_url='/contact']

Then create these sections for page_slug='schedule':

Section 1 — type: schedule, heading: 'This Week\'s Classes', order: 0
[No items — this is the live PushPress widget. If PP is connected it shows real classes.
 If not connected yet, it shows a graceful fallback. Always include this section.]

Section 2 — type: highlights, heading: 'When We Run Classes', order: 1, items:
  - title: 'Early Mornings — 5:30 & 6:30am', short_body: 'For the ones who need to get it done before the day starts.'
  - title: 'Lunch Hour — 12:00pm', short_body: '45-minute format. In, out, back to work.'
  - title: 'Evenings — 5:30, 6:30 & 7:30pm', short_body: 'High energy. Great for burning off the day.'
  - title: 'Saturday Community — 9:00am', short_body: 'Open to all levels. The most fun class of the week.'

Section 3 — type: contact, heading: 'Gym Hours', order: 2
[No items — pulls from site_config automatically]

Section 4 — type: cta, heading: 'Ready to reserve your spot?', order: 3

Create nav_item: label='Schedule', url='/schedule', order=4, is_cta=false
```

[If PP_CONNECTED: after building this page, call test_pushpress_connection to verify the widget will show live data]

---

### Page 5: Pricing (`/pricing`)

```
Create a page: slug='pricing', title='Membership Options', hero_headline='Invest in the Only Body You\'ll Ever Have', hero_subheading='No long-term contracts. Cancel anytime. Start with a completely free class.'

Then create these sections for page_slug='pricing':

Section 1 — type: highlights, heading: 'What\'s Included in Every Membership', order: 0, items:
  - title: 'Unlimited Classes', short_body: 'Come as often as you like. The more you show up, the better it works.'
  - title: 'A Coach at Every Class', short_body: 'Not a trainer you see once. A coach who knows your name and your goals.'
  - title: 'Workouts Scaled to You', short_body: 'Modified for injuries, beginners, and athletes — all in the same class.'
  - title: 'No Contract, Cancel Anytime', short_body: 'We earn your membership every month. If it\'s not working, you can leave. Simple.'
  - title: 'Free Intro Session', short_body: 'Your first visit is always free. Always. No credit card, no obligation.'

Section 2 — type: faq, heading: 'Membership Questions', order: 1, items:
  - title: 'Why is it more expensive than a regular gym?', body: 'Because a regular gym gives you equipment. We give you coaching, accountability, and a community that notices when you don\'t show up. That\'s why it works when other gyms don\'t.'
  - title: 'Is there a contract?', body: 'No long-term contracts. Month-to-month. Cancel with 30 days notice.'
  - title: 'Can I try before I commit?', body: 'Yes — your first class is completely free. No credit card, no pressure. Come see if it\'s for you.'
  - title: 'What if I travel a lot or have an irregular schedule?', body: 'We offer membership pauses for travel. Talk to us — we\'ll work something out.'
  - title: 'Do you offer any discounts?', body: 'We offer discounts for students, military, first responders, and couples. Ask at your intro session.'

Section 3 — type: cta, heading: 'Still thinking about it? Your first class is free.', order: 2

Create nav_item: label='Pricing', url='/pricing', order=5, is_cta=false
```

---

### Page 6: Contact (`/contact`)

```
Create a page: slug='contact', title='Contact Us', hero_headline='Come Find Us', hero_subheading='Drop in during open hours or book a quick tour. No commitment, no pressure.'

Then create these sections for page_slug='contact':

Section 1 — type: contact, heading: 'Find Us', order: 0
[No items — pulls from site_config automatically]

Section 2 — type: highlights, heading: 'Your First Visit', order: 1, items:
  - title: 'Just Show Up', short_body: 'No gear required. Come in whatever you\'d wear to a regular gym — we\'ll handle the rest.'
  - title: 'You\'ll Meet a Coach First', short_body: 'Every new visitor gets a 1:1 with one of our coaches. We learn your goals before your first class.'
  - title: 'Nothing to Prove', short_body: 'Everyone here was a beginner once. Our members are the most welcoming part of what we do.'

Section 3 — type: faq, heading: 'Before You Come In', order: 2, items:
  - title: 'Do I need to book ahead or can I walk in?', body: 'Walk-ins are welcome during open gym hours. For classes, we recommend booking ahead to guarantee your spot — you can do that at [BOOKING_URL].'
  - title: 'What should I bring?', body: 'Just yourself. Water bottle is helpful. Wear whatever you\'d normally work out in. We have changing rooms.'
  - title: 'Is parking easy?', body: '[Add parking details here — street parking, lot, etc.]'

Section 4 — type: cta, heading: 'Rather talk first? We\'re happy to answer any questions.', order: 3

Create nav_item: label='Contact', url='/contact', order=6, is_cta=false
```

---

### Page 7: Free Trial Landing Page (`/free-trial`)

Build based on the offer type argument. See the offer type blueprints below.

Create nav_item: label='Free Trial', url='/free-trial', order=7, is_cta=true, cta_style='primary'

---

## Offer type blueprints for `/free-trial`

Use `is_landing: true` on all of these. Strip the nav, minimal footer, single CTA throughout.

### `free-trial-class`
```
hero_headline: 'Your First Class Is Free. Your Last Excuse Isn\'t.'
hero_subheading: 'Join [N] members who showed up once and never looked back. Takes 60 seconds to book.'
hero_cta_text: 'Book My Free Class'
hero_cta_url: BOOKING_URL
Steps: Book → Coach calls you → Show up, we handle everything
FAQ: Is it really free? / I\'m not fit enough / How long is the class? / What if I want to join?
CTA band: 'You\'re one click away. The rest is just showing up.'
```

### `free-week`
```
hero_headline: 'Train Free for 7 Days. No Credit Card. No Catch.'
hero_subheading: 'A full week of unlimited classes to decide if this is for you.'
hero_cta_text: 'Claim My Free Week'
hero_cta_url: BOOKING_URL
Steps: Claim your week → Attend as many classes as you want → Decide if you want to stay
FAQ: Do I need experience? / What happens after the free week? / Is there any obligation?
CTA band: 'Seven days to change your mind about what you\'re capable of.'
```

### `intro-pt`
```
hero_headline: 'One Session. Your Coach. Your Goals. Free.'
hero_subheading: 'A free 1-on-1 session with one of our coaches — built entirely around you.'
hero_cta_text: 'Book My Free Session'
hero_cta_url: BOOKING_URL
Steps: Book your session → Coach reviews your history and goals → Leave with a real plan
FAQ: What happens in the session? / Is there any pressure to join? / How long is it?
CTA band: '45 minutes could change how you think about training.'
```

### `lead-gen`
```
hero_headline: 'Interested in [GYM_NAME]? Let\'s Talk.'
hero_subheading: 'Leave your info and one of our coaches will reach out within 24 hours.'
hero_cta_text: 'Get More Info'
hero_cta_url: BOOKING_URL
[Add embed section with contact form / Typeform / Google Form — use placeholder if no form URL]
Steps: Leave your info → Coach reaches out within 24 hours → We answer every question
FAQ: What happens after I submit? / Is there any pressure? / How fast will you respond?
CTA band: 'No sales pitch. Just a conversation.'
```

### `no-sweat-intro`
```
hero_headline: 'Come In. Talk to a Coach. Leave With a Plan. Free.'
hero_subheading: 'A 20-minute No Sweat Intro — no gym clothes, no workout, no commitment.'
hero_cta_text: 'Book My No Sweat Intro'
hero_cta_url: BOOKING_URL
Steps: Book your 20-min slot → Sit down with a coach, tell them your goals → Walk out with a real action plan
FAQ: What is a No Sweat Intro? / Do I have to join? / What should I bring?
CTA band: '20 minutes. No sweat. Literally.'
```

### `discovery-call`
```
hero_headline: 'Not Sure If This Is Right for You? Let\'s Find Out Together.'
hero_subheading: 'Book a free 15-minute discovery call with one of our coaches.'
hero_cta_text: 'Schedule My Free Call'
hero_cta_url: BOOKING_URL
[Add embed section with Calendly or scheduling link if available]
Steps: Pick a time → Quick call, no pressure → Walk away knowing exactly what your next step is
FAQ: What do we talk about? / Is this a sales call? / How long is it?
CTA band: 'One conversation could be the thing that changes everything.'
```

---

## Phase 3: Final rebuild

After ALL pages are created, call rebuild_site once:

```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS[0]\", \"messages\": [{\"role\": \"user\", \"content\": \"Call rebuild_site to make all changes live.\"}]}"
```

## Phase 4: Report

```
SITE BUILD COMPLETE — [Gym Name]
=================================

Pages built:
  ✓ /programs    — Programs page (outcome-first)
  ✓ /about       — About / Our Story
  ✓ /coaches     — Coach team page
  ✓ /schedule    — Class schedule
  ✓ /pricing     — Membership options
  ✓ /contact     — Contact + location
  ✓ /free-trial  — Landing page ([offer-type])

Nav items added: 7 (Free Trial as primary CTA button)

Schedule status:
  [If PP_CONNECTED]:  ✓ PushPress connected — /schedule shows live classes
  [If not connected]: ○ /schedule shows static times — connect PushPress to upgrade:
                        /sync-schedule $ARGUMENTS[0] [api-key] [company-id]

⚠️  Things to fill in before going live:
  - Coach bios on /about and /coaches (placeholders added)
  - Parking details on /contact
  - Real membership prices on /pricing
  - Update class time highlights on /schedule with your actual hours
  [If no booking_url]: Add a booking_url to site_config

Preview: https://[render-url]/api/sites/$ARGUMENTS[0]/preview

Next steps:
  - /icp-interview $ARGUMENTS[0] — target the site copy to your best member type
  - /conversion-audit $ARGUMENTS[0] — score the site and get a fix list
  - /full-conversion-rewrite $ARGUMENTS[0] — rewrite all copy for maximum conversion
```
