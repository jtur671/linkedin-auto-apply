export type IndeedStatus = "idle" | "running" | "stopping" | "error";

export interface IndeedState {
  status: IndeedStatus;
  phase: string | null; // "searching" | "scraping" | "scoring"
  searched: number;
  scraped: number;
  scored: number;
  total: number;
  errors: number;
  startedAt: string | null;
}

let state: IndeedState = {
  status: "idle",
  phase: null,
  searched: 0,
  scraped: 0,
  scored: 0,
  total: 0,
  errors: 0,
  startedAt: null,
};

export function getIndeedState(): IndeedState {
  return { ...state };
}

export function updateIndeedState(partial: Partial<IndeedState>): void {
  state = { ...state, ...partial };
}

export function resetIndeedState(): void {
  state = {
    status: "idle",
    phase: null,
    searched: 0,
    scraped: 0,
    scored: 0,
    total: 0,
    errors: 0,
    startedAt: null,
  };
}
