"use client";

const statusConfig: Record<string, { color: string; label: string; pulse: boolean }> = {
  idle: { color: "bg-gray-400", label: "Idle", pulse: false },
  running: { color: "bg-green-400", label: "Running", pulse: true },
  stopping: { color: "bg-yellow-400", label: "Stopping", pulse: true },
  stopped: { color: "bg-gray-400", label: "Stopped", pulse: false },
  error: { color: "bg-red-400", label: "Error", pulse: false },
  captcha: { color: "bg-orange-400", label: "Captcha Detected", pulse: true },
};

export function StatusIndicator({ status, currentJob }: { status: string; currentJob: string | null }) {
  const config = statusConfig[status] ?? { color: "bg-gray-400", label: status, pulse: false };
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          {config.pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`} />}
          <span className={`relative inline-flex rounded-full h-3 w-3 ${config.color}`} />
        </span>
        <span className="text-lg font-semibold">{config.label}</span>
      </div>
      {currentJob && <p className="text-sm text-muted-foreground pl-6">Current: {currentJob}</p>}
    </div>
  );
}
