/** What a provider claimed about deferral, as a provenance tag, or none when it said nothing. */
export const describeDeferral = (deferred: boolean | null): string[] => {
  if (deferred === null) {
    return [];
  }

  if (deferred) {
    return ["deferred"];
  }

  return ["not deferred"];
};
