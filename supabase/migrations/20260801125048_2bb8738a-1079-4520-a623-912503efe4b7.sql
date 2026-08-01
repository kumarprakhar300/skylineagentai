CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL DEFAULT 'browser',
  language TEXT,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  intent TEXT,
  location TEXT,
  property_type TEXT,
  configuration TEXT,
  budget TEXT,
  purpose TEXT,
  timeline TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_call_id ON public.leads(call_id);

GRANT SELECT, INSERT, UPDATE ON public.calls TO anon, authenticated;
GRANT ALL ON public.calls TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.leads TO anon, authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demo: anyone can read calls" ON public.calls FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo: anyone can create calls" ON public.calls FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Demo: anyone can update calls" ON public.calls FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Demo: anyone can read leads" ON public.leads FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo: anyone can create leads" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Demo: anyone can update leads" ON public.leads FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();