# AI-300 Learning Game — Product Specification

**Version**: 1.0  
**Date**: 2026-05-11  
**Status**: Draft

---

## 1. Overview

### 1.1 Product Summary

A mobile-first, gamified web application designed to help learners prepare for the **Microsoft ML Operations Engineer (AI-300)** certification exam. The app combines a curated question bank with AI-generated content to deliver flashcards, multiple-choice quizzes, and product identification challenges across progressive difficulty levels.

### 1.2 Goals

- Make AI-300 exam prep engaging, bite-sized, and habit-forming
- Cover all official AI-300 exam domains with structured progression
- Use AI to provide unlimited content variety and contextual explanations
- Track learner progress and surface weak areas intelligently

### 1.3 Non-Goals (v1)

- No offline mode
- No social/multiplayer features
- No video content
- No native mobile app (PWA acceptable)

---

## 2. Target Users

| Persona | Description |
|---|---|
| **The Career Switcher** | Moving into cloud/Azure roles, studying part-time |
| **The IT Pro** | Already working with Azure, wants to validate knowledge |
| **The Student** | University or bootcamp learner, exam in 4–8 weeks |

All personas share: **mobile-first usage**, **short study sessions (5–15 min)**, **need for immediate feedback**.

---

## 3. Tech Stack

### 3.1 Frontend

| Layer | Technology | Rationale |
|---|---|---|
| Framework | React 18 + Vite | Fast builds, large ecosystem, easy deployment |
| Styling | Tailwind CSS | Mobile-first utilities, consistent design system |
| Components | shadcn/ui | Accessible, unstyled base, full control |
| Routing | React Router v6 | SPA navigation between game modes |
| State | Zustand | Lightweight global state (session, progress) |
| Animations | Framer Motion | Flashcard flips, transitions, score reveals |

### 3.2 Backend / API

| Layer | Technology | Rationale |
|---|---|---|
| Database | Supabase (Postgres) | Question bank, user progress, leaderboards |
| Auth | Supabase Auth | Email/magic link or Google OAuth |
| File Storage | Supabase Storage | Service icons/images for Product ID mode |

### 3.2.1 Content Authoring Tooling (Offline, Not Runtime)

| Layer | Technology | Rationale |
|---|---|---|
| Authoring AI | Anthropic Claude (developer-side) | Draft / refine / expand question bank entries during content production |
| Authoring scripts | Local Node scripts under `tools/` | Generate JSON, validate schemas, seed Supabase |

The production runtime makes **no** outbound calls to any AI provider. Claude is used by the maintainer to author content offline; the resulting JSON is reviewed by a human and committed to the seed bank before reaching users.

### 3.3 Hosting & DevOps

| Concern | Choice |
|---|---|
| Hosting | Vercel (or Azure Static Web Apps) |
| CI/CD | GitHub Actions → auto-deploy on merge to main |
| Environment | `.env` for API keys, Vercel env vars in production |
| Monitoring | Vercel Analytics + Supabase logs |

---

## 4. Information Architecture

```
/                        → Home / Dashboard
/learn                   → Mode selector
/learn/flashcards        → Flashcard session
/learn/quiz              → MCQ quiz session
/learn/product-id        → Product identification challenge
/progress                → Stats, streaks, weak areas
/settings                → Account, preferences
```

---

## 5. Game Structure

### 5.1 Level System (v1 scope: Level 1)

| Level | Name | Unlock Condition |
|---|---|---|
| 1 | **Foundation** | Available immediately |
| 2 | **Practitioner** | Score 70%+ across all Level 1 topics |
| 3 | **Administrator** | Score 80%+ across all Level 2 topics |
| 4 | **Expert** | Complete all timed challenges in Level 3 |

### 5.2 AI-300 Exam Domains (mapped to topics)

| Domain | Weight | Topics |
|---|---|---|
| Manage Azure Identities & Governance | 20–25% | Entra ID, RBAC, Subscriptions, Policies |
| Implement & Manage Storage | 15–20% | Blob, Files, Lifecycle, SAS tokens |
| Deploy & Manage Azure Compute Resources | 20–25% | VMs, Scale Sets, App Service, Containers |
| Implement & Manage Virtual Networking | 15–20% | VNets, NSGs, Load Balancer, DNS, VPN |
| Monitor & Maintain Azure Resources | 10–15% | Monitor, Alerts, Backup, Log Analytics |

