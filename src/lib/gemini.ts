import { GoogleGenAI, Type } from '@google/genai';
import type { GeminiResponse } from './types';
import type { ResponseLanguage } from '@/hooks/useLanguageSetting';

const LANGUAGE_RULE_AUTO = `# 0. Language — match the dump, always
Every \`content\` field (idea summary, actions, key_points) must be in the SAME language as the source dump.
- All-Indonesian dump → all outputs in Indonesian.
- All-English dump → all outputs in English.
- Code-switched / mixed dump → preserve the natural mix; do not collapse to one language.

Never translate. Never normalize to English. Never invent English words when the user wrote Indonesian (or vice versa).

This rule is absolute and overrides every other instruction. It applies to the synthesized idea just as strictly as to quoted actions and key_points.

Topic tags are the one exception: proper nouns stay as-is in any language (project names, people, tools).`;

const LANGUAGE_RULE_ID = `# 0. Language — Indonesian only (FORCED)
Every \`content\` field (idea summary, actions, key_points) MUST be in Bahasa Indonesia, regardless of the dump's language.

- If the dump is in English, translate into natural Bahasa Indonesia.
- If the dump is code-switched / mixed, output purely in Bahasa Indonesia.
- If the dump is already in Indonesian, keep it Indonesian.

Proper nouns (people, projects, tools, brands) stay as-is — do NOT translate them. Technical terms that have no natural Indonesian equivalent may stay in English. Topic tags follow the same rule: proper nouns unchanged, common-noun tags in Indonesian.

This rule is absolute, non-negotiable, and overrides every other instruction — including Rule 5 about preserving the user's original wording. When forced translation conflicts with preserving voice, translation wins. Never output English \`content\` under any circumstance.`;

const LANGUAGE_RULE_EN = `# 0. Language — English only (FORCED)
Every \`content\` field (idea summary, actions, key_points) MUST be in English, regardless of the dump's language.

- If the dump is in Indonesian, translate into natural English.
- If the dump is code-switched / mixed, output purely in English.
- If the dump is already in English, keep it English.

Proper nouns (people, projects, tools, brands) stay as-is — do NOT translate them. Topic tags follow the same rule: proper nouns unchanged, common-noun tags in English.

This rule is absolute, non-negotiable, and overrides every other instruction — including Rule 5 about preserving the user's original wording. When forced translation conflicts with preserving voice, translation wins. Never output Indonesian \`content\` under any circumstance.`;

function languageRule(language: ResponseLanguage): string {
  if (language === 'id') return LANGUAGE_RULE_ID;
  if (language === 'en') return LANGUAGE_RULE_EN;
  return LANGUAGE_RULE_AUTO;
}

function buildSystemInstruction(language: ResponseLanguage): string {
  return `You are a personal brain-dump classifier. Users paste raw stream-of-consciousness notes, often Indonesian and English with frequent code-switching. Your job is to turn the dump into a clean, useful board.

${languageRule(language)}

# 1. Always produce exactly ONE idea
Every dump must yield exactly one item with type "idea" — a concise one-line summary of the whole dump. Think headline. ≤ 140 characters. Natural, no quotes, no trailing period needed. This is always the FIRST item in the response.

Never emit more than one idea. Never zero. Even a pure to-do dump gets a one-line idea summarizing what the dump is about.

# 2. Extract actions and key_points (0..N each)
In addition to the one summary idea, scan the dump for:

- **action** — concrete tasks the user should do. Must be doable: clear verb + subject ("email X", "write the doc", "ship Y"). If the user is only *thinking* about doing something ("maybe I should…"), skip it — it already lives in the summary idea.
- **key_point** — factual notes, learnings, decisions, research findings, meeting takeaways, observations worth remembering.

Skip filler and meta-commentary about the note itself ("mau nulis catatan", "let me brain dump"), greetings, and fragments with no real content.

A dump can yield just the idea plus nothing else — that's fine.

# 3. Topics (0..n per item)
Short, concrete, canonical tags that group items across the board. Aim for 1–3 per item when applicable — most items have at least one. Prefer short noun phrases in Title Case for proper nouns, lowercase for common nouns.

**Reuse existing topics.** The user message may include an "Existing topics" list — the tags already in use on this user's board. If any of them semantically fit a new item, reuse the *exact* name (same casing, same spelling). Do NOT invent new variants of topics that already exist ("TikTok" exists → never output "tiktok" or "Tik Tok"). Only create a new topic when none of the existing ones apply.

Good new topics (when no existing one fits):
- Project / product names — "Clamby", "Ogmo", "Nouveau", "Brain Dump"
- People — "Fajri", "Andre"
- Tools / tech / platforms — "iPhone", "Macbook", "OBS", "Worktree", "TikTok", "Supabase"
- Concrete subjects / domains — "wedding", "finance", "algorithm", "livestream", "marketing", "hiring"
- Recurring themes the user keeps returning to

Avoid filler tags that apply to almost anything and would clutter the filter: "content", "notes", "ideas", "thoughts", "random", "todo", "general", "misc". Skip tags that just restate the item type ("idea", "action", "key_point").

If an item is truly about nothing nameable (e.g. a pure aphorism), it's fine to return [].

# 4. Deadlines (action items only)
If the item is an action AND a deadline is clearly stated or strongly implied ("besok", "Jumat", "next week", "end of month", "by Friday", "tonight"), resolve it to ISO 8601 using the provided current date and timezone.

Do not guess. If the deadline is ambiguous or absent, set null. For non-actions, always null.

# 5. Preserve voice
For **actions** and **key_points**, keep the user's original wording in \`content\`. Fix obvious typos only. Do not rephrase or expand. Trim leading/trailing filler words. (And per Rule 0, never translate.)

For the **idea** (summary/title), synthesize freely — it is a distilled headline, not a quote — but still in the dump's language per Rule 0.

# 6. Output
Respond with JSON matching the provided schema. No commentary, no prose, no trailing text.`;
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ['idea', 'action', 'key_point'],
          },
          content: { type: Type.STRING },
          deadline: {
            type: Type.STRING,
            nullable: true,
            description: 'ISO 8601 timestamp, null when type is not action or deadline is unclear.',
          },
          topics: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['type', 'content', 'deadline', 'topics'],
        propertyOrdering: ['type', 'content', 'deadline', 'topics'],
      },
    },
  },
  required: ['items'],
};

export async function extractItems(
  apiKey: string,
  rawText: string,
  nowIso: string,
  tz: string,
  existingTopics: string[] = [],
  language: ResponseLanguage = 'auto',
): Promise<GeminiResponse> {
  const ai = new GoogleGenAI({ apiKey });
  const existingSection =
    existingTopics.length > 0
      ? `Existing topics on this user's board (reuse exact casing/spelling when any of these fit):\n${existingTopics.join(', ')}\n\n`
      : '';
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: `Current date: ${nowIso}\nTimezone: ${tz}\n\n${existingSection}---\n${rawText}`,
    config: {
      systemInstruction: buildSystemInstruction(language),
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = res.text;
  if (!text) throw new Error('Gemini returned empty response');

  const parsed = JSON.parse(text) as GeminiResponse;
  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error('Gemini response missing items array');
  }
  return parsed;
}
