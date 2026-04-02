"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { isLocalhost, getAdProvider, isAdsEnabled } from "@/lib/ads";

type AdProviderType = "adsense" | "self-hosted";

interface AdContextValue {
  provider: AdProviderType;
  enabled: boolean;
  isLocal: boolean;
}

const AdContext = createContext<AdContextValue>({
  provider: "self-hosted",
  enabled: true,
  isLocal: true,
});

export function useAds() {
  return useContext(AdContext);
}

export function AdProvider({ children }: { children: ReactNode }) {
  const [ctx, setCtx] = useState<AdContextValue>({
    provider: "self-hosted",
    enabled: true,
    isLocal: true,
  });

  useEffect(() => {
    setCtx({
      provider: getAdProvider(),
      enabled: isAdsEnabled(),
      isLocal: isLocalhost(),
    });
  }, []);

  return <AdContext.Provider value={ctx}>{children}</AdContext.Provider>;
}
