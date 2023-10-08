import { describe } from "@jest/globals";
import { AsyncPromiseMock, PromiseMock, SyncPromiseMock } from "@self/PromiseMock";
import dsl, { sync, async, DSL } from "@self/dsl";
import { expectAll, mockFn } from "./utils/assorted";

function assignCallbacks<T>(p: PromiseMock<T>) {
  const handlers = mockFn("then1", "catch1", "finally1");
  const [then1, catch1, finally1] = handlers;

  p.then(then1).catch(catch1).finally(finally1);
  return handlers;
}

async function expectToBehaveLikeResolvedPromise<T>(p: PromiseMock<T>, value: T, ...handlers: jest.Mock[]) {
  const [then1, catch1, finally1] = handlers;
  await expect(p.settled()).resolves.toEqual(value);
  expectAll(then1, finally1).toHaveBeenCalledTimes(1);
  expect(catch1).not.toHaveBeenCalled();
  expect(then1).toHaveBeenCalledWith(value);
}

async function expectToBehaveLikeRejectedPromise<T>(
  p: PromiseMock<T>,
  reason: any,
  ...handlers: jest.Mock[]
) {
  const [then1, catch1, finally1] = handlers;

  await expect(p.settled()).rejects.toEqual(reason);
  expectAll(catch1, finally1).toHaveBeenCalledTimes(1);
  expect(catch1).toHaveBeenCalledWith(reason);
  expect(then1).not.toHaveBeenCalled();
}

describe("dsl", () => {
  it("should expose sync mode directly", async () => {
    await expect(dsl.sync().resolve("Hello from Promitto sync!")).resolves.toEqual(
      "Hello from Promitto sync!",
    );
  });

  it("should expose async directly", async () => {
    await expect(dsl.async().resolve("Hello from Promitto async!")).resolves.toEqual(
      "Hello from Promitto async!",
    );
  });

  it("should be able to have defaultMode assigned", () => {
    const originalMode = dsl.defaultMode;
    try {
      dsl.defaultMode = dsl.async;
      const asyncP = dsl();
      const asyncChain = asyncP.then(jest.fn());
      expect(asyncChain).toBeInstanceOf(AsyncPromiseMock);

      dsl.defaultMode = dsl.sync;
      const syncP = dsl();
      const syncChain = syncP.then(jest.fn());
      expect(syncChain).toBeInstanceOf(SyncPromiseMock);
    } finally {
      dsl.defaultMode = originalMode;
    }
  });
});

interface TestDSL {
  dsl: DSL;
  name: string;
}

const dsls: TestDSL[] = [];
dsls.push({ name: "promitto", dsl });
dsls.push({ name: "syncDsl", dsl: sync });
dsls.push({ name: "asyncDsl", dsl: async });

dsls.forEach((testDSL) => {
  describe(testDSL.name, () => {
    const dsl = testDSL.dsl;

    describe("#pending", () => {
      it("should return a pending promise that represents the provided value", async () => {
        const p = dsl.pending("a nice value");
        const handlers = assignCallbacks(p);

        expectAll(...handlers).not.toHaveBeenCalled();
        p.resolve();
        await expectToBehaveLikeResolvedPromise(p, "a nice value", ...handlers);
      });
    });

    describe("#promise", () => {
      it("should return a blank slate promise that can be resolved with any value", async () => {
        const p = dsl<number>();
        const handlers = assignCallbacks(p);

        expectAll(...handlers).not.toHaveBeenCalled();

        p.resolve(11);
        await expectToBehaveLikeResolvedPromise(p, 11, ...handlers);
      });

      it("should return a blank slate promise that can be rejected with any error", async () => {
        const p = dsl<string>();
        const handlers = assignCallbacks(p);

        expectAll(...handlers).not.toHaveBeenCalled();

        p.reject(new Error("rejected"));
        await expectToBehaveLikeRejectedPromise(p, new Error("rejected"), ...handlers);
      });
    });

    describe("#resolve", () => {
      it("should return a promise that is already resolved", async () => {
        const p = dsl.resolve([1, 2, 3, 4]);
        const handlers = assignCallbacks(p);

        await expectToBehaveLikeResolvedPromise(p, [1, 2, 3, 4], ...handlers);
      });

      it("should be callable without a param", async () => {
        const p = dsl.resolve();
        const handlers = assignCallbacks(p);

        await expectToBehaveLikeResolvedPromise(p, undefined, ...handlers);
      });
    });

    describe("#rejected", () => {
      it("should return a promise that is already rejected", async () => {
        const p = dsl.reject(new Error("rejected"));
        const handlers = assignCallbacks(p);

        await expectToBehaveLikeRejectedPromise(p, new Error("rejected"), ...handlers);
      });

      it("should be callable without a param", async () => {
        const p = dsl.reject();
        const handlers = assignCallbacks(p);

        await expectToBehaveLikeRejectedPromise(p, undefined, ...handlers);
      });
    });
  });
});
