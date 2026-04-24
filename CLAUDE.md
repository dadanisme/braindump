# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — Vite dev server. **Do not run this** to verify changes; the user keeps their own dev server running. Use `pnpm build` instead.
- `pnpm build` — `tsc -b && vite build`. Use this to verify type-checking and that the app compiles.
- `pnpm lint` — ESLint (flat config in `eslint.config.js`).
- No test suite is configured.

Package manager is pnpm (`packageManager: pnpm@10.11.1`). Path alias: `@/*` → `./src/*` (wired in both `tsconfig.app.json` and `vite.config.ts`).

## Stack

React 19 + TypeScript + Vite 8, Tailwind 3 with shadcn/ui (New York style, Lucide icons, CSS-variable theming in `src/index.css`). State/data: TanStack Query. Backend: Supabase (auth + Postgres with RLS). LLM: Google Gemini via `@google/genai` (`gemini-2.5-flash-lite`). Toasts: sonner. Motion: framer-motion.

## Architecture

### Gate chain (src/App.tsx)
`useAuth` → `useGeminiKey` → `Board`. The app renders in sequence: loading → `Login` (Supabase email OTP / magic link) → `ApiKeyModal` (user pastes their own Gemini key, stored in `localStorage` under `gemini_api_key`) → `Board`. A `DesktopOnlyNotice` hides the UI below the `lg` breakpoint — this app is intentionally desktop-only.

Sessions come from Supabase auth; there is no server-side API. The Gemini key lives purely in the browser and is sent directly from the client to Google — never routed through Supabase. Do not add a backend proxy without discussing with the user.

### Data model (supabase/migrations/20260424000000_init.sql)
Four tables, all RLS-gated on `auth.uid() = user_id`:
- `notes` — the raw dump the user pasted.
- `items` — one note explodes into N items of `type ∈ {idea, action, key_point}`. Exactly one `idea` per note (enforced by the Gemini prompt, not the schema). `deadline` is only meaningful for actions. `done` only applies meaningfully to actions.
- `topics` — user-scoped tag list, unique on `(user_id, name)`.
- `item_topics` — many-to-many join.

Cascading deletes: deleting a note cascades to its items; deleting an item cascades to its `item_topics` rows. Topics are never auto-deleted when they become empty.

### Gemini classifier (src/lib/gemini.ts)
`extractItems()` wraps a single `generateContent` call with a strict `responseSchema` and a long system instruction. Invariants encoded in the prompt that the code and UI assume:
- Output is always **exactly one `idea`** plus 0..N `action`/`key_point` items.
- Content must stay in the dump's original language (Indonesian / English / code-switched) — never translate.
- Topics are reused by exact casing/spelling from the existing topic list, which `useExtractDump` passes in from the cached items. Adding new topic creation logic that bypasses this list will cause duplicate/variant topics.
- Deadlines are only resolved for `action` items, using the current ISO time + `Asia/Jakarta` timezone (hardcoded in `useExtractDump`).

When editing the prompt, keep the schema and code in sync — `GeminiResponse` in `src/lib/types.ts` mirrors the schema exactly.

### Board and filters (src/components/Board.tsx)
Three fixed columns: Ideas / Action items / Key points. The board is a single `useItems(userId)` query that fetches items + topics + joins in parallel and stitches them client-side into `ItemWithTopics[]`. Filter state (text query + selected topic names) lives in `FiltersProvider`; item-level callbacks (`onUpdate`, `onDelete`, `onOpenRaw`) flow through `BoardActionsProvider` so `ItemCard` does not need to be prop-drilled.

Mutations in `src/hooks/useItems.ts` (`useUpdateItem`, `useDeleteItem`, `useDeleteNote`, `useExtractDump`) all use optimistic updates against the `['items', userId]` query key with rollback on error. When adding new mutations that touch items/notes/topics, follow the same `onMutate` / `onError` / `onSettled` pattern or the board will show stale state.

### Hotkeys (src/hooks/useFocusHotkey.ts)
- Double-tap a configurable modifier (default Right Option, stored in `localStorage` as `focus_hotkey`) focuses the brain-dump textarea.
- `/` focuses the textarea when not already in an editable field.
- `Cmd/Ctrl+K` focuses the search input.

The focus-hotkey detection rejects the tap if any *other* modifier is held, so it must run on `keydown`/`keyup` pairs — don't collapse it into a single `keydown` handler.

## Environment

`.env.local` must define `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; `src/lib/supabase.ts` throws at import time if either is missing. The Gemini API key is **not** an env var — it's entered by the user into the in-app modal.
