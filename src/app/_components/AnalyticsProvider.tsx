// src/app/_components/AnalyticsProvider.tsx
"use client";

import { Analytics } from "@vercel/analytics/react";

export default function AnalyticsProvider() {
  // Only render Analytics in production
  if (process.env.VERCEL_ENV !== "production") {
    return null;
  }
  return <Analytics />;
}
