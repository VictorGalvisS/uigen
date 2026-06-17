"use client";

import dynamic from "next/dynamic";

export const MainContentClient = dynamic(
  () => import("./main-content").then((m) => ({ default: m.MainContent })),
  { ssr: false }
);
