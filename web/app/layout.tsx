import type { Metadata } from "next";
import { DM_Sans, Crimson_Text, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { LayoutTransition } from "@/components/ui/transitions";
import { ThemeProvider } from "@/components/theme-provider";
import "@/lib/kyc/config-validation"; // Validate KYC env vars on startup

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
});

const crimsonText = Crimson_Text({
  variable: "--font-crimson-text",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ampel - Your AI Company",
  description: "Abundance only matters if it's shared. Join Ampel and earn equity rewards for your engagement.",
  icons: {
    icon: '/ampel-favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${crimsonText.variable} ${robotoMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LayoutTransition>
            {children}
          </LayoutTransition>
        </ThemeProvider>
      </body>
    </html>
  );
}
