type FulfillmentHandler<T, R> = (value: T) => R | PromiseLike<R>;
type RejectionHandler<T> = (reason: any) => T | PromiseLike<T>;
type Action = () => void;
type PromiseResolver<TResult> = (value: TResult | PromiseLike<TResult>) => void;
type PromiseRejector = (reason?: any) => void;

export type PromiseExecutor<T> = (resolve: PromiseResolver<T>, reject: PromiseRejector) => void;

enum PromiseState {
  Pending = "pending",
  Fulfilled = "fulfilled",
  Rejected = "rejected",
}

function unwrap<T>(
  value: T | PromiseLike<T>,
  destination: (value: T) => void,
  error: (error: any) => void,
): void {
  if (value === undefined || value === null) {
    destination(value);
    return;
  }

  if ((value as PromiseLike<T>).then) {
    const promiseLike = value as PromiseLike<T>;
    promiseLike.then(destination, error);
    return;
  }

  destination(value as T);
}

let PromiseId = 0;

interface PromiseMockConstructor {
  new <T>(executor: PromiseExecutor<T>): PromiseMock<T>;

  resolve(): PromiseMock<void>;

  resolve<T>(value: T): PromiseMock<Awaited<T>>;

  resolve<T>(value: T | PromiseLike<T>): PromiseMock<Awaited<T>>;

  reject<T = never>(reason?: any): PromiseMock<T>;
}

/**
 * PromiseMock base. Handles basic implementation of then/catch/finally for the
 * extension PromiseMock types.
 */
class PromiseMock<T> {
  protected id = ++PromiseId;

  protected _status: PromiseState = PromiseState.Pending;

  protected value?: T;

  protected reason?: any;

  protected deferredActions: Action[] = [];

  private _children: PromiseMock<any>[] = [];

  protected childPromise: PromiseMockConstructor;

  constructor(childPromiseConstructor: PromiseMockConstructor) {
    this.childPromise = childPromiseConstructor;
  }

  /**
   * All PromiseMock's created by calling then, catch, finally of this PromiseMock.
   *
   * Provided for troubleshooting purposes to help determine which code path may
   * have created the promise chain.
   */
  get children(): ReadonlyArray<PromiseMock<any>> {
    return this._children;
  }

  get status(): PromiseState {
    return this._status;
  }

  // not using handler alias types for public methods so users intellisense is clearer
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): Promise<TResult1 | TResult2> {
    return this.fork((resolveNext: PromiseResolver<TResult1 | TResult2>, rejectNext: PromiseRejector) => {
      this.onSettled(() => this.completeThen(resolveNext, rejectNext, onfulfilled, onrejected));
    });
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null,
  ): Promise<T | TResult> {
    return this.fork((resolveNext: PromiseResolver<T | TResult>, rejectNext: PromiseRejector) => {
      this.onSettled(() => this.completeCatch(resolveNext, rejectNext, onrejected));
    });
  }

  finally(onfinally?: (() => void) | undefined | null): Promise<T> {
    return this.fork((resolveNext: PromiseResolver<T>, rejectNext: PromiseRejector) => {
      this.onSettled(() => this.completeFinally(resolveNext, rejectNext, onfinally));
    });
  }

  /**
   * Returns a Promise that only resolves once all chained promises created
   * by then, catch, finally and their children are resolved.
   *
   * This is mostly useful for testing code that may add callbacks several
   * layers deep and you do not have access to the
   * end of the chain.
   */
  settled(): Promise<T> {
    return new Promise((resolveSettled, rejectSettled) => {
      Promise.all(this._children.map((child) => child.settled()))
        .finally(() => {
          this.onSettled(() => {
            if (this._status === PromiseState.Fulfilled) resolveSettled(this.value!);
            else rejectSettled(this.reason);
          });
        })
        .catch(() => {
          return;
        });
    });
  }

  get [Symbol.toStringTag]() {
    return `PromiseMock`;
  }

  protected runDeferred() {
    for (const action of this.deferredActions) action();
  }

  private defer(action: Action) {
    this.deferredActions.push(action);
  }

  private onSettled(action: Action) {
    if (this._status === PromiseState.Pending) {
      this.defer(action);
    } else {
      action();
    }
  }

  private completeThen<TResult1, TResult2>(
    resolveNext: PromiseResolver<TResult1 | TResult2>,
    rejectNext: PromiseRejector,
    onfulfilled: FulfillmentHandler<T, TResult1> | undefined | null,
    onrejected: RejectionHandler<TResult2> | undefined | null,
  ) {
    if (this._status === PromiseState.Fulfilled) {
      if (onfulfilled) {
        try {
          const resultValue = onfulfilled(this.value!);
          unwrap(resultValue, resolveNext, rejectNext);
        } catch (error: any) {
          rejectNext(error);
        }
      } else {
        // This type cast is dirty but anything else is less efficient
        // Or doesn't match the promise type spec
        resolveNext(this.value as TResult1);
      }
    } else {
      if (onrejected) {
        const result = onrejected(this.reason);
        unwrap(result, resolveNext, rejectNext);
      } else {
        rejectNext(this.reason);
      }
    }
  }

  private completeCatch<TResult>(
    resolveNext: PromiseResolver<T | TResult>,
    rejectNext: PromiseRejector,
    onrejected: RejectionHandler<TResult> | undefined | null,
  ) {
    if (this._status === PromiseState.Rejected) {
      if (onrejected) {
        try {
          const chainValue = onrejected(this.reason);
          unwrap(chainValue, resolveNext, rejectNext);
        } catch (error) {
          rejectNext(error);
        }
      } else {
        rejectNext();
      }
    } else {
      resolveNext(this.value!);
    }
  }

  private completeFinally(
    resolveNext: PromiseResolver<T>,
    rejectNext: PromiseRejector,
    onfinally: (() => void) | undefined | null,
  ) {
    onfinally && onfinally();
    if (this._status === PromiseState.Fulfilled) {
      resolveNext(this.value!);
    }

    if (this._status === PromiseState.Rejected) {
      rejectNext(this.reason);
    }
  }

  protected fork<TResult>(executor: PromiseExecutor<TResult>): PromiseMock<TResult> {
    const promise = new this.childPromise<TResult>(executor);
    // For debugging purposes and for settled() we track the promises we fork
    this._children.push(promise);
    return promise;
  }
}

