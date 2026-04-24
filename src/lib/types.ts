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

export type GeminiItem = {
  type: ItemType;
  content: string;
  deadline: string | null;
  topics: string[];
};

export type GeminiResponse = {
  items: GeminiItem[];
};
