import { describe } from "@jest/globals";
import { PassivePromiseMock, PendingPromiseMock, IllegalPromiseMutationError } from "@self/PromiseMock";

describe(PassivePromiseMock.name, () => {
  describe("#resolve", () => {
    it("should return itself to allow chaining #settled", async () => {
      const p = new PassivePromiseMock<string>();
      await expect(p.resolve("Hello!").settled()).resolves.toEqual("Hello!");
    });

    it("should not allow changing state once resolved", async () => {
      const p = new PassivePromiseMock<number>();
      p.resolve(10);
      expect(() => p.resolve(11)).toThrow(IllegalPromiseMutationError);

      await expect(p.settled()).resolves.toEqual(10);
    });

    it("should not allow changing state once rejected", async () => {
      const p = new PassivePromiseMock<number>();
      p.reject(new Error("original error message"));
      expect(() => p.resolve(11)).toThrow(IllegalPromiseMutationError);

      await expect(p.settled()).rejects.toThrow("original error message");
    });
  });

  describe("#reject", () => {
    it("should return itself to allow chaining #settled", async () => {
      const p = new PassivePromiseMock<string>();
      await expect(p.reject(new Error("oh no!")).settled()).rejects.toThrow("oh no!");
    });

    it("should not allow changing state once resolved", async () => {
      const p = new PassivePromiseMock<string>();
      p.resolve("Hello!");
      expect(() => p.reject(new Error("Not the error"))).toThrow(IllegalPromiseMutationError);

      await expect(p.settled()).resolves.toEqual("Hello!");
    });

    it("should not allow changing state once rejected", async () => {
      const p = new PassivePromiseMock<number>();
      p.reject(new Error("original error"));
      expect(() => p.reject(new Error("new error"))).toThrow(IllegalPromiseMutationError);

      await expect(p.settled()).rejects.toThrow("original error");
    });
  });
});

describe(PendingPromiseMock.name, () => {
  describe("#resolve", () => {
    it("should return itself to allow chaining #settled", async () => {
      const p = new PendingPromiseMock(19);
      await expect(p.resolve().settled()).resolves.toEqual(19);
    });
  });
});
