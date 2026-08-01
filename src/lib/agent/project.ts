/**
 * DEMO PROJECT KNOWLEDGE BASE
 *
 * These are fictional real estate projects created for an interview demo.
 * The live values are stored in the database (table `project_catalog`) and can
 * be edited from the /admin page without redeploying the app. The values below
 * are only used as a fallback when the catalog rows cannot be read.
 */

export type Configuration = { type: string; carpet: string; price: string };

export type ProjectCatalog = {
  id?: string;
  city: string;
  name: string;
  developer: string;
  location: string;
  status: string;
  reraNote: string;
  configurations: Configuration[];
  priceRange: string;
  possession: string;
  amenities: string[];
  locationAdvantages: string[];
  /** Why a customer should care — used by the agent to pitch benefits, not features. */
  benefits: string[];
  paymentNote: string;
  siteVisitNote: string;
  sortOrder?: number;
};

export const defaultProjects: ProjectCatalog[] = [
  {
    city: "Pune",
    name: "Skyline Greens",
    developer: "Skyline Estates (demo developer)",
    location: "Wakad, Pune, Maharashtra",
    status: "Under construction (demo)",
    reraNote: "RERA number is a placeholder in this demo build",
    configurations: [
      { type: "2 BHK", carpet: "720 sq ft", price: "78 lakh – 92 lakh" },
      { type: "3 BHK", carpet: "1,050 sq ft", price: "1.15 crore – 1.4 crore" },
      { type: "4 BHK", carpet: "1,480 sq ft", price: "1.75 crore – 2.1 crore" },
    ],
    priceRange: "78 lakh to 2.1 crore (indicative, subject to change)",
    possession: "December 2027 (expected)",
    amenities: [
      "Clubhouse with co-working lounge",
      "Rooftop infinity pool",
      "Fully equipped gym",
      "Kids' play zone and creche",
      "400 m jogging track",
      "EV charging bays",
      "3-tier security with app-based visitor entry",
      "Landscaped podium garden",
    ],
    locationAdvantages: [
      "10 minutes to Hinjewadi IT Park Phase 1",
      "5 minutes to Mumbai–Pune Expressway entry",
      "Schools and hospitals within 3 km",
      "Upcoming metro station approx 1.5 km away",
      "Malls and daily needs retail within walking distance",
    ],
    benefits: [
      "Lowest entry price of the 5 demo cities for a full-size 2 BHK",
      "Walk-to-work for Hinjewadi IT families saves 90 minutes of commute daily",
      "Rental yield of about 3.4% with steady IT tenant demand",
      "Construction-linked plan keeps early outflow under 15%",
      "Podium parking plus EV bays included, no extra charge in this demo",
    ],
    paymentNote:
      "Flexible construction-linked payment plan available; home loan support from leading banks (details shared by the sales team, nothing guaranteed on call)",
    siteVisitNote: "Site visits available all days, 10 AM to 7 PM",
    sortOrder: 10,
  },
  {
    city: "Mumbai",
    name: "Skyline Marine Vista",
    developer: "Skyline Estates (demo developer)",
    location: "Powai, Mumbai, Maharashtra",
    status: "Under construction (demo), tower B slab work on",
    reraNote: "RERA number is a placeholder in this demo build",
    configurations: [
      { type: "2 BHK", carpet: "690 sq ft", price: "2.35 crore - 2.8 crore" },
      { type: "3 BHK", carpet: "1,010 sq ft", price: "3.6 crore - 4.4 crore" },
      { type: "4 BHK sea-facing", carpet: "1,620 sq ft", price: "5.5 crore - 6.4 crore" },
    ],
    priceRange: "2.35 crore to 6.4 crore (indicative, subject to change)",
    possession: "June 2028 (expected)",
    amenities: [
      "Lake-facing sky deck on the 32nd floor",
      "Olympic-length lap pool and kids pool",
      "Two-level clubhouse with squash and simulator golf",
      "Co-working floor with meeting pods",
      "Creche and homework zone",
      "Spa, sauna and salon",
      "5-tier security with facial access",
      "EV charging on every parking level",
    ],
    locationAdvantages: [
      "8 minutes to Powai lake promenade and Hiranandani high street",
      "15 minutes to BKC via LBS and JVLR",
      "Metro Line 6 station under 1 km",
      "Airport in 20 minutes off-peak",
      "IIT Bombay, schools and hospitals within 4 km",
    ],
    benefits: [
      "Sea and lake view stock in a supply-starved micro market, strong resale depth",
      "BKC and Powai job hubs both inside a 20 minute drive",
      "Rental potential of about 1.4 lakh a month on the 3 BHK for expat tenants",
      "Stamp duty support in this demo cuts about 12 lakh from registration cost",
      "Large-format 4 BHK at Powai pricing instead of South Mumbai pricing",
    ],
    paymentNote:
      "Flexible 20:40:40 construction-linked plan; stamp duty support offer running in this demo; loan desk with 6 banks on site",
    siteVisitNote: "Site visits all days, 10 AM to 8 PM; pick-up from Powai plaza on request",
    sortOrder: 20,
  },
  {
    city: "Delhi NCR",
    name: "Skyline Aurum Residences",
    developer: "Skyline Estates (demo developer)",
    location: "Sector 79, Golf Course Extension Road, Gurugram, Haryana",
    status: "Under construction (demo), 6 of 9 towers topped out",
    reraNote: "RERA number is a placeholder in this demo build",
    configurations: [
      { type: "2 BHK + study", carpet: "1,050 sq ft", price: "1.45 crore - 1.75 crore" },
      { type: "3 BHK", carpet: "1,560 sq ft", price: "2.1 crore - 2.6 crore" },
      { type: "4 BHK duplex", carpet: "2,480 sq ft", price: "3.4 crore - 4.2 crore" },
    ],
    priceRange: "1.45 crore to 4.2 crore (indicative, subject to change)",
    possession: "March 2028 (expected)",
    amenities: [
      "45,000 sq ft clubhouse with banquet",
      "Temperature controlled pool",
      "Indoor badminton and table tennis",
      "Amphitheatre and party lawn",
      "Business centre with 12 seat boardroom",
      "Pet park",
      "Piped gas and 100% power backup",
      "Triple height air conditioned lobby",
    ],
    locationAdvantages: [
      "Direct access to Golf Course Extension Road and SPR",
      "Rapid Metro and proposed metro extension within 3 km",
      "Cyber City in 25 minutes, IGI airport in 35 minutes",
      "Demo international schools within 2 km",
      "Two multi-speciality hospitals and two malls within 5 km",
    ],
    benefits: [
      "Largest carpet per rupee of the 5 demo cities, 1,560 sq ft 3 BHK at 2.1 crore",
      "Golf Course Extension corridor has shown the steepest demo-price appreciation",
      "10:80:10 plan means only 10% now, 80% at possession — easiest cash flow",
      "Ready sample flat, so buyers can decide in one visit",
      "100% power backup and piped gas cut monthly running cost for families",
    ],
    paymentNote:
      "Subvention style 10:80:10 plan in this demo; no floor rise on lower blocks; loan tie-ups with leading banks",
    siteVisitNote: "Site visits all days, 9:30 AM to 7:30 PM; 3 BHK sample flat is ready",
    sortOrder: 30,
  },
  {
    city: "Bengaluru",
    name: "Skyline Verde Park",
    developer: "Skyline Estates (demo developer)",
    location: "Whitefield, Bengaluru, Karnataka",
    status: "Under construction (demo), phase 1 handover trials on",
    reraNote: "RERA number is a placeholder in this demo build",
    configurations: [
      { type: "2 BHK", carpet: "1,120 sq ft", price: "95 lakh - 1.15 crore" },
      { type: "3 BHK", carpet: "1,480 sq ft", price: "1.35 crore - 1.7 crore" },
      { type: "3 BHK + terrace", carpet: "1,910 sq ft", price: "2.1 crore - 2.6 crore" },
    ],
    priceRange: "95 lakh to 2.6 crore (indicative, subject to change)",
    possession: "September 2027 (expected), phase 1 December 2026",
    amenities: [
      "7 acre central green with 900 trees",
      "Rainwater harvesting and 100% treated water reuse",
      "Clubhouse with 25 m pool and gym",
      "Cricket practice net and half basketball court",
      "Work-from-home pods on every floor",
      "Organic farming plots for residents",
      "Solar common lighting",
      "App based visitor and helper entry",
    ],
    locationAdvantages: [
      "10 minutes to ITPL and EPIP Zone tech parks",
      "Whitefield metro station about 2 km",
      "Schools and hospitals within 3 km",
      "Phoenix Marketcity and VR Bengaluru within 6 km",
      "Outer Ring Road access in 20 minutes",
    ],
    benefits: [
      "Best pick for tech-hub end users, ITPL commute under 20 minutes door to desk",
      "Green design cuts common area power and water bills by roughly 30% in this demo",
      "Phase 1 possession in Dec 2026 means rent savings start earliest here",
      "Strong NRI resale and lease market, about 55,000 a month on the 3 BHK",
      "Lowest per sq ft cost for a large 1,480 sq ft 3 BHK among the metro options",
    ],
    paymentNote:
      "Construction-linked plan with 10% booking; NRI documentation desk available in this demo",
    siteVisitNote: "Site visits all days, 10 AM to 7 PM; virtual walkthrough for NRI buyers",
    sortOrder: 40,
  },
  {
    city: "Hyderabad",
    name: "Skyline Cyber Heights",
    developer: "Skyline Estates (demo developer)",
    location: "Gachibowli, Hyderabad, Telangana",
    status: "Under construction (demo), structure at 18 of 40 floors",
    reraNote: "RERA number is a placeholder in this demo build",
    configurations: [
      { type: "2 BHK", carpet: "1,180 sq ft", price: "1.05 crore - 1.3 crore" },
      { type: "3 BHK", carpet: "1,720 sq ft", price: "1.6 crore - 2.05 crore" },
      { type: "4 BHK sky villa", carpet: "2,650 sq ft", price: "2.6 crore - 3.1 crore" },
    ],
    priceRange: "1.05 crore to 3.1 crore (indicative, subject to change)",
    possession: "December 2028 (expected)",
    amenities: [
      "60,000 sq ft clubhouse with rooftop lounge",
      "Infinity pool on the 40th floor",
      "Indoor games arena and bowling lane",
      "Mini theatre for 40 people",
      "Two level basement parking",
      "Sky garden every 10 floors",
      "Double glazed windows for heat and sound",
      "Vaastu compliant layouts",
    ],
    locationAdvantages: [
      "5 minutes to Financial District and DLF Cyber City",
      "ORR access in 6 minutes, airport in 30 minutes",
      "Top demo schools and multi-speciality hospitals within 4 km",
      "IIIT Hyderabad and University of Hyderabad nearby",
      "Retail, cafes and Inorbit mall within 5 km",
    ],
    benefits: [
      "Biggest apartments in the line-up, 1,720 sq ft 3 BHK from 1.6 crore",
      "Financial District commute of 5 minutes, ideal for GCC and IT professionals",
      "No pre-EMI till slab 20 in this demo protects first-time buyer cash flow",
      "Vaastu compliant plans and double glazing, a top ask from Hyderabad families",
      "Sky villa inventory offers villa-style space with high-rise amenities",
    ],
    paymentNote:
      "Flexible plan with 10% booking and milestone payments; no pre-EMI till slab 20 in this demo",
    siteVisitNote: "Site visits all days, 10 AM to 8 PM; drone plot view at the experience centre",
    sortOrder: 50,
  },
];

