"use client";

import { useFormStatus } from "react-dom";

import { buttonPrimary, buttonSecondary } from "./ui";

/**
 * A submit button that disables itself while its form action is in flight,
 * so nobody double-submits a booking request.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  const base = variant === "primary" ? buttonPrimary : buttonSecondary;
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={`${base} ${className}`}>
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
