"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { AD_SIZES, AdSize } from "../constants";
import { AdPlaceholder } from "../ad-placeholder";

const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ?? "";

export function AdSenseAd({ size, slotId }: { size: AdSize; slotId: string }) {
  const adRef = useRef<HTMLModElement>(null);
  const dims = AD_SIZES[size];

  useEffect(() => {
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      // AdSense not loaded (ad blocker, localhost, etc.)
    }
  }, []);

  if (!publisherId) {
    return <AdPlaceholder size={size} />;
  }

  return (
    <div className="flex justify-center" aria-hidden="true" role="complementary">
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <ins
        ref={adRef}
        className="adsbygoogle bg-muted/30 rounded-xl"
        style={{ display: "inline-block", width: dims.width, height: dims.height }}
        data-ad-client={publisherId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
