import type { Waiting } from "src/types/internal/Waiting";

export const isSameWaiting = (left: Waiting, right: Waiting) =>
  left.reason === right.reason &&
  left.consumers.length === right.consumers.length &&
  left.consumers.every(({ id, name }, index) => {
    const other = right.consumers[index];

    return other?.id === id && other.name === name;
  });
