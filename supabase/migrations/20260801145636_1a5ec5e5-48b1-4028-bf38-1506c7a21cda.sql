ALTER TABLE public.project_catalog DROP CONSTRAINT IF EXISTS project_catalog_singleton_key;
ALTER TABLE public.project_catalog DROP CONSTRAINT IF EXISTS project_catalog_singleton_true;
ALTER TABLE public.project_catalog ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '';
ALTER TABLE public.project_catalog ADD COLUMN IF NOT EXISTS benefits jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.project_catalog ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE public.project_catalog
SET city = 'Pune',
    sort_order = 10,
    benefits = '["Lowest entry price of the 5 demo cities for a full-size 2 BHK","Walk-to-work for Hinjewadi IT families saves 90 minutes of commute daily","Rental yield of about 3.4% with steady IT tenant demand","Construction-linked plan keeps early outflow under 15%","Podium parking plus EV bays included, no extra charge in this demo"]'::jsonb
WHERE id = 'ea96ad99-27c2-4719-abe2-b9ebdb50bea2';

INSERT INTO public.project_catalog
  (city, name, developer, location, status, rera_note, price_range, possession, payment_note, site_visit_note, configurations, amenities, location_advantages, benefits, sort_order)
VALUES
(
  'Mumbai',
  'Skyline Marine Vista',
  'Skyline Estates (demo developer)',
  'Powai, Mumbai, Maharashtra',
  'Under construction (demo), tower B slab work on',
  'RERA number is a placeholder in this demo build',
  '2.35 crore to 6.4 crore (indicative, subject to change)',
  'June 2028 (expected)',
  'Flexible 20:40:40 construction-linked plan; stamp duty support offer running in this demo; loan desk with 6 banks on site',
  'Site visits all days, 10 AM to 8 PM; pick-up from Powai plaza on request',
  '[{"type":"2 BHK","carpet":"690 sq ft","price":"2.35 crore - 2.8 crore"},{"type":"3 BHK","carpet":"1,010 sq ft","price":"3.6 crore - 4.4 crore"},{"type":"4 BHK sea-facing","carpet":"1,620 sq ft","price":"5.5 crore - 6.4 crore"}]'::jsonb,
  '["Lake-facing sky deck on the 32nd floor","Olympic-length lap pool and kids pool","Two-level clubhouse with squash and simulator golf","Co-working floor with meeting pods","Creche and homework zone","Spa, sauna and salon","Podium jogging loop of 500 m","5-tier security with facial access","EV charging on every parking level"]'::jsonb,
  '["8 minutes to Powai lake promenade and Hiranandani high street","15 minutes to BKC via LBS and JVLR","Metro Line 6 station under 1 km","Airport in 20 minutes off-peak","IIT Bombay, Hiranandani schools and Hiranandani hospital within 4 km"]'::jsonb,
  '["Sea and lake view stock in a supply-starved micro market, strong resale depth","BKC and Powai job hubs both inside a 20 minute drive, one-car household is enough","Rental potential of about 1.4 lakh a month on the 3 BHK for expat tenants","Stamp duty support in this demo cuts about 12 lakh from registration cost","Large-format 4 BHK at Powai pricing instead of South Mumbai pricing"]'::jsonb,
  20
),
(
  'Delhi NCR',
  'Skyline Aurum Residences',
  'Skyline Estates (demo developer)',
  'Sector 79, Golf Course Extension Road, Gurugram, Haryana',
  'Under construction (demo), 6 of 9 towers topped out',
  'RERA number is a placeholder in this demo build',
  '1.45 crore to 4.2 crore (indicative, subject to change)',
  'March 2028 (expected)',
  'Subvention style 10:80:10 plan in this demo; no floor rise on lower blocks; loan tie-ups with leading banks',
  'Site visits all days, 9:30 AM to 7:30 PM; sample flat for 3 BHK is ready',
  '[{"type":"2 BHK + study","carpet":"1,050 sq ft","price":"1.45 crore - 1.75 crore"},{"type":"3 BHK","carpet":"1,560 sq ft","price":"2.1 crore - 2.6 crore"},{"type":"4 BHK duplex","carpet":"2,480 sq ft","price":"3.4 crore - 4.2 crore"}]'::jsonb,
  '["45,000 sq ft clubhouse with banquet","Temperature controlled pool","Indoor badminton and table tennis","Amphitheatre and party lawn","Business centre with 12 seat boardroom","Yoga and meditation deck","Pet park","Piped gas and 100% power backup","Triple height air conditioned lobby"]'::jsonb,
  '["Direct access to Golf Course Extension Road and SPR","Rapid Metro and proposed metro extension within 3 km","Cyber City in 25 minutes, IGI airport in 35 minutes","Schools such as demo international schools within 2 km","Two multi-speciality hospitals and two malls within 5 km"]'::jsonb,
  '["Largest carpet per rupee of the 5 demo cities, 1,560 sq ft 3 BHK at 2.1 crore","Golf Course Extension corridor has shown the steepest demo-price appreciation","10:80:10 plan means only 10% now, 80% at possession, easiest cash flow for investors","Ready sample flat, so buyers can decide in one visit","100% power backup and piped gas cut monthly running cost for families"]'::jsonb,
  30
),
(
  'Bengaluru',
  'Skyline Verde Park',
  'Skyline Estates (demo developer)',
  'Whitefield, Bengaluru, Karnataka',
  'Under construction (demo), phase 1 handover trials on',
  'RERA number is a placeholder in this demo build',
  '95 lakh to 2.6 crore (indicative, subject to change)',
  'September 2027 (expected), phase 1 December 2026',
  'Construction-linked plan with 10% booking; NRI documentation desk available in this demo',
  'Site visits all days, 10 AM to 7 PM; virtual walkthrough on request for NRI buyers',
  '[{"type":"2 BHK","carpet":"1,120 sq ft","price":"95 lakh - 1.15 crore"},{"type":"3 BHK","carpet":"1,480 sq ft","price":"1.35 crore - 1.7 crore"},{"type":"3 BHK + terrace","carpet":"1,910 sq ft","price":"2.1 crore - 2.6 crore"}]'::jsonb,
  '["7 acre central green with 900 trees","Rainwater harvesting and 100% treated water reuse","Clubhouse with 25 m pool and gym","Cricket practice net and half basketball court","Work-from-home pods on every floor","Organic farming plots for residents","Solar common lighting","Pet wash bay","App based visitor and helper entry"]'::jsonb,
  '["10 minutes to ITPL and EPIP Zone tech parks","Whitefield metro station about 2 km","Schools and hospitals within 3 km, including demo international school","Phoenix Marketcity and VR Bengaluru within 6 km","Outer Ring Road access in 20 minutes"]'::jsonb,
  '["Best pick for tech-hub end users, ITPL commute under 20 minutes door to desk","Green certified design cuts common area power and water bills by roughly 30% in this demo","Phase 1 possession in Dec 2026 means rent savings start earliest here","Strong NRI resale and lease market, about 55,000 a month on the 3 BHK","Lowest per sq ft cost for large 1,480 sq ft 3 BHK among the metro options"]'::jsonb,
  40
),
(
  'Hyderabad',
  'Skyline Cyber Heights',
  'Skyline Estates (demo developer)',
  'Gachibowli, Hyderabad, Telangana',
  'Under construction (demo), structure at 18 of 40 floors',
  'RERA number is a placeholder in this demo build',
  '1.05 crore to 3.1 crore (indicative, subject to change)',
  'December 2028 (expected)',
  'Flexible plan with 10% booking and milestone payments; no pre-EMI till slab 20 in this demo',
  'Site visits all days, 10 AM to 8 PM; drone view of the plot shown at the experience centre',
  '[{"type":"2 BHK","carpet":"1,180 sq ft","price":"1.05 crore - 1.3 crore"},{"type":"3 BHK","carpet":"1,720 sq ft","price":"1.6 crore - 2.05 crore"},{"type":"4 BHK sky villa","carpet":"2,650 sq ft","price":"2.6 crore - 3.1 crore"}]'::jsonb,
  '["60,000 sq ft clubhouse with rooftop lounge","Infinity pool on the 40th floor","Indoor games arena and bowling lane","Mini theatre for 40 people","Two level basement parking","Sky garden every 10 floors","Toddler zone and senior citizen court","Double glazed windows for heat and sound","Vaastu compliant layouts"]'::jsonb,
  '["5 minutes to Financial District and DLF Cyber City","ORR access in 6 minutes, airport in 30 minutes","Top demo schools and multi-speciality hospitals within 4 km","IIIT Hyderabad and University of Hyderabad nearby","Retail, cafes and Inorbit mall within 5 km"]'::jsonb,
  '["Biggest apartments in the demo line-up, 1,720 sq ft 3 BHK for 1.6 crore onwards","Financial District commute of 5 minutes, ideal for GCC and IT professionals","No pre-EMI till slab 20 in this demo protects cash flow for first-time buyers","Vaastu compliant plans and double glazing, a top ask from Hyderabad families","Sky villa inventory offers villa-style space with high-rise amenities"]'::jsonb,
  50
);