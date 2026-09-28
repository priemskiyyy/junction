/** What is left until a deadline, from `now`, in minutes and seconds: `9:41`, or `0:00` once it passed. */
export const formatCountdown = (at: number, now: number) => {
  const left = Math.max(0, Math.ceil((at - now) / 1_000));
  const minutes = Math.floor(left / 60);
  const seconds = String(left % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
};
