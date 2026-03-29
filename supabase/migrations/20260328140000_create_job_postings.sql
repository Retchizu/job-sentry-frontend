-- Job postings persisted from the improvement flow (service-role inserts; RLS on with no anon policies yet).

create table public.job_postings (
  id uuid primary key default gen_random_uuid(),
  job_title text,
  job_desc text,
  skills_desc text,
  company_profile text,
  rate_min numeric,
  rate_max numeric,
  currency text,
  rate_type text,
  created_at timestamptz not null default now()
);

comment on table public.job_postings is 'Structured job posting fields from predict/improvement flow.';

alter table public.job_postings enable row level security;
