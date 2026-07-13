"use client";

import { Suspense, type ReactNode } from "react";
import { PwaProvider } from "./PwaProvider";

/** Suspense boundary required for useSearchParams inside PwaProvider. */
export function PwaRoot({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <PwaProvider>{children}</PwaProvider>
    </Suspense>
  );
}
