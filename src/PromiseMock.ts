type FulfillmentHandler<T,R> = ((value: T) => R | PromiseLike<R>)
type RejectionHandler<T> = ((reason: any) => T | PromiseLike<T>)

enum PromiseState {
    Pending = 'pending',
    Fulfilled = 'fulfilled',
    Rejected = 'rejected',
}

function unwrap<T>(value: T | PromiseLike<T>, destination: (value:T) => void): void {
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

/**
 * PromiseMock base. Handles basic implementation of then/catch/finally for the two
 * extension PromiseMock types.
 */
class PromiseMock<T> {
    protected status: PromiseState = PromiseState.Pending;

    protected value?: T;

    protected reason?: any;

    protected fulfillmentHandlers: FulfillmentHandler<T,any>[] = []

    protected rejectionHandlers: RejectionHandler<any>[] = []

    protected finallyHandlers: (() => void)[] = [];

    then<TResult1 = T, TResult2 = never>(
        onfulfilled?: FulfillmentHandler<T,TResult1>| undefined | null,
        onrejected?: RejectionHandler<TResult2> | undefined | null
    ): Promise<TResult1 | TResult2> {
        onfulfilled && this.fulfillmentHandlers.push(onfulfilled);
        onrejected && this.rejectionHandlers.push(onrejected);

        return new ActivePromiseMock<TResult1>((resolve: (value: TResult1) => void, reject: (reason: any) => void) => {
            if (this.status === PromiseState.Pending) {
                this.fulfillmentHandlers.push(() => {
                    if (onfulfilled) {
                        const chainValue = onfulfilled(this.value!);
                        unwrap(chainValue, resolve);
                    }
                });
            } else {
                if (onfulfilled) {
                    const chainValue = onfulfilled(this.value!)
                    unwrap(chainValue, resolve);
                }
            }
        });
    }

    catch<TResult = never>(onrejected?: RejectionHandler<TResult> | undefined | null): Promise<T | TResult> {
        return new PassivePromiseMock<TResult>();
    }

    finally(onfinally?: (() => void) | undefined | null): Promise<T> {
        onfinally && this.finallyHandlers.push(onfinally);
        return new ActivePromiseMock<T>((resolve: (value: T) => void) => {
            this.fulfillmentHandlers.push(() => {
                resolve(this.value!);
            });
        });
    }

    get [Symbol.toStringTag]() {
        return `PromiseMock`;
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
        for(const handler of this.fulfillmentHandlers) {
            handler(value);
        }

        for(const handler of this.finallyHandlers) {
            handler();
        }
    }
}

class ActivePromiseMock<T> extends PassivePromiseMock<T>{
    constructor(action: (resolve: (value: T) => void, reject: (reason: any) => void) => void) {
        super()
        const resolve = (value: T) => {
            this.status = PromiseState.Fulfilled;
            this.value = value;
            for(const handler of this.fulfillmentHandlers) {
                handler(value);
            }

            for(const handler of this.finallyHandlers) {
                handler();
            }
        }

        const reject = (reason: any) => {
            this.reason = reason;
            this.status = PromiseState.Rejected
        }

        try {
            action(resolve, reject);
        } catch (error) {
            reject(error);
        }
    }
}

export { PromiseMock, PassivePromiseMock };
