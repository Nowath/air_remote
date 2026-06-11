import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/app/providers";
import { geistMono, kanit } from "@/app/fonts";
import "@/app/styles/globals.css";

export const metadata: Metadata = {
  title: "air-remote",
  description: "air-remote — Next.js + Supabase + shadcn/ui (Feature-Sliced Design)",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${kanit.variable} ${geistMono.variable} h-full font-sans antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
