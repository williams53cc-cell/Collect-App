import { NextResponse } from "next/server";
import { getBusinessProfile } from "@/lib/data/business-profile";
import { getInvoice } from "@/lib/data/invoices";
import { toInvoicePdfInput } from "@/lib/pdf/invoice-pdf-input";
import { buildInvoicePdf, quotePdfFileName } from "@/lib/pdf/quote-pdf";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The invoice as a PDF. Only the signed-in owner can get it: the database
 * only returns invoices that belong to the signed-in contractor. A draft
 * has no number yet, so it has no PDF until it is issued. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const invoice = await getInvoice(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const profile = await getBusinessProfile();
  const input = toInvoicePdfInput(invoice, profile);
  if (!input) {
    return NextResponse.json(
      { error: "Issue the invoice first. A draft has no PDF." },
      { status: 409 }
    );
  }
  const bytes = await buildInvoicePdf(input);
  const fileName = quotePdfFileName(
    input.invoice.number,
    input.invoice.clientName
  );

  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
