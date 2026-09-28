import type { IntentProvenance } from "@priemskiyyy/junction";
import type React from "react";

import { describeProvenance } from "example-shared/formatting/describeProvenance";
import { Tag } from "src/components/Common/Tag";

type ProvenanceTagsProps = { provenance: IntentProvenance };

export const ProvenanceTags: React.FunctionComponent<ProvenanceTagsProps> = ({
  provenance,
}) => (
  <>
    {describeProvenance(provenance).map((tag, index) => (
      <Tag key={tag} strong={index === 0}>
        {tag}
      </Tag>
    ))}
  </>
);
