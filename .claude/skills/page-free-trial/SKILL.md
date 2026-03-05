---
name: page-free-trial
description: Build a free trial landing page — the highest-converting page on any gym site. No navbar distractions, one CTA, pure conversion. Supports 6 offer types. Every ad campaign should link here, not the homepage.
argument-hint: [siteId] [offer-type?]
allowed-tools: Bash
---

You are building the most important page on this gym's website. This is where ads land, where referral links go, where the decision gets made. One goal: get them to book.

## Arguments

- `$ARGUMENTS[0]` — siteId (required)
- `$ARGUMENTS[1]` — offer type (optional, default: `free-trial-class`)

**Offer types:**
- `free-trial-class` — Try a class free, no commitment (default)
- `free-week` — 7-day free pass
- `intro-pt` — Free personal training intro session
- `lead-gen` — Leave your info, we'll reach out
- `no-sweat-intro` — Free 20-min no-sweat intro / consult
- `discovery-call` — Schedule a discovery call

## Why this page is different from everything else

The homepage has nav links, multiple CTAs, lots of content. This page has ONE job. The prospect is already interested (they clicked an ad or a referral link). Don't give them reasons to leave and "think about it." Remove all exits except the booking CTA.

**Key differences from other pages:**
- **No navbar links** — uses `is_landing: true` which renders `landing.hbs` (logo only, no nav)
- **No footer nav** — minimal footer, just copyright
- **Single CTA repeated 3–4 times** — same button, every section
- **Social proof is specific** — numbers, names, results, not vague claims
- **Risk reversal everywhere** — "free", "no contract", "no obligation" in every section

---

## Phase 1: Read the site

```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS[0]\", \"messages\": [{\"role\": \"user\", \"content\": \"Use get_site_config and list_pages to show me: gym name, booking URL, any existing highlight content I can adapt for social proof, and whether a free-trial page already exists\"}]}"
```

From this, extract:
- `GYM_NAME` — config.name
- `BOOKING_URL` — config.booking_url (used in every CTA)
- Whether `/free-trial` already exists (if so, ask user before overwriting)

---

## Phase 2: Build the page

Use `is_landing: true` — this triggers `landing.hbs` (stripped chrome, logo-only nav).

Choose the offer type blueprint below. If `$ARGUMENTS[1]` is set, use that offer type. Otherwise default to `free-trial-class`.

### Offer type: `free-trial-class` (default)
```
Create page: slug='free-trial', title='Try a Free Class', is_landing=true,
  hero_headline='Your First Class Is Free. Your Last Excuse Isn\'t.',
  hero_subheading='Join [N] members who showed up once and never looked back. Takes 60 seconds to book.',
  hero_cta_text='Book My Free Class', hero_cta_url=BOOKING_URL

Section 1 — type: highlights, heading: 'What Members Say After Their First Month', order: 0, items:
  - title: 'Lost 18 lbs, kept it off', short_body: 'I tried 4 gyms before this one. The difference is the coaches actually notice if you\'re struggling.'
  - title: 'First pull-up at 42', short_body: 'I told them my goal on day one. They built a plan around it. 6 weeks later I did my first unassisted pull-up.'
  - title: 'Finally consistent', short_body: 'I\'ve been a member for 8 months. Before this I couldn\'t stick to anything for more than 3 weeks.'

Section 2 — type: steps, heading: 'Here\'s Exactly What Happens', order: 1, items:
  - title: 'Book a Free 15-Min Intro', short_body: 'No gym clothes needed. Just a phone call. We learn your goals.'
  - title: 'A Coach Sets Up Your First Class', short_body: 'They match you to the right class and time. No guesswork.'
  - title: 'Show Up. We Handle Everything Else.', short_body: 'Your first class is completely free. No credit card, no commitment.'

Section 3 — type: faq, heading: 'Before You Book', order: 2, items:
  - title: 'Is it really free? What\'s the catch?', body: 'No catch. Your first class is free — no credit card, no commitment. We just want to show you what we do.'
  - title: 'I\'m not fit enough yet', body: 'Everyone says this. Our coaches scale every workout to your level — beginners are welcome in every class.'
  - title: 'How long is the class?', body: 'Classes are [45–60] minutes. The intro call beforehand is 15 minutes — over the phone, no gym clothes needed.'
  - title: 'What if I want to join after?', body: 'We\'ll go over options at the end of your first class. No pressure. Come see if you like it first.'

Section 4 — type: cta, heading: 'You\'re One Click Away. The Rest Is Just Showing Up.', order: 3
```

