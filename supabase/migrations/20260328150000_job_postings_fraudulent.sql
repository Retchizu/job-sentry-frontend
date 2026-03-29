-- 0 = not fraudulent, 1 = fraudulent (matches app FraudulentFlag / insert-job-posting.ts).

alter table public.job_postings
  add column fraudulent smallint not null default 0
  check (fraudulent in (0, 1));
