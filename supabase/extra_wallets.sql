alter table profiles add column if not exists extra_wallets jsonb default '[]'::jsonb;
alter table profiles add column if not exists custom_chains jsonb default '[]'::jsonb;
alter table profiles add column if not exists last_wallet_scan_at timestamptz;
