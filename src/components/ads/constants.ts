export const AD_SIZES = {
  leaderboard: { width: 728, height: 90 },
  banner: { width: 468, height: 60 },
  small: { width: 320, height: 100 },
} as const;

export type AdSize = keyof typeof AD_SIZES;

export const AD_SLOTS = {
  dashboardMain: { id: "dashboard-main", defaultSize: "leaderboard" as AdSize },
  jobsMain: { id: "jobs-main", defaultSize: "leaderboard" as AdSize },
  reviewMain: { id: "review-main", defaultSize: "small" as AdSize },
  automationBottom: { id: "automation-bottom", defaultSize: "small" as AdSize },
} as const;

export type AdSlotName = keyof typeof AD_SLOTS;
