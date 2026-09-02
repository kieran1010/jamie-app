import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

const TUTOR_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "My profile" },
  { href: "/dashboard/subjects", label: "Subjects & levels" },
  { href: "/dashboard/availability", label: "Availability" },
  { href: "/dashboard/requests", label: "Lesson requests" },
];

const SEEKER_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/bookings", label: "My bookings" },
  { href: "/dashboard/students", label: "Who I book for" },
  { href: "/search", label: "Find a tutor" },
];

const ADMIN_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/admin", label: "Verify tutors" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const links =
    user.role === "TUTOR" ? TUTOR_LINKS : user.role === "ADMIN" ? ADMIN_LINKS : SEEKER_LINKS;

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:items-start">
      <nav className="lg:sticky lg:top-6">
        <ul className="flex flex-wrap gap-1 lg:flex-col">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-white hover:text-ink-900"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  );
}
