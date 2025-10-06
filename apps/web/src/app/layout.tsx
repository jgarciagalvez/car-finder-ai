import type { Metadata } from "next";
import { VehicleProvider } from "@/context/VehicleContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Car Finder AI",
  description: "Personal Car Finder AI - Automated vehicle search and analysis tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <VehicleProvider>
          {children}
        </VehicleProvider>
      </body>
    </html>
  );
}