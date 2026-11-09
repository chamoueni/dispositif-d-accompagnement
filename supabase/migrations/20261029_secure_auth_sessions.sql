create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  previous_token_hash text,
  previous_valid_until timestamptz,
  user_id uuid not null references auth.users (id) on delete cascade,
  tokens_encrypted text not null,
  remember_me boolean not null default false,
  created_at timestamptz not null default now(),
  last_rotated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists auth_sessions_user_id_idx on public.auth_sessions (user_id);
create index if not exists auth_sessions_expires_at_idx on public.auth_sessions (expires_at);

alter table public.auth_sessions enable row level security;
revoke all on public.auth_sessions from anon, authenticated;
