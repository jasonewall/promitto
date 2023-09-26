import {
  PassivePromiseMock,
  PendingPromiseMock,
  RejectedPromiseMock,
  ResolvedPromiseMock,
} from "./PromiseMock";

interface DSL {
  <T>(): PassivePromiseMock<T>;

  pending<T>(value: T): PendingPromiseMock<T>;

  resolve<T>(value?: T): ResolvedPromiseMock<T>;

  reject<T>(reason?: any): RejectedPromiseMock<T>;
}

const dsl = <DSL>function <T>(): PassivePromiseMock<T> {
  return new PassivePromiseMock<T>();
};

dsl.pending = <T>(value: T) => {
  return new PendingPromiseMock<T>(value);
};

dsl.resolve = <T>(value?: T): ResolvedPromiseMock<T> => {
  return new ResolvedPromiseMock(value);
};

dsl.reject = <T>(reason?: any): RejectedPromiseMock<T> => {
  return new RejectedPromiseMock<T>(reason);
};

export default dsl;
