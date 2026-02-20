import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Building Bill Manager",
  description: "Monthly building billing with per-flat statements and admin workflows."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
