# PatienTrials Site Portal

A modernised front end for the PatienTrials clinical-trial site portal, plus the participant-facing
trial funnel that feeds it.

It is a redesign, not a reproduction. Every workflow evidenced by the legacy screenshots and the
twenty Playwright specs is here; none of the legacy interaction patterns are.

---

## Running it

```bash
npm install
```

```bash
npm run dev
```

The app runs at `http://localhost:5177`.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run typecheck` | Types only |
| `npm run lint` | oxlint |
| `npm run preview` | Serve the production build |

### Signing in

There is no identity provider behind this build. The login screen lists the seeded accounts under
**Demo accounts** — choosing one fills the form. Any password of six characters or more is accepted.

| Account | Role |
| --- | --- |
| `nick.wilde@plano-research.com` | Site Administrator (full access) |
| `marcus.bell@plano-research.com` | Study Administrator |
| `lilly.joy@plano-research.com` | Principal Investigator |
| `judy@hopps.com` | Study Coordinator |

The account menu also has a **View as role** switcher, which changes navigation and action
permissions without signing out.

### Seeing the loading, error and empty states

The top bar has a **States** control that forces the whole app into one of four modes: normal, slow
network, server error, or no data. It is also a URL parameter — `?sim=error`, `?sim=empty`,
`?sim=slow` — so a specific state can be linked to or scripted.

---

## What the legacy system was

Two live surfaces, running the same business process through two unrelated interfaces:

1. **Site back-office** — a ServiceNow instance (scope `x_224218_ptntrial`). Mostly raw platform UI
   rendered inside an `#iframe`: slushbucket multi-selects, `Lookup using list` links that open new
   browser windows, `sysverb_insert` / `sysverb_update` buttons, and a strip of red "Required
   information" chips at the foot of every form.
2. **Participant funnel** — a React SPA where someone searches by NCT number, answers pre-screening
   questions, fills one long demographic form, and receives a `PT######` participant ID.

Sign-ups on the second produce exactly the participants triaged in the first. They are one product
here.

---

## Functionality preserved

Every row is evidenced by a screenshot, a Playwright spec, or both.

| Legacy workflow | Where it lives now |
| --- | --- |
| Log in | `/login` |
| Register as Site Admin / Network Admin / Independent Nurse | `/register?as=…` |
| SaaS Services Agreement, acknowledge | Dialog in the registration flow |
| Registration confirmation | `/register/submitted` |
| Site onboarding wizard, six sections | `/onboarding` |
| Site Details · Past Trials · IRB · Labs · Facilities | `/site` (tabs) — same components as the wizard |
| Collaborators | `/site/team` |
| Site Administrator hub (three products) | `/hub` |
| Studies list, status filters, search, grid/list | `/studies` |
| Create Study from NCT, promote yes/no, eligibility, preview | `/studies/new` |
| Promote a study later | `/studies/:id/promote` |
| New Study Request, duplicate detection | `/requests` |
| Site selection questions | `/requests/:id` |
| Assign Principal Investigator (+ mandatory note) | `/studies/:id/team` |
| Approved Locations | `/studies/:id/locations` |
| Subject triage — Validate / Reject / Recruit | `/studies/:id/participants` |
| Pre-screening question groups, primary + secondary | `/studies/:id/prescreening` |
| Assign forms to a study, set form Type | `/studies/:id/forms` |
| Assign surveys to a study | `/studies/:id/surveys` |
| Appointment templates, in person + virtual | `/studies/:id/appointments` |
| Patient notification question groups | `/studies/:id/notifications` |
| Form builder — 7 question types, draft, publish | `/forms/:id`, `/surveys/:id` |
| Find trials, trial detail, sign up, `PT######` | `/find-trials`, `/trials/:nctId`, `/trials/:nctId/sign-up` |

Out of scope by agreement: the `deleteing_chat_servers` spec, which drives a separate internal ops
tool at `status.etrials.io`.

---

## What changed, and why

Each of these is a response to a specific weakness in the legacy build, not a restyle.

**The iframe is gone.** Study detail is a set of routed pages. The specs were full of
`scrollIntoViewIfNeeded()`, `hover()`, fixed waits and `click({ force: true })` to reach tabs inside
a frame that scrolled independently of the page around it. None of that is needed now, and the
study's identity stays on screen while you work.

**Popup lookups became inline comboboxes.** `Lookup using list` opened a *new browser window*
containing a record list — `page.waitForEvent('popup')` appears in six specs. Choosing a therapy
area, country, investigator or facility now happens in place: type to filter, arrow keys to move,
Enter to choose.

