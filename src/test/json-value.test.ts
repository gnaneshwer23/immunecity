import { describe, expect, it } from "vitest";
import { parseJsonObject, parseJsonValue } from "../lib/jsonValue";
describe("server JSON boundaries", () => {
  it("preserves JSON values while returning an independent object", () => {
    const input = { list: [null, 2, false, "text"], nested: { value: 1 } };
    const result = parseJsonObject(input);
    expect(result).toEqual(input);
    expect(result).not.toBe(input);
  });
  it("rejects unsupported values and prototype keys rather than shipping unknown data", () => {
    for (const value of [undefined, NaN, Infinity, () => 1, new Date(), { field: undefined }, JSON.parse('{"__proto__":{"admin":true}}')]) {
      expect(() => parseJsonValue(value)).toThrow();
    }
    expect(() => parseJsonObject([])).toThrow();
  });
});
