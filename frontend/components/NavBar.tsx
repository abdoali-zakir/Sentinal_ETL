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

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 border-b border-white/5 bg-ink"
      data-testid="navbar"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-3"
          data-testid="brand-link"
        >
          <MedallionDots />
          <span className="text-[15px] font-semibold tracking-tight text-white">
            Sentinel ETL
          </span>
        </Link>

        <ul className="flex items-center gap-7 text-[13px] font-medium tracking-wide">
          {navLinks.map((link) => {
            const isActive =
              link.href !== "#" &&
              (link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href));
            const isDisabled = link.href === "#";
            return (
              <li key={link.label}>
                <Link
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  aria-disabled={isDisabled}
                  data-testid={`nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`nav-link ${isActive ? "active text-white" : ""} ${
                    isDisabled
                      ? "cursor-default text-slate-muted/60"
                      : "text-slate-muted hover:text-white"
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
