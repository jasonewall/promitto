# Promitto

Simple Promise mocking for unit testing.

```typescript
const p = promitto.pending("Some API results");

render(<MyComponent data={p} />);

// assert loading state

await p.resolve().settled();

// assert final state
```
