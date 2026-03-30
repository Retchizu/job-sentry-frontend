-- Free-text detail when reviewers flag "other suspicious patterns" (column renamed for clarity).

alter table public.job_postings
  rename column other_suspicious_patterns_note to warnings;
