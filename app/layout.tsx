import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title: "Entropy Wizard", description: "Sequence prediction and PRNG analysis, with an interactive generator laboratory."};
export default function Layout({children}: {children: React.ReactNode}) { return <html lang="en"><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600;800&display=swap" /></head><body>{children}</body></html>; }