**Slushbuckets became searchable checklists.** Assigning forms meant selecting a 32-character
`sys_id` from one list box and pressing "Add selected options to the…" to move it to another. The
available set and the chosen set are visible at once now, options are searchable by their real
names, and the save button says exactly how many will be added and removed.

**The red chip strip became inline validation.** Errors appear under the field that failed,
on blur, announced with `role="alert"`. On submit, a summary lists what is outstanding and each
entry moves focus to its field.

**Subject triage became a queue.** Acting on one participant used to cost four navigations and
returned you to the studies index — screening twenty people meant losing your place twenty times.
The list now stays put, the record opens beside it, and after a decision the next participant
awaiting review is selected automatically. Their pre-screening answers are shown against the answer
the study wanted, so the decision has its evidence beside it.

**Appointment lock/unlock became a field.** The legacy form required "Unlock Appointment", a popup,
then "Lock Appointment With" before the schedule fields would accept input. Assigning someone is one
combobox.

**The promote preview is inline.** It used to open a popup window, so the writer lost the form while
checking their words — and could be blocked by the browser entirely. It updates as you type now.

**The form builder gained a preview.** The legacy builder had none: you published, then opened the
participant app to find out what you had made.

**Rich text without a rich-text editor.** The legacy builder embedded TinyMCE, and every question
prompt lived in its own iframe. Descriptions here are plain text with line prefixes — `- ` for a
bullet, `1. ` for a numbered list — which keeps the capability that mattered without the editor, the
iframes, or an HTML sanitising problem.

**Pre-screening choices are a list.** They were a pipe-delimited string (`Yes|No`) with a
free-text "desired answer" that had to match one of them exactly. The desired answer is now chosen
*from* the choices, so the two cannot fall out of step.

**An ineligible participant gets an answer.** The legacy funnel had no "not a match" outcome. There
is one now, and it explains that eligibility criteria are set in advance for safety and reliability
rather than leaving someone to assume they were judged.

**Failure is not a browser `alert()`.** Sign-up errors are inline, next to the action.

**Site sub-records became one screen.** Past Trials, IRB Details, Labs Associated, Facility Services
and Edit Site were five separate sidebar entries for what is one record with five related lists.
They are tabs of `/site`, using the same components as the onboarding wizard so the two can never
drift apart.

**The hub is no longer a toll gate.** Every legacy session began with a mandatory click on "SITE
SOLUTION". Sign-in lands in the console; the workspace switcher is still reachable at `/hub`.

---

## Architecture

```
src/
  styles/globals.css      design tokens — the source of truth for colour, radius, motion
  lib/                    cn, formatting, validators, useForm, useAsync
  components/
    ui/                   primitives: button, input, combobox, multi-select, dialog, toast…
    patterns/             composed behaviour: FormField, AsyncBoundary, DataTable, EmptyState…
    layout/               AppShell, ConsoleSidebar, TopBar, PublicShell, nav config
  features/
    auth/                 login, registration, legal agreement, roles, session
    onboarding/           the six-step site setup
    studies/              studies list, create, promote, requests
    study/                the study workspace and its nine tabs
    forms/                form and survey library, builder, question groups
    enroll/               participant funnel
    site/                 dashboard, site profile, team, hierarchy
  data/
    types.ts              domain model
    reference.ts          the option sets the legacy forms offered
    mock/seed.ts          seed records
    api.ts                the async facade
```

Dependencies flow one way: `tokens → ui → patterns + layout → features → data`. Features never
import each other; anything two features need moves down into `patterns`.

Every route below the shells is code-split with `React.lazy`, so a participant
looking for a trial does not download the form builder and the console's first
paint does not wait on the participant funnel. The production build is one
~132 kB gzipped vendor chunk plus per-route chunks of 2–7 kB.

### The data seam

`data/api.ts` is the only place the UI talks to. It behaves like a network — calls are async, they
take time, and they can fail — which is what makes the loading and error states real rather than
decorative. Swapping the mock for a live backend is a change to that one file.

State lives where it is used: React state for view concerns, `useAsync` for reads, `useAction` for
writes, one context for the session and one for toasts. There is no store, because nothing in this
app needs one.

### Reuse worth pointing at

- `patterns/form-field.tsx` holds the accessibility contract for every control in the app, so no
  screen can quietly ship an unlabelled field or a silent error.
- `patterns/async-boundary.tsx` renders exactly one of loading / error / empty / content, which is
  how the four states exist everywhere rather than only where someone remembered them.
- `patterns/status-badge.tsx` maps every domain status to a tone once, so a new status is a one-line
  change and cannot drift between screens.
