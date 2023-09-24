import { PendingPromiseMock } from "./PromiseMock";

export default {
  pending: <T>(value: T) => {
    return new PendingPromiseMock<T>(value);
  },
};
