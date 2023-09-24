function mockFn(...fns: string[]): jest.Mock[] {
  const results: jest.Mock[] = [];
  for(const fnName of fns) results.push(jest.fn().mockName(fnName));
  return results;
}

export { mockFn }
