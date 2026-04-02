"use client";

import { useState, useEffect } from "react";
import { AD_SIZES, AdSize } from "../constants";

interface Banner {
  headline: string;
  cta: string;
  url: string;
  gradient: string;
}

const BANNERS: Banner[] = [
  {
    headline: "Build a standout resume with AI",
    cta: "Try Resume.io",
    url: "https://resume.io",
    gradient: "from-blue-600/20 to-cyan-600/20",
  },
  {
    headline: "Ace your next interview",
    cta: "Practice on Interviewing.io",
    url: "https://interviewing.io",
    gradient: "from-purple-600/20 to-pink-600/20",
  },
  {
    headline: "Discover salary insights for your role",
    cta: "Check Levels.fyi",
    url: "https://levels.fyi",
    gradient: "from-green-600/20 to-emerald-600/20",
  },
  {
    headline: "Upskill with free coding courses",
    cta: "Browse freeCodeCamp",
    url: "https://freecodecamp.org",
    gradient: "from-yellow-600/20 to-orange-600/20",
  },
  {
    headline: "Get noticed by top recruiters",
    cta: "Try LinkedIn Premium",
    url: "https://premium.linkedin.com",
    gradient: "from-sky-600/20 to-blue-600/20",
  },
  {
    headline: "Find remote QA jobs worldwide",
    cta: "Browse We Work Remotely",
    url: "https://weworkremotely.com",
    gradient: "from-teal-600/20 to-cyan-600/20",
  },
];

export function SelfHostedAd({ size }: { size: AdSize }) {
  const [banner, setBanner] = useState<Banner>(BANNERS[0]);

  useEffect(() => {
    setBanner(BANNERS[Math.floor(Math.random() * BANNERS.length)]);
  }, []);

  const dims = AD_SIZES[size];
  const isSmall = size === "small";

  return (
    <a
      href={banner.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={`flex items-center justify-center rounded-xl bg-gradient-to-r ${banner.gradient} border border-foreground/5 hover:border-foreground/15 transition-colors mx-auto cursor-pointer no-underline`}
      style={{ maxWidth: dims.width, height: dims.height }}
      aria-label={banner.headline}
      role="complementary"
    >
      <div className={`text-center ${isSmall ? "px-4" : "px-6"}`}>
        <p className={`font-medium text-foreground ${isSmall ? "text-xs" : "text-sm"}`}>
          {banner.headline}
        </p>
        <p className={`text-muted-foreground mt-1 ${isSmall ? "text-[10px]" : "text-xs"}`}>
          {banner.cta} &rarr;
          <span className="ml-2 opacity-40">Ad</span>
        </p>
      </div>
    </a>
  );
}
