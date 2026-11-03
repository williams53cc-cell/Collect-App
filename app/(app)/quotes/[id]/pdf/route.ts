import { NextResponse } from "next/server";
import { getBusinessProfile } from "@/lib/data/business-profile";
import { getQuote } from "@/lib/data/quotes";
import { buildQuotePdf, quotePdfFileName } from "@/lib/pdf/quote-pdf";
import { toQuotePdfInput } from "@/lib/pdf/quote-pdf-input";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The quote as a PDF. Only the signed-in owner can get it: the database
 * only returns quotes that belong to the signed-in contractor. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Quote not found." }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const quote = await getQuote(id);
  if (!quote) {
    return NextResponse.json({ error: "Quote not found." }, { status: 404 });
  }

  const profile = await getBusinessProfile();
  const input = toQuotePdfInput(quote, profile);
  const bytes = await buildQuotePdf(input);
  const fileName = quotePdfFileName(input.quote.number, input.quote.clientName);

  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
