/** The screens a waiting reason is about, by the names they registered with. */
export const describeConsumers = (consumers: { name: string | null }[]) =>
  consumers.map(({ name }) => name ?? "An unnamed screen").join(" and ");
