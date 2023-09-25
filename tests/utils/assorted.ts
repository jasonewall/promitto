function mockFn(...fns: string[]): jest.Mock[] {
  const results: jest.Mock[] = [];
  for (const fnName of fns) results.push(jest.fn().mockName(fnName));
  return results;
}

function expectAll<T>(
  ...values: T[]
): jest.JestMatchers<T> {
  const results: any[] = values.map((x) => expect(x));
  const handler: ProxyHandler<jest.JestMatchers<T>> = {
    get: (target, propName) => {
      for (let i = 0; i < results.length; i++) {
        results[i] = results[i][propName];
      }
      return new Proxy((target as any)[propName], handler);
    },
    apply: (_, __, argArray) => {
      for (const result of results) result(...argArray);
    }
  }
  return new Proxy<jest.JestMatchers<T>>(expect<T>(values[0]), handler);
}

export { mockFn, expectAll };
