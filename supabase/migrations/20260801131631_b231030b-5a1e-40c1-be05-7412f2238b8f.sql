CREATE TABLE public.project_catalog (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  name text NOT NULL,
  developer text NOT NULL,
  location text NOT NULL,
  status text NOT NULL DEFAULT '',
  rera_note text NOT NULL DEFAULT '',
  price_range text NOT NULL DEFAULT '',
  possession text NOT NULL DEFAULT '',
  payment_note text NOT NULL DEFAULT '',
  site_visit_note text NOT NULL DEFAULT '',
  configurations jsonb NOT NULL DEFAULT '[]'::jsonb,
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  location_advantages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT project_catalog_singleton_true CHECK (singleton = true)
);

GRANT SELECT ON public.project_catalog TO anon;
GRANT SELECT ON public.project_catalog TO authenticated;
GRANT ALL ON public.project_catalog TO service_role;

ALTER TABLE public.project_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demo: anyone can read the project catalog"
ON public.project_catalog
FOR SELECT
TO anon, authenticated
USING (true);

CREATE TRIGGER update_project_catalog_updated_at
BEFORE UPDATE ON public.project_catalog
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.project_catalog (
  name, developer, location, status, rera_note, price_range, possession,
  payment_note, site_visit_note, configurations, amenities, location_advantages
) VALUES (
  'Skyline Greens',
  'Skyline Estates (demo developer)',
  'Wakad, Pune, Maharashtra',
  'Under construction (demo)',
  'RERA number is a placeholder in this demo build',
  '78 lakh to 2.1 crore (indicative, subject to change)',
  'December 2027 (expected)',
  'Flexible construction-linked payment plan available; home loan support from leading banks (details shared by the sales team, nothing guaranteed on call)',
  'Site visits available all days, 10 AM to 7 PM',
  '[{"type":"2 BHK","carpet":"720 sq ft","price":"78 lakh – 92 lakh"},{"type":"3 BHK","carpet":"1,050 sq ft","price":"1.15 crore – 1.4 crore"},{"type":"4 BHK","carpet":"1,480 sq ft","price":"1.75 crore – 2.1 crore"}]'::jsonb,
  '["Clubhouse with co-working lounge","Rooftop infinity pool","Fully equipped gym","Kids'' play zone and creche","400 m jogging track","EV charging bays","3-tier security with app-based visitor entry","Landscaped podium garden"]'::jsonb,
  '["10 minutes to Hinjewadi IT Park Phase 1","5 minutes to Mumbai–Pune Expressway entry","Schools and hospitals within 3 km","Upcoming metro station approx 1.5 km away","Malls and daily needs retail within walking distance"]'::jsonb
);