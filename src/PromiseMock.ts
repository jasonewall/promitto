type FulfillmentHandler<T, R> = (value: T) => R | PromiseLike<R>;
type RejectionHandler<T> = (reason: any) => T | PromiseLike<T>;
type PromiseExecutor<T> = (resolve: (value: T | PromiseLike<T>) => void,  reject: (reason?: any) => void) => void;

enum PromiseState {
  Pending = "pending",
  Fulfilled = "fulfilled",
  Rejected = "rejected",
}

function unwrap<T>(
  value: T | PromiseLike<T>,
  destination: (value: T) => void,
): void {
  if (value === undefined) {
    destination(value);
    return;
  }

  if ((value as PromiseLike<T>).then) {
    (value as PromiseLike<T>).then(destination);
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

  protected actions: (() => void)[] = [];

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: FulfillmentHandler<T, TResult1> | undefined | null,
    onrejected?: RejectionHandler<TResult2> | undefined | null,
  ): Promise<TResult1 | TResult2> {
    return new ActivePromiseMock<TResult1>(
      (resolveNext: (value: TResult1) => void, rejectNext: (reason: any) => void) => {
        if (this.status === PromiseState.Pending) {
          this.actions.push(() => {
            this.onFulfilled(resolveNext, rejectNext, onfulfilled);
          });
        } else {
          this.onFulfilled(resolveNext, rejectNext, onfulfilled);
        }
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
        if (this.status === PromiseState.Pending) {
          this.actions.push(() => {
            this.onRejected(resolveNext, rejectNext, onrejected);
          });
        } else {
          this.onRejected(resolveNext, rejectNext, onrejected);
        }
      },
    );
  }

  finally(onfinally?: (() => void) | undefined | null): Promise<T> {
    return new ActivePromiseMock<T>(
      (resolve: (value: T) => void, reject: (reason: any) => void) => {
        if (this.status === PromiseState.Pending) {
          onfinally && this.actions.push(onfinally);
          this.actions.push(() => {
            if (this.status === PromiseState.Fulfilled) {
              resolve(this.value!);
            }
          });

          this.actions.push(() => {
            reject(this.reason);
          });
        } else {
          onfinally && onfinally();
        }
      },
    );
  }

  get [Symbol.toStringTag]() {
    return `PromiseMock`;
  }

  protected runActions() {
    for (const action of this.actions) action();
  }

  private onFulfilled<TResult>(
    resolve: (value: TResult) => void,
    reject: (reason: any) => void,
    onfulfilled?: FulfillmentHandler<T, TResult> | undefined | null,
  ) {
    if (this.status !== PromiseState.Fulfilled) return;

    if (onfulfilled) {
      try {
        const resultValue = onfulfilled(this.value!);
        unwrap(resultValue, resolve);
      } catch (error: any) {
        reject(error);
      }
    }
  }

  private onRejected<TResult, TReason = never>(
    resolveNext: (value: T | TResult) => void,
    rejectNext: (reason: any) => void,
    onrejected?: RejectionHandler<TReason> | undefined | null,
  ): void;

  private onRejected<TResult>(
    resolveNext: (value: T | TResult) => void,
    rejectNext: (reason: any) => void,
    onrejected?: RejectionHandler<TResult> | undefined | null,
  ) {
    if (this.status === PromiseState.Rejected) {
      if (onrejected) {
        try {
          const chainValue = onrejected(this.reason);
          unwrap(chainValue, resolveNext);
        } catch (error) {
          rejectNext(error);
        }
      }
    } else {
      resolveNext(this.value!);
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
    this.runActions();
  }

  reject(reason: any) {
    this.status = PromiseState.Rejected;
    this.reason = reason;
    this.runActions();
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
      unwrap(value, (unwrapped: T) => this.value = unwrapped);
      this.runActions();
    };

    const reject = (reason: any) => {
      this.status = PromiseState.Rejected;
      this.reason = reason;
      this.runActions();
    };

    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }
}

export { PromiseExecutor, PromiseMock, ActivePromiseMock, PassivePromiseMock };
