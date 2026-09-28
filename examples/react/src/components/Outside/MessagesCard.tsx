import { ChatCircleText, LinkSimple } from "@phosphor-icons/react";
import type React from "react";

import { MESSAGES } from "example-shared/device/constants/messages";
import { PEOPLE } from "example-shared/folio/constants/people";
import { Monogram } from "src/components/Common/Monogram";
import { OutsideCard } from "src/components/Outside/OutsideCard";
import { useLab } from "src/hooks/useLab";

export const MessagesCard: React.FunctionComponent = () => {
  const lab = useLab();

  return (
    <OutsideCard
      icon={ChatCircleText}
      title="Messages"
      source="links"
      factory="linking()"
    >
      <ul className="flex flex-col gap-2.5">
        {MESSAGES.map(({ id, from, text, url }) => (
          <li key={id} className="flex items-start gap-2">
            <Monogram
              text={PEOPLE[from.id].initials}
              tone={PEOPLE[from.id].tone}
              shape="small"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-2xl rounded-tl-sm bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
              <span className="text-sm">{text}</span>
              <button
                type="button"
                aria-label={`Open the link to ${text}`}
                onClick={() => lab.openLink(url)}
                className="flex items-center gap-1 text-left font-mono text-xs break-all text-violet-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-violet-500 dark:text-violet-300"
              >
                <LinkSimple
                  aria-hidden="true"
                  size={12}
                  weight="bold"
                  className="shrink-0"
                />
                {url}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </OutsideCard>
  );
};