---

## 6. Game Modes

### 6.1 Flashcards

**Purpose**: Build vocabulary and concept recall.

**Flow**:
1. User selects a topic (or "random mix")
2. Card appears showing **Term / Concept** on front
3. User taps to flip → reveals **Definition / Explanation**
4. User self-rates: `Got it ✓` / `Almost` / `Missed ✗`
5. Rating feeds spaced repetition queue
6. Session ends after N cards (user-configurable: 10, 20, 30)

**Card Data Fields**:
```json
{
  "id": "uuid",
  "type": "flashcard",
  "domain": "networking",
  "topic": "NSG",
  "front": "What is a Network Security Group?",
  "back": "A set of security rules that allow or deny inbound/outbound traffic to Azure resources...",
  "difficulty": 1,
  "tags": ["networking", "security", "level-1"],
  "source": "bank | ai-generated"
}
```

**Content Sourcing**:
- All flashcards are pre-authored and seeded into Supabase
- When a user exhausts the bank for a topic, the app cycles back through spaced-repetition cards rather than generating new ones at runtime
- The maintainer uses Claude offline (see §7) to grow the bank between releases

**UX Notes**:
- Swipe left = Missed, swipe right = Got it (mobile gesture)
- Progress bar across top showing cards remaining
- Flip animation (Y-axis card flip)
- Streak counter visible during session

---

### 6.2 Multiple Choice Quiz (MCQ)

**Purpose**: Simulate exam conditions, test applied knowledge.

**Flow**:
1. User selects topic, difficulty, and question count
2. Optional: enable timer (45 seconds per question, AI-300 pace)
3. Question displayed with 4 options (A/B/C/D)
4. On answer:
   - **Correct**: Green highlight + brief explanation (1–2 sentences)
   - **Incorrect**: Red highlight on chosen, green on correct + full explanation
5. "Next" → advances to next question
6. End screen: score %, time taken, weak topics flagged

**Question Data Fields**:
```json
{
  "id": "uuid",
  "type": "mcq",
  "domain": "identity",
  "topic": "RBAC",
  "question": "Which built-in RBAC role allows a user to manage all Azure resources but not grant access?",
  "options": {
    "A": "Owner",
    "B": "Contributor",
    "C": "Reader",
    "D": "User Access Administrator"
  },
  "correct": "B",
  "explanation": "Contributor can manage all resources but cannot assign roles. Owner includes role assignment rights.",
  "difficulty": 2,
  "tags": ["identity", "rbac", "level-1"],
  "source": "bank | ai-generated"
}
```

**Content Sourcing**:
- Questions and explanations are pre-authored and stored in Supabase
- Every MCQ in the bank ships with its explanation; there is no runtime "generate explanation" path
- "Explain more" is **not** a v1 feature; it is deferred until/unless a runtime AI tier is introduced

**UX Notes**:
- Timer shown as a shrinking progress ring around question number
- Keyboard shortcuts on desktop: A/B/C/D keys
- Swipe up to skip (costs a "hint token" — future feature)
- Results screen shows domain breakdown chart

---

### 6.3 Product Identification

**Purpose**: Build visual/name recognition of Azure services — critical for real exam scenarios.

**Flow**:
1. A service **name**, **icon**, or **one-line description** is shown
2. User must identify the correct category or use case from 4 options
3. Alternatively: match-the-service card pairs (memory game variant)

**Sub-modes**:

| Sub-mode | Input | Task |
|---|---|---|
| **Name → Category** | Service name (e.g. "Azure Bastion") | Pick the correct category (Networking / Security / Compute / Storage / Identity) |
| **Description → Name** | "Provides secure RDP/SSH access to VMs without public IP" | Pick the correct service name from 4 options |
| **Icon → Name** | Azure service icon image | Name the service |
| **Memory Match** | Grid of face-down cards | Match service name to its description |

**Data Fields**:
```json
{
  "id": "uuid",
  "type": "product-id",
  "service_name": "Azure Bastion",
  "category": "Networking",
  "description": "Provides secure and seamless RDP and SSH access to your VMs directly through the Azure portal without exposing public IPs.",
  "icon_url": "/icons/azure-bastion.svg",
  "common_confusions": ["VPN Gateway", "Azure Firewall"],
  "difficulty": 1
}
```

