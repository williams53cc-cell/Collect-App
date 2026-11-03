import Link from "next/link";
import { getCustomers } from "@/lib/data/customers";
import { QuoteForm } from "../quote-form";

export default async function NewQuotePage() {
  const customers = await getCustomers();

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
      <QuoteForm
        mode="create"
        customers={customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
        }))}
      />
    </div>
  );
}
