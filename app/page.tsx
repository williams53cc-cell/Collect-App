import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";

const FEATURES = [
  {
    title: "One list, not a dozen sticky notes",
    description:
      "Every customer who owes you money, what they owe, and what's due when — in one place instead of scattered across texts, invoices, and memory.",
  },
  {
    title: "Follow-ups that don't rely on you remembering",
    description:
      "GripBill tells you who to follow up with today and who's overdue, so nothing slips through because you were busy on a job site.",
  },
  {
    title: "A drafted message in one click",
    description:
      "Friendly, firm, or formal — GripBill writes the follow-up for you based on how overdue it is, ready to text or email as-is.",
  },
  {
    title: "Payment context, automatically included",
    description:
      "Set what a payment is for and when it's due once, and every drafted message explains it — no re-typing the same explanation to every customer.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-lg font-semibold">GripBill</span>
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                Know who owes you. Get paid without the chase.
              </h1>
              <p className="mt-4 text-lg text-gray-600">
                GripBill is a simple follow-up tracker built for contractors
                who are done chasing payments through old texts and memory.
                Track who owes you, get reminded who to follow up with, and
                send the right message in one click.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login?mode=signup"
                  className={buttonClassName({
                    size: "md",
                    className: "px-5 py-2.5 text-base",
                  })}
                >
                  Get started
                </Link>
                <Link
                  href="/login"
                  className={buttonClassName({
                    variant: "secondary",
                    size: "md",
                    className: "px-5 py-2.5 text-base",
                  })}
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <blockquote className="border-l-4 border-gray-300 pl-4 text-xl text-gray-700 sm:pl-6 sm:text-2xl">
            &ldquo;I know I&rsquo;m owed money out there. I just don&rsquo;t
            always know exactly how much, from who, or who I already
            followed up with.&rdquo;
          </blockquote>
          <p className="mt-4 text-sm text-gray-500">
            If that sounds familiar, GripBill was built for you — not for
            accountants, and not for running a whole business. Just for
            keeping a grip on who owes you money.
          </p>
        </section>

        {/* Dashboard mockup */}
        <section className="border-y border-gray-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              See where things stand, at a glance
            </h2>
            <p className="mt-2 max-w-2xl text-gray-600">
              Your dashboard shows what&rsquo;s outstanding, what&rsquo;s due
              today, and what&rsquo;s overdue — the moment you log in.
            </p>

            <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Money outstanding"
                  value="$12,430.00"
                  helpText="Across 9 customers"
                />
                <StatCard
                  label="Follow-ups due today"
                  value="2"
                  tone="warning"
                />
                <StatCard
                  label="Overdue follow-ups"
                  value="3"
                  tone="danger"
                />
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3">Due date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          Sarah Brown
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          Deck rebuild — final payment
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-red-600">
                            Sep 22, 2026
                          </span>
                          <span className="ml-2">
                            <Badge tone="red">Overdue</Badge>
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          Marcus Lee
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          Kitchen remodel — deposit
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          Sep 29, 2026
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          Dana Whitfield
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          Fence install — balance
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          Oct 3, 2026
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Sample data shown for illustration.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            What GripBill actually does
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-gray-200 bg-white p-5"
              >
                <h3 className="font-medium text-gray-900">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Message mockup */}
        <section className="border-y border-gray-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              One click, and the message is written for you
            </h2>
            <p className="mt-2 max-w-2xl text-gray-600">
              Pick a tone — friendly, firm, or formal — and GripBill drafts
              the follow-up, including what the payment is for. Text it,
              email it, or copy it as-is.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-[auto,1fr] sm:items-start">
              <div className="flex gap-2 sm:flex-col">
                <span className="rounded-md border border-blue-600 bg-blue-600 px-3 py-2 text-center text-xs font-medium text-white">
                  Friendly
                </span>
                <span className="rounded-md border border-gray-300 px-3 py-2 text-center text-xs text-gray-500">
                  Firm
                </span>
                <span className="rounded-md border border-gray-300 px-3 py-2 text-center text-xs text-gray-500">
                  Formal
                </span>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 text-sm leading-relaxed text-gray-700">
                <p>
                  Hi Marcus, just a friendly reminder that the balance of
                  $1,850.00 is still outstanding, now 4 days past due. If
                  you&rsquo;ve already sent payment, please disregard this
                  message. Could you let me know when I can get this
                  settled, ideally by the end of the week? Happy to help if
                  there&rsquo;s anything holding it up.
                </p>
                <p className="mt-4">Deposit — required before work begins.</p>
                <p className="mt-4">Thanks,</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Sample message shown for illustration.
            </p>
          </div>
        </section>

        {/* Positioning */}
        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Not invoicing software. Not a smaller version of the big guys.
          </h2>
          <p className="mt-3 max-w-2xl text-gray-600">
            GripBill doesn&rsquo;t send invoices, schedule jobs, or run
            payroll — there are already tools for that, and you might use
            one. GripBill&rsquo;s one job is making sure nobody who owes you
            money gets forgotten, and that following up doesn&rsquo;t take
            more of your time than the job itself did.
          </p>
        </section>

        {/* Pricing */}
        <section className="border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
            <div className="mx-auto max-w-sm rounded-lg border border-gray-200 p-6 text-center">
              <p className="text-sm font-medium text-gray-500">GripBill</p>
              <p className="mt-2 text-4xl font-semibold text-gray-900">
                $15
                <span className="text-base font-normal text-gray-500">
                  /month
                </span>
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Unlimited customers and follow-ups. Cancel anytime.
              </p>
              <Link
                href="/login?mode=signup"
                className={buttonClassName({
                  className: "mt-6 w-full",
                })}
              >
                Get started
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200">
        <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-gray-400 sm:px-6">
          GripBill
        </div>
      </footer>
    </div>
  );
}