### Offer type: `free-week`
```
Create page: slug='free-trial', title='Free Week Pass', is_landing=true,
  hero_headline='Train Free for 7 Days. No Credit Card. No Catch.',
  hero_subheading='A full week of unlimited classes to decide if this is for you.',
  hero_cta_text='Claim My Free Week', hero_cta_url=BOOKING_URL

Section 1 — type: highlights, heading: 'What You Get With Your Free Week', order: 0, items:
  - title: 'Unlimited Classes', short_body: 'Attend as many classes as you want during your free week. No limit.'
  - title: 'Full Coaching Support', short_body: 'Every class has a coach. You\'re not walking into a room of equipment and guessing.'
  - title: 'No Credit Card Required', short_body: 'You won\'t be charged anything. We won\'t ask for your card until you decide you want to stay.'

Section 2 — type: steps, heading: 'How Your Free Week Works', order: 1, items:
  - title: 'Claim Your Week', short_body: 'Book your first class and let us know you\'re doing the free week. That\'s it.'
  - title: 'Attend As Many Classes As You Want', short_body: 'Try different times, different coaches, different formats. See what fits your life.'
  - title: 'Decide If You Want to Stay', short_body: 'At the end of the week, we\'ll ask if you want to continue. No pressure either way.'

Section 3 — type: faq, heading: 'Free Week Questions', order: 2, items:
  - title: 'Do I need experience?', body: 'None at all. Every workout scales to your fitness level. Absolute beginners are welcome.'
  - title: 'What happens after the free week?', body: 'If you want to stay, we\'ll set you up with a membership. If not, no hard feelings — we appreciate you giving us a try.'
  - title: 'Is there any obligation?', body: 'Zero. No credit card, no pressure, no sales pitch at the end. We want you to decide if this is genuinely right for you.'
  - title: 'Can I really attend unlimited classes?', body: 'Yes. Come every day if you want. We\'d love it.'

Section 4 — type: cta, heading: 'Seven Days to Change Your Mind About What You\'re Capable Of.', order: 3
```

### Offer type: `intro-pt`
```
Create page: slug='free-trial', title='Free Personal Training Intro', is_landing=true,
  hero_headline='One Session. Your Coach. Your Goals. Free.',
  hero_subheading='A free 1-on-1 session with one of our coaches — built entirely around you.',
  hero_cta_text='Book My Free Session', hero_cta_url=BOOKING_URL

Section 1 — type: highlights, heading: 'What Makes This Session Different', order: 0, items:
  - title: 'It\'s About You', short_body: 'Not a standard intro. Your coach reviews your history, your goals, and your limitations before you start.'
  - title: 'No Group to Keep Up With', short_body: 'One coach, one client. The pace is yours. The focus is yours.'
  - title: 'You Leave With a Real Plan', short_body: 'Not "come back and join." A plan. Something you can act on whether you stay with us or not.'

Section 2 — type: steps, heading: 'What Happens in Your Free Session', order: 1, items:
  - title: 'Book Your Session', short_body: 'Pick a time. We\'ll confirm with your coach.'
  - title: 'Coach Reviews Your Goals and History', short_body: '15 minutes of conversation before you move. We learn what you\'re working toward and what\'s in the way.'
  - title: 'Leave With a Real Action Plan', short_body: 'Movement assessment, goal mapping, and a clear next step — whether that\'s with us or not.'

Section 3 — type: faq, heading: 'About Your Free Session', order: 2, items:
  - title: 'What happens in the session?', body: 'You\'ll talk with a coach for about 15 minutes (goals, history, any injuries), then do a brief movement assessment. You\'ll leave with a structured plan.'
  - title: 'Is there any pressure to join?', body: 'No. We\'d love for you to join, but this session is genuinely free regardless of your decision. We want you to see the quality of our coaching first.'
  - title: 'How long is it?', body: 'About 45 minutes total. 15 minutes of conversation, then movement.'
  - title: 'Do I need to be fit already?', body: 'The session is designed for your current level. Come as you are.'

Section 4 — type: cta, heading: '45 Minutes Could Change How You Think About Training.', order: 3
```

