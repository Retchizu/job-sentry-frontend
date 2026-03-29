-- Free-text detail when reviewers flag "other suspicious patterns" on the improvement flow.

alter table public.job_postings
  add column other_suspicious_patterns_note text;
