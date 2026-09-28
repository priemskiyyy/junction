import type { Icon } from "@phosphor-icons/react";
import type React from "react";
import type { ReactNode } from "react";

type PanelHeadingProps = {
  id: string;
  icon: Icon;
  title: string;
  shows: string;
  children?: ReactNode;
};

export const PanelHeading: React.FunctionComponent<PanelHeadingProps> = ({
  id,
  icon: HeadingIcon,
  title,
  shows,
  children,
}) => (
  <div className="flex items-start gap-3">
    <span
      aria-hidden="true"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
    >
      <HeadingIcon size={18} weight="duotone" />
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <h3 id={id} className="font-semibold">
        {title}
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{shows}</p>
    </div>
    {children}
  </div>
);
