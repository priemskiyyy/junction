import type { Inspection } from "@priemskiyyy/junction";
import type React from "react";
import { match } from "ts-pattern";

import { IGNORED_WORDS } from "example-shared/formatting/constants/ignoredWords";
import { REJECTION_WORDS } from "example-shared/formatting/constants/rejectionWords";
import { Badge } from "src/components/Common/Badge";
import { PayloadBlock } from "src/components/Common/PayloadBlock";
import { Tag } from "src/components/Common/Tag";

type InspectionResultProps = { inspection: Inspection };

export const InspectionResult: React.FunctionComponent<
  InspectionResultProps
> = ({ inspection }) =>
  match(inspection)
    .with({ status: "matched" }, ({ route, intent }) => (
      <div className="flex flex-col gap-3">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone="positive" dot>
            Matched
          </Badge>
          Route <Tag strong>{route.id}</Tag> makes <Tag>{intent.name}</Tag>
        </p>
        <PayloadBlock
          label="Payload, after the schema"
          value={intent.payload}
        />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Junction would admit it as a typed intent and hold it for the screen
          that owns it.
        </p>
      </div>
    ))
    .with({ status: "ignored" }, ({ reason }) => (
      <div className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone="neutral" dot>
            Ignored
          </Badge>
          {IGNORED_WORDS[reason]}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Nothing reaches Folio: no intent is admitted and no handler runs.
        </p>
      </div>
    ))
    .with({ status: "rejected" }, ({ reason, issues }) => (
      <div className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone="danger" dot>
            Refused
          </Badge>
          {REJECTION_WORDS[reason]}
        </p>
        {issues.length === 0 ? null : (
          <ul aria-label="Issues" className="flex flex-col gap-1">
            {issues.map(({ path, message }) => (
              <li
                key={`${path}:${message}`}
                className="flex flex-wrap items-baseline gap-2 text-sm"
              >
                {path === "" ? null : <Tag>{path}</Tag>}
                <span>{message}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Nothing reaches Folio: a link that breaks the grammar or the schema
          never becomes an intent.
        </p>
      </div>
    ))
    .exhaustive();
