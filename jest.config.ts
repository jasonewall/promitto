import { JestConfigWithTsJest, pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from './tsconfig.json';

const config: JestConfigWithTsJest = {
    preset: 'ts-jest',
    moduleDirectories: [
        'node_modules',
        '<rootDir>',
    ],
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
    testMatch: [
        "<rootDir>/tests/**/*.[jt]s",
    ],
    transform: {
        "^.+\\.(t|j)s$": "@swc/jest",
    },
}

export default config;
