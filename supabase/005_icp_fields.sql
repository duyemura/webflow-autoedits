-- Add ICP (Ideal Customer Profile) fields to site_config
alter table site_config
  add column if not exists icp_avatar text,
  add column if not exists icp_trigger text,
  add column if not exists icp_fear text,
  add column if not exists icp_desire text,
  add column if not exists icp_objection text,
  add column if not exists icp_identity text;
