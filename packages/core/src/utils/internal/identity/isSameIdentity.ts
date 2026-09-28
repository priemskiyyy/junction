import type { JunctionIdentity } from "src/types/JunctionIdentity";

export const isSameIdentity = (
  left: JunctionIdentity,
  right: JunctionIdentity,
) => {
  if (left.status !== "authenticated" || right.status !== "authenticated") {
    return left.status === right.status;
  }

  return left.account.id === right.account.id;
};
