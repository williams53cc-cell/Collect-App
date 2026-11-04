import type { QuoteSection } from "@/types/database";

export interface QuoteTemplateLine {
  section: QuoteSection;
  stage: string;
  description: string;
  unit: string;
  /** Suggested unit price. The contractor can change it. Empty = none. */
  unitPrice?: string;
}

export interface QuoteTemplate {
  id: string;
  name: string;
  description: string;
  lines: QuoteTemplateLine[];
}

const labour = (
  stage: string,
  description: string,
  unit: string,
  unitPrice: string,
): QuoteTemplateLine => ({
  section: "labour",
  stage,
  description,
  unit,
  unitPrice,
});

const material = (description: string, unit: string): QuoteTemplateLine => ({
  section: "materials",
  stage: "",
  description,
  unit,
});

// Lines and units copied from real Jamaican contractor documents (a labour
// invoice and a material list). Labour lines come with a suggested unit price
// that the contractor can change. Quantities are never filled in, and material
// prices are left empty because they change too often.

const HOUSE_LABOUR: QuoteTemplateLine[] = [
  labour("Foundation", "Tie steel, foundation level", "tonne", "100000"),
  labour(
    "Foundation",
    "Build and install stirrups, foundation level",
    "dz",
    "1500",
  ),
  labour("Foundation", "Cast foundation footing", "cu yd", "10000"),
  labour("Walls", 'Lay and cast 6" concrete blocks', "100 blocks", "15000"),
  labour("Walls", "Put up and cast stiffener columns", "RN/FT", "1400"),
  labour("Lintel and belt beam", "Put up and cast lintel", "RN/FT", "1400"),
  labour("Lintel and belt beam", "Put up and cast belt beam", "RN/FT", "1400"),
  labour(
    "Lintel and belt beam",
    "Tie steel for belting and lintel",
    "tonne",
    "100000",
  ),
  labour(
    "Lintel and belt beam",
    "Build and install stirrups for lintels and belt beam",
    "dz",
    "1500",
  ),
  labour("Decking", "Put up decking", "sq", "25000"),
  labour("Decking", "Tie steel for decking", "tonne", "100000"),
  labour("Decking", "Put up cantilever and backing board", "RN/FT", "1000"),
  labour("Decking", "Cast decking", "cu yd", "10000"),
];

const HOUSE_MATERIALS: QuoteTemplateLine[] = [
  material("Fine aggregate (sand)", "cyd"),
  material("Black gravel", "cyd"),
  material("Carib cement", "bags"),
  material('6" concrete blocks', "blocks"),
  material("12 mm corrugated steel bar (1/2)", "ton"),
  material("16 mm corrugated steel bar (5/8)", "ton"),
  material("10 mm corrugated steel bar (3/8)", "ton"),
  material("5/8 formply", "sht"),
  material("2\u00d76\u00d720'", "lght."),
  material("2\u00d74\u00d720'", "lght."),
  material("1\u00d73\u00d716' lathe", "lght."),
  material("Binding wire", "roll"),
  material('2 1/2" wire nails', "Lbs"),
  material('2" wire nails', "Lbs"),
  material('3" wire nails', "Lbs"),
  material('4" wire nails', "Lbs"),
  material('2 1/2" concrete nails', "Lbs"),
  material('2" concrete nails', "Lbs"),
  material('3" concrete nails', "Lbs"),
  material("Shovel", "each"),
  material("Water drums", "each"),
  material("Buckets", "each"),
  material("Water hose 100'", "each"),
  material("Pickaxe", "each"),
  material("Wheelbarrow", "each"),
];

export const QUOTE_TEMPLATES: QuoteTemplate[] = [
  {
    id: "house-labour",
    name: "House labour",
    description:
      "Steel, footing, blocks, columns, lintel, belt beam and decking.",
    lines: HOUSE_LABOUR,
  },
  {
    id: "house-materials",
    name: "House materials",
    description:
      "Sand, gravel, cement, blocks, steel, lumber, nails and tools.",
    lines: HOUSE_MATERIALS,
  },
  {
    id: "house-both",
    name: "House labour and materials",
    description: "Both lists together on one quote.",
    lines: [...HOUSE_MATERIALS, ...HOUSE_LABOUR],
  },
];

export function getQuoteTemplate(id: string | undefined): QuoteTemplate | null {
  if (!id) return null;
  return QUOTE_TEMPLATES.find((template) => template.id === id) ?? null;
}

/**
 * The price to send to the server for a template line. A line the contractor
 * has not touched (no quantity, price still the suggested one) is sent with an
 * empty price so it counts as an unused line and is left out when saving.
 */
export function submittedPrice(
  quantity: string,
  unitPrice: string,
  presetPrice: string | undefined,
): string {
  if (
    presetPrice &&
    quantity.trim() === "" &&
    unitPrice.trim() === presetPrice.trim()
  ) {
    return "";
  }
  return unitPrice;
}
