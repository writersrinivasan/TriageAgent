import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IT Incident Triage Agent",
  description: "Agentic AI for infrastructure incident triage",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
