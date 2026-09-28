import type React from "react";

import { PEOPLE } from "example-shared/folio/constants/people";
import { isPersonId } from "example-shared/folio/isPersonId";
import { Monogram } from "src/components/Common/Monogram";

type PersonMonogramProps = { id: string };

export const PersonMonogram: React.FunctionComponent<PersonMonogramProps> = ({
  id,
}) => {
  if (!isPersonId(id)) {
    return <Monogram text={id.slice(0, 1).toUpperCase()} tone="neutral" />;
  }

  return <Monogram text={PEOPLE[id].initials} tone={PEOPLE[id].tone} />;
};
