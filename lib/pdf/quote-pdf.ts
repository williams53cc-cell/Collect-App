import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { QUOTE_SECTIONS, QUOTE_SECTION_LABELS } from "@/lib/quotes";
import type { QuoteCustomerView, QuoteSection } from "@/types/database";

/** Everything the PDF needs, as plain values. The builder never talks to
 * the database, so it can be tested and checked by eye on its own. */
export interface QuotePdfItem {
  section: QuoteSection;
  stage: string | null;
  description: string;
  unit: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface QuotePdfInput {
  business: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    terms: string | null;
  };
  quote: {
    number: string;
    title: string;
    /** ISO timestamp of when the quote was created. */
    issuedOn: string;
    /** YYYY-MM-DD, or null. */
    validUntil: string | null;
    clientName: string;
    clientPhone: string | null;
    clientEmail: string | null;
    jobAddress: string | null;
    currency: string;
    customerView: QuoteCustomerView;
    notes: string | null;
    taxRate: number;
    totals: {
      materials: number;
      labour: number;
      extras: number;
      subtotal: number;
      discount: number;
      tax: number;
      total: number;
    };
    items: QuotePdfItem[];
  };
  /** IANA time zone used to show the issue date. Defaults to Jamaica. */
  timeZone?: string | null;
}

// ---------- small helpers (exported so they can be tested) ----------

const REPLACEMENTS: Record<string, string> = {
  "\u2033": '"', // double prime, as in 6 inches
  "\u2032": "'", // prime, as in 6 feet
  "\u00a0": " ", // non-breaking space
  "\u2212": "-", // minus sign
  "\u2192": "->", // arrow
  "\u2713": "v", // check mark
};

const safeCache = new WeakMap<PDFFont, Map<string, string>>();

/** The built-in PDF fonts only know Western characters. Anything else
 * (emoji, other alphabets) becomes "?" instead of breaking the whole PDF. */
export function pdfSafe(text: string, font: PDFFont): string {
  let cache = safeCache.get(font);
  if (!cache) {
    cache = new Map();
    safeCache.set(font, cache);
  }
  let out = "";
  for (const raw of text.normalize("NFC").replace(/[\t\r\n]+/g, " ")) {
    const cached = cache.get(raw);
    if (cached !== undefined) {
      out += cached;
      continue;
    }
    const ch = REPLACEMENTS[raw] ?? raw;
    let result = ch;
    try {
      font.encodeText(ch);
    } catch {
      result = "?";
    }
    cache.set(raw, result);
    out += result;
  }
  return out;
}