**UX Notes**:
- Icons sourced from official Azure icon set (SVG)
- "Confused this with X" tracking to surface confusable services
- Memory match uses a grid layout, optimized for portrait mobile

---

## 7. AI-Assisted Content Authoring (Offline)

Claude is used **by the maintainer**, not by end users. The production app
never calls an AI API. This section describes the authoring workflow.

### 7.1 Authoring Use Cases

| Use Case | Output |
|---|---|
| Draft new flashcards for an under-served topic | Batch of 5–10 JSON flashcard items |
| Draft new MCQs with options + explanations | Batch of 5–10 JSON MCQ items |
| Rewrite an explanation that learners flagged as unclear | Replacement explanation text |
| Suggest "common confusions" for a Product-ID entry | List of 2–3 confusable services |

### 7.2 Authoring Workflow

1. Maintainer runs a local Node script under `tools/author/` that prompts Claude with: domain, topic, difficulty, existing item IDs to avoid, and the JSON schema.
2. Claude returns JSON; the script validates against the schema in §8.
3. Maintainer reviews each item, edits as needed, and commits the reviewed JSON to the seed file.
4. A seed script writes the new items into Supabase with `source: "ai-generated"` and the human reviewer's initials.

### 7.3 Prompt Design Principles

- Always include: domain, topic, difficulty level, exam context ("AI-300")
- For generation: include existing item IDs to suppress duplicates
- Temperature: `0.7` for generation, `0.3` for explanation rewrites
- Always request JSON output for generation
- No production rate limit applies; spend is bounded by maintainer usage

---

## 8. Data Model (Supabase)

### Tables

```sql
-- Question bank
questions (
  id uuid PRIMARY KEY,
  type text,           -- 'flashcard' | 'mcq' | 'product-id'
  domain text,
  topic text,
  difficulty int,      -- 1 (easy) to 3 (hard)
  content jsonb,       -- flexible per type
  source text,         -- 'bank' | 'ai-generated'
  created_at timestamp
)

-- Users (extends Supabase Auth)
profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  display_name text,
  streak_days int DEFAULT 0,
  last_active date,
  level int DEFAULT 1
)

-- User progress per question
user_progress (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  question_id uuid REFERENCES questions,
  times_seen int DEFAULT 0,
  times_correct int DEFAULT 0,
  last_rating text,    -- 'correct' | 'almost' | 'missed'
  next_review date,    -- spaced repetition
  updated_at timestamp
)

-- Quiz sessions
sessions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  mode text,
  topic text,
  score_pct float,
  duration_seconds int,
  completed_at timestamp
)
```

---

## 9. Spaced Repetition Logic

Uses a simplified **SM-2 algorithm**:

| Rating | Next Review |
|---|---|
| Got it ✓ | +3 days (first time), then doubles |
| Almost | +1 day |
| Missed ✗ | Tomorrow |

- Questions due for review surface first in any session
- "Daily Review" mode on home screen shows cards due today

---

## 10. UX & Design

### 10.1 Design Principles

- **Mobile-first**: All layouts designed for 375px width first, scaled up
- **Thumb-friendly**: Primary actions in bottom 60% of screen
- **Dark mode default**: Azure blue + dark background (easy on eyes during study)
- **Progress visible always**: Streak, XP, and session progress always in view

### 10.2 Key Screens

| Screen | Key Elements |
|---|---|
| **Home / Dashboard** | Daily streak, XP bar, "Continue", due-for-review count, quick-start buttons |
| **Mode Selector** | Three large cards (Flashcards / Quiz / Product ID) with topic filter |
| **Flashcard Session** | Full-screen card, flip animation, self-rating buttons, progress bar |
| **Quiz Session** | Question + 4 tappable options, timer ring, explanation panel |
| **Product ID** | Icon/name/description display, 4 category options or match grid |
| **Results Screen** | Score, domain breakdown, XP earned, "Review Missed" CTA |
| **Progress Dashboard** | Domain radar chart, streak calendar, weak topics list |

### 10.3 Mobile Gestures

| Gesture | Action |
|---|---|
| Swipe right | Flashcard: "Got it" |
| Swipe left | Flashcard: "Missed" |
| Tap card | Flip flashcard |
| Tap option | Select MCQ answer |
| Swipe up | Next question (after answering) |

