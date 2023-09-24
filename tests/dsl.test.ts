import { describe } from "@jest/globals";
import { PromiseMock } from "@self/PromiseMock";
import dsl from "@self/dsl";
import { mockFn } from "./utils/assorted";

function assignCallbacks<T>(p: PromiseMock<T>) {
  const handlers = mockFn("then1", "catch1", "finally1");
  const [then1, catch1, finally1] = handlers;

  p.then(then1).catch(catch1).finally(finally1);
  return handlers;
}

function expectAll<T>(
  definer: (matcher: jest.JestMatchers<T>) => void,
  ...values: T[]
) {
  for (const val of values) definer(expect(val));
}

describe("promitto", () => {
  describe("pending", () => {
    it("should be nice", async () => {
      const p = dsl.pending("a nice value");
      const handlers = assignCallbacks(p);

      p.resolve();
      await p.settled();
    });
  });
});
