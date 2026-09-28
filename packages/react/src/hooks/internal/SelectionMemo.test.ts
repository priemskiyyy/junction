import { expect, test, vi } from "vitest";

import { SelectionMemo } from "src/hooks/internal/SelectionMemo";

test("a selection is computed once per snapshot, and again for a new one", () => {
  const select = vi.fn((value: { count: number }) => ({
    doubled: value.count * 2,
  }));

  const memo = new SelectionMemo(select);
  const first = { count: 1 };
  const second = { count: 2 };

  const selection = memo.read(first);

  expect(memo.read(first)).toBe(selection);
  expect(memo.read(second)).toEqual({ doubled: 4 });
  expect(select.mock.calls).toEqual([[first], [second]]);
});
