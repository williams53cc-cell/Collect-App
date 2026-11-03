import Link from "next/link";
import { getCustomers } from "@/lib/data/customers";
import { QUOTE_TEMPLATES, getQuoteTemplate } from "@/lib/quote-templates";
import { QuoteForm, type QuoteFormInitial } from "../quote-form";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template: templateId } = await searchParams;
  const template = getQuoteTemplate(templateId);
  const customers = await getCustomers();

  const initial: QuoteFormInitial | undefined = template
    ? {
        title: "",
        client_name: "",
        client_phone: "",
        client_email: "",
        client_address: "",
        customer_id: "",
        customer_view: "detailed",
        valid_until: "",
        notes: "",
        discount_amount: "",
        tax_rate: "",
        items: template.lines.map((line) => ({
          section: line.section,
          stage: line.stage,
          description: line.description,
          unit: line.unit,
          quantity: "",
          unit_price: "",
        })),
      }
    : undefined;

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium ${
      active
        ? "border-blue-600 bg-blue-50 text-blue-700"
        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
    }`;

  return (
    <div className="space-y-6">
      <Link href="/quotes" className="text-sm text-gray-500 hover:underline">
        ← Back to quotes
      </Link>
      <div>
        <h1 className="text-xl font-semibold">New quote</h1>
        <p className="text-sm text-gray-500">
          Add the materials, labour and extras. The total works itself out.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Start from</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/quotes/new" className={chip(!template)}>
            Blank quote
          </Link>
          {QUOTE_TEMPLATES.map((option) => (
            <Link
              key={option.id}
              href={`/quotes/new?template=${option.id}`}
              className={chip(template?.id === option.id)}
            >
              {option.name}
            </Link>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          {template
            ? `${template.description} Fill in the quantity and price on the lines you need. Lines you leave empty are left out when you save.`
            : "A template adds the usual lines and units. You enter the quantities and prices."}
        </p>
      </div>

      <QuoteForm
        key={template?.id ?? "blank"}
        mode="create"
        customers={customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
        }))}
        initial={initial}
      />
    </div>
  );
}
