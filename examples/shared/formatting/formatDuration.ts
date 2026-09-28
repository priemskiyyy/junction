/** A duration in milliseconds, as the lab says it: `800 ms`, `2 s`, `11 min`. */
export const formatDuration = (duration: number) => {
  if (duration < 1_000) {
    return `${Math.round(duration)} ms`;
  }

  if (duration < 60_000) {
    return `${Math.round(duration / 1_000)} s`;
  }

  return `${Math.round(duration / 60_000)} min`;
};
