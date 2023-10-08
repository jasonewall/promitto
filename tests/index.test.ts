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

  it("should be able to assign other imports as modes", () => {
    const originalMode = promitto.defaultMode;
    try {
      promitto.defaultMode = sync;
      promitto.defaultMode = async;
    } finally {
      promitto.defaultMode = originalMode;
    }
  });

  it("should be able to assign the modes directly from promitto", () => {
    const originalMode = promitto.defaultMode;
    try {
      promitto.defaultMode = promitto.sync;
      promitto.defaultMode = promitto.async;
    } finally {
      promitto.defaultMode = originalMode;
    }
  });
});

test("everything else should be importable", () => {
  [sync, async, PromiseMock, PromiseState, PassivePromiseMock, PendingPromiseMock].forEach((x) =>
    expect(x).toBeTruthy(),
  );
});
