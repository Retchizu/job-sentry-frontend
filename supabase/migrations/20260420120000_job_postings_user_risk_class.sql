-- FE-TICKET-004: reviewer three-class label (aligned with multiclass indices: 0=legit, 1=warning, 2=fraud).
-- fraudulent remains 0|1 with fraudulent=1 iff user_risk_class=2 (compatibility for binary tooling).

alter table public.job_postings
  add column user_risk_class smallint not null default 0;

alter table public.job_postings
  add constraint job_postings_user_risk_class_check check (user_risk_class in (0, 1, 2));

comment on column public.job_postings.user_risk_class is
  'Reviewer risk class: 0=legit, 1=warning, 2=fraud (matches PredictResponse.predicted_class indices).';

-- Legacy rows: binary fraudulent only → legit (0) or fraud (2); no historical warning tier.
update public.job_postings
set user_risk_class = case when fraudulent = 1 then 2 else 0 end;
