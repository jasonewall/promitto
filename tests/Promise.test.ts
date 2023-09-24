import { describe } from "@jest/globals";
import './utils/invocationCallOrderMatcher';
import { PromiseExecutor, ActivePromiseMock } from '@self/PromiseMock';

interface TestPromiseConstructor {
  new <T>(executor: PromiseExecutor<T>): Promise<T>;

  reject<T = never>(reason?: any): Promise<T>;

  resolve<T>(value: T): Promise<T>;
}

const promiseTypes: TestPromiseConstructor[] = [];
promiseTypes.push(ActivePromiseMock);
promiseTypes.push(Promise);

function mockFn(...fns: string[]): jest.Mock[] {
  const results: jest.Mock[] = [];
  for(const fnName of fns) results.push(jest.fn().mockName(fnName));
  return results;
}

promiseTypes.forEach((TestPromise: TestPromiseConstructor) => {
  describe(TestPromise.name, () => {
    describe('#then', () => {
      describe('when rejected', () => {
        it('should call success handlers if promise is rejected', async () => {
          const then1 = jest.fn();
          then1.mockReturnValue(16);

          const chain = TestPromise.resolve(15)
            .then(then1);

          const result = await chain;
          expect(then1).toHaveBeenCalledWith(15);
          expect(result).toEqual(16);
        });

        it('should not call success handlers if promise is rejected', async () => {
          const then1 = jest.fn();
          const chain = TestPromise.reject(new Error('Rejected!'))
            .then(then1);

          try {
            await chain;
          } catch(error: any) {
            // swallow
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
        expect(then1).not.toHaveBeenCalled();
        expect(catch2).toHaveBeenCalledTimes(1);
        expect(catch1).toHaveBeenCalledBefore(catch2);
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
});
