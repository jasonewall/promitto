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
  describe("#pending", () => {
    it("should return a pending promise that represents the provided value", async () => {
      const p = dsl.pending("a nice value");
      const handlers = assignCallbacks(p);
      const [then1, catch1, finally1] = handlers;

      expectAll((h) => h.not.toHaveBeenCalled(), ...handlers);

      p.resolve();
      const result = await p.settled();

      expect(result).toEqual("a nice value");
      expectAll((h) => h.toHaveBeenCalledTimes(1), then1, finally1);
      expect(catch1).not.toHaveBeenCalled();
    });
  });

  describe("#promise", () => {
    it("should return a blank slate promise that can be resolved with any value", async () => {
      const p = dsl.promise<number>();
      const handlers = assignCallbacks(p);
      const [then1, catch1, finally1] = handlers;

      expectAll((h) => h.not.toHaveBeenCalled(), ... handlers);

      p.resolve(11);
      const result = await p.settled();

      expectAll((h) => h.toHaveBeenCalledTimes(1), then1, finally1);
      expect(then1).toHaveBeenCalledWith(11);
      expect(catch1).not.toHaveBeenCalled();
    });

    it("should return a blank slate promise that can be rejected with any error", async () => {
      const p = dsl.promise<string>();
      const handlers = assignCallbacks(p);
      const [then1, catch1, finally1] = handlers;

      expectAll((h) => h.not.toHaveBeenCalled(), ...handlers);

      p.reject(new Error('rejected'));
      await expect(p.settled()).rejects.toThrowError('rejected');

      expectAll((h) => h.toHaveBeenCalledTimes(1), catch1, finally1);
      expect(catch1).toHaveBeenCalledWith(new Error('rejected'));
      expect(then1).not.toHaveBeenCalled();
    });
  });

  describe('#resolve', () => {
    it.todo("should return a promise that is already resolved");
  });
});
