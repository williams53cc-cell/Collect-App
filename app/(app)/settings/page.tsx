import { getBusinessProfile } from "@/lib/data/business-profile";
import { BusinessInfoForm } from "./business-info-form";
import { PaymentInfoForm } from "./payment-info-form";

export default async function SettingsPage() {
  const profile = await getBusinessProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage how GripBill works for your business.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
        <h2 className="text-base font-semibold">Business info</h2>
        <p className="mt-1 text-sm text-gray-500">
          Used to personalize your drafted messages and keep dates and
          currency right for where you work.
        </p>
        <div className="mt-4">
          <BusinessInfoForm
            businessName={profile?.business_name ?? ""}
            businessType={profile?.business_type ?? "other"}
            currency={profile?.currency ?? "USD"}
            country={profile?.country ?? null}
            timezone={profile?.timezone ?? null}
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
        <h2 className="text-base font-semibold">Getting paid</h2>
        <p className="mt-1 text-sm text-gray-500">
          Add a payment link so follow-up messages can include one your
          customers can tap to pay you directly — the money goes straight to
          your own account, GripBill never touches it.
        </p>
        <div className="mt-4">
          <PaymentInfoForm
            paymentMethod={profile?.payment_method ?? null}
            paymentLink={profile?.payment_link ?? null}
            paymentInstructions={profile?.payment_instructions ?? null}
            includePaymentLinkDefault={
              profile?.include_payment_link_default ?? true
            }
          />
        </div>
      </div>
    </div>
  );
}
