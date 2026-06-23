import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NSE Options Intelligence — Optimal CE/PE Selling Bands",
  description:
    "AI-powered platform for identifying statistically optimal call and put option selling percentages for NSE indices and F&O stocks. Real-time recommendations, historical analytics, and market regime analysis.",
  keywords: [
    "NSE options",
    "option selling",
    "NIFTY options",
    "BANKNIFTY strategy",
    "CE PE selling",
    "options probability",
    "F&O analytics",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
