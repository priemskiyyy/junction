import type React from "react";

import { SOURCE_PACKAGES } from "example-shared/junction/constants/sources";
import type { FolioSourceName } from "example-shared/junction/types/FolioSourceName";
import { Tag } from "src/components/Common/Tag";

type SourceTagProps = { source: FolioSourceName; factory: string };

export const SourceTag: React.FunctionComponent<SourceTagProps> = ({
  source,
  factory,
}) => (
  <span
    title={SOURCE_PACKAGES[source]}
    className="flex flex-wrap items-center gap-1"
  >
    <Tag strong>{source}</Tag>
    <Tag>{factory}</Tag>
  </span>
);