- `onboarding/section-shell.tsx` is shared by the five repeatable onboarding sections.
- `studies/promotion-builder.tsx` is shared by create-study and promote-later.
- `site/team-manager.tsx` is shared by the onboarding step and the standing Team screen.
- `study/assignment-tab.tsx` serves both forms and surveys from one component.

---

## Design system

Tokens are carried over from the PatienTrials patient app so the two surfaces read as one product,
then tuned for console density.

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#F6F5F2` | warm-neutral canvas |
| `--sunken` | `#F1EFEA` | sidebar, table headers |
| `--card` | `#FFFFFF` | elevated surfaces |
| `--foreground` | `#1C1A17` | warm ink |
| `--primary` | `#1C1A17` | most actions |
| `--brand` | `#B23A17` | lead CTA, active nav, focus ring |
| `--success` / `--warning` / `--destructive` / `--info` | `#2F7A55` / `#A66A12` / `#C1352B` / `#1F6F78` | status |

Type is Plus Jakarta Sans for headings and Inter for UI and data. Radius is 8px for controls and
12px for cards. Motion is 150–250ms and honours `prefers-reduced-motion`. Icons are Lucide only.

All seven ClinicalTrials.gov recruitment statuses have distinct tones at AA contrast, because
"Terminated" and "Recruiting" should not read the same at a glance.

**Handoff note:** fonts load from Google Fonts. Self-host them for production to remove the
third-party request.

---

## Contracts

**States.** Every data screen implements loading (a shape-matched skeleton, not a spinner on blank),
empty, error with retry, no-results distinct from empty, and success. The States control forces each
one.

**Validation.** Validates on blur, re-validates while typing once a field has been touched, blocks
submit with a linked error summary. Required fields mirror the legacy exactly — the red chip strips
in the screenshots enumerate them per section.

**Accessibility.** Semantic landmarks and a skip link on every shell; every control labelled;
a single visible focus ring defined once in `globals.css`; full keyboard operation including the
combobox (ARIA combobox pattern with `aria-activedescendant`) and multi-select; ≥44px touch targets;
contrast ≥4.5:1; `role="alert"` on errors and `aria-live` on async results; focus moves to the page
heading on route change and is trapped in dialogs.

**Responsive.** 375 / 640 / 768 / 1024 / 1440. The sidebar collapses to a focus-trapped sheet below
1024. Data tables become stacked definition lists below 768 rather than scrolling off the side. The
wizard stepper becomes a labelled progress bar on mobile. No fixed pixel widths.

---

## Old → new selector map

The Playwright specs targeted the legacy DOM. Where the redesign allowed, accessible names were kept
so a spec can be repointed with a URL change. Where a legacy interaction was itself the problem, it
is gone — those rows need a spec rewrite.

### Kept

| Legacy selector | Still works |
| --- | --- |
| `getByRole('button', { name: 'Log in' })` | yes |
| `getByRole('link', { name: 'Studies' })` | yes — sidebar |
| `getByRole('link', { name: 'Forms' })` | yes — sidebar |
| `getByRole('button', { name: 'NEXT' })` | yes — "Next" |
| `getByRole('button', { name: 'FINISH' })` | yes — "Finish" |
| `getByRole('button', { name: 'Proceed with Promote' })` | yes |
| `getByRole('button', { name: 'Validate' \| 'Reject' \| 'Recruit' })` | yes |
| `getByRole('button', { name: 'Add Question' })` | yes |
| `getByRole('button', { name: 'Save as draft' })` | yes |
| `getByRole('button', { name: 'Publish' })` | yes |
| `getByRole('button', { name: 'Sign Up', exact: true })` | yes |
| `getByRole('button', { name: 'Complete Sign Up' })` | yes |
| `heading` matching `/Your Participant ID : PT\d{6}/` | yes |
| `input[name="condition"]` | yes — trial search |
| `input[name="firstname" \| "lastname" \| "email" \| "phone" \| "city" \| "zipcode"]` | yes |
| `select[name="gender" \| "smokingstatus" \| "primarylanguage"]` | yes |
| `textarea[name="healthcondition"]` | yes |
| `checkbox` "I consent to receive periodic notifications…" | yes |
| `checkbox` "I have read and accept the…" | yes |
| `#study-nct` | yes — create-study NCT field |
| `#btnYesPromote` / `#btnNoPromote` | yes — promote radio cards |
| `#symptoms` / `#location` / `#research` / `#age` | yes — promotion list inputs |
| `#field_start_date_time` | yes — publish start date |

### Changed, deliberately

