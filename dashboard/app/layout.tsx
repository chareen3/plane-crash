import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRoot } from "./components/pwa/PwaRoot";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060a14" },
    { media: "(prefers-color-scheme: light)", color: "#060a14" },
  ],
  colorScheme: "dark",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "CrashTracker | Real-Time Crash Analytics & AI Risk Coach",
  description:
    "Stop playing blind. Track real-time crash statistics, target hit rates, and volatility patterns to trade the crash with mathematical discipline.",
  applicationName: "CrashTracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CrashTracker",
    startupImage: ["/apple-touch-icon.png"],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon-32.png"],
  },
  openGraph: {
    title: "CrashTracker | AI Risk Analytics",
    description:
      "Real-time crash analytics, peak hours, and AI risk coaching for disciplined play.",
    siteName: "CrashTracker",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "CrashTracker" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CrashTracker",
    description: "Real-time crash analytics & AI risk coach.",
    images: ["/og.png"],
  },
};

/** Runs before paint — sets mobile class so refresh doesn't flash desktop CSS. */
const MOBILE_BOOT_SCRIPT = `
(function(){
  try {
    var bp = 850;
    var w = window.innerWidth || 0;
    var ua = navigator.userAgent || "";
    var phone = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) && w <= 1024;
    var mobile = w <= bp || phone;
    try {
      var s = localStorage.getItem("ct_is_mobile");
      if (s === "1" && w <= 1024) mobile = true;
      if (s === "0" && w > bp) mobile = false;
    } catch (e) {}
    var root = document.documentElement;
    if (mobile) root.classList.add("m-native-root");
    else root.classList.remove("m-native-root");
    root.dataset.mobile = mobile ? "1" : "0";
    try { localStorage.setItem("ct_is_mobile", mobile ? "1" : "0"); } catch (e) {}
    document.cookie = "ct_mobile=" + (mobile ? "1" : "0") + ";path=/;max-age=31536000;samesite=lax";
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#060a14" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CrashTracker" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script dangerouslySetInnerHTML={{ __html: MOBILE_BOOT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <PwaRoot>{children}</PwaRoot>
      </body>
    </html>
  );
}
