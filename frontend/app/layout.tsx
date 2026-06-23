import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Sentinel ETL",
  description: "Sentinel ETL dashboard",
};

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "#", label: "Lineage" },
  { href: "#", label: "Audit Log" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} min-h-screen bg-background font-[family-name:var(--font-geist-sans)] text-foreground antialiased`}
      >
        <nav className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <span className="text-lg font-semibold">Sentinel ETL</span>
            <ul className="flex gap-6 text-sm">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
