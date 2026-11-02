/** Validate DB/API JSON at the boundary instead of asserting unknown is serializable. */
export type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };
export function parseJsonValue(value: unknown, depth = 0): JsonValue {
  if (depth > 32) throw new Error("JSON nesting limit exceeded");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((item) => parseJsonValue(item, depth + 1));
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const result: JsonObject = {};
    for (const [key, item] of Object.entries(value)) {
      if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("Unsafe JSON key");
      result[key] = parseJsonValue(item, depth + 1);
    }
    return result;
  }
  throw new Error("Value is not JSON serializable");
}
export function parseJsonObject(value: unknown): JsonObject {
  const parsed = parseJsonValue(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected a JSON object");
  return parsed;
}