### Offer type: `lead-gen`
```
Create page: slug='free-trial', title='Get More Info', is_landing=true,
  hero_headline='Interested in [GYM_NAME]? Let\'s Talk.',
  hero_subheading='Leave your info and one of our coaches will reach out within 24 hours.',
  hero_cta_text='Get More Info', hero_cta_url=BOOKING_URL

Section 1 — type: embed, heading: 'Tell Us A Little About You', order: 0
[Use config.code or a placeholder — if no form URL available, use:
  <a href='BOOKING_URL' target='_blank' class='btn btn--primary' style='display:inline-block;padding:1rem 2rem;background:var(--color-primary);color:#fff;border-radius:4px;font-weight:600;text-decoration:none;'>Schedule a Quick Call →</a>]

Section 2 — type: steps, heading: 'What Happens Next', order: 1, items:
  - title: 'Leave Your Info', short_body: 'Takes 30 seconds. Name and best way to reach you.'
  - title: 'Coach Reaches Out Within 24 Hours', short_body: 'Not a sales call. A conversation. They\'ll answer any questions you have.'
  - title: 'Come In — Or Don\'t', short_body: 'If it sounds right, we\'ll set up your free first visit. If not, no pressure.'

Section 3 — type: faq, heading: 'Before You Submit', order: 2, items:
  - title: 'What happens after I submit?', body: 'One of our coaches will reach out personally within 24 hours. Not an automated email — a real person.'
  - title: 'Is there any pressure?', body: 'None. We want to answer your questions, not pitch you. If it\'s not the right fit, we\'ll tell you.'
  - title: 'How fast will you respond?', body: 'Within 24 hours on business days. Usually same-day.'

Section 4 — type: cta, heading: 'No Sales Pitch. Just a Conversation.', order: 3
```

### Offer type: `no-sweat-intro`
```
Create page: slug='free-trial', title='Book a No Sweat Intro', is_landing=true,
  hero_headline='Come In. Talk to a Coach. Leave With a Plan. Free.',
  hero_subheading='A 20-minute No Sweat Intro — no gym clothes, no workout, no commitment.',
  hero_cta_text='Book My No Sweat Intro', hero_cta_url=BOOKING_URL

Section 1 — type: highlights, heading: 'What a No Sweat Intro Actually Is', order: 0, items:
  - title: 'No Workout', short_body: 'Come in your work clothes. This is a conversation, not a class.'
  - title: 'No Sales Pitch', short_body: 'We\'re not trying to sell you a membership. We\'re trying to understand if we\'re the right fit for you.'
  - title: 'You Leave With a Plan', short_body: 'Specific goals, a recommended program, and a clear path forward — whether you join or not.'

Section 2 — type: steps, heading: 'Your 20-Minute No Sweat Intro', order: 1, items:
  - title: 'Book Your Slot', short_body: 'Pick a time that works. We\'ll send you a confirmation.'
  - title: 'Sit Down With a Coach', short_body: 'Tell them where you are, where you want to be, and what\'s stopped you before. They listen.'
  - title: 'Walk Out With a Real Action Plan', short_body: 'A recommended starting point, a realistic timeline, and a clear next step.'

Section 3 — type: faq, heading: 'About the No Sweat Intro', order: 2, items:
  - title: 'What is a No Sweat Intro?', body: 'It\'s a 20-minute conversation with a coach. No workout, no assessment, no gym clothes needed. Just a conversation about your goals and how we can help.'
  - title: 'Do I have to join?', body: 'No. This is genuinely free with zero obligation. We do them because they help us understand if we\'re the right fit for you.'
  - title: 'What should I bring?', body: 'Nothing. Come as you are. Literally — no gym clothes needed.'
  - title: 'What if I\'m not sure fitness is right for me?', body: 'That\'s exactly who this is for. Come in and let\'s figure it out together.'

Section 4 — type: cta, heading: '20 Minutes. No Sweat. Literally.', order: 3
```

