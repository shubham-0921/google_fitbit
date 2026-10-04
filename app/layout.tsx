import type { Metadata, Viewport } from "next";
import { Bungee, Quicksand, Space_Mono } from "next/font/google";
import "./globals.css";
import { EmbedBridge } from "@/components/EmbedBridge";

const heading = Bungee({ weight: "400", subsets: ["latin"], variable: "--font-heading" });
const body = Quicksand({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--font-body" });
const mono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Trace — your Fitbit data",
  description: "Running and sleep dashboards from your Fitbit / Google Health data.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <EmbedBridge />
        {children}
      </body>
    </html>
  );
}
