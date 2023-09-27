import { describe } from "@jest/globals";
import { PassivePromiseMock, PendingPromiseMock } from "@self/PromiseMock";

describe(PassivePromiseMock.name, () => {
  describe("#resolve", () => {
    it("should return itself to allow chaining #settled", async () => {
      const p = new PassivePromiseMock<string>();
      await expect(p.resolve("Hello!").settled()).resolves.toEqual("Hello!");
    });
  });

  describe("#reject", () => {
    it("should return itself to allow chaining #settled", async () => {
      const p = new PassivePromiseMock<string>();
      await expect(p.reject(new Error("oh no!")).settled()).rejects.toThrow(
        "oh no!",
      );
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
