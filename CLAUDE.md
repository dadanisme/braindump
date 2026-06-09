# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — Vite dev server. **Do not run this** to verify changes; the user keeps their own dev server running. Use `pnpm build` instead.
- `pnpm build` — `tsc -b && vite build`. Use this to verify type-checking and that the app compiles.
- `pnpm lint` — ESLint (flat config in `eslint.config.js`).
- No test suite is configured.

Package manager is pnpm (`packageManager: pnpm@10.11.1`). Path alias: `@/*` → `./src/*` (wired in both `tsconfig.app.json` and `vite.config.ts`).

## Stack

React 19 + TypeScript + Vite 8, Tailwind 3 with shadcn/ui (New York style, Lucide icons, CSS-variable theming in `src/index.css`). State/data: TanStack Query. Backend: Supabase (auth + Postgres with RLS). LLM: OpenRouter chat-completions API called directly from the browser with `fetch` (no SDK; user-selectable model, default `google/gemini-2.5-flash-lite`). Toasts: sonner. Motion: framer-motion.

## Architecture

### Gate chain (src/App.tsx)
`useAuth` → `useOpenRouterKey` → `Board`. The app renders in sequence: loading → `Login` (Supabase email OTP / magic link) → `ApiKeyModal` (user pastes their own OpenRouter key, stored in `localStorage` under `openrouter_api_key`) → `Board`. A `DesktopOnlyNotice` hides the UI below the `lg` breakpoint — this app is intentionally desktop-only.

Sessions come from Supabase auth; there is no server-side API. The OpenRouter key lives purely in the browser and is sent directly from the client to OpenRouter — never routed through Supabase. Do not add a backend proxy without discussing with the user.

### Data model (supabase/migrations/20260424000000_init.sql)
Four tables, all RLS-gated on `auth.uid() = user_id`:
- `notes` — the raw dump the user pasted.
- `items` — one note explodes into N items of `type ∈ {idea, action, key_point}`. Exactly one `idea` per note (enforced by the extraction prompt, not the schema). `deadline` is only meaningful for actions. `done` only applies meaningfully to actions.
- `topics` — user-scoped tag list, unique on `(user_id, name)`.
- `item_topics` — many-to-many join.

Cascading deletes: deleting a note cascades to its items; deleting an item cascades to its `item_topics` rows. Topics are never auto-deleted when they become empty.

### OpenRouter classifier (src/lib/openrouter.ts)
`extractItems()` wraps a single `POST /chat/completions` call with a strict `json_schema` `response_format` and a long system instruction. The request always sends `provider: { require_parameters: true }` so multi-provider models never route to a host that silently ignores the schema — keep that. Errors can arrive as HTTP 200 with an `error` body or `finish_reason: "error"` (mid-generation provider failures), so the body is checked before the content is parsed. Invariants encoded in the prompt that the code and UI assume:
- Output is always **exactly one `idea`** plus 0..N `action`/`key_point` items.
- Content must stay in the dump's original language (Indonesian / English / code-switched) — never translate.
- Topics are reused by exact casing/spelling from the existing topic list, which `useExtractDump` passes in from the cached items. Adding new topic creation logic that bypasses this list will cause duplicate/variant topics.
- Deadlines are only resolved for `action` items, using the current ISO time + `Asia/Jakarta` timezone (hardcoded in `useExtractDump`).

When editing the prompt, keep the schema and code in sync — `ExtractResponse` in `src/lib/types.ts` mirrors the schema exactly.

Model selection: stored in `localStorage` under `openrouter_model` (`useModelSetting`), default `DEFAULT_MODEL` in `src/lib/openrouter.ts`. The picker in `SettingsPanel` lists models from `GET /api/v1/models?supported_parameters=structured_outputs` (`useOpenRouterModels`, no auth, cached 24h) — only structured-output-capable models, so don't relax that filter. Per-call cost is taken from the response's `usage.cost` (exact billed USD) and logged to the `ai_usage` table — there is no client-side pricing table.

### Board and filters (src/components/Board.tsx)
Three fixed columns: Ideas / Action items / Key points. The board is a single `useItems(userId)` query that fetches items + topics + joins in parallel and stitches them client-side into `ItemWithTopics[]`. Filter state (text query + selected topic names) lives in `FiltersProvider`; item-level callbacks (`onUpdate`, `onDelete`, `onOpenRaw`) flow through `BoardActionsProvider` so `ItemCard` does not need to be prop-drilled.

Mutations in `src/hooks/useItems.ts` (`useUpdateItem`, `useDeleteItem`, `useDeleteNote`, `useExtractDump`) all use optimistic updates against the `['items', userId]` query key with rollback on error. When adding new mutations that touch items/notes/topics, follow the same `onMutate` / `onError` / `onSettled` pattern or the board will show stale state.

### Hotkeys (src/hooks/useFocusHotkey.ts)
- Double-tap a configurable modifier (default Right Option, stored in `localStorage` as `focus_hotkey`) focuses the brain-dump textarea.
- `/` focuses the textarea when not already in an editable field.
- `Cmd/Ctrl+K` focuses the search input.

The focus-hotkey detection rejects the tap if any *other* modifier is held, so it must run on `keydown`/`keyup` pairs — don't collapse it into a single `keydown` handler.

## Environment

`.env.local` must define `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; `src/lib/supabase.ts` throws at import time if either is missing. The OpenRouter API key is **not** an env var — it's entered by the user into the in-app modal.
