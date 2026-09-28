import type React from "react";
import type { ReactNode } from "react";

import { tagStyles } from "example-shared/ui/styles/tagStyles";

type TagProps = { strong?: boolean; children: ReactNode };

export const Tag: React.FunctionComponent<TagProps> = ({
  strong = false,
  children,
}) => (
  <span className={tagStyles({ emphasis: strong ? "strong" : "plain" })}>
    {children}
  </span>
);
