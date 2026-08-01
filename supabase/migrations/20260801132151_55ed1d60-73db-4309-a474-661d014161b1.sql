ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_band text NOT NULL DEFAULT 'cold',
  ADD COLUMN IF NOT EXISTS score_reasons jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS leads_score_idx ON public.leads (score DESC);