/** Kept for the admin "reset to demo defaults" action. */
export const defaultProject: ProjectCatalog = defaultProjects[0]!;

export function projectBrief(project: ProjectCatalog): string {
  return [
    `Project: ${project.name} by ${project.developer}`,
    `City: ${project.city || "—"}`,
    `Location: ${project.location}`,
    `Status: ${project.status}. ${project.reraNote}.`,
    `Configurations: ${project.configurations
      .map((c) => `${c.type} (${c.carpet}, approx ${c.price})`)
      .join("; ")}`,
    `Overall indicative price range: ${project.priceRange}`,
    `Possession: ${project.possession}`,
    `Amenities: ${project.amenities.join(", ")}`,
    `Location advantages: ${project.locationAdvantages.join(", ")}`,
    `Customer benefits (use these to pitch value, always as indicative): ${project.benefits.join(", ")}`,
    `Payments: ${project.paymentNote}`,
    `Site visit: ${project.siteVisitNote}`,
  ].join("\n");
}

/** Full multi-city knowledge base for the agent prompt. */
export function catalogBrief(projects: ProjectCatalog[]): string {
  const list = projects.length > 0 ? projects : defaultProjects;
  const cities = list.map((p) => `${p.city} (${p.name})`).join(", ");
  return [
    `Skyline Estates has ${list.length} live demo projects across these metro cities: ${cities}.`,
    "",
    ...list.map((p, i) => `--- PROJECT ${i + 1} of ${list.length} ---\n${projectBrief(p)}`),
  ].join("\n");
}
