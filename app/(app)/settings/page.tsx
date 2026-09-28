import { createClient } from "@/utils/supabase/server";
import { PaypalSettingsForm } from "./paypal-settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentUsername =
    (user?.user_metadata?.paypal_username as string | undefined) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage how GripBill works for your business.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
        <h2 className="text-base font-semibold">Getting paid</h2>
        <p className="mt-1 text-sm text-gray-500">
          Add your PayPal.me link so follow-up messages can include a link
          your customers can tap to pay you directly — the money goes
          straight to your own PayPal account, GripBill never touches it.
        </p>
        <div className="mt-4">
          <PaypalSettingsForm currentUsername={currentUsername} />
        </div>
      </div>
    </div>
  );
}
