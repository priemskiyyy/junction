import type { Registration } from "src/types/internal/Registration";

export const getReadiness = ({ options: { ready } }: Registration) => {
  if (ready === true) {
    return "READY";
  }

  if (typeof ready !== "function") {
    return "NOT_READY";
  }

  try {
    if (ready() === true) {
      return "READY";
    }

    return "NOT_READY";
  } catch {
    return "FAILED";
  }
};
