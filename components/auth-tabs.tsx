"use client";

import { useState } from "react";
import { PasswordInput } from "@/components/password-input";

type AuthMode = "signin" | "signup";

/** Previously "Sign in" and "Sign up" were two separate buttons sitting
 * side by side under one shared form — nothing showed which mode you were
 * in, since neither button reflected a "selected" state. This replaces
 * that with a tab-style switch: the active mode is solid, the other
 * stays light gray, and the single submit button at the bottom follows
 * whichever tab is selected. */
export function AuthTabs({
  login,
  signup,
}: {
  login: (formData: FormData) => Promise<void>;
  signup: (formData: FormData) => Promise<void>;
}) {
  const [mode, setMode] = useState<AuthMode>("signin");

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-md bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`rounded py-1.5 text-sm font-medium transition-colors ${
            mode === "signin"
              ? "bg-blue-600 text-white"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded py-1.5 text-sm font-medium transition-colors ${
            mode === "signup"
              ? "bg-blue-600 text-white"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Sign up
        </button>
      </div>

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
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </div>
        <button
          formAction={mode === "signin" ? login : signup}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
    </>
  );
}
