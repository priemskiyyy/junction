import {
  ArrowSquareOut,
  CaretLeft,
  FloppyDisk,
  PencilSimple,
} from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";

import type { FolioDocument } from "example-shared/folio/types/FolioDocument";
import { getPersonName } from "example-shared/formatting/getPersonName";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { Tag } from "src/components/Common/Tag";

type DocumentViewProps = {
  document: FolioDocument;
  comment: { id: string } | null;
  editing: boolean;
  related: FolioDocument | null;
  onBack: () => void;
  onEditingChange: (editing: boolean) => void;
  onRelatedPress: (related: FolioDocument) => void;
};

export const DocumentView: React.FunctionComponent<DocumentViewProps> = ({
  document,
  comment,
  editing,
  related,
  onBack,
  onEditingChange,
  onRelatedPress,
}) => (
  <article
    aria-label={document.title}
    className="flex flex-col gap-3 motion-safe:animate-land"
  >
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        className={buttonStyles({ variant: "ghost", size: "tiny" })}
      >
        <CaretLeft aria-hidden="true" size={12} weight="bold" />
        Documents
      </button>
      <span className="ml-auto">
        {editing ? (
          <button
            type="button"
            onClick={() => onEditingChange(false)}
            className={buttonStyles({ variant: "primary", size: "tiny" })}
          >
            <FloppyDisk aria-hidden="true" size={12} weight="bold" />
            Save
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onEditingChange(true)}
            className={buttonStyles({ size: "tiny" })}
          >
            <PencilSimple aria-hidden="true" size={12} weight="bold" />
            Edit
          </button>
        )}
      </span>
    </div>
    <div className="flex flex-col gap-1">
      <h4 className="text-lg font-semibold tracking-tight">{document.title}</h4>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {document.summary}
      </p>
    </div>
    {editing ? (
      <p
        role="status"
        className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
      >
        Unsaved changes. This pane is not ready, so Junction holds anything that
        arrives for it until you save.
      </p>
    ) : null}
    {document.comments.length === 0 ? null : (
      <ul aria-label="Comments" className="flex flex-col gap-2">
        {document.comments.map(({ id, author, body }) => (
          <li
            key={id}
            className={clsx(
              "flex flex-col gap-1 rounded-lg px-3 py-2 text-sm",
              id === comment?.id
                ? "bg-violet-50 ring-2 ring-violet-500 dark:bg-violet-950/40"
                : "bg-zinc-100 dark:bg-zinc-800/70",
            )}
          >
            <span className="flex items-center gap-2 text-xs font-medium text-zinc-500">
              {getPersonName(author.id)}
              {id === comment?.id ? <Tag strong>from the mention</Tag> : null}
            </span>
            <span>{body}</span>
          </li>
        ))}
      </ul>
    )}
    {related === null ? null : (
      <button
        type="button"
        onClick={() => onRelatedPress(related)}
        className={buttonStyles({ variant: "ghost", size: "block" })}
      >
        <ArrowSquareOut aria-hidden="true" size={14} weight="bold" />
        <span className="flex flex-col">
          <span>Open {related.title}</span>
          <span className="text-xs font-normal text-zinc-500">
            Dispatched through Junction, like an entry point from outside
          </span>
        </span>
      </button>
    )}
  </article>
);
