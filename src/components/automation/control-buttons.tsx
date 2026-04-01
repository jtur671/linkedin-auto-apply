"use client";
import { Button } from "@/components/ui/button";
import { Play, Square } from "lucide-react";

export function ControlButtons({ status, onStart, onStop }: { status: string; onStart: () => void; onStop: () => void }) {
  const isRunning = status === "running" || status === "stopping";
  return (
    <div className="flex gap-3">
      <Button onClick={onStart} disabled={isRunning} className="bg-green-600 hover:bg-green-700 text-white">
        <Play className="h-4 w-4 mr-2" />Start Automation
      </Button>
      <Button onClick={onStop} disabled={!isRunning} variant="destructive">
        <Square className="h-4 w-4 mr-2" />Stop
      </Button>
    </div>
  );
}
