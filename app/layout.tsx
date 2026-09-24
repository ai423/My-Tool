import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { toolConfig } from "@/tool.config";
import "./globals.css";

export const metadata: Metadata = {
  title: toolConfig.toolName || `הכלי של ${toolConfig.ownerName}`,
  description: "נבנה בסדנת 'הלוואי שהיה אפשר' של GR8MINDS",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// צבע המותג נכנס כמשתנה CSS אחד. globals.css גוזר ממנו את כל השאר.
const brand = { "--brand": toolConfig.brandColor } as CSSProperties;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" style={brand}>
      <body>{children}</body>
    </html>
  );
}
