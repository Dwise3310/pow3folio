alter table profiles add column if not exists extra_wallets jsonb default '[]'::jsonb;
alter table profiles add column if not exists custom_chains jsonb default '[]'::jsonb;
alter table profiles add column if not exists last_wallet_scan_at timestamptz;
alter table profiles add column if not exists public_chain_ids jsonb;
alter table profiles add column if not exists imported_tokens jsonb default '[]'::jsonb;
