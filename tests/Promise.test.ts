import { describe } from "@jest/globals";
import "./utils/invocationCallOrderMatcher";
import { expectAll, mockFn } from "./utils/assorted";
import { PromiseExecutor, SyncPromiseMock, AsyncPromiseMock } from "@self/PromiseMock";

interface TestPromiseConstructor {
  new <T>(executor: PromiseExecutor<T>): Promise<T>;

  reject<T = never>(reason?: any): Promise<T>;

  resolve<T>(value?: T): Promise<T>;
}

const promiseTypes: TestPromiseConstructor[] = [];
promiseTypes.push(Promise);
promiseTypes.push(SyncPromiseMock);
promiseTypes.push(AsyncPromiseMock);

promiseTypes.forEach((TestPromise: TestPromiseConstructor) => {
  describe(TestPromise.name, () => {
    describe("#then", () => {
      describe("when resolved", () => {
        it("should call fulfillment handlers", async () => {
          const then1 = jest.fn();
          then1.mockReturnValue(16);

          const chain = TestPromise.resolve(15).then(then1);

          const result = await chain;
          expect(then1).toHaveBeenCalledWith(15);
          expect(result).toEqual(16);
        });

        it("should not call rejection handlers", async () => {
          const [then1, onrejected1] = mockFn("then1", "onrejected1");
          then1.mockReturnValue(32);

          const chain = TestPromise.resolve(18).then(then1, onrejected1);

          const results = await chain;
          expect(then1).toHaveBeenCalledWith(18);
          expect(onrejected1).not.toHaveBeenCalled();
        });

        it("should reject the next promise if fulfillment handler raises an error", async () => {
          const [then1, onrejected1, catch1] = mockFn("then1", "onrejected1", "catch1");
          then1.mockImplementation(() => {
            throw new Error("What am I supposed to do with this?!");
          });
          catch1.mockReturnValue("We are saved!");

          const chain = TestPromise.resolve(18).then(then1, onrejected1).catch(catch1);

          const result = await chain;
          expect(result).toEqual("We are saved!");
          expect(then1).toHaveBeenCalledWith(18);
          expect(onrejected1).not.toHaveBeenCalled();
          expect(catch1).toHaveBeenCalledWith(new Error("What am I supposed to do with this?!"));
          expect(catch1).toHaveBeenCalledAfter(then1);
        });

        it("should reject the new promise if fulfillment handler returns a rejected promise", async () => {
          const [then1, onrejected1, catch1] = mockFn("then1", "onrejected1", "catch1");
          then1.mockReturnValue(TestPromise.reject("Something bad happened"));
          catch1.mockReturnValue("We are saved!");

          const chain = TestPromise.resolve(19).then(then1, onrejected1).catch(catch1);

          const result = await chain;
          expect(result).toEqual("We are saved!");
          expect(then1).toHaveBeenCalledWith(19);
          expect(onrejected1).not.toHaveBeenCalled();
          expect(catch1).toHaveBeenCalledWith("Something bad happened");
          expect(catch1).toHaveBeenCalledAfter(then1);
        });

        it("should be chainable with multiple thens", async () => {
          const [then1, then2, then3] = mockFn("then1", "then2", "then3");
          then1.mockReturnValue(1);
          then2.mockReturnValue(20);
          then3.mockReturnValue("33");

          const chain = TestPromise.resolve("Hello").then(then1).then(then2).then(then3);

          const result = await chain;
          expect(result).toEqual("33");
          expect(then1).toHaveBeenCalledWith("Hello");
          expect(then1).toHaveBeenCalledTimes(1);
          expect(then1).toHaveBeenCalledBefore(then2);

          expect(then2).toHaveBeenCalledWith(1);
          expect(then2).toHaveBeenCalledTimes(1);
          expect(then2).toHaveBeenCalledAfter(then1);

          expect(then3).toHaveBeenCalledWith(20);
          expect(then3).toHaveBeenCalledTimes(1);
          expect(then3).toHaveBeenCalledAfter(then2);
        });

        it("should unwrap promises if they are returned by a fulfillment handler", async () => {
          const [then1, then2] = mockFn("then1", "then2");
          then1.mockReturnValue(TestPromise.resolve(13));
          then2.mockReturnValue("Success!");

          const chain = TestPromise.resolve("Start").then(then1).then(then2);

          const result = await chain;
          expect(result).toEqual("Success!");
          expect(then1).toHaveBeenCalledWith("Start");
          expect(then1).toHaveBeenCalledTimes(1);
          expect(then1).toHaveBeenCalledBefore(then2);

          expect(then2).toHaveBeenCalledWith(13);
          expect(then2).toHaveBeenCalledTimes(1);
          expect(then2).toHaveBeenCalledAfter(then1);
        });

        it("should allow finally to be interjected anywhere", async () => {
          const [then1, finally1, onrejected1] = mockFn("then1", "finally1", "onrejected1");
          const [then2, finally2, onrejected2] = mockFn("then2", "finally2", "onrejected2");
          then1.mockReturnValue(14);
          then2.mockReturnValue(18);

          const chain = TestPromise.resolve("Start")
            .then(then1, onrejected1)
            .finally(finally1)
            .then(then2, onrejected2)
            .finally(finally2);

          const result = await chain;

          expectAll(then1, then2, finally1, finally2).toHaveBeenCalledTimes(1);
          expectAll(onrejected1, onrejected2).not.toHaveBeenCalled();
          expect(result).toEqual(18);
          expect(then1).toHaveBeenCalledWith("Start");
          expect(then1).toHaveBeenCalledBefore(finally1);
          expect(finally1).toHaveBeenCalledAfter(then1);
          expect(then2).toHaveBeenCalledWith(14);
          expect(then2).toHaveBeenCalledAfter(finally1);
          expect(finally2).toHaveBeenCalledAfter(then2);
        });

        it("should be callable without a fulfillment handler", async () => {
          const p = TestPromise.resolve("Start");
          const chain = p.then();

          // calling with empty handler does indeed create a new promise
          expect(Object.is(p, chain)).toEqual(false);

          await expect(chain).resolves.toEqual("Start");
        });
      });

      describe("when rejected", () => {
        it("should not call fulfilled handlers if promise is rejected", async () => {
          const then1 = jest.fn();
          const chain = TestPromise.reject(new Error("Rejected!")).then(then1);

          await expect(chain).rejects.toThrowError("Rejected!");
          expect(then1).not.toHaveBeenCalled();
        });

        it("should call the rejection handler if rejected", async () => {
          const [then1, onrejected] = mockFn("then1", "onrejected");
          onrejected.mockImplementation(() => "ok");
          const chain = TestPromise.reject(new Error("Rejected!")).then(then1, onrejected);

          await chain;
          expect(then1).not.toHaveBeenCalled();
          expect(onrejected).toHaveBeenCalledTimes(1);
        });

        it("should still be an error if the reject handler raises an error", async () => {
          const [then1, onrejected] = mockFn("then1", "onrejected");
          onrejected.mockImplementation(() => {
            throw new Error("not ok");
          });
          const chain = TestPromise.reject(new Error("Rejected!")).then(then1, onrejected);

          await expect(chain).rejects.toThrowError("not ok");
          expect(then1).not.toHaveBeenCalled();
          expect(onrejected).toHaveBeenCalledTimes(1);
        });

        it("should be an error if the reject handler returns a rejected promise", async () => {
          const [then1, onrejected] = mockFn("then1", "onrejected");
          onrejected.mockImplementation(() => TestPromise.reject(new Error("not ok")));
          const chain = TestPromise.reject(new Error("Rejected!")).then(then1, onrejected);

          await expect(chain).rejects.toThrowError("not ok");

          expect(then1).not.toHaveBeenCalled();
          expect(onrejected).toHaveBeenCalledTimes(1);
        });

        it("should be callable without a handler", async () => {
          const p = TestPromise.reject();
          const chain = p.then();

          await expect(chain).rejects.toEqual(undefined);
        });
      });
    });

    describe("#catch", () => {
      describe("when resolved", () => {
        it("should not call catch handlers", async () => {
          const [catch1, then1] = mockFn("catch1", "then1");
          then1.mockReturnValue(["Pepper"]);

          const chain = TestPromise.resolve("Banana").catch(catch1).then(then1);

          await expect(chain).resolves.toEqual(["Pepper"]);
          expect(catch1).not.toHaveBeenCalled();
          expect(then1).toHaveBeenCalledTimes(1);
          expect(then1).toHaveBeenCalledWith("Banana");
        });

        it("should be callable without a handler", async () => {
          const p = Promise.resolve("with a value");
          const chain = p.catch();

          await expect(p).resolves.toEqual("with a value");
        });
      });

      describe("when rejected", () => {
        it("should still reject if we catch without a handler", async () => {
          const p = TestPromise.reject();
          const chain = p.catch();

          expect(Object.is(p, chain)).toEqual(false);
          await expect(chain).rejects.toEqual(undefined);
        });

        it("should resolve even if catch does not return a value", async () => {
          const [catch1] = mockFn("catch1");
          const chain = TestPromise.reject().catch(catch1);

          await expect(chain).resolves.toEqual(undefined);

          expect(catch1).toHaveBeenCalledWith(undefined);
          expect(catch1).toHaveBeenCalledTimes(1);
        });

        it("should resolve to a value if catch does not re-reject", async () => {
          const catch1 = jest.fn().mockName("catch1");
          catch1.mockReturnValue("recovered");

          const chain = TestPromise.reject(new Error("rejected")).catch(catch1);

          const result = await chain;
          expect(result).toEqual("recovered");
          expect(catch1).toHaveBeenCalledTimes(1);
          expect(catch1).toHaveBeenCalledWith(new Error("rejected"));
        });

        it("should switch to resolved if catch does not re-reject", async () => {
          const [catch1, then1, catch2] = mockFn("catch1", "then1", "catch2");

          const chain = TestPromise.reject(new Error("This is fine")).catch(catch1).then(then1).catch(catch2);

          await chain;
          expect(catch1).toHaveBeenCalledTimes(1);
          expect(then1).toHaveBeenCalledTimes(1);
          expect(catch2).not.toHaveBeenCalled();
          expect(catch1).toHaveBeenCalledBefore(then1);
        });

        it("should skip then handlers until caught", async () => {
          const [catch1, then1, catch2] = mockFn("catch1", "then1", "catch2");
          catch1.mockImplementation(() => {
            throw new Error("this is not fine");
          });

          const chain = Promise.reject(new Error("this is still fine"))
            .catch(catch1)
            .then(then1)
            .catch(catch2);

          await chain;
          expect(catch1).toHaveBeenCalledTimes(1);
          expect(catch1).toHaveBeenCalledWith(new Error("this is still fine"));
          expect(then1).not.toHaveBeenCalled();
          expect(catch2).toHaveBeenCalledTimes(1);
          expect(catch1).toHaveBeenCalledBefore(catch2);
        });

        it("should count returning a new rejected promise as a re-raise", async () => {
          const [catch1, then1, catch2] = mockFn("catch1", "then1", "catch2");
          catch1.mockReturnValue(TestPromise.reject(new Error("Are you mocking me?")));

          const chain = TestPromise.reject(new Error("We are not starting of on a good note"))
            .catch(catch1)
            .then(then1)
            .catch(catch2);

          await chain;
          expectAll(catch1, catch2).toHaveBeenCalledTimes(1);
          expect(then1).not.toHaveBeenCalled();
          expect(catch1).toHaveBeenCalledWith(new Error("We are not starting of on a good note"));
          expect(catch1).toHaveBeenCalledBefore(catch2);
          expect(catch2).toHaveBeenCalledWith(new Error("Are you mocking me?"));
        });

        it("should call handlers in the order that they are added", async () => {
          const [finally1, catch1, then1] = mockFn("finally1", "catch1", "then1");
          const chain = Promise.reject(new Error("This is fine")).finally(finally1).catch(catch1).then(then1);

          await chain;

          expectAll(finally1, catch1, then1).toHaveBeenCalledTimes(1);
          expect(finally1).toHaveBeenCalledBefore(catch1);
          expect(catch1).toHaveBeenCalledBefore(then1);
        });
      });
    });

    describe("#finally", () => {
      describe("when resolved", () => {
        it("should be called", async () => {
          const [finally1] = mockFn("finally1");

          const chain = TestPromise.resolve(180).finally(finally1);

          const result = await chain;
          expect(result).toEqual(180);
          expect(finally1).toHaveBeenCalledTimes(1);
        });

        it("should be called even if we reject in a fulfillment handler", async () => {
          const [then1, finally1] = mockFn("then1", "finally1");
          then1.mockReturnValue(TestPromise.reject(new Error("rejected")));

          const chain = TestPromise.resolve(1810).then(then1).finally(finally1);

          await expect(chain).rejects.toThrowError("rejected");

          expectAll(then1, finally1).toHaveBeenCalledTimes(1);
          expect(then1).toHaveBeenCalledWith(1810);
        });

        it("should be called if a fulfillment handler rejects with a promise", async () => {
          const handlers = mockFn("then1", "finally1", "catch1");
          const [then1, finally1, catch1] = handlers;

          then1.mockReturnValue(TestPromise.reject(new Error("error")));
          catch1.mockReturnValue(TestPromise.resolve(13));

          const chain = TestPromise.resolve(1).then(then1).catch(catch1).finally(finally1);

          const result = await chain;
          expect(result).toEqual(13);
          expectAll(...handlers).toHaveBeenCalledTimes(1);
          expect(then1).toHaveBeenCalledWith(1);
        });

        it("should be able to have multiple finally calls", async () => {
          const handlers = mockFn("then1", "finally1", "finally2", "finally3");
          const [then1, finally1, finally2, finally3] = handlers;
          then1.mockReturnValue("Good Year");

          const chain = TestPromise.resolve(1952)
            .finally(finally1)
            .then(then1)
            .finally(finally2)
            .finally(finally3);

          const result = await chain;
          expect(result).toEqual("Good Year");
          expectAll(...handlers).toHaveBeenCalledTimes(1);
          expect(then1).toHaveBeenCalledWith(1952);
          expect(finally1).toHaveBeenCalledBefore(then1);
          expect(finally2).toHaveBeenCalledAfter(then1);
          expect(finally3).toHaveBeenCalledAfter(finally2);
        });

        it("should be callable without a handler", async () => {
          const p = TestPromise.resolve();
          const chain = p.finally();

          expect(Object.is(p, chain)).toEqual(false);

          await expect(chain).resolves.toEqual(undefined);
        });
      });

      describe("when rejected", () => {
        it("should be called", async () => {
          const [finally1] = mockFn("finally1");

          const chain = TestPromise.reject(new Error("whoops")).finally(finally1);

          await expect(chain).rejects.toThrowError("whoops");

          expect(finally1).toHaveBeenCalledTimes(1);
        });

        it("should be called even if we recover in a rejection handler", async () => {
          const [catch1, finally1] = mockFn("catch1", "finally1");
          catch1.mockReturnValue("A-ok");

          const chain = TestPromise.reject(new Error("whoops")).catch(catch1).finally(finally1);

          const result = await chain;
          expect(result).toEqual("A-ok");
          expectAll(catch1, finally1).toHaveBeenCalledTimes(1);
          expect(catch1).toHaveBeenCalledWith(new Error("whoops"));
        });

        it("should be able to chain multiple finally calls", async () => {
          const handlers = mockFn("finally1", "finally2", "finally3");
          const [finally1, finally2, finally3] = handlers;
          const chain = TestPromise.reject(new Error("whoops"))
            .finally(finally1)
            .finally(finally2)
            .finally(finally3);

          await expect(chain).rejects.toThrowError("whoops");

          expectAll(...handlers).toHaveBeenCalledTimes(1);
        });

        it("should be callable without a handler", async () => {
          const p = TestPromise.reject();
          const chain = p.finally();

          expect(Object.is(p, chain)).toEqual(false);

          await expect(chain).rejects.toEqual(undefined);
        });
      });
    });

    describe(".new", () => {
      it("should accept an executor that will resolve the promise", async () => {
        const p = new TestPromise<string>((resolve) => resolve("hello!"));
        await expect(p).resolves.toEqual("hello!");
      });

      it("should accept an executor that can be rejected", async () => {
        const p = new TestPromise<string>((_, reject) => {
          reject(new Error("rejected"));
        });
        await expect(p).rejects.toThrow("rejected");
      });

      it("should not be able to be resolved once settled", async () => {
        const resolved = new TestPromise<string>((resolve) => {
          resolve("Hello!");
          resolve("Good-bye!");
        });
        await expect(resolved).resolves.toEqual("Hello!");

        const rejected = new TestPromise<string>((resolve, reject) => {
          reject(new Error("rejected"));
          resolve("It's ok");
        });

        await expect(rejected).rejects.toThrow("rejected");
      });

      it("should not be able to be rejected once settled", async () => {
        const resolved = new TestPromise<string>((resolve, reject) => {
          resolve("Hello!");
          reject(new Error("rejected"));
        });
        await expect(resolved).resolves.toEqual("Hello!");

        const rejected = new TestPromise<string>((resolve, reject) => {
          reject(new Error("rejected"));
          reject(new Error("Good-bye!"));
        });
        await expect(rejected).rejects.toThrow("rejected");
      });
    });

    describe(".resolve", () => {
      it("should be callable without a param", async () => {
        await expect(TestPromise.resolve()).resolves.toEqual(undefined);
      });
    });

    describe(".reject", () => {
      it("should return a promise already rejected", async () => {
        await expect(TestPromise.reject(new Error("rejected"))).rejects.toThrowError("rejected");
      });

      it("should be callable without a param", async () => {
        await expect(TestPromise.reject()).rejects.toEqual(undefined);
      });
    });

    describe("adding multiple handlers to the same promise (not chaining)", () => {
      const attachCallbacks = <T>(p: Promise<T>) => {
        const [then1, catch1, finally1, onrejected1] = mockFn("then1", "catch1", "finally1", "onrejected1");
        p.then(then1, onrejected1);
        p.catch(catch1);
        p.finally(finally1).catch(() => "ok"); // prevent core promise from raising an unhandled rejection with jest

        return { then1, catch1, finally1, onrejected1 };
      };

      it("should only call then and finally when resolve", async () => {
        const p = TestPromise.resolve("Success!");
        const { then1, catch1, finally1, onrejected1 } = attachCallbacks(p);

        const value = await p;

        expect(value).toEqual("Success!");
        expectAll(then1, finally1).toHaveBeenCalledTimes(1);
        expectAll(onrejected1, catch1).not.toHaveBeenCalled();
        expect(then1).toHaveBeenCalledWith("Success!");
        expect(then1).toHaveBeenCalledBefore(finally1);
      });

      it("should only call catch and finally when rejected", async () => {
        const p = TestPromise.reject(new Error("oh no!"));
        const { then1, catch1, finally1, onrejected1 } = attachCallbacks(p);

        await expect(p).rejects.toThrowError("oh no!");

        expect(then1).not.toHaveBeenCalled();
        expectAll(catch1, finally1, onrejected1).toHaveBeenCalledTimes(1);
        expectAll(catch1, onrejected1).toHaveBeenCalledWith(new Error("oh no!"));
        expect(onrejected1).toHaveBeenCalledBefore(catch1);
        expect(finally1).toHaveBeenCalledAfter(catch1);
      });
    });
  });
});
