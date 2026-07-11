import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://housemates-sand.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl),
  title: {
    default: "HouseFair",
    template: "%s | HouseFair",
  },
  description:
    "Fair chores, groceries, house issues, shared expenses, and AI planning for roommates.",
  applicationName: "HouseFair",
  keywords: [
    "roommate chores",
    "shared expenses",
    "grocery planner",
    "roommate app",
    "Splitwise alternative",
    "household management",
  ],
  openGraph: {
    title: "HouseFair",
    description:
      "Fair chores, groceries, house issues, shared money, and AI planning for roommates.",
    url: publicSiteUrl,
    siteName: "HouseFair",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HouseFair",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/icon-180.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#151922" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider>
          <PwaRegistration />
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
