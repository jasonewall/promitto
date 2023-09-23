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

    describe('fulfilled', () => {
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

        it('should handle when thens return a promise', () => {
            const p = new PassivePromiseMock<string>();

            p.resolve("peter");

            const results: string[] = [];
            p.then((value: string) => PromiseMock.resolve(`${value} piper`))
             .then((value: string) => results.push(value));


            expect(results[0]).toEqual('peter piper');
        });

        it('should work with await', async () => {
            const p = new PassivePromiseMock<string>();
            p.resolve('waiting for you');

            const result = await p;
            expect(result).toEqual('waiting for you');
        });
    });

    describe('rejected', () => {
        it('should call finally', () => {
            const p = new PassivePromiseMock<string>();
            const results: string[] = [];

            p.catch(() => {
                results.push('catch');
            }).finally(() => {
                results.push('finally');
            });

            p.reject(new Error('this is fine'));
            expect(results).toEqual([
                'catch',
                'finally',
            ]);
        });

        it('should work if finally is first', () => {
            const p = new PassivePromiseMock<string>();
            const results: string[] = [];

            p.finally(() => results.push('finally'))
            .catch(() => {
                return 'help';
            }).then((value: string) => {
                results.push('then');
                results.push(value);
            });

            p.reject(new Error('derp'));

            expect(results).toEqual(['finally', 'then', 'help']);
        });

        describe('by throwing errors from a then block', () => {

            let p: PassivePromiseMock<string>;
            const results: string[] = [];

            beforeEach(() => {
                p = new PassivePromiseMock<string>();
                results.length = 0;
            });

            function setupChain() {
                p.then(() => {
                    results.push('then1');
                    return 17;
                }).then((value: number) => {
                    results.push('then2');
                    throw new Error(`${value} is not old enough to drink!`)
                }).catch((reason: Error) => {
                    results.push('catch');
                    expect(reason.message).toEqual('17 is not old enough to drnk!');
                });
            }

            it('should work when resolving after chain is setup', () => {
                setupChain();
                p.resolve("Minor Person's name");

                expect(results).toEqual([
                    'then1',
                    'then2',
                    'catch'
                ]);
            });

            it('should work when resolving before chain is setup', () => {
                p.resolve("Minor person's name");
                setupChain();

                expect(results).toEqual([
                    'then1',
                    'then2',
                    'catch'
                ]);
            });

            it.todo('should allow calling onrejected in then')
        });
    });

    it.todo('should behave correctly when adding multiple handlers to the same promise (not chaining)');
});
