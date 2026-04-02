"use client";

import { useAds } from "./ad-provider";
import { AD_SLOTS, AdSlotName, AdSize } from "./constants";
import { SelfHostedAd } from "./providers/self-hosted";
import { AdSenseAd } from "./providers/adsense";
import { AdPlaceholder } from "./ad-placeholder";

interface AdSlotProps {
  slot: AdSlotName;
  size?: AdSize;
  className?: string;
}

export function AdSlot({ slot, size, className }: AdSlotProps) {
  const { provider, enabled } = useAds();

  if (!enabled) return null;

  const config = AD_SLOTS[slot];
  const adSize = size ?? config.defaultSize;

  return (
    <div className={className}>
      {/* Leaderboard on desktop, small on mobile */}
      {adSize === "leaderboard" ? (
        <>
          <div className="hidden md:block">
            <AdContent provider={provider} size="leaderboard" slotId={config.id} />
          </div>
          <div className="block md:hidden">
            <AdContent provider={provider} size="small" slotId={config.id} />
          </div>
        </>
      ) : (
        <AdContent provider={provider} size={adSize} slotId={config.id} />
      )}
    </div>
  );
}

function AdContent({ provider, size, slotId }: { provider: string; size: AdSize; slotId: string }) {
  switch (provider) {
    case "adsense":
      return <AdSenseAd size={size} slotId={slotId} />;
    case "self-hosted":
      return <SelfHostedAd size={size} />;
    default:
      return <AdPlaceholder size={size} />;
  }
}
