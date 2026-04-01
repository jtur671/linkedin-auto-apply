export type AutomationStatus = "idle" | "running" | "paused" | "stopping" | "error" | "captcha_required";

export interface AutomationState {
  status: AutomationStatus; currentJob: string | null;
  appliedThisRun: number; skippedThisRun: number; errorsThisRun: number; startedAt: string | null;
}

let state: AutomationState = { status: "idle", currentJob: null, appliedThisRun: 0, skippedThisRun: 0, errorsThisRun: 0, startedAt: null };

export function getState(): AutomationState { return { ...state }; }
export function updateState(partial: Partial<AutomationState>): void { state = { ...state, ...partial }; }
export function resetState(): void { state = { status: "idle", currentJob: null, appliedThisRun: 0, skippedThisRun: 0, errorsThisRun: 0, startedAt: null }; }
