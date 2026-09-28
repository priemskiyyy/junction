import type { InboxEntry } from "src/types/InboxEntry";
import type { JunctionIdentity } from "src/types/JunctionIdentity";

type Binding = InboxEntry<string, unknown>["binding"];

const PUBLIC_BINDING: Binding = Object.freeze({ kind: "public" });

const UNBOUND_BINDING: Binding = Object.freeze({ kind: "unbound" });

export const getBinding = ({
  accountBound,
  target,
  identity,
}: {
  accountBound: boolean;
  target: string | undefined;
  identity: JunctionIdentity;
}): Binding => {
  if (!accountBound) {
    return PUBLIC_BINDING;
  }

  const id =
    target ??
    (identity.status === "authenticated" ? identity.account.id : null);

  if (id === null) {
    return UNBOUND_BINDING;
  }

  return Object.freeze({ kind: "bound", account: Object.freeze({ id }) });
};
