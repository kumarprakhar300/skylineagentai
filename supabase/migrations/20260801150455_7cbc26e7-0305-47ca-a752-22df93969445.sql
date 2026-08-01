ALTER TABLE public.project_catalog
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS map_zoom integer NOT NULL DEFAULT 14;