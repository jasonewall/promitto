type FulfillmentHandler<T, R> = (value: T) => R | PromiseLike<R>;
type RejectionHandler<T> = (reason: any) => T | PromiseLike<T>;
export type PromiseExecutor<T> = (resolve: (value: T | PromiseLike<T>) => void,  reject: (reason?: any) => void) => void;
type Action = () => void;

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
  if (value === undefined) {
    destination(value);
    return;
  }

  if ((value as PromiseLike<T>).then) {
    (value as PromiseLike<T>).then(destination, error);
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

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: FulfillmentHandler<T, TResult1> | undefined | null,
    onrejected?: RejectionHandler<TResult2> | undefined | null,
  ): Promise<TResult1 | TResult2> {
    return new ActivePromiseMock<TResult1 | TResult2>(
      (resolveNext: (value: TResult1 | TResult2) => void, rejectNext: (reason: any) => void) => {
        this.onSettled(() => this.completeThen(resolveNext, rejectNext, onfulfilled, onrejected));
      },
    );
  }

  catch<TResult = never>(
    onrejected?: RejectionHandler<TResult> | undefined | null,
  ): Promise<T | TResult> {
    return new ActivePromiseMock<T | TResult>(
      (
        resolveNext: (value: T | TResult) => void,
        rejectNext: (reason: any) => void,
      ) => {
        this.onSettled(() => this.completeCatch(resolveNext, rejectNext, onrejected));
      },
    );
  }

  finally(onfinally?: (() => void) | undefined | null): Promise<T> {
    return new ActivePromiseMock<T>(
      (resolveNext: (value: T) => void, rejectNext: (reason: any) => void) => {
        this.onSettled(() => this.completeFinally(resolveNext, rejectNext, onfinally));
      },
    );
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

  private completeThen<TResult1,TResult2>(
    resolveNext: (value: TResult1 | TResult2) => void,
    rejectNext: (reason: any) => void,
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
      if(onrejected) {
        const result = onrejected(this.reason);
        unwrap(result, resolveNext, rejectNext);
      } else {
        rejectNext(this.reason);
      }
    }
  }

  private completeCatch<TResult>(
    resolveNext: (value: T | TResult) => void,
    rejectNext: (reason: any) => void,
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
      }
    } else {
      resolveNext(this.value!);
    }
  }

  private completeFinally(
    resolveNext: (value: T) => void,
    rejectNext: (reason: any) => void,
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

  static resolve<T>(value: T): ResolvedPromiseMock<T> {
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
  resolve(value: T) {
    this.status = PromiseState.Fulfilled;
    this.value = value;
    this.runDeferred();
  }

  reject(reason: any) {
    this.status = PromiseState.Rejected;
    this.reason = reason;
    this.runDeferred();
  }
}

class ResolvedPromiseMock<T> extends PromiseMock<T> {
  constructor(value: T) {
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
  constructor(
    executor: PromiseExecutor<T>,
  ) {
    super();
    const resolve = (value: T | PromiseLike<T>) => {
      this.status = PromiseState.Fulfilled;
      unwrap(value, (unwrapped: T) => this.value = unwrapped, reject);
      this.runDeferred();
    };

    const reject = (reason: any) => {
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

export { PromiseMock, ActivePromiseMock, PassivePromiseMock };
