-- Reports carry only what the reporter chose to attach (paths in a private area).
alter table public.reports add column attachment_paths text[] not null default '{}' check (cardinality(attachment_paths) <= 5);
