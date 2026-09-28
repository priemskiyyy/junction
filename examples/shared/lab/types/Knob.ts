/** One control of the lab, as the panel lists it. */
export type Knob<TId extends string> = {
  id: TId;
  label: string;
  description: string;
};