class IllegalPromiseMutationError extends Error {
  type = "IllegalPromiseMutationError" as const;
}

/**
 * PassivePromiseMock is a PromiseMock that has no initial resolved value or
 * a wrapped action in a constructor. Passive in the sense that it is simply constructed
 * and has no active way of getting resolved/rejected without the instance methods being invoked
 * with the value meant to be represented by this instance.
 */
class PassivePromiseMock<T> extends PromiseMock<T> {
  /**
   * Marks this promise as resolved and updates it's internal value with the provided value.
   * All appropriate handlers added with then, catch, finally are executed.
   * @param value Value to resolve this promise to.
   */
  resolve(value: T): PromiseMock<T> {
    if (this._status !== PromiseState.Pending)
      throw new IllegalPromiseMutationError("Cannot modify a settled promise");
    this._status = PromiseState.Fulfilled;
    this.value = value;
    this.runDeferred();
    return this;
  }

  reject(reason: any): PromiseMock<T> {
    if (this._status !== PromiseState.Pending)
      throw new IllegalPromiseMutationError("Cannot modify a settled promise");

    this._status = PromiseState.Rejected;
    this.reason = reason;
    this.runDeferred();
    return this;
  }
}

class PendingPromiseMock<T> extends PromiseMock<T> {
  private pendingValue: T;

  constructor(value: T, childPromiseConstructor: PromiseMockConstructor) {
    super(childPromiseConstructor);
    this.pendingValue = value;
  }

  /**
   * Resolves the promise to the previously provided value.
   * All appropriate handlers added with then, catch, finally are executed.
   */
  resolve(): PromiseMock<T> {
    this._status = PromiseState.Fulfilled;
    this.value = this.pendingValue;
    this.runDeferred();
    return this;
  }
}

type Abstract = unknown;

/**
 * Base class for PromiseMocks that take in an executor.
 */
abstract class ActivePromiseMock<T> extends PromiseMock<T> {
  constructor(executor: PromiseExecutor<T>, childPromiseConstructor: PromiseMockConstructor) {
    super(childPromiseConstructor);
  }

  static resolve<T>(value?: T | undefined): PromiseMock<T> {
    return new (this as Abstract as PromiseMockConstructor)((resolve) => resolve(value!));
  }

  static reject<T = never>(reason?: any): PromiseMock<T> {
    return new (this as Abstract as PromiseMockConstructor)((_, reject) => reject(reason));
  }

  protected runExecutor(executor: PromiseExecutor<T>) {
    const resolve = (value: T | PromiseLike<T>) => {
      if (this._status !== PromiseState.Pending) return;
      this._status = PromiseState.Fulfilled;
      unwrap(value, (unwrapped: T) => (this.value = unwrapped), reject);
      this.runDeferred();
    };

    const reject = (reason?: any) => {
      if (this._status !== PromiseState.Pending) return;
      this._status = PromiseState.Rejected;
      this.reason = reason;
      this.runDeferred();
    };

    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }
}

/**
 * A synchronous implementation of the Promise interface.
 */
class SyncPromiseMock<T> extends ActivePromiseMock<T> {
  constructor(executor: PromiseExecutor<T>) {
    super(executor, SyncPromiseMock);
    this.runExecutor(executor);
  }
}

/**
 * An async PromiseMock implementation for when async promises are
 * better for your test scenario.
 */
class AsyncPromiseMock<T> extends ActivePromiseMock<T> {
  constructor(executor: PromiseExecutor<T>) {
    super(executor, AsyncPromiseMock);
    setTimeout(() => this.runExecutor(executor));
  }
}

export { IllegalPromiseMutationError };

export {
  PromiseMock,
  PromiseMockConstructor,
  PromiseState,
  SyncPromiseMock,
  AsyncPromiseMock,
  PassivePromiseMock,
  PendingPromiseMock,
};
