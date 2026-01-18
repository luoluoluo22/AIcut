import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { baseMetaData } from "./metadata";
import { defaultFont } from "../lib/font-config";
import { env } from "@/env";

export const metadata = baseMetaData;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${defaultFont.className} font-sans antialiased`} suppressHydrationWarning>
        <div suppressHydrationWarning>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true} disableTransitionOnChange>
            <TooltipProvider>
              {children}
              <Analytics />
              <Toaster />
              <Script
                src="https://cdn.databuddy.cc/databuddy.js"
                strategy="afterInteractive"
                async
                data-client-id="UP-Wcoy5arxFeK7oyjMMZ"
                data-disabled={env.NODE_ENV === "development"}
                data-track-attributes={false}
                data-track-errors={true}
                data-track-outgoing-links={false}
                data-track-web-vitals={false}
                data-track-sessions={false}
              />
            </TooltipProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
