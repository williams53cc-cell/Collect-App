"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/follow-ups", label: "Follow-ups" },
];

function useIsActive(href: string) {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  return (
    <>
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-lg font-semibold">
                 GripBill
            </Link>
            <div className="hidden items-center gap-1 sm:flex">
              {LINKS.map((link) => (
                <TopLink key={link.href} href={link.href} label={link.label} />
              ))}
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      {/* Bottom tab bar: mobile only. Thumb-reachable, always visible — no
          hidden or scrolled-off destinations on a phone-sized screen. */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div className="grid grid-cols-3">
          {LINKS.map((link) => (
            <BottomLink key={link.href} href={link.href} label={link.label} />
          ))}
        </div>
      </nav>
    </>
  );
}

function TopLink({ href, label }: { href: string; label: string }) {
  const isActive = useIsActive(href);
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-gray-100 text-gray-900"
          : "text-gray-500 hover:text-gray-900"
      }`}
    >
      {label}
    </Link>
  );
}

function BottomLink({ href, label }: { href: string; label: string }) {
  const isActive = useIsActive(href);
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
        isActive ? "text-gray-900" : "text-gray-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-gray-900" : "bg-transparent"
        }`}
      />
      {label}
    </Link>
  );
}
