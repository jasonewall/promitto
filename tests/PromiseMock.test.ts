import { describe } from "@jest/globals";
import { mockFn } from './utils/assorted';
import './utils/invocationCallOrderMatcher';
import { PromiseMock, PassivePromiseMock } from "@self/PromiseMock";

describe(PromiseMock.name, () => {
  it("should be assignable as a promise", () => {
    const [then1] = mockFn('then1');

    const somePromisingFunction = (action: Promise<string>) => {
      action.then(then1);
    };

    const promise = new PassivePromiseMock<string>();
    somePromisingFunction(promise);
    expect(then1).not.toHaveBeenCalled();

    promise.resolve('A value');

    expect(then1).toHaveBeenCalledTimes(1);
    expect(then1).toHaveBeenCalledWith('A value');
  });

  it('should behave like a javascript object', () => {
    const promise = new PromiseMock();
    const result = Object.prototype.toString.call(promise);
    expect(result).toEqual("[object PromiseMock]");
  });

  describe('fulfilled', () => {
    it('should call finally and then handlers', () => {
      const allMocks = mockFn('then1', 'finally1');
      const [then1, finally1] = allMocks;
      const p = new PassivePromiseMock<number>();

      p.then(then1);
      p.finally(finally1);

      for (const mock of allMocks) expect(mock).not.toHaveBeenCalled();

      p.resolve(93);

      for (const mock of allMocks) expect(mock).toHaveBeenCalledTimes(1);
      expect(then1).toHaveBeenCalledWith(93);
      expect(then1).toHaveBeenCalledBefore(finally1);
    });

    it("should allow chaining finally and then calls", () => {
      const allMocks = mockFn('then1', 'then2', 'finally1', 'finally2');
      const [then1, then2, finally1, finally2] = allMocks;
      const p = new PassivePromiseMock<number>();

      p
        .then(then1)
        .then(then2)
        .finally(finally1)
        .finally(finally2);

      then1.mockReturnValue('33');

      for (const mock of allMocks) expect(mock).not.toHaveBeenCalled();

      p.resolve(23);

      for (const mock of allMocks) expect(mock).toHaveBeenCalledTimes(1);
      expect(then1).toHaveBeenCalledWith(23);
      expect(then2).toHaveBeenCalledWith('33');
      expect(then1).toHaveBeenCalledBefore(then2);
      expect(then2).toHaveBeenCalledBefore(finally1);
      expect(finally1).toHaveBeenCalledBefore(finally2);
    });

    it('should allow adding chains after resolution', () => {
      const then1 = jest.fn().mockName('then1');
      const p = new PassivePromiseMock<number>();
      p.resolve(87);
      p.then(then1);
      expect(then1).toHaveBeenCalledWith(87);
    });

    it('should handle when thens return a promise', () => {
      const allMocks = mockFn('then1', 'then2');
      const [then1, then2] = allMocks;

      const p = PromiseMock.resolve('Peter');
      then1.mockImplementation((value: string) => PromiseMock.resolve(`${value} Piper`));
      p
        .then(then1)
        .then(then2);

      for (const mock of allMocks) expect(mock).toHaveBeenCalledTimes(1);
      expect(then1).toHaveBeenCalledWith('Peter');
      expect(then2).toHaveBeenCalledWith('Peter Piper');
    });

    it.skip('should handle real promises gracefully', async () => {
      const allMocks = mockFn('then1', 'then2');
      const [then1, then2] = allMocks;

      const p = PromiseMock.resolve('Sally');
      then1.mockImplementation((value: string) => Promise.resolve(`${value} Sells`));
      p
        .then(then1)
        .then(then2);

      const result = await p;

      expect(result).toEqual('Sally');
      for (const mock of allMocks) expect(mock).toHaveBeenCalledTimes(1);
      expect(then1).toHaveBeenCalledWith('Sally');
      expect(then2).toHaveBeenCalledWith('Sally Sells');
    });

    it('should work with await', async () => {
      const p = new PassivePromiseMock<string>();
      p.resolve('waiting for you');

      const result = await p;
      expect(result).toEqual('waiting for you');
    });
  });

  describe('rejected', () => {
    it('should call finally', () => {
      const allMocks = mockFn('catch1', 'finally1');
      const [catch1, finally1] = allMocks;
      const p = new PassivePromiseMock<string>();

      p
        .catch(catch1)
        .finally(finally1);

      p.reject(new Error('this is fine'));
      for (const m of allMocks) expect(m).toHaveBeenCalledTimes(1);
      expect(catch1).toHaveBeenCalledBefore(finally1);
    });

    it('should work if finally is first', () => {
      const allMocks = mockFn('finally1', 'catch1', 'then1');
      const [finally1, catch1, then1] = allMocks;
      const p = new PassivePromiseMock<string>();

      catch1.mockReturnValue('recovered');
      p
        .finally(finally1)
        .catch(catch1)
        .then(then1);

      for (const m of allMocks) expect(m).not.toBeCalled();

      p.reject(new Error('derp'));
      for (const m of allMocks) expect(m).toHaveBeenCalledTimes(1);
      expect(then1).toHaveBeenCalledWith('recovered');
      expect(finally1).toHaveBeenCalledBefore(catch1);
      expect(catch1).toHaveBeenCalledBefore(then1);
    });

    describe('by throwing errors from a then block', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      function setupChain<T>(p: PassivePromiseMock<T>) {
        const handlers = mockFn('then1', 'then2', 'catch1');
        const [then1, then2, catch1] = handlers;
        then1.mockReturnValue(17);
        then2.mockImplementation((value) => { throw new Error(`${value} is not old enough to drink!`); })

        p
          .then(then1)
          .then(then2)
          .catch(catch1);

          return handlers;
      }

      function expectPromiseToWork(handlers: jest.Mock[]) {
        const [then1, then2, catch1] = handlers;

        for (const h of handlers) expect(h).toHaveBeenCalledTimes(1);
        expect(then1).toHaveBeenCalledWith("Minor Person's name")
        expect(then2).toHaveBeenCalledWith(17);
        expect(catch1).toHaveBeenCalledWith(new Error ('17 is not old enough to drink!'));
      }

      it('should work when resolving after chain is setup', () => {
        const p = new PassivePromiseMock<string>();
        const handlers = setupChain(p);
        for (const h of handlers) expect(h).not.toHaveBeenCalled();
        p.resolve("Minor Person's name");

        expectPromiseToWork(handlers);
      });

      it('should work when resolving before chain is setup', () => {
        const p = new PassivePromiseMock<string>();
        p.resolve("Minor Person's name");
        const handlers = setupChain(p);

        expectPromiseToWork(handlers);
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
});
