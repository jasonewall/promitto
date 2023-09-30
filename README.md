# Promitto

Simple Promise mocking for unit testing.

```typescript
const p = promitto.pending("Some API results");

render(<MyComponent data={p} />);

// assert loading state

await p.resolve().settled();

// assert final state
```

## Getting Started

`npm i --save-dev @jasonewall/promitto`

`import promitto from '@jasonewall/promitto'`

## API

### `promitto<T>()`

Returns a promise mock that can be resolved or rejected by calling either:

1. `resolve(value?: T)` - The promise will resolve to the value passed in, and value will be passed to any fulfillment handlers attached to the promise mock.
2. `reject(reason?: any)` - The promise will reject with the reason passed in and reason will be passed to any rejection handlers attached to the promise mock.

No `then`, `catch`, `finally` callbacks will be executed until either of these are called.

```ts
const p = promitto<string>();

p.resolve("Testing is fun!");

p.reject(new Error("Error handling is fun!"));
```

### `promitto.pending<T>(value: T)`

Returns a promise mock that will not run any callbacks (added through `then`, `catch`, `finally`) until `resolve()` is called on the promise mock. The wrapped value of the promise mock is locked into the value initially passed into `pending`.

```ts
const p = promitto.pending("Hello!");

p.resolve();
```

### `promitto.resolve(value?: T)`

Returns a promise mock that is already resolved to the provided value. Any callbacks added by `then`, `catch`, or `finally` will be immediately executed.

```ts
const p = promitto.resolve(["Cats", "Dogs"]);
```

### `promitto.reject(reason?: any)`

Return a promise mock that is already rejected to the provided value. Any callbacks added by `then`, `catch`, or `finally` will be imediately executed.

```ts
const p = promitto.reject(new Error("Missing pets!"));
```

See [Use Cases](./USECASES.md#first-the-entry-point-functions) for more info.

## PromiseMock Instance Methods

### `#children`

Returns all promises created by calling `then`, `catch`, `finally` of this PromiseMock.

```ts
const p = promitto.pending("Some value");

callMyApplication(p);

console.log(p.children);
```

[[More Info](./USECASES.md#children)]

### `#settled()`

Returns a promise that only settles once this promise and all of it's children are settled.

```ts
const p = promitto.resolved("Good job!");

callMyApplication(p);

await p.settled();

// assert application state
```

[Settling Rejected PromiseMocks](./USECASES.md#settling-rejected-promisemocks)

[[More Info](./USECASES.md#settled)]

### `#status: PromiseState`

Returns the current status of this PromiseMock. Will be one of:

```
enum PromiseState {
  Pending = "pending",
  Fulfilled = "fulfilled",
  Rejected = "rejected",
}
```

## Compatability with Core JS/TS Promise

This is a huge concern of Promitto. We DO NOT want our tests to be buggy because our mocks are creating promise chains that behave differently than real promises. To ensure Promitto PromiseMocks behave exactly like real promises we have a large test suite that compares the behaviour of PromiseMock to Promise.

In short - we run our test suite against Promise core to test the tests. See [the Promise tests](./tests/Promise.test.ts) for more details.

If you feel there are some cases that are missing Pull Requests and/or Issues describing the missing test cases are welcome.

## For Testing Only

As a mostly synchronous promise implemenation this library has no value for application code. Please only use it for testing.
