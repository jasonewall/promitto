import { describe } from "@jest/globals";

// to compare our behaviour with real promises
describe("Core Promise", () => {
  describe("rejected", () => {
    test("what happens when we call then on a rejected promise", async () => {
      let [caught, thened, caught2] = [false, false, false];
      Promise.reject(new Error("This is fine"))
        .catch(() => {
          caught = true;
        })
        .then((value: void) => {
          thened = true;
        })
        .catch((reason: any) => {
          caught2 = true;
        });

      await Promise.resolve();
      expect(caught).toBeTruthy();

      await Promise.resolve();
      expect(thened).toBeTruthy();

      await Promise.resolve();
      expect(caught2).toBeFalsy();

      [caught, thened, caught2] = [false, false, false];
      Promise.reject(new Error("this is still fine"))
        .catch(() => {
          caught = true;
          throw new Error("new error");
        })
        .then((value: never) => {
          thened = true;
        })
        .catch((reason: any) => {
          caught2 = true;
        });

      await Promise.resolve();
      expect(caught).toBeTruthy();

      await Promise.resolve();
      expect(thened).toBeFalsy();

      await Promise.resolve();
      expect(caught2).toBeTruthy();
    });

    test("how sequencing works", async () => {
      const results: string[] = [];

      const chain = Promise.reject(new Error("This is fine"))
        .finally(() => {
          results.push("finally");
        })
        .catch(() => {
          return "help";
        })
        .then((value: string) => {
          results.push("then");
          results.push(value);
        });

      await chain;

      expect(results).toEqual(["finally", "then", "help"]);
    });
  });
});
