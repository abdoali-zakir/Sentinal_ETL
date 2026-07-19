"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MedallionDots } from "@/components/MedallionDots";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/datasets", label: "Datasets" },
  { href: "/upload", label: "Upload" },
  { href: "#", label: "Lineage" },
  { href: "#", label: "Audit Log" },
];

function isLinkActive(href: string, pathname: string): boolean {
  if (href === "#") return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-white/10 bg-ink px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <MedallionDots />
          <span className="text-lg font-semibold text-white">Sentinel ETL</span>
        </div>

        <ul className="flex gap-6 text-sm">
          {navLinks.map((link) => {
            const active = isLinkActive(link.href, pathname);

            return (
              <li key={link.label}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`border-b-2 pb-0.5 font-medium tracking-wide transition-colors ${
                    active
                      ? "border-gold text-white"
                      : "border-transparent text-neutral-300 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
