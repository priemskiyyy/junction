import { Bell, Signpost } from "@phosphor-icons/react";
import type React from "react";

import { NOTIFICATION_PRESETS } from "example-shared/device/constants/notificationPresets";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { OutsideCard } from "src/components/Outside/OutsideCard";
import { useLab } from "src/hooks/useLab";

export const NotificationsCard: React.FunctionComponent = () => {
  const lab = useLab();

  return (
    <OutsideCard
      icon={Bell}
      title="Notifications"
      source="notifications"
      factory="notifications()"
    >
      <ul className="flex flex-col gap-2.5">
        {NOTIFICATION_PRESETS.map((preset) => (
          <li
            key={preset.id}
            className="flex flex-col gap-2 rounded-2xl bg-zinc-100/80 p-3 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800/80 dark:ring-zinc-700"
          >
            <div className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white"
              >
                <Signpost size={16} weight="bold" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold">{preset.title}</span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {preset.body}
                </span>
              </span>
            </div>
            <div className="flex gap-2">
              {preset.actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  aria-label={`${action.label}: ${preset.title}`}
                  onClick={() => lab.pressNotification(preset, action.id)}
                  className={buttonStyles({ size: "tiny" })}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </OutsideCard>
  );
};
