# CLAUDE.md — PatienTrials Site Portal

Frontend rules for this project. Adapted from the house frontend-rules template,
corrected for this project's stack and its guiding direction.

## Guiding Direction (read this first)

**Preserve the functionality, redesign the experience.** This app replaces a
legacy ServiceNow site portal + a participant funnel. The screenshots and the
Playwright specs are the **legacy system being replaced** — they define *what
workflows exist and how they behave*, NOT how the UI should look.

- **Behaviour is the contract.** Every workflow proven by the legacy Playwright
  suite must survive. Those specs are **external reference** the user holds (from
  the `site_validations` zip) — they are not in this repo. The authoritative,
  in-repo record of which selectors to preserve is **`README.md` → "Old → new
  selector map"**; read it before touching navigation, forms, or the studies /
  participants screens. Keep the accessible names and ids it lists (`SITE
  SOLUTION`, `Studies`, `New Study Request`, `#active`, `#create-study`,
  `#btnYesPromote`, `#addlocation`, `getByRole('button', { name: study_id })`,
  the `Your Participant ID : PT######` heading, …). If you must break one, update
  that map.
- **Look and arrangement are ours.** Do NOT reproduce the legacy visuals or
  information architecture. Modernise them. This is a data-dense clinical
  enterprise console, not a marketing page — think Veeva Vault / Medidata Rave /
  Linear, not a landing page.
- Do not narrow or widen the requested scope. Build the actual ask.

## Always Do First

- **Invoke a design skill before writing or restyling any frontend, every
  session.** Primary: **`frontend-design`** (Anthropic's craft skill — install
  commands below if it is not available). Companion: **`ui-ux-pro-max`** (the
  searchable design database). For reviews: `design:design-critique` and
  `design:accessibility-review`.
- Use `frontend-design` for craft — spacing, type, color, states, polish. Do
  NOT adopt its default output conventions (single `index.html`, Tailwind via
  CDN, "match the reference exactly"): those are for from-scratch landing pages
  and conflict with this project's multi-file Vite app and its "modernize, don't
  reproduce" direction. The Stack and Guiding Direction sections here win.

## Design Skills & MCP

**`frontend-design` skill (Anthropic plugin).** Hands-on frontend craft. If it
is not installed in this session, add the marketplace and install it (these are
interactive Claude Code commands — run them in the terminal, they cannot be run
non-interactively):
```
/plugin marketplace add anthropics/claude-code
/plugin install frontend-design@claude-code-plugins
```
Use it for design execution and polish. It ships defaults for standalone pages
(single-file HTML, Tailwind CDN, screenshot-match-the-reference) — ignore those
here; obey this file's Stack, Guiding Direction, and guardrails instead.

**`ui-ux-pro-max` skill (installed from Git).** A searchable design database —
84 styles, 192 palettes, 74 font pairings, 192 product types, 98 UX guidelines,
GSAP presets, chart types across 22 stacks. Installed personally, not a plugin.

- Lives at `C:\Users\Nithin Reddy\.claude\skills\ui-ux-pro-max`.
- Invoke via the Skill tool (`ui-ux-pro-max`), or run its search directly — the
  script path is hardcoded to the skill dir, so always call it by full path:
  ```
  python "C:/Users/Nithin Reddy/.claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --design-system --density 8 -p "PatienTrials Site Portal"
  ```
  Use `--density 8` (dense/dashboard) for the console; drop it for the
  participant funnel. `--domain ux|color|typography|chart|...` deep-dives one
  dimension.

**21st.dev MCP (component-generation MCP).** HTTP MCP for pulling modern
component patterns/snippets.

- Config lives at `N:\ui_ux\.mcp.json` — server name `21st`, type `http`, url
  `https://21st.dev/api/mcp`, authed with an `x-api-key`. **The key is a secret;
  keep it in that file, never paste it into source or docs.**
- It is **project-scoped to `N:\ui_ux`**, so it is NOT connected in this project
  by default. To use it here, copy the `21st` server block into a `.mcp.json` at
  this project's root and approve it once by running `claude` from this folder
  (or `/mcp` in an interactive session). MCP OAuth/approval cannot be done in a
  non-interactive session — tell the user to approve it.
- Treat its output as reference to adapt into our token system + component
  layering, not as drop-in code. It must still obey the guardrails below.

## SEO (OpenSEO)

**`openseo` plugin + MCP.** Keyword research, competitor/backlink data and site
audits. Installed at **user scope**, so it is available in every project, not
just this one.

- Plugin `openseo@openseo` from marketplace `every-app/open-seo`. Ships nine
  skills, invoked namespaced: `/openseo:seo-audit`, `/openseo:keyword-research`,
  `/openseo:seo-project-setup`, `/openseo:local-seo`,
  `/openseo:competitor-analysis`, `/openseo:competitive-landscape`,
  `/openseo:keyword-clustering`, `/openseo:link-prospecting`,
  `/openseo:seo-coach`.
