import type { Icon } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";
import type { ReactNode } from "react";

import type { FolioSourceName } from "example-shared/junction/types/FolioSourceName";
import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import { SourceTag } from "src/components/Outside/SourceTag";

type OutsideCardProps = {
  icon: Icon;
  title: string;
  source: FolioSourceName;
  factory: string;
  children: ReactNode;
};

export const OutsideCard: React.FunctionComponent<OutsideCardProps> = ({
  icon: CardIcon,
  title,
  source,
  factory,
  children,
}) => (
  <section
    aria-label={title}
    className={clsx("flex flex-col gap-3 p-4", CARD_CLASS_NAME)}
  >
    <div className="flex flex-wrap items-center gap-2">
      <CardIcon
        aria-hidden="true"
        size={18}
        weight="duotone"
        className="text-violet-600 dark:text-violet-300"
      />
      <h3 className="mr-auto font-semibold">{title}</h3>
      <SourceTag source={source} factory={factory} />
    </div>
    {children}
  </section>
);
