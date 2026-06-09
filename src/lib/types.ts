export type ItemType = 'idea' | 'action' | 'key_point';

export type NoteRow = {
  id: string;
  user_id: string;
  raw_text: string;
  created_at: string;
};

export type TopicRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type ItemRow = {
  id: string;
  note_id: string;
  user_id: string;
  type: ItemType;
  content: string;
  deadline: string | null;
  done: boolean;
  created_at: string;
};

export type ItemTopicRow = {
  item_id: string;
  topic_id: string;
};

export type ItemWithTopics = ItemRow & {
  topics: TopicRow[];
};

export type ExtractedItem = {
  type: ItemType;
  content: string;
  deadline: string | null;
  topics: string[];
};

export type ExtractResponse = {
  items: ExtractedItem[];
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type AiUsageStatus = 'success' | 'error';

export type AiUsageRow = {
  id: string;
  user_id: string;
  note_id: string | null;
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  fx_rate_idr: number;
  status: AiUsageStatus;
  error_message: string | null;
  created_at: string;
};
