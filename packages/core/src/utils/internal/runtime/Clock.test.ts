import { expect, test } from "vitest";

import { Clock } from "src/utils/internal/runtime/Clock";

test("the clock reads the time it is given", () => {
  const readings = [1_000, 1_500, 2_250];
  const clock = new Clock(() => readings.shift() ?? 0);

  expect([clock.now(), clock.now(), clock.now()]).toEqual([
    1_000, 1_500, 2_250,
  ]);
});

test("a wall clock set backwards never moves the time back, and the time that passes after it still counts", () => {
  const readings = [5_000, 3_000, 4_000, 6_000];
  const clock = new Clock(() => readings.shift() ?? 0);

  expect([clock.now(), clock.now(), clock.now(), clock.now()]).toEqual([
    5_000, 5_000, 6_000, 8_000,
  ]);
});

test("a restored checkpoint ahead of the wall clock is a floor the time keeps moving on from", () => {
  const readings = [1_000, 1_000, 3_000];
  const clock = new Clock(() => readings.shift() ?? 0);

  clock.advance(10_000);

  expect([clock.now(), clock.now(), clock.now()]).toEqual([
    10_000, 10_000, 12_000,
  ]);
});
