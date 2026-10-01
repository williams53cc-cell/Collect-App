"use client";

import { useState } from "react";
import { Input } from "./field";
import { formatPhoneAsTyped } from "@/lib/format";

interface PhoneInputProps {
  id: string;
  name: string;
  defaultValue?: string;
  invalid?: boolean;
  placeholder?: string;
}

/** A plain text input only shows what's typed, so a contractor typing
 * "5551234567" saw exactly that — no punctuation — even though the field's
 * own placeholder promised "(555) 123-4567". This reformats on every
 * keystroke via formatPhoneAsTyped() (lib/format.ts), so what's on screen
 * (and what ends up saved, since this is the value the form submits) is
 * the readable version from the first digit typed. Kept separate from the
 * plain Input component since it's the only field in the app that needs
 * to reshape its own value as the contractor types. */
export function PhoneInput({
  id,
  name,
  defaultValue,
  invalid,
  placeholder,
}: PhoneInputProps) {
  const [value, setValue] = useState(() =>
    formatPhoneAsTyped(defaultValue ?? "")
  );

  return (
    <Input
      id={id}
      name={name}
      type="tel"
      value={value}
      onChange={(event) => setValue(formatPhoneAsTyped(event.target.value))}
      invalid={invalid}
      placeholder={placeholder}
    />
  );
}
