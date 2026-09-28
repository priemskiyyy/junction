import { CaretRight, FileText } from "@phosphor-icons/react";
import type React from "react";

import type { FolioDocument } from "example-shared/folio/types/FolioDocument";

type DocumentListProps = {
  documents: FolioDocument[];
  onOpen: (documentId: string) => void;
};

export const DocumentList: React.FunctionComponent<DocumentListProps> = ({
  documents,
  onOpen,
}) => (
  <ul aria-label="Documents" className="flex flex-col gap-1.5">
    {documents.map((document) => (
      <li key={document.id}>
        <button
          type="button"
          onClick={() => onOpen(document.id)}
          className="flex w-full items-center gap-2.5 rounded-lg bg-zinc-100 px-3 py-2 text-left hover:bg-zinc-200/80 focus-visible:outline-2 focus-visible:outline-violet-500 dark:bg-zinc-800/70 dark:hover:bg-zinc-800"
        >
          <FileText
            aria-hidden="true"
            size={16}
            weight="duotone"
            className="shrink-0 text-violet-600 dark:text-violet-300"
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-medium">{document.title}</span>
            <span className="truncate text-xs text-zinc-500">
              {document.summary}
            </span>
          </span>
          <CaretRight
            aria-hidden="true"
            size={12}
            weight="bold"
            className="shrink-0 text-zinc-400"
          />
        </button>
      </li>
    ))}
  </ul>
);
