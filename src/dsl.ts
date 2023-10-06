import { SyncPromiseMock, PassivePromiseMock, PendingPromiseMock, PromiseMock } from "./PromiseMock";

interface DSL {
  <T>(): PassivePromiseMock<T>;

  pending<T>(value: T): PendingPromiseMock<T>;

  resolve<T>(value?: T): PromiseMock<T>;

  reject<T>(reason?: any): PromiseMock<T>;
}

const dsl = <DSL>function <T>(): PassivePromiseMock<T> {
  return new PassivePromiseMock<T>(SyncPromiseMock);
};

dsl.pending = <T>(value: T) => {
  return new PendingPromiseMock<T>(value, SyncPromiseMock);
};

dsl.resolve = <T>(value?: T): PromiseMock<T> => {
  return SyncPromiseMock.resolve(value);
};

dsl.reject = <T>(reason?: any): PromiseMock<T> => {
  return SyncPromiseMock.reject(reason);
};

export default dsl;