/** Breaks text into lines that fit `maxWidth`. Words longer than a whole
 * line are cut so nothing runs off the page. Line breaks in the text are
 * kept. */
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const width = (value: string) =>
    font.widthOfTextAtSize(pdfSafe(value, font), size);
  const lines: string[] = [];

  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (width(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      let rest = word;
      while (width(rest) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && width(rest.slice(0, cut)) > maxWidth) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

const moneyFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const quantityFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export function formatMoney(amount: number): string {
  return moneyFormat.format(amount);
}

export function formatQuantity(quantity: number): string {
  return quantityFormat.format(quantity);
}

/** "3 Nov 2026". A plain YYYY-MM-DD date is shown as is; a timestamp is
 * shown in the given time zone so an evening quote doesn't jump a day. */
export function formatPdfDate(value: string, timeZone?: string | null): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  if (dateOnly) options.timeZone = "UTC";
  else options.timeZone = timeZone || "America/Jamaica";
  try {
    return new Intl.DateTimeFormat("en-GB", options).format(date);
  } catch {
    options.timeZone = "America/Jamaica";
    return new Intl.DateTimeFormat("en-GB", options).format(date);
  }
}

/** A safe file name like "Q-0007-Ms-Brown.pdf". */
export function quotePdfFileName(number: string, clientName: string): string {
  const client = clientName
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${number}${client ? `-${client}` : ""}.pdf`;
}

// ---------- layout ----------

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H = 28;

const INK = rgb(0.11, 0.13, 0.17);
const MUTED = rgb(0.42, 0.45, 0.5);
const ACCENT = rgb(0.145, 0.388, 0.922);
const RULE = rgb(0.86, 0.88, 0.9);
const BAND = rgb(0.94, 0.95, 0.97);
const HEAD_FILL = rgb(0.13, 0.17, 0.25);
const WHITE = rgb(1, 1, 1);

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

class Sheet {
  readonly doc: PDFDocument;
  readonly fonts: Fonts;
  page!: PDFPage;
  y = 0;
  private readonly continued: () => void;

  constructor(doc: PDFDocument, fonts: Fonts, continued: () => void) {
    this.doc = doc;
    this.fonts = fonts;
    this.continued = continued;
  }

  newPage(isFirst: boolean) {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
    if (!isFirst) this.continued();
  }

  /** Starts a new page when `height` would not fit above the footer. */
  ensure(height: number, onNewPage?: () => void) {
    if (this.y - height < MARGIN + FOOTER_H) {
      this.newPage(false);
      onNewPage?.();
    }
  }

  text(
    value: string,
    x: number,
    y: number,
    opts: {
      font?: PDFFont;
      size?: number;
      color?: ReturnType<typeof rgb>;
      align?: "left" | "right";
    } = {}
  ) {
    const font = opts.font ?? this.fonts.regular;
    const size = opts.size ?? 9.5;
    const safe = pdfSafe(value, font);
    if (!safe) return;
    const left =
      opts.align === "right" ? x - font.widthOfTextAtSize(safe, size) : x;
    this.page.drawText(safe, {
      x: left,
      y,
      font,
      size,
      color: opts.color ?? INK,
    });
  }

  rect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: ReturnType<typeof rgb>
  ) {
    this.page.drawRectangle({ x, y, width, height, color });
  }

  line(x1: number, y1: number, x2: number, y2: number, thickness = 0.6) {
    this.page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness,
      color: RULE,
    });
  }
}

function label(sheet: Sheet, value: string, x: number, y: number) {
  sheet.text(value.toUpperCase(), x, y, {
    font: sheet.fonts.bold,
    size: 7.5,
    color: MUTED,
  });
}

/** A heading with a block of text under it. Long text flows onto the next
 * page one line at a time. */
function textBlock(sheet: Sheet, heading: string, body: string, gap = 12) {
  const lines = wrapText(body, sheet.fonts.regular, 9, CONTENT_W);
  sheet.ensure(gap + 11 + 12 * Math.min(lines.length, 2));
  sheet.y -= gap;
  label(sheet, heading, MARGIN, sheet.y);
  sheet.y -= 12;
  for (const line of lines) {
    sheet.ensure(12);
    sheet.text(line, MARGIN, sheet.y, { size: 9 });
    sheet.y -= 12;
  }
}

interface Column {
  key: string;
  title: string;
  width: number;
  align: "left" | "right";
}

const LINE_H = 11.5;
const PAD = 3;
const ROW_FONT = 9;

function drawTableHeader(sheet: Sheet, columns: Column[]) {
  const height = 16;
  sheet.rect(MARGIN, sheet.y - height, CONTENT_W, height, BAND);
  let x = MARGIN;
  for (const col of columns) {
    const pad = 6;
    if (col.align === "right") {
      sheet.text(col.title, x + col.width - pad, sheet.y - 11, {
        font: sheet.fonts.bold,
        size: 8,
        color: MUTED,
        align: "right",
      });
    } else {
      sheet.text(col.title, x + pad, sheet.y - 11, {
        font: sheet.fonts.bold,
        size: 8,
        color: MUTED,
      });
    }
    x += col.width;
  }
  sheet.y -= height;
}

function rowLines(
  sheet: Sheet,
  columns: Column[],
  cells: Record<string, string>,
  bold = false
): { lines: Record<string, string[]>; height: number } {
  const font = bold ? sheet.fonts.bold : sheet.fonts.regular;
  const lines: Record<string, string[]> = {};
  let most = 1;
  for (const col of columns) {
    const wrapped = wrapText(cells[col.key] ?? "", font, ROW_FONT, col.width - 12);
    lines[col.key] = wrapped;
    most = Math.max(most, wrapped.length);
  }
  return { lines, height: most * LINE_H + PAD * 2 };
}

function drawRow(
  sheet: Sheet,
  columns: Column[],
  cells: Record<string, string>,
  opts: { bold?: boolean; fill?: ReturnType<typeof rgb>; header: () => void }
) {
  const { lines, height } = rowLines(sheet, columns, cells, opts.bold);
  sheet.ensure(height, opts.header);
  if (opts.fill) sheet.rect(MARGIN, sheet.y - height, CONTENT_W, height, opts.fill);
  const font = opts.bold ? sheet.fonts.bold : sheet.fonts.regular;
  let x = MARGIN;
  for (const col of columns) {
    let baseline = sheet.y - PAD - 7.5;
    for (const line of lines[col.key]) {
      if (col.align === "right") {
        sheet.text(line, x + col.width - 6, baseline, {
          font,
          size: ROW_FONT,
          align: "right",
        });
      } else {
        sheet.text(line, x + 6, baseline, { font, size: ROW_FONT });
      }
      baseline -= LINE_H;
    }
    x += col.width;
  }
  sheet.line(MARGIN, sheet.y - height, MARGIN + CONTENT_W, sheet.y - height);
  sheet.y -= height;
}

function drawSectionBand(sheet: Sheet, title: string) {
  const height = 18;
  sheet.rect(MARGIN, sheet.y - height, CONTENT_W, height, HEAD_FILL);
  sheet.text(title.toUpperCase(), MARGIN + 8, sheet.y - 12.5, {
    font: sheet.fonts.bold,
    size: 9,
    color: WHITE,
  });
  sheet.y -= height;
}

const DETAIL_COLUMNS: Column[] = [
  { key: "description", title: "Description", width: 233, align: "left" },
  { key: "quantity", title: "Qty", width: 52, align: "right" },
  { key: "unit", title: "Unit", width: 64, align: "left" },
  { key: "unitPrice", title: "Unit price", width: 70, align: "right" },
  { key: "amount", title: "Amount", width: CONTENT_W - 233 - 52 - 64 - 70, align: "right" },
];

const SUMMARY_COLUMNS: Column[] = [
  { key: "description", title: "Description", width: CONTENT_W - 130, align: "left" },
  { key: "amount", title: "Amount", width: 130, align: "right" },
];

function drawDetailedSections(sheet: Sheet, input: QuotePdfInput) {
  const { items, totals } = input.quote;
  const sectionTotals: Record<QuoteSection, number> = {
    materials: totals.materials,
    labour: totals.labour,
    extras: totals.extras,
  };

  for (const section of QUOTE_SECTIONS) {
    const rows = items.filter((item) => item.section === section);
    if (rows.length === 0) continue;

    const header = () => drawTableHeader(sheet, DETAIL_COLUMNS);
    const first = rowLines(
      sheet,
      DETAIL_COLUMNS,
      { description: rows[0].description }
    ).height;
    sheet.ensure(10 + 18 + 16 + first, undefined);
    sheet.y -= 10;
    drawSectionBand(sheet, QUOTE_SECTION_LABELS[section]);
    header();

    const anyStage = rows.some((row) => row.stage && row.stage.trim());
    let previousStage: string | null = null;
    let shaded = false;

    for (const row of rows) {
      const stage = (row.stage ?? "").trim();
      if (anyStage && stage !== previousStage) {
        drawRow(
          sheet,
          SUMMARY_COLUMNS,
          { description: stage || "Other" },
          { bold: true, fill: rgb(0.97, 0.97, 0.98), header }
        );
        previousStage = stage;
        shaded = false;
      }
      drawRow(
        sheet,
        DETAIL_COLUMNS,
        {
          description: row.description,
          quantity: formatQuantity(row.quantity),
          unit: row.unit ?? "",
          unitPrice: formatMoney(row.unitPrice),
          amount: formatMoney(row.amount),
        },
        { fill: shaded ? rgb(0.985, 0.985, 0.99) : undefined, header }
      );
      shaded = !shaded;
    }

    drawRow(
      sheet,
      SUMMARY_COLUMNS,
      {
        description: `${QUOTE_SECTION_LABELS[section]} total`,
        amount: formatMoney(sectionTotals[section]),
      },
      { bold: true, fill: BAND, header }
    );
  }
}

function drawSectionTotalsTable(sheet: Sheet, input: QuotePdfInput) {
  const { items, totals } = input.quote;
  const sectionTotals: Record<QuoteSection, number> = {
    materials: totals.materials,
    labour: totals.labour,
    extras: totals.extras,
  };
  const header = () => drawTableHeader(sheet, SUMMARY_COLUMNS);
  sheet.ensure(10 + 18 + 16 + 30);
  sheet.y -= 10;
  drawSectionBand(sheet, "Summary of work");
  header();
  for (const section of QUOTE_SECTIONS) {
    const has = items.some((item) => item.section === section);
    if (!has && sectionTotals[section] === 0) continue;
    drawRow(
      sheet,
      SUMMARY_COLUMNS,
      {
        description: QUOTE_SECTION_LABELS[section],
        amount: formatMoney(sectionTotals[section]),
      },
      { header }
    );
  }
}

function drawTotals(sheet: Sheet, input: QuotePdfInput) {
  const { totals, taxRate, currency } = input.quote;
  const boxW = 250;
  const x = PAGE_W - MARGIN - boxW;
  // With no discount and no tax the subtotal is the total, so say it once.
  const rows: [string, string][] =
    totals.discount > 0 || totals.tax > 0
      ? [["Subtotal", formatMoney(totals.subtotal)]]
      : [];
  if (totals.discount > 0) {
    rows.push(["Discount", `-${formatMoney(totals.discount)}`]);
  }
  if (totals.tax > 0) {
    rows.push([
      `Tax (${quantityFormat.format(taxRate)}%)`,
      formatMoney(totals.tax),
    ]);
  }
  const height = rows.length * 16 + (rows.length > 0 ? 6 : 0) + 26;
  sheet.ensure(height + 12);
  sheet.y -= 12;
  for (const [name, value] of rows) {
    sheet.text(name, x + 8, sheet.y - 11, { color: MUTED, size: 9 });
    sheet.text(value, x + boxW - 8, sheet.y - 11, { align: "right", size: 9 });
    sheet.y -= 16;
  }
  if (rows.length > 0) sheet.y -= 6;
  sheet.rect(x, sheet.y - 26, boxW, 26, ACCENT);
  sheet.text(`TOTAL (${currency})`, x + 10, sheet.y - 17, {
    font: sheet.fonts.bold,
    size: 10,
    color: WHITE,
  });
  sheet.text(formatMoney(totals.total), x + boxW - 10, sheet.y - 17.5, {
    font: sheet.fonts.bold,
    size: 12.5,
    color: WHITE,
    align: "right",
  });
  sheet.y -= 26;
}

function drawAcceptance(sheet: Sheet) {
  sheet.ensure(58);
  sheet.y -= 14;
  label(sheet, "Acceptance", MARGIN, sheet.y);
  sheet.y -= 11;
  sheet.text(
    "To accept this quote, please sign below and return a copy.",
    MARGIN,
    sheet.y,
    { size: 9 }
  );
  sheet.y -= 24;
  const parts: [string, number, number][] = [
    ["Name", MARGIN, 170],
    ["Signature", MARGIN + 190, 190],
    ["Date", MARGIN + 400, CONTENT_W - 400],
  ];
  for (const [name, x, width] of parts) {
    sheet.line(x, sheet.y, x + width, sheet.y, 0.8);
    sheet.text(name, x, sheet.y - 11, { size: 8, color: MUTED });
  }
  sheet.y -= 12;
}

const SIDE_COL_W = 290;

/** Terms on the left, the signature lines on the right, so a short quote
 * still fits on one page. */
function drawTermsBeside(sheet: Sheet, termLines: string[]) {
  const height = Math.max(12 + termLines.length * 12, 70);
  sheet.ensure(height + 8);
  sheet.y -= 8;
  const top = sheet.y;

  label(sheet, "Terms", MARGIN, top);
  let y = top - 12;
  for (const line of termLines) {
    sheet.text(line, MARGIN, y, { size: 9 });
    y -= 12;
  }

  const x = MARGIN + SIDE_COL_W + 24;
  const width = CONTENT_W - SIDE_COL_W - 24;
  label(sheet, "Acceptance", x, top);
  sheet.text("Sign to accept this quote.", x, top - 12, { size: 9 });
  let lineY = top - 34;
  sheet.line(x, lineY, x + width, lineY, 0.8);
  sheet.text("Name", x, lineY - 10, { size: 8, color: MUTED });
  lineY -= 22;
  const signatureW = width - 62;
  sheet.line(x, lineY, x + signatureW, lineY, 0.8);
  sheet.text("Signature", x, lineY - 10, { size: 8, color: MUTED });
  sheet.line(x + signatureW + 12, lineY, x + width, lineY, 0.8);
  sheet.text("Date", x + signatureW + 12, lineY - 10, {
    size: 8,
    color: MUTED,
  });
  sheet.y = top - height;
}

/** Builds the quote as an A4 PDF and returns its bytes. */
export async function buildQuotePdf(input: QuotePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const { business, quote } = input;
  doc.setTitle(`Quote ${quote.number} - ${quote.title}`);
  doc.setAuthor(business.name || "GripBill");
  doc.setCreator("GripBill");
  doc.setProducer("GripBill");

  const sheet: Sheet = new Sheet(doc, fonts, () => {
    // Small running header on pages after the first.
    sheet.text(business.name, MARGIN, sheet.y - 9, {
      font: fonts.bold,
      size: 9,
      color: MUTED,
    });
    sheet.text(`Quote ${quote.number} (continued)`, PAGE_W - MARGIN, sheet.y - 9, {
      size: 9,
      color: MUTED,
      align: "right",
    });
    sheet.line(MARGIN, sheet.y - 16, PAGE_W - MARGIN, sheet.y - 16);
    sheet.y -= 30;
  });
  sheet.newPage(true);

  // ----- header: business on the left, quote details on the right -----
  const startY = sheet.y;
  const nameLines = wrapText(business.name || "Your business", fonts.bold, 18, 330);
  let leftY = startY - 14;
  for (const line of nameLines) {
    sheet.text(line, MARGIN, leftY, { font: fonts.bold, size: 18 });
    leftY -= 21;
  }
  leftY += 21 - 13;
  const contact: string[] = [];
  if (business.address) {
    contact.push(...wrapText(business.address, fonts.regular, 9, 330));
  }
  if (business.phone) contact.push(business.phone);
  if (business.email) contact.push(business.email);
  for (const line of contact) {
    sheet.text(line, MARGIN, leftY, { size: 9, color: MUTED });
    leftY -= 12;
  }

  const rightX = PAGE_W - MARGIN;
  sheet.text("QUOTE", rightX, startY - 20, {
    font: fonts.bold,
    size: 26,
    color: ACCENT,
    align: "right",
  });
  sheet.text(quote.number, rightX, startY - 38, {
    font: fonts.bold,
    size: 11,
    align: "right",
  });
  let rightY = startY - 54;
  sheet.text(`Date: ${formatPdfDate(quote.issuedOn, input.timeZone)}`, rightX, rightY, {
    size: 9,
    color: MUTED,
    align: "right",
  });
  rightY -= 12;
  if (quote.validUntil) {
    sheet.text(`Valid until: ${formatPdfDate(quote.validUntil)}`, rightX, rightY, {
      size: 9,
      color: MUTED,
      align: "right",
    });
    rightY -= 12;
  }

  sheet.y = Math.min(leftY, rightY) - 6;
  sheet.rect(MARGIN, sheet.y, CONTENT_W, 2, ACCENT);
  sheet.y -= 16;

  // ----- prepared for / job address -----
  const blockTop = sheet.y;
  label(sheet, "Prepared for", MARGIN, blockTop);
  let clientY = blockTop - 15;
  for (const line of wrapText(quote.clientName, fonts.bold, 12, 240)) {
    sheet.text(line, MARGIN, clientY, { font: fonts.bold, size: 12 });
    clientY -= 15;
  }
  for (const detail of [quote.clientPhone, quote.clientEmail]) {
    if (!detail) continue;
    sheet.text(detail, MARGIN, clientY, { size: 9.5, color: MUTED });
    clientY -= 12.5;
  }
  let jobY = blockTop;
  if (quote.jobAddress) {
    const colX = MARGIN + 270;
    label(sheet, "Job address", colX, blockTop);
    jobY = blockTop - 15;
    for (const line of wrapText(quote.jobAddress, fonts.regular, 9.5, CONTENT_W - 270)) {
      sheet.text(line, colX, jobY, { size: 9.5 });
      jobY -= 12.5;
    }
  }
  sheet.y = Math.min(clientY, jobY) - 2;

  // ----- project title -----
  sheet.y -= 4;
  label(sheet, "Project", MARGIN, sheet.y);
  sheet.y -= 14;
  for (const line of wrapText(quote.title, fonts.bold, 13, CONTENT_W)) {
    sheet.ensure(18);
    sheet.text(line, MARGIN, sheet.y, { font: fonts.bold, size: 12.5 });
    sheet.y -= 16;
  }

  // ----- lines -----
  if (quote.customerView === "section_totals") {
    drawSectionTotalsTable(sheet, input);
  } else {
    drawDetailedSections(sheet, input);
  }
  drawTotals(sheet, input);

  // ----- notes, terms, acceptance -----
  // Bank details are not printed on a quote: they go on the invoice sent
  // once the customer accepts.
  if (quote.notes?.trim()) textBlock(sheet, "Notes", quote.notes);

  const terms = business.terms?.trim() ?? "";
  const termLines = terms ? wrapText(terms, fonts.regular, 9, SIDE_COL_W) : [];
  if (termLines.length > 0 && termLines.length <= 8) {
    drawTermsBeside(sheet, termLines);
  } else {
    if (terms) textBlock(sheet, "Terms", terms);
    drawAcceptance(sheet);
  }

  // ----- footer on every page -----
  const pages = doc.getPages();
  pages.forEach((page, index) => {
    sheet.page = page;
    sheet.line(MARGIN, MARGIN + 14, PAGE_W - MARGIN, MARGIN + 14);
    sheet.text(
      `${business.name || "Quote"}  |  ${quote.number}`,
      MARGIN,
      MARGIN,
      { size: 8, color: MUTED }
    );
    sheet.text(`Page ${index + 1} of ${pages.length}`, PAGE_W - MARGIN, MARGIN, {
      size: 8,
      color: MUTED,
      align: "right",
    });
  });

  return doc.save();
}
