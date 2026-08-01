/**
 * DEMO PROJECT KNOWLEDGE BASE
 *
 * This is a fictional real estate project created for an interview demo.
 * The live values are stored in the database (table `project_catalog`) and can
 * be edited from the /admin page without redeploying the app. The values below
 * are only used as a fallback when the catalog row cannot be read.
 */

export type Configuration = { type: string; carpet: string; price: string };

export type ProjectCatalog = {
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
  paymentNote: string;
  siteVisitNote: string;
};

export const defaultProject: ProjectCatalog = {
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
  paymentNote:
    "Flexible construction-linked payment plan available; home loan support from leading banks (details shared by the sales team, nothing guaranteed on call)",
  siteVisitNote: "Site visits available all days, 10 AM to 7 PM",
};

export function projectBrief(project: ProjectCatalog): string {
  return [
    `Project: ${project.name} by ${project.developer}`,
    `Location: ${project.location}`,
    `Status: ${project.status}. ${project.reraNote}.`,
    `Configurations: ${project.configurations
      .map((c) => `${c.type} (${c.carpet}, approx ${c.price})`)
      .join("; ")}`,
    `Overall indicative price range: ${project.priceRange}`,
    `Possession: ${project.possession}`,
    `Amenities: ${project.amenities.join(", ")}`,
    `Location advantages: ${project.locationAdvantages.join(", ")}`,
    `Payments: ${project.paymentNote}`,
    `Site visit: ${project.siteVisitNote}`,
  ].join("\n");
}
