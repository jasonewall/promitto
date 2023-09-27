# Promitto

Simple Promise mocking for unit testing.

```typescript
const p = promitto.pending("Some API results");

render(<MyComponent data={p} />);

// assert loading state

await p.resolve().settled();

// assert final state
```

## API

`promitto<T>()`

Returns a promise mock that can be resolved or rejected by calling either:

1. `resolve(value?: T)` - The promise will resolve to the value passed in, and value will be passed to any fulfillment handlers attached to the promise mock.
2. `reject(reason?: any)` - The promise will reject with the reason passed in and reason will be passed to any rejection handlers attached to the promise mock.

No `then`, `catch`, `finally` callbacks will be executed until either of these are called.

```ts
const p = promitto<string>();

p.resolve("Testing is fun!");

p.reject(new Error("Error handling is fun!"));
```

`promitto.pending<T>(value: T)`

Returns a promise mock that will not run any callbacks (added through `then`, `catch`, `finally`) until `resolve()` is called on the promise mock. The wrapped value of the promise mock is locked into the value initially passed into `pending`.

```ts
const p = promitto.pending("Hello!");

p.resolve();
```

`promitto.resolve(value?: T)`

Returns a promise mock that is already resolved to the provided value. Any callbacks added by `then`, `catch`, or `finally` will be immediately executed.

```ts
const p = promitto.resolve(['Cats', 'Dogs']);
```

`promitto.reject(reason?: any)`

Return a promise mock that is already rejected to the provided value. Any callbacks added by `then`, `catch`, or `finally` will be imediately executed.

```ts
const p = promitto.reject(new Error('Missing pets!'));
```

### Use Cases

`promitto.resolve` and `promitto.reject` exist as drop-in replacements for `Promise.resolve` and `Promise.reject`. This is functionally different than the other methods which return a pending promise mock. You would want to use the Promitto pre-resolved methods in your test cases to allow the application to build promise mocks instead of async promises. Our tests then have access to the entirety of the chain. This becomes more relevant as we understand the purpose of the [`#settled`](#settled) method.

## `children`

All promise mocks track the promises created from calling their then, catch, finally methods. While this is only done for the sake of the `settled()` function, it is also exposed for troubleshooting purposes. This attribute could be logged out to get some clues as to the shape of our promise chain.

```ts
const p = promitto.pending("Some value");

callMyApplication(p);

console.log(p.children);
```

It is NOT recommended that you make assertions based on the contents of children.

## `settled()`

While the implementation of all promise mocks in `promitto` are entirely synchronous the Promise spec behaves in such a way that fulfillment handlers (callbacks passed as the first argument of `then`) and rejection handlers (callbacks passed into `catch` or as the second argument of `then`) can resolve to `PromiseLike<Return Type>`. This means that application code or any other package in our applications could add asynchronous promises to our chain. Because of this all PromiseMock types have a `settled()` method that returns a core Promise that will only resolve once the entire chain is settled.

 > Keep in mind when we inject Promises into our application in unit tests, we typically do not have access to the end of the chain. The code we are trying to test is appending new promises to the chain via then, catch, and finally. Otherwise if we could await the end of the chain we wouldn't have need of `settled()` or other tricks like `await Promise.resolve()`/`await new Promise(process.nextTick)`/`await new Promise(setImmediate)`.
 >
 > NOTE: Some of these tricks aren't functional on all platforms, where `settled()` should always be reliable.

```ts
const p = promitto.resolve("A value to represent success.");

callMyApplication(p); // the application adds many thens and catches.

await p.settled();

// add your expectations for after the promise has settled
```

NOTE: The promise returned by `settled` is NOT tracked in `children` so they are an accurate representation of the promise chain generated by our application.

## Compatability with Core JS/TS Promise

This is a huge concern of Promitto. We DO NOT want our tests to be buggy because our mocks are creating promise chains that behave differently than real promises. To ensure Promitto PromiseMocks behave exactly like real promises we have a large test suite that compares the behaviour of PromiseMock to Promise.

In short - we run our test suite against Promise core to test the tests. See [the Promise tests](./tests/Promise.test.ts) for more details.

If you feel there are some cases that are missing Pull Requests and/or Issues describing the missing test cases are welcome.

## For Testing Only

As a mostly synchronous promise implemenation this library has no value for application code. Please only use it for testing.
