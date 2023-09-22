import { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
    preset: 'ts-jest',
    moduleDirectories: [
        'node_modules',
        '<rootDir>',
    ],
    testMatch: [
        "<rootDir>/tests/**/*.[jt]s",
    ],
    transform: {
        "^.+\\.(t|j)s$": "@swc/jest",
    },
}

export default config;
