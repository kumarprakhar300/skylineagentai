ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS draft_lead JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS calls_external_id_key ON public.calls (external_id) WHERE external_id IS NOT NULL;