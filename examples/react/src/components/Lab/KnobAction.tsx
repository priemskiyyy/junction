import { CircleNotch } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type React from "react";
import { useId } from "react";

import type { Knob } from "example-shared/lab/types/Knob";
import type { ActionKnobId } from "example-shared/lab/types/KnobId";
import type { LabNotice } from "example-shared/lab/types/LabNotice";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { NoticeCard } from "src/components/Common/NoticeCard";

type KnobActionProps = {
  knob: Knob<ActionKnobId>;
  icon: Icon;
  running: boolean;
  blocked: boolean;
  /** What this action showed the last time it ran. */
  notice: LabNotice | undefined;
  onPress: () => void;
  onDismissNotice: (id: number) => void;
};

export const KnobAction: React.FunctionComponent<KnobActionProps> = ({
  knob,
  icon: KnobIcon,
  running,
  blocked,
  notice,
  onPress,
  onDismissNotice,
}) => {
  const descriptionId = useId();

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <button
        type="button"
        aria-describedby={descriptionId}
        disabled={blocked}
        onClick={onPress}
        className={buttonStyles({ size: "block" })}
      >
        {running ? (
          <CircleNotch
            aria-hidden="true"
            size={16}
            weight="bold"
            className="shrink-0 motion-safe:animate-spin"
          />
        ) : (
          <KnobIcon
            aria-hidden="true"
            size={16}
            weight="bold"
            className="shrink-0"
          />
        )}
        {knob.label}
      </button>
      <p
        id={descriptionId}
        className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
      >
        {knob.description}
      </p>
      <div aria-live="polite" className="empty:hidden">
        {notice === undefined ? null : (
          <NoticeCard
            title={notice.title}
            body={notice.body}
            tone={notice.tone}
            onDismiss={() => onDismissNotice(notice.id)}
          />
        )}
      </div>
    </li>
  );
};
