/** Junction's clock in the lab: the wall clock, which Skip ahead moves forward. */
export const createLabClock = () => {
  const state = { offset: 0 };

  return {
    now: () => Date.now() + state.offset,
    skip: (duration: number) => {
      state.offset += duration;
    },
    reset: () => {
      state.offset = 0;
    },
  };
};
