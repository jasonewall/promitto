import { JestConfigWithTsJest, pathsToModuleNameMapper } from "ts-jest";
import { compilerOptions } from "./tsconfig.json";

const config: JestConfigWithTsJest = {
  preset: "ts-jest",
  moduleDirectories: ["node_modules", "<rootDir>"],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
  testMatch: ["<rootDir>/tests/**/*.[jt]s"],
  testPathIgnorePatterns: ["<rootDir>/tests/utils/*"],
  transform: {
    "^.+\\.(t|j)s$": "@swc/jest",
  },
  reporters: ["default", "jest-junit"],
};

export default config;
