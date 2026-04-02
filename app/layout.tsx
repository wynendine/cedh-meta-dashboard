import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "cEDH Meta Dashboard",
  description: "Commander meta share by region, state, city, and store",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
