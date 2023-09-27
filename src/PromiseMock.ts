type FulfillmentHandler<T, R> = (value: T) => R | PromiseLike<R>;
type RejectionHandler<T> = (reason: any) => T | PromiseLike<T>;
type Action = () => void;
type PromiseResolver<T> = (value: T | PromiseLike<T>) => void;
type PromiseRejector = (reason?: any) => void;

export type PromiseExecutor<T> = (
  resolve: PromiseResolver<T>,
  reject: PromiseRejector,
) => void;

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

/**
 * PromiseMock base. Handles basic implementation of then/catch/finally for the
 * extension PromiseMock types.
 */
class PromiseMock<T> {
  protected id = ++PromiseId;

  protected status: PromiseState = PromiseState.Pending;

  protected value?: T;

  protected reason?: any;

  protected deferredActions: Action[] = [];

  private _children: PromiseMock<any>[] = [];

  /**
   * All PromiseMock's created by calling then, catch, finally of this Promise mock.
   *
   * Provided for troubleshooting purposes to help determine which code path may
   * have created the promise chain.
   */
  get children(): ReadonlyArray<PromiseMock<any>> {
    return this._children;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: FulfillmentHandler<T, TResult1> | undefined | null,
    onrejected?: RejectionHandler<TResult2> | undefined | null,
  ): Promise<TResult1 | TResult2> {
    return this.fork(
      (
        resolveNext: PromiseResolver<TResult1 | TResult2>,
        rejectNext: PromiseRejector,
      ) => {
        this.onSettled(() =>
          this.completeThen(resolveNext, rejectNext, onfulfilled, onrejected),
        );
      },
    );
  }

  catch<TResult = never>(
    onrejected?: RejectionHandler<TResult> | undefined | null,
  ): Promise<T | TResult> {
    return this.fork(
      (
        resolveNext: PromiseResolver<T | TResult>,
        rejectNext: PromiseRejector,
      ) => {
        this.onSettled(() =>
          this.completeCatch(resolveNext, rejectNext, onrejected),
        );
      },
    );
  }

  finally(onfinally?: (() => void) | undefined | null): Promise<T> {
    return this.fork(
      (resolveNext: PromiseResolver<T>, rejectNext: PromiseRejector) => {
        this.onSettled(() =>
          this.completeFinally(resolveNext, rejectNext, onfinally),
        );
      },
    );
  }

  /**
   * Returns a Promise that only resolves once all chained promises created
   * by then, catch, finally and their children are resolved.
   *
   * This is mostly useful for testing code that may add callbacks several
   * layers deep. In these scenarios it's likely you will not have access to the
   * end of the chain, however the promise returned by settled will not
   * resolve/reject until the entire chain is resolved.
   */
  async settled(): Promise<T> {
    try {
      await Promise.all(this._children.map((value) => value.settled()));
    } catch (error: any) {
      // don't care
    }

    if (this.status === PromiseState.Fulfilled) {
      return this.value!;
    } else {
      throw this.reason;
    }
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
    if (this.status === PromiseState.Pending) {
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
    if (this.status === PromiseState.Fulfilled) {
      if (onfulfilled) {
        try {
          const resultValue = onfulfilled(this.value!);
          unwrap(resultValue, resolveNext, rejectNext);
        } catch (error: any) {
          rejectNext(error);
        }
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
    if (this.status === PromiseState.Rejected) {
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
    if (this.status === PromiseState.Fulfilled) {
      resolveNext(this.value!);
    }

    if (this.status === PromiseState.Rejected) {
      rejectNext(this.reason);
    }
  }

  private fork<T>(executor: PromiseExecutor<T>): ActivePromiseMock<T> {
    const promise = new ActivePromiseMock<T>(executor);
    // For debugging purposes and for settled() we track the promises we fork
    this._children.push(promise);
    return promise;
  }

  static resolve<T>(value?: T): ResolvedPromiseMock<T> {
    return new ResolvedPromiseMock(value);
  }

  static reject<T = never>(reason?: any): PromiseMock<T> {
    return new RejectedPromiseMock<T>(reason);
  }
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
    this.status = PromiseState.Fulfilled;
    this.value = value;
    this.runDeferred();
    return this;
  }

  reject(reason: any): PromiseMock<T> {
    this.status = PromiseState.Rejected;
    this.reason = reason;
    this.runDeferred();
    return this;
  }
}

class PendingPromiseMock<T> extends PromiseMock<T> {
  private pendingValue: T;

  constructor(value: T) {
    super();
    this.pendingValue = value;
  }

  /**
   * Resolves the promise to the previously provided value.
   * All appropriate handlers added with then, catch, finally are executed.
   */
  resolve(): PromiseMock<T> {
    this.status = PromiseState.Fulfilled;
    this.value = this.pendingValue;
    this.runDeferred();
    return this;
  }
}

class ResolvedPromiseMock<T> extends PromiseMock<T> {
  constructor(value?: T) {
    super();
    this.status = PromiseState.Fulfilled;
    this.value = value;
  }
}

class RejectedPromiseMock<T> extends PromiseMock<T> {
  constructor(reason?: any) {
    super();
    this.reason = reason;
    this.status = PromiseState.Rejected;
  }
}

/**
 * Most akin to core Promises as the constructor takes in an executor. Mostly used
 * internally for the chain functions then/catch/finally as they have need for injecting behavour
 * to the promise chain.
 */
class ActivePromiseMock<T> extends PromiseMock<T> {
  constructor(executor: PromiseExecutor<T>) {
    super();
    const resolve = (value: T | PromiseLike<T>) => {
      this.status = PromiseState.Fulfilled;
      unwrap(value, (unwrapped: T) => (this.value = unwrapped), reject);
      this.runDeferred();
    };

    const reject = (reason?: any) => {
      this.status = PromiseState.Rejected;
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

export {
  PromiseMock,
  ActivePromiseMock,
  PassivePromiseMock,
  PendingPromiseMock,
  RejectedPromiseMock,
  ResolvedPromiseMock,
};
