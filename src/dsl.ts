import { PassivePromiseMock, PendingPromiseMock, RejectedPromiseMock, ResolvedPromiseMock } from "./PromiseMock";

export default {
  pending: <T>(value: T) => {
    return new PendingPromiseMock<T>(value);
  },

  promise: <T>() => {
    return new PassivePromiseMock<T>();
  },

  resolve: <T>(value: T): ResolvedPromiseMock<T> => {
    return new ResolvedPromiseMock(value);
  },

  reject: <T>(reason?: any): RejectedPromiseMock<T> => {
    return new RejectedPromiseMock<T>(reason);
  },
};
