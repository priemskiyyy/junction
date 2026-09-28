import {
  Camera,
  ChatCircleText,
  Gear,
  Image,
  Signpost,
} from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";
import { useState } from "react";

import { SHORTCUTS } from "example-shared/device/constants/shortcuts";
import { useLab } from "src/hooks/useLab";

const OTHER_APPS = [
  { name: "Messages", icon: ChatCircleText, className: "bg-emerald-500" },
  { name: "Photos", icon: Image, className: "bg-amber-400" },
  { name: "Camera", icon: Camera, className: "bg-zinc-600" },
  { name: "Settings", icon: Gear, className: "bg-zinc-400" },
];

export const HomeScreen: React.FunctionComponent = () => {
  const lab = useLab();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const handleOpenPress = () => {
    lab.openApp();
  };

  return (
    <div className="flex flex-1 flex-col gap-6 bg-linear-to-b from-violet-500 via-violet-600 to-sky-600 px-6 pt-8 text-white">
      <p className="text-center text-sm font-medium text-white/80">
        Folio is not running
      </p>
      <div className="grid grid-cols-4 gap-x-4 gap-y-5">
        <div className="relative flex flex-col items-center gap-1.5">
          <button
            type="button"
            aria-label="Open Folio"
            onClick={handleOpenPress}
            onContextMenu={(event) => {
              event.preventDefault();
              setShortcutsOpen(true);
            }}
            className="inline-flex size-14 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-lg ring-1 ring-white/40 transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-white"
          >
            <Signpost size={28} weight="duotone" />
          </button>
          <span className="text-xs font-medium">Folio</span>
        </div>
        {OTHER_APPS.map(({ name, icon: AppIcon, className }) => (
          <div
            key={name}
            aria-hidden="true"
            className="flex flex-col items-center gap-1.5 opacity-80"
          >
            <span
              className={clsx(
                "inline-flex size-14 items-center justify-center rounded-2xl shadow",
                className,
              )}
            >
              <AppIcon size={26} weight="fill" />
            </span>
            <span className="text-xs">{name}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          aria-expanded={shortcutsOpen}
          onClick={() => setShortcutsOpen((open) => !open)}
          className="self-start rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-white"
        >
          Hold Folio&apos;s icon for its shortcuts
        </button>
        {shortcutsOpen ? (
          <ul
            aria-label="Folio's shortcuts"
            className="flex w-56 flex-col divide-y divide-zinc-200 overflow-hidden rounded-2xl bg-white/95 text-zinc-900 shadow-xl motion-safe:animate-land"
          >
            {SHORTCUTS.map((shortcut) => (
              <li key={shortcut.action.id}>
                <button
                  type="button"
                  onClick={() => lab.chooseShortcut(shortcut)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-500"
                >
                  {shortcut.title}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
};
