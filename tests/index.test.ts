import promitto, {
  sync,
  async,
  PassivePromiseMock,
  PendingPromiseMock,
  PromiseMock,
  PromiseState,
} from "../src";

describe("promitto/dsl", () => {
  it("should be the default import", async () => {
    await expect(promitto().resolve("Hello from Promitto!").settled()).resolves.toEqual(
      "Hello from Promitto!",
    );
  });
});

test("everything else should be importable", () => {
  [sync, async, PromiseMock, PromiseState, PassivePromiseMock, PendingPromiseMock].forEach((x) =>
    expect(x).toBeTruthy(),
  );
});
