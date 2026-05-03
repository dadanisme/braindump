create table ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid references notes(id) on delete set null,
  model_name text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  cost_usd numeric(14, 8) not null default 0,
  fx_rate_idr numeric(14, 4) not null,
  status text not null check (status in ('success', 'error')),
  error_message text,
  created_at timestamptz not null default now()
);

create index on ai_usage (user_id, created_at desc);
create index on ai_usage (note_id);

alter table ai_usage enable row level security;

create policy "own ai_usage" on ai_usage
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table currency_rates (
  base text not null,
  target text not null,
  rate numeric(14, 4) not null,
  fetched_at timestamptz not null default now(),
  primary key (base, target)
);

alter table currency_rates enable row level security;

create policy "currency_rates auth read" on currency_rates
  for select using (auth.role() = 'authenticated');
create policy "currency_rates auth insert" on currency_rates
  for insert with check (auth.role() = 'authenticated');
create policy "currency_rates auth update" on currency_rates
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
