import promitto, { PassivePromiseMock, PendingPromiseMock, PromiseMock, PromiseState } from "../src";

test("promitto/dsl should be the default import", async () => {
  await expect(promitto().resolve("Hello from Promitto!").settled()).resolves.toEqual("Hello from Promitto!");
});

test("everything else should be importable", () => {
  [PromiseMock, PromiseState, PassivePromiseMock, PendingPromiseMock].forEach((x) => expect(x).toBeTruthy());
});
