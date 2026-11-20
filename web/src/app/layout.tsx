import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VaultPay — Autonomous Smart Pockets & Reactive Omni Dashboard",
  description:
    "Set-and-Forget Smart Pockets & 1s Wallet Shield on Reactive Omni & Base Sepolia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark antialiased">
      <body className="min-h-screen bg-[#08090C] text-white selection:bg-[#2563EB] selection:text-white">
        {children}
      </body>
    </html>
  );
}
