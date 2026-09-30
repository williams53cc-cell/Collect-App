import Link from "next/link";
import { getBusinessProfile } from "@/lib/data/business-profile";
import { NameStep } from "./name-step";
import { BusinessBasicsStep } from "./business-basics-step";
import { BusinessDetailsStep } from "./business-details-step";
import { PaymentStep } from "./payment-step";

const STEP_TITLES = [
  "Your name",
  "Business basics",
  "Business details",
  "Getting paid",
];

function parseStep(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 4) return 1;
  return parsed;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const params = await searchParams;
  const step = parseStep(params.step);
  const profile = await getBusinessProfile();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Step {step} of 4
          </p>
          {step > 1 && (
            <Link
              href={`/onboarding?step=${step - 1}`}
              className="text-xs text-gray-500 hover:underline"
            >
              ← Back
            </Link>
          )}
        </div>

        <h1 className="mb-1 text-xl font-semibold">GripBill</h1>
        <p className="mb-6 text-sm text-gray-500">{STEP_TITLES[step - 1]}</p>

        {step === 1 && (
          <NameStep
            firstName={profile?.first_name ?? ""}
            lastName={profile?.last_name ?? ""}
          />
        )}
        {step === 2 && (
          <BusinessBasicsStep
            businessName={profile?.business_name ?? ""}
            businessType={profile?.business_type ?? "other"}
          />
        )}
        {step === 3 && (
          <BusinessDetailsStep
            currency={profile?.currency ?? "USD"}
            country={profile?.country ?? null}
            timezone={profile?.timezone ?? null}
          />
        )}
        {step === 4 && (
          <PaymentStep
            paymentMethod={profile?.payment_method ?? null}
            paymentLink={profile?.payment_link ?? null}
            paymentInstructions={profile?.payment_instructions ?? null}
            includePaymentLinkDefault={
              profile?.include_payment_link_default ?? true
            }
          />
        )}
      </div>
    </div>
  );
}
