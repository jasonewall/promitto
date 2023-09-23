import { describe } from "@jest/globals";
import { PromiseExecutor, ActivePromiseMock } from '@self/PromiseMock';

interface TestPromiseConstructor {
  new <T>(executor: PromiseExecutor<T>): Promise<T>;

  reject<T = never>(reason?: any): Promise<T>;

  resolve<T>(value: T): Promise<T>;
}

const promiseTypes: TestPromiseConstructor[] = []
promiseTypes.push(ActivePromiseMock);
promiseTypes.push(Promise);


promiseTypes.forEach((TestPromise: TestPromiseConstructor) => {
  describe(TestPromise.name, () => {
    describe("rejected", () => {
      test("what happens when we call then on a rejected promise", async () => {
        let [caught, thened, caught2] = [false, false, false]
        let chain: Promise<void>;
        let results: string[];

        results = [];
        chain = TestPromise.reject(new Error("This is fine"))
          .catch(() => {
            caught = true;
            results.push('catch1');
          })
          .then(() => {
            thened = true;
            results.push('then');
          })
          .catch(() => {
            caught2 = true;
            results.push('catch2');
          });

        await chain;
        expect(caught).toBeTruthy();
        expect(thened).toBeTruthy();
        expect(caught2).toBeFalsy();
        expect(results).toEqual([
          'catch1',
          'then',
        ]);

        [caught, thened, caught2] = [false, false, false];
        results = [];
        chain = Promise.reject(new Error("this is still fine"))
          .catch(() => {
            caught = true;
            results.push('catch1');
            throw new Error("new error");
          })
          .then(() => {
            thened = true;
            results.push('then')
          })
          .catch(() => {
            caught2 = true;
            results.push('catch2');
          });


        await chain;
        expect(caught).toBeTruthy();
        expect(thened).toBeFalsy();
        expect(caught2).toBeTruthy();
        expect(results).toEqual([
          'catch1',
          'catch2',
        ]);
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
});
