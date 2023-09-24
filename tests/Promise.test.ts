import { describe } from "@jest/globals";
import './utils/invocationCallOrderMatcher';
import { mockFn } from './utils/assorted';
import { PromiseExecutor, ActivePromiseMock } from '@self/PromiseMock';

interface TestPromiseConstructor {
  new <T>(executor: PromiseExecutor<T>): Promise<T>;

  reject<T = never>(reason?: any): Promise<T>;

  resolve<T>(value: T): Promise<T>;
}

const promiseTypes: TestPromiseConstructor[] = [];
promiseTypes.push(ActivePromiseMock);
promiseTypes.push(Promise);

promiseTypes.forEach((TestPromise: TestPromiseConstructor) => {
  describe(TestPromise.name, () => {
    describe('#then', () => {
      describe('when resolved', () => {
        it('should call fulfillment handlers', async () => {
          const then1 = jest.fn();
          then1.mockReturnValue(16);

          const chain = TestPromise.resolve(15)
            .then(then1);

          const result = await chain;
          expect(then1).toHaveBeenCalledWith(15);
          expect(result).toEqual(16);
        });

        it('should not call rejection handlers', async () => {
          const [then1, onrejected1] = mockFn('then1', 'onrejected1');
          then1.mockReturnValue(32);

          const chain = TestPromise.resolve(18)
            .then(then1, onrejected1);

          const results = await chain;
          expect(then1).toHaveBeenCalledWith(18);
          expect(onrejected1).not.toHaveBeenCalled();
        });

        it('should reject the next promise if fulfillment handler raises an error', async () => {
          const [then1, onrejected1, catch1] = mockFn('then1', 'onrejected1', 'catch1');
          then1.mockImplementation(() => { throw new Error('What am I supposed to do with this?!'); });
          catch1.mockReturnValue('We are saved!');

          const chain = TestPromise.resolve(18)
            .then(then1, onrejected1)
            .catch(catch1);

          const result = await chain;
          expect(result).toEqual('We are saved!');
          expect(then1).toHaveBeenCalledWith(18);
          expect(onrejected1).not.toHaveBeenCalled();
          expect(catch1).toHaveBeenCalledWith(new Error('What am I supposed to do with this?!'));
          expect(catch1).toHaveBeenCalledAfter(then1);
        });

        it('should reject the new promise if fulfillment handler returns a rejected promise', async() => {
          const [then1, onrejected1, catch1] = mockFn('then1', 'onrejected1', 'catch1');
          then1.mockReturnValue(TestPromise.reject('Something bad happened'));
          catch1.mockReturnValue('We are saved!');

          const chain = TestPromise.resolve(19)
            .then(then1, onrejected1)
            .catch(catch1);

          const result = await chain;
          expect(result).toEqual('We are saved!');
          expect(then1).toHaveBeenCalledWith(19);
          expect(onrejected1).not.toHaveBeenCalled();
          expect(catch1).toHaveBeenCalledWith('Something bad happened');
          expect(catch1).toHaveBeenCalledAfter(then1);
        })

        it('should be chainable with multiple thens', async () => {
          const [then1, then2, then3] = mockFn('then1', 'then2', 'then3');
          then1.mockReturnValue(1);
          then2.mockReturnValue(20);
          then3.mockReturnValue('33');

          const chain = TestPromise.resolve('Hello')
            .then(then1)
            .then(then2)
            .then(then3);

          const result = await chain;
          expect(result).toEqual('33');
          expect(then1).toHaveBeenCalledWith('Hello');
          expect(then1).toHaveBeenCalledTimes(1);
          expect(then1).toHaveBeenCalledBefore(then2);

          expect(then2).toHaveBeenCalledWith(1);
          expect(then2).toHaveBeenCalledTimes(1);
          expect(then2).toHaveBeenCalledAfter(then1);

          expect(then3).toHaveBeenCalledWith(20);
          expect(then3).toHaveBeenCalledTimes(1);
          expect(then3).toHaveBeenCalledAfter(then2);
        });

        it('should unwrap promises if they are returned by a fulfillment handler', async () => {
          const [then1, then2] = mockFn('then1', 'then2');
          then1.mockReturnValue(TestPromise.resolve(13));
          then2.mockReturnValue('Success!');

          const chain = TestPromise.resolve('Start')
            .then(then1)
            .then(then2);

          const result = await chain;
          expect(result).toEqual('Success!');
          expect(then1).toHaveBeenCalledWith('Start');
          expect(then1).toHaveBeenCalledTimes(1);
          expect(then1).toHaveBeenCalledBefore(then2);

          expect(then2).toHaveBeenCalledWith(13);
          expect(then2).toHaveBeenCalledTimes(1);
          expect(then2).toHaveBeenCalledAfter(then1);
        });

        it('should allow finally to be interjected anywhere', async () => {
          const [then1, finally1, onrejected1] = mockFn('then1', 'finally1', 'onrejected1');
          const [then2, finally2, onrejected2] = mockFn('then2', 'finally2', 'onrejected2');
          then1.mockReturnValue(14);
          then2.mockReturnValue(18);

          const chain = TestPromise.resolve('Start')
            .then(then1, onrejected1)
            .finally(finally1)
            .then(then2, onrejected2)
            .finally(finally2);

          const result = await chain;

          const allMocks = [then1, then2, finally1, finally2];
          for (const mock of allMocks) expect(mock).toHaveBeenCalledTimes(1);
          for (const mock of [onrejected1, onrejected2]) expect(mock).not.toHaveBeenCalled();
          expect(result).toEqual(18);
          expect(then1).toHaveBeenCalledWith('Start');
          expect(then1).toHaveBeenCalledBefore(finally1);
          expect(finally1).toHaveBeenCalledAfter(then1);
          expect(then2).toHaveBeenCalledWith(14);
          expect(then2).toHaveBeenCalledAfter(finally1);
          expect(finally2).toHaveBeenCalledAfter(then2);
        })
      });

      describe('when rejected', () => {
        it('should not call fulfilled handlers if promise is rejected', async () => {
          const then1 = jest.fn();
          const chain = TestPromise.reject(new Error('Rejected!'))
            .then(then1);

          try {
            await chain;
          } catch(error: any) {
            expect(error.message).toEqual('Rejected!');
          }

          expect(then1).not.toHaveBeenCalled();
        });

        it('should call the rejection handler if rejected', async () => {
          const [then1, onrejected] = mockFn('then1', 'onrejected');
          onrejected.mockImplementation(() => 'ok');
          const chain = TestPromise.reject(new Error('Rejected!'))
            .then(then1, onrejected);

          await chain;
          expect(then1).not.toHaveBeenCalled();
          expect(onrejected).toHaveBeenCalledTimes(1);
        });

        it('should still be an error if the reject handler raises an error', async () => {
          const [then1, onrejected] = mockFn('then1', 'onrejected');
          onrejected.mockImplementation(() => { throw new Error('not ok'); });
          const chain = TestPromise.reject(new Error('Rejected!'))
            .then(then1, onrejected);

          try {
            await chain;
          } catch(error: any) {
            expect(error.message).toEqual('not ok');
          }
          expect(then1).not.toHaveBeenCalled();
          expect(onrejected).toHaveBeenCalledTimes(1);
        });

        it('should be an error if the reject handler returns a rejected promise', async () => {
          const [then1, onrejected] = mockFn('then1', 'onrejected');
          onrejected.mockImplementation(() => TestPromise.reject(new Error('not ok')));
          const chain = TestPromise.reject(new Error('Rejected!'))
            .then(then1, onrejected);

          try {
            await chain;
          } catch(error: any) {
            expect(error.message).toEqual('not ok');
          }

          expect(then1).not.toHaveBeenCalled();
          expect(onrejected).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('#catch', () => {
      describe('when resolved', () => {
        it('should not call catch handlers', async () => {
          const [catch1, then1] = mockFn('catch1', 'then1')
          then1.mockReturnValue(['Pepper']);

          const chain = TestPromise.resolve('Banana')
            .catch(catch1)
            .then(then1);

          const result = await chain;

          expect(result).toEqual(['Pepper']);
          expect(catch1).not.toHaveBeenCalled();
          expect(then1).toHaveBeenCalledTimes(1);
          expect(then1).toHaveBeenCalledWith('Banana');
        });
      });

      describe('when rejected', () => {
        it('should switch to resolved if catch does not re-reject', async () => {
          const [catch1, then1, catch2] = mockFn('catch1', 'then1', 'catch2');

          const chain = TestPromise.reject(new Error("This is fine"))
            .catch(catch1)
            .then(then1)
            .catch(catch2);

          await chain;
          expect(catch1).toHaveBeenCalledTimes(1);
          expect(then1).toHaveBeenCalledTimes(1);
          expect(catch2).not.toHaveBeenCalled();
          expect(catch1).toHaveBeenCalledBefore(then1);
        });

        it('should skip then handlers until caught', async () => {
          const [catch1, then1, catch2] = mockFn('catch1', 'then1', 'catch2');
          catch1.mockImplementation(() => {
            throw new Error('this is not fine');
          });

          const chain = Promise.reject(new Error("this is still fine"))
            .catch(catch1)
            .then(then1)
            .catch(catch2)

          await chain;
          expect(catch1).toHaveBeenCalledTimes(1);
          expect(catch1).toHaveBeenCalledWith(new Error('this is still fine'));
          expect(then1).not.toHaveBeenCalled();
          expect(catch2).toHaveBeenCalledTimes(1);
          expect(catch1).toHaveBeenCalledBefore(catch2);
        });

        it('should count returning a new rejected promise as a re-raise', async () => {
          const [catch1, then1, catch2] = mockFn('catch1', 'then1', 'catch2');
          catch1.mockReturnValue(TestPromise.reject(new Error('Are you mocking me?')));

          const chain = TestPromise.reject(new Error('We are not starting of on a good note'))
            .catch(catch1)
            .then(then1)
            .catch(catch2);

          await chain;
          for (const mock of [catch1, catch2]) expect(mock).toHaveBeenCalledTimes(1);
          expect(then1).not.toHaveBeenCalled();
          expect(catch1).toHaveBeenCalledWith(new Error('We are not starting of on a good note'));
          expect(catch1).toHaveBeenCalledBefore(catch2);
          expect(catch2).toHaveBeenCalledWith(new Error('Are you mocking me?'));
        });

        it('should call handlers in the order that they are added', async () => {
          const [finally1, catch1, then1] = mockFn('finally1', 'catch1', 'then1');
          const chain = Promise.reject(new Error("This is fine"))
            .finally(finally1)
            .catch(catch1)
            .then(then1)

          await chain;

          [finally1, catch1, then1].forEach((value) => {
            expect(value).toHaveBeenCalledTimes(1);
          });
          expect(finally1).toHaveBeenCalledBefore(catch1);
          expect(catch1).toHaveBeenCalledBefore(then1);
        });
      });
    });

    describe('adding multiple handlers to the same promise (not chaining)', () => {
      const attachCallbacks = <T>(p: Promise<T>) => {
        const [then1, catch1, finally1, onrejected1] = mockFn('then1', 'catch1', 'finally1', 'onrejected1');
        p.then(then1, onrejected1);
        p.catch(catch1);
        p.finally(finally1)
          .catch(() => 'ok'); // prevent core promise from raising an unhandled rejection with jest

        return { then1, catch1, finally1, onrejected1 }
      }

      it('should only call then and finally when resolve', async () => {
        const p = TestPromise.resolve('Success!');
        const { then1, catch1, finally1, onrejected1 } = attachCallbacks(p);

        const value = await p;

        expect(value).toEqual('Success!');
        for(const mock of [then1, finally1]) expect(mock).toHaveBeenCalledTimes(1);
        for(const mock of [onrejected1, catch1]) expect(mock).not.toHaveBeenCalled();
        expect(then1).toHaveBeenCalledWith('Success!');
        expect(then1).toHaveBeenCalledBefore(finally1);
      });

      it('should only call catch and finally when rejected', async () => {
        const p = TestPromise.reject(new Error('oh no!'));
        const { then1, catch1, finally1, onrejected1 } = attachCallbacks(p);

        try {
          await p;
        } catch (error: any) {
          expect(error).toEqual(new Error('oh no!'));
        }

        expect(then1).not.toHaveBeenCalled();
        for (const mock of [catch1, finally1, onrejected1]) expect(mock).toHaveBeenCalledTimes(1);
        for (const mock of [catch1, onrejected1]) expect(mock).toHaveBeenCalledWith(new Error('oh no!'));
        expect(onrejected1).toHaveBeenCalledBefore(catch1);
        expect(finally1).toHaveBeenCalledAfter(catch1);
      });
    });
  });
});
