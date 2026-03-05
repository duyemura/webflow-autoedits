-- Add PushPress credentials to site_config
alter table site_config add column if not exists pp_api_key text;
alter table site_config add column if not exists pp_company_id text;
