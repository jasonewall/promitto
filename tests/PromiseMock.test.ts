import { describe } from "@jest/globals";
import { mockFn } from './utils/assorted';
import './utils/invocationCallOrderMatcher';
import { PromiseMock, PassivePromiseMock } from "@self/PromiseMock";

describe(PromiseMock.name, () => {
  it("should be assignable as a promise", () => {
    const results: string[] = [];

    const somePromisingFunction = (action: Promise<string>) => {
      action.then((value) => {
        results.push(value);
      });
    };

    const promise = new PassivePromiseMock<string>();
    somePromisingFunction(promise);
    expect(results).toEqual([]);

    promise.resolve("A value");

    expect(results).toContain("A value");
  });

  it("should behave like a javascript object", () => {
    const promise = new PromiseMock();
    const result = Object.prototype.toString.call(promise);
    expect(result).toEqual("[object PromiseMock]");
  });

  describe("fulfilled", () => {
    it("should call finally and then handlers", () => {
      const p = new PassivePromiseMock<number>();
      const results: string[] = [];

      p.then((value: number) => {
        results[0] = "then";
        expect(value).toEqual(93);
      });
      p.finally(() => (results[1] = "finally"));
      p.resolve(93);

      expect(results).toEqual(["then", "finally"]);
    });

    it("should allow chaining finally and then calls", () => {
      const p = new PassivePromiseMock<number>();
      const results: string[] = [];

      p.then((value: number) => {
        results[0] = "then1";
        expect(value).toEqual(23);
        return "33";
      })
        .then((value: string) => {
          results[1] = "then2";
          expect(value).toEqual("33");
        })
        .finally(() => (results[2] = "finally1"))
        .finally(() => (results[3] = "finally2"));

      p.resolve(23);

      expect(results).toEqual(["then1", "then2", "finally1", "finally2"]);
    });

    it("should allow adding chains after resolution", () => {
      const p = new PassivePromiseMock<number>();
      p.resolve(87);

      var results: number[] = [];
      p.then((value: number) => results.push(value));

      expect(results[0]).toEqual(87);
    });

    it("should handle when thens return a promise", () => {
      const p = new PassivePromiseMock<string>();

      p.resolve("peter");
      const results: string[] = [];
      p.then((value: string) => PromiseMock.resolve(`${value} piper`)).then(
        (value: string) => results.push(value),
      );

      expect(results[0]).toEqual("peter piper");
    });

    it("should work with await", async () => {
      const p = new PassivePromiseMock<string>();
      p.resolve("waiting for you");

      const result = await p;
      expect(result).toEqual("waiting for you");
    });

    it("should work with finally first", async () => {
      const p = new PassivePromiseMock<string>();
      const results: string[] = [];

      const chain = p
        .finally(() => {
          results.push("finally");
        })
        .then((value: string) => {
          results.push("then");
          return 13;
        });

      p.resolve('Thirteen');
      const result = await chain;

      expect(result).toEqual(13);
      expect(results).toEqual(["finally", "then"]);
    });
  });

  describe("rejected", () => {
    it("should call finally", () => {
      const p = new PassivePromiseMock<string>();
      const results: string[] = [];

      p.catch(() => {
        results.push("catch");
      }).finally(() => {
        results.push("finally");
      });

      p.reject(new Error("this is fine"));
      expect(results).toEqual(["catch", "finally"]);
    });

    it("should work if finally is first", () => {
      const p = new PassivePromiseMock<string>();
      const results: string[] = [];

      p.finally(() => results.push("finally"))
        .catch(() => {
          return "help";
        })
        .then((value: string) => {
          results.push("then");
          results.push(value);
        });

      p.reject(new Error("derp"));

      expect(results).toEqual(["finally", "then", "help"]);
    });

    describe("by throwing errors from a then block", () => {
      let p: PassivePromiseMock<string>;
      const results: string[] = [];

      beforeEach(() => {
        p = new PassivePromiseMock<string>();
        results.length = 0;
      });

      function setupChain() {
        p.then(() => {
          results.push("then1");
          return 17;
        })
          .then((value: number) => {
            results.push("then2");
            throw new Error(`${value} is not old enough to drink!`);
          })
          .catch((reason: Error) => {
            results.push("catch");
          });
      }

      it("should work when resolving after chain is setup", () => {
        setupChain();
        p.resolve("Minor Person's name");

        expect(results).toEqual(["then1", "then2", "catch"]);
      });

      it("should work when resolving before chain is setup", () => {
        p.resolve("Minor person's name");
        setupChain();

        expect(results).toEqual(["then1", "then2", "catch"]);
      });
    });
  });

  describe('adding multiple handlers to the same promise (not chaining)', () => {
    const attachCallbacks = <T>(p: Promise<T>) => {
      const [then1, onrejected1, catch1, finally1] = mockFn('then1', 'onrejected1', 'catch1', 'finally1');
      p.then(then1, onrejected1);
      p.catch(catch1);
      p.finally(finally1);
      return { then1, onrejected1, catch1, finally1 };
    }

    it('should only call then and finally when resolved', async () => {
      const p = new PassivePromiseMock<string>();
      const { then1, onrejected1, catch1, finally1 }= attachCallbacks(p);

      p.resolve('Success!');
      const result = await p;

      expect(result).toEqual('Success!');
      for (const mock of [then1, finally1]) expect(mock).toHaveBeenCalledTimes(1);
      for (const mock of [onrejected1, catch1]) expect(mock).not.toHaveBeenCalled();
      expect(then1).toHaveBeenCalledWith('Success!');
      expect(then1).toHaveBeenCalledBefore(finally1);
    });

    it('should only call catch and finally when rejected', async () => {
      const p = new PassivePromiseMock<string>();
      const { then1, onrejected1, catch1, finally1 }= attachCallbacks(p);

      p.reject(new Error('Rejected!'));
      try {
        await p;
      } catch (error: any) {
        expect(error).toEqual(new Error('Rejected!'));
      }

      expect(then1).not.toHaveBeenCalled();
      for (const mock of [onrejected1, catch1, finally1]) expect(mock).toBeCalledTimes(1);
      for (const mock of [onrejected1, catch1]) expect(mock).toBeCalledWith(new Error('Rejected!'));
      expect(onrejected1).toHaveBeenCalledBefore(catch1);
      expect(catch1).toHaveBeenCalledBefore(finally1);
    });
  });


  describe('finally', () => {
    it.todo('should be tested with all chain functions');
  })

  describe('catch', () => {
    it.todo('should be tested with all chain functions');
  })
});
