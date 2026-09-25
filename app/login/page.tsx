import { login, signup } from "./actions";
import { PasswordInput } from "@/components/password-input";

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

        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              formAction={login}
              className="flex-1 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Sign in
            </button>
            <button
              formAction={signup}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
