create type item_type as enum ('idea', 'action', 'key_point');

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null,
  created_at timestamptz not null default now()
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table items (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type item_type not null,
  content text not null,
  deadline timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table item_topics (
  item_id uuid not null references items(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (item_id, topic_id)
);

create index on items (user_id, type);
create index on items (user_id, created_at desc);
create index on notes (user_id, created_at desc);
create index on items (user_id, deadline)
  where type = 'action' and deadline is not null;

alter table notes       enable row level security;
alter table topics      enable row level security;
alter table items       enable row level security;
alter table item_topics enable row level security;

create policy "own notes"  on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own topics" on topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own items"  on items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own item_topics" on item_topics
  for all using (
    exists (select 1 from items where items.id = item_id and items.user_id = auth.uid())
  )
  with check (
    exists (select 1 from items where items.id = item_id and items.user_id = auth.uid())
  );
