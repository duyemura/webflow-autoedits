-- Add is_landing flag to pages table
alter table pages add column if not exists is_landing boolean default false;
