import promitto from "../src";
import { PromiseState } from "../src";

it("promitto/dsl should be the default import", async () => {
  await expect(promitto().resolve("Hello from Promitto!").settled()).resolves.toEqual("Hello from Promitto!");
});

it("PromiseState should be importable", () => {
  expect(PromiseState.Pending).toEqual(PromiseState.Pending);
});