- MCP server `plugin:openseo:openseo` → `https://app.openseo.so/mcp`, OAuth.
  Sign-in is interactive only (`/mcp` in a terminal session) — it cannot be done
  non-interactively. A connected server is not proof this session can call it;
  the tools only load in a session started **after** sign-in.
- **It is a paid service (~$10/month).** `whoami` and `list_projects` are free
  reads; research and audits are not. Do not fire paid workflows to "check if it
  works", and do not run them without being asked.

**Only part of this app is in scope.** Everything under `ProtectedRoute` —
studies, subjects, forms, the whole staff console — is behind a login and
invisible to crawlers. SEO applies solely to the participant path:

```
/login  /register  /find-trials  /trials/:nctId  /trials/:nctId/sign-up  /about
```

**Fix the meta tags before acting on any SEO advice.** This is a client-rendered
SPA with a single `index.html`, so every one of those routes serves the same
`<title>` and `<meta name="description">`. A crawler cannot tell `/about` from an
individual trial page. Per-route metadata (and structured data on trial pages)
has to come first — keyword work on top of one shared title changes nothing.

## Stack (do not drift from this)

- React 19 + TypeScript + Vite + Tailwind (via PostCSS) + Radix primitives +
  lucide-react. No CDN Tailwind. No single-file HTML.
- **Design tokens are the source of truth**: `src/styles/globals.css` defines
  the palette/radius/density as CSS variables; `tailwind.config.ts` maps them.
  Change a colour in one place, never with raw hex in components.
- **`src/data/api.ts` is the only seam** between UI and data. Every screen reads
  through `useAsync` / writes through `useAction`. A real backend replaces this
  one file. Never fetch or hardcode data inside a component.
- Layering: `styles → ui → patterns + layout → features → data`. Features never
  import each other; shared behaviour moves down into `patterns`.
- Fonts: Plus Jakarta Sans (display) + Inter (sans/data), via Google Fonts.

## Local Server & Verification

- **Serve on localhost** — never verify a `file:///` URL.
- Start the dev server: `npm run dev` (Vite, `http://localhost:5177`). If it is
  already running, do not start a second instance.
- Verify through the Browser MCP tools against the running server: `read_page`,
  `javascript_tool`, `read_console_messages`, `resize_window`. Screenshot with
  `computer { action: "screenshot" }` where the pane composites.
- **Iterate at least 2 rounds.** After a visual change, inspect the result, name
  the mismatches specifically ("row height 56px, should be 48px"; "brand blue is
  reading purple"), fix, re-inspect. Stop only when clean or the user says so.
- Before finishing frontend work: `npm run typecheck` and `npm run lint` clean,
  and check `read_console_messages` for errors.

## Anti-Generic Guardrails

- **Colors:** custom token palette only — never raw default Tailwind classes
  (`blue-600`, `indigo-500`) in components. Derive from the tokens.
- **Density:** this is a console. Enterprise control heights (32–36px), hairline
  1px borders, shadows reserved for things that float (dialogs, popovers,
  panels) — not on every static card. Do NOT add radial gradients, grain, or
  image blend overlays; those belong on a marketing page, not here.
- **Typography:** display font for headings, sans for body/data. Tabular numbers
  for counts and IDs. Consistent modular type scale.
- **Motion:** animate only `transform` and `opacity`. Never `transition-all`.
  150–300ms. Honour `prefers-reduced-motion`.
- **Interactive states:** every clickable element needs hover, `focus-visible`,
  and active/pressed states. One focus ring, defined once in `globals.css`.
- **Depth:** a layering system (canvas → card → floating), not everything on one
  z-plane.

## Non-Negotiable Contracts

- **States:** every data screen implements loading (shape-matched skeleton),
  empty, error+retry, no-results (distinct from empty), success. The `States`
  control / `?sim=` forces each one — use it to verify.
- **Validation:** on blur, revalidate on change once touched, block submit with a
  linked error summary that moves focus to the field. Errors announced via
  `role="alert"`.
- **Accessibility:** semantic landmarks + skip link, every control labelled,
  full keyboard operation (incl. combobox, multi-select, data grid), ≥44px touch
  targets on the participant funnel, contrast ≥4.5:1, focus to the heading on
  route change, focus trapped in dialogs.
- **Responsive:** 375 / 768 / 1024 / 1440. Sidebar → sheet under 1024. Data grids
  scroll inside their own container and reflow to stacked cards under 768 — the
  page body never scrolls horizontally.

## Hard Rules

- Preserve every workflow the Playwright specs cover; keep their selectors.
- Do NOT reproduce the legacy visuals or IA — modernise them.
- Do not put data-fetching or hardcoded data in components; go through `data/api.ts`.
- Do not use `transition-all`.
- Do not use raw default Tailwind palette classes as brand colour; use tokens.
- Do not add sections/features the user did not ask for.
- Do not stop after one verification pass.
