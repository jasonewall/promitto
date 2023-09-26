import { describe } from "@jest/globals";
import { PromiseMock } from "@self/PromiseMock";
import dsl from "@self/dsl";
import { expectAll, mockFn } from "./utils/assorted";

function assignCallbacks<T>(p: PromiseMock<T>) {
  const handlers = mockFn("then1", "catch1", "finally1");
  const [then1, catch1, finally1] = handlers;

  p.then(then1).catch(catch1).finally(finally1);
  return handlers;
}

describe("promitto", () => {
  describe("#pending", () => {
    it("should return a pending promise that represents the provided value", async () => {
      const p = dsl.pending("a nice value");
      const handlers = assignCallbacks(p);
      const [then1, catch1, finally1] = handlers;

      expectAll(...handlers).not.toHaveBeenCalled();

      p.resolve();
      const result = await p.settled();

      expect(result).toEqual("a nice value");
      expectAll(then1, finally1).toHaveBeenCalledTimes(1);
      expect(catch1).not.toHaveBeenCalled();
    });
  });

  describe("#promise", () => {
    it("should return a blank slate promise that can be resolved with any value", async () => {
      const p = dsl.promise<number>();
      const handlers = assignCallbacks(p);
      const [then1, catch1, finally1] = handlers;

      expectAll(... handlers).not.toHaveBeenCalled();

      p.resolve(11);
      const result = await p.settled();

      expectAll(then1, finally1).toHaveBeenCalledTimes(1);
      expect(then1).toHaveBeenCalledWith(11);
      expect(catch1).not.toHaveBeenCalled();
    });

    it("should return a blank slate promise that can be rejected with any error", async () => {
      const p = dsl.promise<string>();
      const handlers = assignCallbacks(p);
      const [then1, catch1, finally1] = handlers;

      expectAll(...handlers).not.toHaveBeenCalled();

      p.reject(new Error('rejected'));
      await expect(p.settled()).rejects.toThrowError('rejected');

      expectAll(catch1, finally1).toHaveBeenCalledTimes(1);
      expect(catch1).toHaveBeenCalledWith(new Error('rejected'));
      expect(then1).not.toHaveBeenCalled();
    });
  });

  describe('#resolve', () => {
    it("should return a promise that is already resolved", async () => {
      const p = dsl.resolve([1,2,3,4]);
      const handlers = assignCallbacks(p);
      const[then1, catch1, finally1] = handlers;

      expectAll(then1, finally1).toHaveBeenCalledTimes(1);
      expect(catch1).not.toHaveBeenCalled();
      expect(then1).toHaveBeenCalledWith([1,2,3,4]);
      const result = await p.settled();
      expect(result).toEqual([1,2, 3, 4]);
    });
  });

  describe('#rejected', () => {
    it("should return a promise that is already rejected", async () => {
      const p = dsl.reject(new Error('rejected'));
      const handlers = assignCallbacks(p);
      const [then1, catch1, finally1] = handlers;

      expectAll(catch1, finally1).toHaveBeenCalledTimes(1);
      expect(then1).not.toHaveBeenCalled();
      expect(catch1).toHaveBeenCalledWith(new Error('rejected'));

      await expect(p.settled()).rejects.toThrowError('rejected');
    });

    it("should be callable without a param", async () => {
      const p = dsl.reject();
      const handlers = assignCallbacks(p);
      const [then1, catch1, finally1] = handlers;

      expectAll(catch1, finally1).toHaveBeenCalledTimes(1);
      expect(then1).not.toHaveBeenCalled();
      expect(catch1).toHaveBeenCalledWith(undefined);
    });
  });
});
