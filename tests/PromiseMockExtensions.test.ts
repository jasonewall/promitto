import { describe } from "@jest/globals";
import {
  PassivePromiseMock,
  PendingPromiseMock,
  IllegalPromiseMutationError,
  SyncPromiseMock,
  AsyncPromiseMock,
  PromiseMock,
} from "@self/PromiseMock";

describe(PassivePromiseMock.name, () => {
  describe("#resolve", () => {
    it("should return itself to allow chaining #settled", async () => {
      const p = new PassivePromiseMock<string>(SyncPromiseMock);
      await expect(p.resolve("Hello!").settled()).resolves.toEqual("Hello!");
    });

    it("should not allow changing state once resolved", async () => {
      const p = new PassivePromiseMock<number>(SyncPromiseMock);
      p.resolve(10);
      expect(() => p.resolve(11)).toThrow(IllegalPromiseMutationError);

      await expect(p.settled()).resolves.toEqual(10);
    });

    it("should not allow changing state once rejected", async () => {
      const p = new PassivePromiseMock<number>(SyncPromiseMock);
      p.reject(new Error("original error message"));
      expect(() => p.resolve(11)).toThrow(IllegalPromiseMutationError);

      await expect(p.settled()).rejects.toThrow("original error message");
    });
  });

  describe("#reject", () => {
    it("should return itself to allow chaining #settled", async () => {
      const p = new PassivePromiseMock<string>(SyncPromiseMock);
      await expect(p.reject(new Error("oh no!")).settled()).rejects.toThrow("oh no!");
    });

    it("should not allow changing state once resolved", async () => {
      const p = new PassivePromiseMock<string>(SyncPromiseMock);
      p.resolve("Hello!");
      expect(() => p.reject(new Error("Not the error"))).toThrow(IllegalPromiseMutationError);

      await expect(p.settled()).resolves.toEqual("Hello!");
    });

    it("should not allow changing state once rejected", async () => {
      const p = new PassivePromiseMock<number>(SyncPromiseMock);
      p.reject(new Error("original error"));
      expect(() => p.reject(new Error("new error"))).toThrow(IllegalPromiseMutationError);

      await expect(p.settled()).rejects.toThrow("original error");
    });
  });
});

describe(PendingPromiseMock.name, () => {
  describe("#resolve", () => {
    it("should return itself to allow chaining #settled", async () => {
      const p = new PendingPromiseMock(19, SyncPromiseMock);
      await expect(p.resolve().settled()).resolves.toEqual(19);
    });
  });
});

interface TestPromiseConstructor {
  name: string;

  resolve<T>(value?: T): PromiseMock<T>;
}

const PassivePromiseMockConstructor = {
  name: "PassivePromiseMock",
  resolve: <T>() => new PassivePromiseMock<T>(SyncPromiseMock).resolve(undefined as T),
};

const PendingPromiseMockConstructor = {
  name: "PendingPromiseMock",
  resolve: <T>() => new PendingPromiseMock<T>(undefined as T, SyncPromiseMock).resolve(),
};

const promiseTypes: TestPromiseConstructor[] = [];
promiseTypes.push(PassivePromiseMockConstructor);
promiseTypes.push(PendingPromiseMockConstructor);
promiseTypes.push(SyncPromiseMock);
promiseTypes.push(AsyncPromiseMock);

promiseTypes.forEach((TestPromise) => {
  describe(TestPromise.name, () => {
    describe("#then", () => {
      it("should add the result to children", () => {
        const p = TestPromise.resolve();
        const child = p.then(jest.fn());
        expect(p.children).toEqual([child]);
      });
    });

    describe("#catch", () => {
      it("should add the result to children", () => {
        const p = TestPromise.resolve();
        const child = p.catch(jest.fn());
        expect(p.children).toEqual([child]);
      });
    });

    describe("#finally", () => {
      it("should add the result to children", () => {
        const p = TestPromise.resolve();
        const child = p.finally(jest.fn());
        expect(p.children).toEqual([child]);
      });
    });
  });
});
