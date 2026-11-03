import type { QuoteSection } from "@/types/database";

export interface QuoteTemplateLine {
  section: QuoteSection;
  stage: string;
  description: string;
  unit: string;
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
  unit: string
): QuoteTemplateLine => ({ section: "labour", stage, description, unit });

const material = (description: string, unit: string): QuoteTemplateLine => ({
  section: "materials",
  stage: "",
  description,
  unit,
});

// Lines and units copied from real Jamaican contractor documents (a labour
// invoice and a material list). Quantities and prices are NOT included: each
// contractor fills in their own.

const HOUSE_LABOUR: QuoteTemplateLine[] = [
  labour("Foundation", "Tie steel, foundation level", "tonne"),
  labour("Foundation", "Build and install stirrups, foundation level", "dz"),
  labour("Foundation", "Cast foundation footing", "cu yd"),
  labour("Walls", 'Lay and cast 6" concrete blocks', "100 blocks"),
  labour("Walls", "Put up and cast stiffener columns", "RN/FT"),
  labour("Lintel and belt beam", "Put up and cast lintel", "RN/FT"),
  labour("Lintel and belt beam", "Put up and cast belt beam", "RN/FT"),
  labour("Lintel and belt beam", "Tie steel for belting and lintel", "tonne"),
  labour(
    "Lintel and belt beam",
    "Build and install stirrups for lintels and belt beam",
    "dz"
  ),
  labour("Decking", "Put up decking", "sq"),
  labour("Decking", "Tie steel for decking", "tonne"),
  labour("Decking", "Put up cantilever and backing board", "RN/FT"),
  labour("Decking", "Cast decking", "cu yd"),
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
  material("2×6×20'", "lght."),
  material("2×4×20'", "lght."),
  material("1×3×16' lathe", "lght."),
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
    description: "Steel, footing, blocks, columns, lintel, belt beam and decking.",
    lines: HOUSE_LABOUR,
  },
  {
    id: "house-materials",
    name: "House materials",
    description: "Sand, gravel, cement, blocks, steel, lumber, nails and tools.",
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
