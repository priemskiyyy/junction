import { CheckCircle, Warning, X } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";

import type { Tone } from "example-shared/types/Tone";
import { noticeStyles } from "example-shared/ui/styles/noticeStyles";

type NoticeCardProps = {
  title: string;
  body: string;
  tone: Tone;
  onDismiss: () => void;
};

// In the flow of the page, beside the control it is about, so it never covers the lab.
export const NoticeCard: React.FunctionComponent<NoticeCardProps> = ({
  title,
  body,
  tone,
  onDismiss,
}) => {
  const danger = tone === "danger";
  const NoticeIcon = danger ? Warning : CheckCircle;

  return (
    <div className={clsx(noticeStyles({ tone }), "motion-safe:animate-land")}>
      <NoticeIcon
        aria-hidden="true"
        size={18}
        weight="fill"
        className={clsx(
          "mt-0.5 shrink-0",
          danger ? "text-rose-600" : "text-emerald-600",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-semibold">{title}</p>
        <p className="leading-relaxed text-zinc-700 dark:text-zinc-300">
          {body}
        </p>
      </div>
      <button
        type="button"
        aria-label={`Dismiss ${title}`}
        onClick={onDismiss}
        className="rounded-md p-1 text-zinc-500 hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-violet-500 dark:hover:bg-zinc-800"
      >
        <X aria-hidden="true" size={14} weight="bold" />
      </button>
    </div>
  );
};
