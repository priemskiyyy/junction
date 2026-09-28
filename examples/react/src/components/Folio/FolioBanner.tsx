import { X } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";

import type { FolioBanner as FolioBannerState } from "example-shared/folio/types/FolioBanner";
import { noticeStyles } from "example-shared/ui/styles/noticeStyles";

type FolioBannerProps = { banner: FolioBannerState; onDismiss: () => void };

export const FolioBanner: React.FunctionComponent<FolioBannerProps> = ({
  banner,
  onDismiss,
}) => (
  <div
    role="status"
    className={clsx(
      noticeStyles({ tone: banner.tone }),
      "mx-3 mt-2 items-center py-2 motion-safe:animate-land",
    )}
  >
    <p className="min-w-0 flex-1 text-sm font-medium">{banner.text}</p>
    <button
      type="button"
      aria-label="Dismiss"
      onClick={onDismiss}
      className="rounded-md p-1 text-zinc-500 hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-violet-500 dark:hover:bg-zinc-800"
    >
      <X aria-hidden="true" size={12} weight="bold" />
    </button>
  </div>
);
