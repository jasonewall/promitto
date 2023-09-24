export {};

declare global {
    namespace jest {
        interface Matchers<R> {
            toHaveBeenCalledAfter(expected: Mock): CustomMatcherResult;
            toHaveBeenCalledBefore(expected: Mock): CustomMatcherResult;
        }
    }
}

expect.extend({
    toHaveBeenCalledAfter(received: jest.Mock, expected: jest.Mock): jest.CustomMatcherResult {
        const pass: boolean = received.mock.invocationCallOrder[0] > expected.mock.invocationCallOrder[0];
        const message: () => string = () => pass ? "" : `Expected ${received.getMockName()} to have been called after ${expected.getMockName()}`;

        return { pass, message }
    },
    toHaveBeenCalledBefore(received: jest.Mock, expected: jest.Mock): jest.CustomMatcherResult {
        const pass: boolean = received.mock.invocationCallOrder[0] < expected.mock.invocationCallOrder[0];
        const message: () => string = () => pass ? "" : `Expected ${received.getMockName()} to have been called before ${expected.getMockName()}`;
         return { pass, message };
    },
})
