"use client";

import { useState } from "react";

/** The plain <input type="password"> this replaces gave no way to check
 * what you'd typed before submitting — easy to fat-finger on a phone
 * keyboard and not notice until the sign-in fails. This adds a Show/Hide
 * toggle that flips the input between masked and plain text. */
export function PasswordInput({
  id,
  name,
  autoComplete,
}: {
  id: string;
  name: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-1">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required
        minLength={6}
        autoComplete={autoComplete}
        className="w-full rounded-md border border-gray-300 px-3 py-2 pr-14 text-sm focus:border-gray-500 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-gray-500 hover:text-gray-900"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
