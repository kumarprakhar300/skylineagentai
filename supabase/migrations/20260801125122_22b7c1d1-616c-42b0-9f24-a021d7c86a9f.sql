DROP POLICY "Demo: anyone can create calls" ON public.calls;
DROP POLICY "Demo: anyone can update calls" ON public.calls;
DROP POLICY "Demo: anyone can create leads" ON public.leads;
DROP POLICY "Demo: anyone can update leads" ON public.leads;

REVOKE INSERT, UPDATE ON public.calls FROM anon, authenticated;
REVOKE INSERT, UPDATE ON public.leads FROM anon, authenticated;