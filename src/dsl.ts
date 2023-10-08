import {
  SyncPromiseMock,
  PassivePromiseMock,
  PendingPromiseMock,
  PromiseMock,
  AsyncPromiseMock,
  PromiseMockConstructor,
} from "./PromiseMock";

export interface DSL {
  <T>(): PassivePromiseMock<T>;

  pending<T>(value: T): PendingPromiseMock<T>;

  resolve(): PromiseMock<void>;

  resolve<T>(value: T): PromiseMock<Awaited<T>>;

  resolve<T>(value: T | PromiseLike<T>): PromiseMock<Awaited<T>>;

  reject<T>(reason?: any): PromiseMock<T>;
}

function buildDSL(type: PromiseMockConstructor): DSL {
  const dsl = <DSL>function <T>(): PassivePromiseMock<T> {
    return new PassivePromiseMock<T>(type);
  };

  dsl.pending = <T>(value: T) => {
    return new PendingPromiseMock<T>(value, type);
  };

  dsl.resolve = <T>(value?: T): PromiseMock<T | undefined> => {
    return type.resolve(value);
  };

  dsl.reject = <T>(reason?: any): PromiseMock<T> => {
    return type.reject(reason);
  };

  return dsl;
}

const async = buildDSL(AsyncPromiseMock);
const sync = buildDSL(SyncPromiseMock);

export interface SuperDSL extends DSL {
  defaultMode: DSL;

  sync: DSL;

  async: DSL;
}

const dsl = <SuperDSL>function <T>(): PassivePromiseMock<T> {
  return dsl.defaultMode();
};

dsl.defaultMode = sync;
dsl.sync = sync;
dsl.async = async;

dsl.pending = <T>(value: T): PendingPromiseMock<T> => {
  return dsl.defaultMode.pending(value);
};

dsl.resolve = <T>(value?: T): PromiseMock<T | undefined> => {
  return dsl.defaultMode.resolve(value);
};

dsl.reject = <T>(reason?: any): PromiseMock<T> => {
  return dsl.defaultMode.reject(reason);
};

export { sync, async };

export default dsl;
