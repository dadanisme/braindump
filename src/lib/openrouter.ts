import type { ExtractResponse, TokenUsage } from './types';
import type { ResponseLanguage } from '@/hooks/useLanguageSetting';

export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_MODEL = 'google/gemini-2.5-flash-lite';

export type ExtractResult = {
  response: ExtractResponse;
  usage: TokenUsage;
  costUsd: number;
  model: string;
};

export class OpenRouterCallError extends Error {
  usage: TokenUsage | null;
  costUsd: number;
  model: string;
  constructor(
    message: string,
    model: string,
    usage: TokenUsage | null,
    costUsd = 0,
  ) {
    super(message);
    this.name = 'OpenRouterCallError';
    this.model = model;
    this.usage = usage;
    this.costUsd = costUsd;
  }
}

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

const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'extracted_items',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['idea', 'action', 'key_point'],
              },
              content: { type: 'string' },
              deadline: {
                type: ['string', 'null'],
                description:
                  'ISO 8601 timestamp, null when type is not action or deadline is unclear.',
              },
              topics: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['type', 'content', 'deadline', 'topics'],
            additionalProperties: false,
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    },
  },
};

type ChatCompletionBody = {
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
  error?: { code?: number | string; message?: string };
};

function readUsage(body: ChatCompletionBody): {
  usage: TokenUsage | null;
  costUsd: number;
} {
  const u = body.usage;
  if (!u || typeof u !== 'object') return { usage: null, costUsd: 0 };
  const inputTokens = u.prompt_tokens ?? 0;
  const outputTokens = u.completion_tokens ?? 0;
  const totalTokens = u.total_tokens ?? inputTokens + outputTokens;
  return {
    usage: { inputTokens, outputTokens, totalTokens },
    costUsd: u.cost ?? 0,
  };
}

export async function extractItems(
  apiKey: string,
  model: string,
  rawText: string,
  nowIso: string,
  tz: string,
  existingTopics: string[] = [],
  language: ResponseLanguage = 'auto',
): Promise<ExtractResult> {
  const existingSection =
    existingTopics.length > 0
      ? `Existing topics on this user's board (reuse exact casing/spelling when any of these fit):\n${existingTopics.join(', ')}\n\n`
      : '';

  const res = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-OpenRouter-Title': 'Brain Dump',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: buildSystemInstruction(language) },
        {
          role: 'user',
          content: `Current date: ${nowIso}\nTimezone: ${tz}\n\n${existingSection}---\n${rawText}`,
        },
      ],
      stream: false,
      // Only route to providers that honor response_format — without this a
      // multi-provider model can land on a host that ignores the schema.
      provider: { require_parameters: true },
      response_format: RESPONSE_FORMAT,
    }),
  });

  let body: ChatCompletionBody;
  try {
    body = (await res.json()) as ChatCompletionBody;
  } catch {
    throw new OpenRouterCallError(
      `OpenRouter returned an unreadable response (HTTP ${res.status})`,
      model,
      null,
    );
  }

  const { usage, costUsd } = readUsage(body);

  // OpenRouter reports mid-generation failures with HTTP 200 + error body,
  // so the body error has to be checked even on ok responses.
  if (!res.ok || body.error) {
    const message =
      body.error?.message ?? `OpenRouter request failed (HTTP ${res.status})`;
    throw new OpenRouterCallError(message, model, usage, costUsd);
  }

  const choice = body.choices?.[0];
  const finishReason = choice?.finish_reason;
  if (finishReason === 'error') {
    throw new OpenRouterCallError(
      'Model provider failed mid-generation',
      model,
      usage,
      costUsd,
    );
  }
  if (finishReason === 'length') {
    throw new OpenRouterCallError(
      'Model response was cut off (output limit reached)',
      model,
      usage,
      costUsd,
    );
  }
  if (finishReason === 'content_filter') {
    throw new OpenRouterCallError(
      'Model provider filtered the response',
      model,
      usage,
      costUsd,
    );
  }

  const text = choice?.message?.content;
  if (!text) {
    throw new OpenRouterCallError(
      'Model returned empty response',
      model,
      usage,
      costUsd,
    );
  }

  let parsed: ExtractResponse;
  try {
    parsed = JSON.parse(text) as ExtractResponse;
  } catch {
    throw new OpenRouterCallError(
      'Model response was not valid JSON',
      model,
      usage,
      costUsd,
    );
  }
  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new OpenRouterCallError(
      'Model response missing items array',
      model,
      usage,
      costUsd,
    );
  }

  return {
    response: parsed,
    usage: usage ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    costUsd,
    model,
  };
}
