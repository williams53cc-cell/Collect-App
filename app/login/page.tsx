import { login, signup } from "./actions";
import { AuthTabs } from "@/components/auth-tabs";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold">GripBill</h1>
        <p className="mb-6 text-sm text-gray-500">
          Sign in to track customers and follow-ups.
        </p>

        {params.error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </p>
        )}
        {params.message && (
          <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {params.message}
          </p>
        )}

        <AuthTabs login={login} signup={signup} />
      </div>
    </div>
  );
}
