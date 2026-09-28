import { BatteryFull, CellSignalFull, WifiHigh } from "@phosphor-icons/react";
import type React from "react";

type StatusBarProps = { now: number };

export const StatusBar: React.FunctionComponent<StatusBarProps> = ({ now }) => (
  <div className="relative flex h-11 shrink-0 items-center justify-between px-7 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
    <span className="tabular-nums">
      {new Date(now).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
    <span
      aria-hidden="true"
      className="absolute top-2 left-1/2 h-6 w-24 -translate-x-1/2 rounded-full bg-zinc-900 dark:bg-black"
    />
    <span aria-hidden="true" className="flex items-center gap-1">
      <CellSignalFull size={14} weight="fill" />
      <WifiHigh size={14} weight="bold" />
      <BatteryFull size={16} weight="fill" />
    </span>
  </div>
);
