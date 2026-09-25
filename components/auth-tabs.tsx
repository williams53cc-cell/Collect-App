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
