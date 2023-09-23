import { describe } from '@jest/globals'
import { PromiseMock, PassivePromiseMock } from '@self/PromiseMock'

describe(PromiseMock.name, () => {
    it('should be assignable as a promise', () => {
        const results: string[] = [];

        const somePromisingFunction = (action: Promise<string>) => {
            action.then((value) => {
                results.push(value);
            })
        }

        const promise = new PassivePromiseMock<string>();
        somePromisingFunction(promise);
        expect(results).toEqual([]);

        promise.resolve('A value');

        expect(results).toContain('A value');
    });

    it('should behave like a javascript object', () => {
        const promise = new PromiseMock();
        const result = Object.prototype.toString.call(promise);
        expect(result).toEqual("[object PromiseMock]");
    });

    describe('#resolve', () => {
        it('should call finally and then handlers', () => {
            const p = new PassivePromiseMock<number>();
            const results: string[] = [];

            p.then((value: number) => {
                results[0] = "then";
                expect(value).toEqual(93);
            });
            p.finally(() => results[1] = "finally");
            p.resolve(93);

            expect(results).toEqual(['then', 'finally']);
        });

        it('should allow chaining finally and then calls', () => {
            const p = new PassivePromiseMock<number>();
            const results: string[] = [];

            p.then((value: number) => {
                results[0] = 'then1';
                expect(value).toEqual(23);
                return '33';
            })
            .then((value: string) => {
                results[1] = 'then2';
                expect(value).toEqual('33');
            })
            .finally(() => results[2] = 'finally1')
            .finally(() => results[3] = 'finally2');

            p.resolve(23);

            expect(results).toEqual([
                'then1',
                'then2',
                'finally1',
                'finally2',
            ]);
        });

        it('should allow adding chains after resolution', () => {
            const p = new PassivePromiseMock<number>();
            p.resolve(87);

            var results: number[] = [];
            p.then((value: number) => results.push(value));

            expect(results[0]).toEqual(87);
        });

        test.todo('what should it do if we call then on a rejected promise');
    });
});