| Legacy | Now | Why |
| --- | --- | --- |
| `getByPlaceholder('User Email')` | `#email`, label "Email address", `data-testid="user-email"` | a placeholder is not a label |
| `getByPlaceholder('Password')` | `#password`, label "Password" | same |
| `#iframe` + `frameLocator` | routed pages under `/studies/:id/*` | the iframe was the source of most spec fragility |
| `getByRole('link', { name: 'Lookup using list' })` + `waitForEvent('popup')` | `Combobox`, `role="combobox"` | no popup window to wait for |
| `getByLabel('Collection')` + "Add selected options to the…" | `MultiSelect` checkboxes, then "Save changes" | opaque `sys_id` options replaced by names |
| `#sysverb_insert` / `#sysverb_update` / `#sysverb_insert_bottom` | named submit buttons per form | platform verbs are not user actions |
| "Unlock Appointment" → popup → "Lock Appointment With" | one "Assign to" combobox | three steps existed for the record model, not the user |
| `#active` tab on the studies list | `StatTile` with `aria-pressed`, `?status=active` | the filter is now stated and linkable |
| `Choices` textbox taking `Yes\|No` | `ListInput`, one entry per option | a delimiter is not a data structure |
| `Desired Answer` free text | `Select` of the entered choices | cannot drift from the options |
| `iframe[title="Rich Text Area"]` (TinyMCE) | `RichTextField` textarea + `-`/`1.` prefixes | no editor iframe to reach into |
| `Preview` button opening a popup | inline live preview | popups get blocked; the preview belongs beside the form |
| native `dialog` on sign-up failure | inline `Alert` with `role="alert"` | `page.on('dialog')` is not an error state |
| `Back` returning to the studies index after each triage decision | queue keeps its place | the navigation was the bug |

Stable `data-testid` attributes are on the login fields; the rest are reachable by role and name.

---

## What is mocked, and what a backend would need to provide

Everything is in-memory and resets on a hard reload. `data/api.ts` is shaped like the real thing, so
each of these is an endpoint rather than a redesign:

- **Authentication.** Any known email with a six-character password signs in. Real sign-in, password
  reset and session expiry are backend concerns.
- **ClinicalTrials.gov lookup.** `REGISTRY` in `data/api.ts` holds six NCT numbers; anything else
  reports "not found", which is the error branch the legacy spec exercised. The create-study and
  raise-request screens list the numbers that resolve.
- **File uploads.** File names are recorded; nothing is stored.
- **Email.** Invitations and password resets report success without sending anything.
- **CAPTCHA.** The legacy registration form had an "I'm not a robot" widget. A non-functional
  imitation would be worse than none, so it is omitted — this is an integration point at handoff.
- **Audit trail.** The mandatory note on an investigator change is captured and validated but not
  persisted anywhere a monitor could read it.

## What was verified

Driven in a real browser against the dev server, not by inspection:

- All 28 routes render with a page heading, no console errors, and no horizontal
  overflow at 375 / 768 / 1440.
- Create study: duplicate NCT, unknown NCT, and the success path through both the
  promote-yes (with live preview and validation gate) and promote-no branches.
- Studies search: match, no-match, and clear-filters recovery.
- Participant sign-up: blocked when pre-screening is unanswered, the "not a
  match" outcome when an answer disqualifies, the success path issuing a
  `PT######` id, the terms gate, and the duplicate-email failure inline.
- Onboarding: submit with missing required fields produces a linked summary that
  moves focus to the offending field.
- Form builder: the title gate, and publish blocked both with no questions and
  with an incomplete question.
- Role gating as Clinical Staff across six screens: triage actions, create
  buttons, PI assignment and request responses all correctly withheld.
- All four system states via the States control and `?sim=`.
- Combobox keyboard: arrow keys, Home/End, Enter to select, Escape to close with
  focus returned to the trigger.
- Mobile navigation sheet: focus trapped on open, restored to the trigger on
  close, no orphaned overlay.

Three defects were found and fixed during this pass: popovers and dialogs stayed
mounted after closing (entry animations were not gated on Radix's `data-state`,
so its presence check waited for an exit animation that never ran); the public
header overflowed at 375px; and closing the mobile navigation dropped focus to
the body.

Screenshots could not be captured — the browser pane was not composited in this
environment.

## Reconstructed screens

The legacy sidebar listed three destinations that no screenshot or spec in the source material shows:
**Dashboard**, **Site Hierarchy** and **Question Groups**. Rather than invent them silently, each is
designed from records the app already holds and carries a visible "Proposed screen" notice, and each
is marked **New** in the sidebar. They are proposals for review, not reconstructions of something
that was seen.
