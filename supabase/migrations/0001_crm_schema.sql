-- Vetray CRM: WhatsApp chatbot + CRM base schema

create extension if not exists pgcrypto;

-- Panel users (sales team), linked to auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'agent' check (role in ('admin','agent')),
  created_at timestamptz not null default now()
);

-- WhatsApp contacts / leads
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  wa_number text not null unique,            -- e.g. 905xxxxxxxxx
  name text,
  company text,
  email text,
  stage text not null default 'new'
    check (stage in ('new','contacted','qualified','proposal','won','lost')),
  tags text[] not null default '{}',
  owner_id uuid references public.profiles(id) on delete set null,
  is_personal boolean not null default false, -- true = bot never replies (personal chats on her own number)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One open conversation per contact; bot or human handles it
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  status text not null default 'bot' check (status in ('bot','human','closed')),
  last_message_at timestamptz,
  next_followup_at timestamptz,               -- 6h / 24h follow-up scheduler
  followup_count int not null default 0,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  sender text not null check (sender in ('contact','bot','human')),
  body text,
  media_url text,
  wa_message_id text unique,                  -- Evolution message id, dedupe
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

-- Single-row bot configuration
create table public.bot_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,
  system_prompt text not null default '',
  business_info text not null default '',
  work_hours jsonb not null default '{"start":"09:00","end":"18:00","days":[1,2,3,4,5],"tz":"Europe/Istanbul"}',
  reply_only_unknown boolean not null default true, -- protects personal chats
  updated_at timestamptz not null default now()
);
insert into public.bot_settings (id) values (1);

create table public.quick_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index on public.conversations (contact_id);
create index on public.conversations (next_followup_at) where status = 'bot';
create index on public.messages (conversation_id, created_at);
create index on public.notes (contact_id);

-- RLS: only signed-in panel users; bot/webhook uses service role (bypasses RLS)
alter table public.profiles      enable row level security;
alter table public.contacts      enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.notes         enable row level security;
alter table public.bot_settings  enable row level security;
alter table public.quick_replies enable row level security;

create policy "own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "team access" on public.contacts      for all to authenticated using (true) with check (true);
create policy "team access" on public.conversations for all to authenticated using (true) with check (true);
create policy "team access" on public.messages      for all to authenticated using (true) with check (true);
create policy "team access" on public.notes         for all to authenticated using (true) with check (true);
create policy "team access" on public.bot_settings  for all to authenticated using (true) with check (true);
create policy "team access" on public.quick_replies for all to authenticated using (true) with check (true);