---

## 11. Gamification

| Element | Description |
|---|---|
| **XP Points** | Earned per correct answer, bonus for streaks |
| **Daily Streak** | Days in a row with at least one session |
| **Level Badges** | Foundation → Practitioner → Administrator → Expert |
| **Domain Mastery** | Per-domain progress bar (0–100%) |
| **Perfect Quiz** | Badge for 100% on a timed quiz |
| **Hint Tokens** | Earn tokens to reveal a hint during MCQ (future) |

---

## 12. Question Bank Seed Plan

Initial bank targets **200 questions** across all domains:

| Domain | Flashcards | MCQ | Product ID |
|---|---|---|---|
| Identity & Governance | 15 | 20 | 10 |
| Storage | 10 | 15 | 8 |
| Compute | 15 | 20 | 12 |
| Networking | 15 | 20 | 10 |
| Monitoring | 10 | 15 | 5 |
| **Total** | **65** | **90** | **45** |

Questions sourced from:
- Official Microsoft Learn AI-300 study guide
- Public exam prep communities (rephrased/original)
- AI-generated (Claude, reviewed before seeding)

---

## 13. Development Phases

### Phase 1 — Foundation (Weeks 1–2)
- [ ] Supabase schema + seed 50 questions
- [ ] React app scaffold with routing
- [ ] Flashcard mode (static, no AI)
- [ ] Basic MCQ mode (static, no timer)
- [ ] Supabase Auth (email login)

### Phase 2 — Core Game (Weeks 3–4)
- [ ] Product ID mode (Name → Category sub-mode)
- [ ] Timer for MCQ
- [ ] Results screen with domain breakdown
- [ ] User progress tracking
- [ ] Streak + XP system

### Phase 3 — Content & Personalization (Weeks 5–6)
- [ ] Authoring scripts under `tools/author/` (Claude-assisted, schema-validated)
- [ ] Full question bank seeded (200 questions, human-reviewed)
- [ ] Spaced repetition ("Daily Review" mode)
- [ ] Progress dashboard with radar chart

### Phase 4 — Polish & Launch (Weeks 7–8)
- [ ] Dark mode + design refinement
- [ ] PWA manifest + mobile install prompt
- [ ] Guest-mode → authenticated migration flow
- [ ] Performance audit + Lighthouse score ≥ 90

---

## 14. Success Metrics

| Metric | Target (3 months post-launch) |
|---|---|
| Daily Active Users | 500+ |
| Avg session length | 8–12 minutes |
| D7 retention | 30%+ |
| Quiz completion rate | 75%+ |
| User-reported exam pass rate | Track via optional survey |

---

## 15. Resolved Decisions

Resolved 2026-05-11. Each item below was an open question in earlier drafts.

1. **Auth model**: **Guest mode with local storage.** Anyone can start playing immediately; progress lives in localStorage. Optional sign-in (Supabase Auth) at any time migrates local progress into the user's profile. Implication: progress-storage layer must abstract over local vs. Supabase; sync/migration flow is a Phase 4 task.

2. **Pricing**: **Free + paid "Pro" cosmetic tier (~$3/mo).** Free includes the full question bank and all four game modes. Pro unlocks themes, advanced stats, and exam-day countdown — non-essential features only. Implication: Stripe + entitlement plumbing added; v1 ships with one or two Pro features as proof of plumbing, more added post-launch. No paid feature blocks exam preparation.

3. **Azure icons**: **Use the official Microsoft Azure icon set.** Subject to a licensing review against Microsoft's current terms before shipping; if terms forbid the use case at review time, fall back to a custom set. Action: legal/licensing check is a Phase 1 task and a release blocker.

4. **Localization**: **English only for v1.** No i18n framework wired up; strings live inline. Revisit post-launch.

5. **Accessibility**: **WCAG 2.1 AA on core flows.** "Core" = flashcards, MCQ quiz, product-ID, sign-in, and the guest-to-account migration. Settings, progress dashboard, and any admin/Pro-only screens are best-effort. Keyboard equivalents for every gesture are mandatory across the whole app (already in §10). Lighthouse Accessibility ≥ 90 (constitution Principle V) is the numerical gate.

---

*Spec authored with Claude (Anthropic). Review and iterate before development kickoff.*