### Offer type: `discovery-call`
```
Create page: slug='free-trial', title='Book a Discovery Call', is_landing=true,
  hero_headline='Not Sure If This Is Right for You? Let\'s Find Out Together.',
  hero_subheading='Book a free 15-minute discovery call with one of our coaches.',
  hero_cta_text='Schedule My Free Call', hero_cta_url=BOOKING_URL

[If config.booking_url includes a Calendly or scheduling link, add:]
Section 1 — type: embed, heading: 'Pick a Time That Works for You', order: 0
[Use scheduling embed URL or booking_url as fallback link]

Section 2 — type: highlights, heading: 'What We\'ll Cover on the Call', order: 1, items:
  - title: 'Your Goals', short_body: 'What are you actually trying to achieve? We ask the real question, not the surface one.'
  - title: 'What\'s Worked and What Hasn\'t', short_body: 'Most people have tried things before. We learn from that.'
  - title: 'Whether We\'re the Right Fit', short_body: 'Honest answer. If we\'re not the right gym for you, we\'ll tell you.'

Section 3 — type: steps, heading: 'How the Call Works', order: 2, items:
  - title: 'Pick a Time', short_body: 'Schedule a 15-minute slot. We\'ll send you a calendar invite.'
  - title: 'Quick Conversation, No Pressure', short_body: 'We learn about your goals. You ask anything you want. 15 minutes, no sales pitch.'
  - title: 'Walk Away Knowing Your Next Step', short_body: 'Whether that\'s booking a first class with us or not — you\'ll leave the call with clarity.'

Section 4 — type: faq, heading: 'About the Discovery Call', order: 3, items:
  - title: 'What do we talk about?', body: 'Your fitness goals, current situation, what\'s worked in the past, and what you\'re looking for. It\'s a real conversation.'
  - title: 'Is this a sales call?', body: 'No. We won\'t pitch you a membership on this call. We want to understand if we\'re a good fit first.'
  - title: 'How long is it?', body: '15 minutes. We respect your time.'
  - title: 'What if I decide it\'s not for me?', body: 'No problem. We appreciate you taking the call. No follow-up pressure.'

Section 5 — type: cta, heading: 'One Conversation Could Be the Thing That Changes Everything.', order: 4
```

---

## Phase 3: Nav CTA

After building the page, add a nav CTA:

```bash
curl -s "http://localhost:3200/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$ARGUMENTS[0]\", \"messages\": [{\"role\": \"user\", \"content\": \"Create a nav_item: label='Free Trial', url='/free-trial', is_cta=true, order=99. Then call rebuild_site.\"}]}"
```

---

## Phase 4: Report

After the build, output:

```
FREE TRIAL PAGE BUILT — [Gym Name]
====================================
Offer type: [offer-type]
URL: /free-trial (is_landing: true — stripped nav)

⚠️  Things to update before running ads:
  - Replace testimonial placeholders with real member results (#1 conversion driver)
  - Confirm booking_url is live and working
  [For lead-gen]: Add a real contact form embed (Typeform, Tally, Google Forms)
  [For discovery-call]: Add Calendly or scheduling embed URL

Ads should point to: https://[your-domain]/free-trial
(NOT your homepage — every extra click kills conversion)

Next: /conversion-audit $ARGUMENTS[0] to score and improve the full site
```
