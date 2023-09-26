# Promitto

Simple Promise mocking for unit testing.

```ts
const p = promitto.pending("Some API results");

render(<MyComponent data={p} />);

// assert loading state

p.resolve();
await p.settled();

// assert final state
```
