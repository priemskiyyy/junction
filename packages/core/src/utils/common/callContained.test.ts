import { expect, test, vi } from "vitest";

import { callContained } from "src/utils/common/callContained";

test("a callback that throws or rejects reaches the failure handler and nothing is rethrown", async () => {
  const tasks: Array<() => void> = [];

  vi.spyOn(globalThis, "queueMicrotask").mockImplementation((task) => {
    tasks.push(task);
  });

  const failures: unknown[] = [];
  const thrown = new Error("dispose threw");
  const rejected = new Error("dispose rejected");

  callContained(
    () => {
      throw thrown;
    },
    (error) => failures.push(error),
  );
  callContained(
    () => Promise.reject(rejected),
    (error) => failures.push(error),
  );
  callContained(
    () => {},
    (error) => failures.push(error),
  );

  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(failures).toEqual([thrown, rejected]);
  expect(tasks).toEqual([]);
});
