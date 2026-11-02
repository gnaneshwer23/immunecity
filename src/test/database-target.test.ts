import { describe, expect, it } from "vitest";
import { isiDatabaseConnectionOptions } from "../lib/db/connection-options";
describe("ISI database isolation", () => {
  it("refuses HSI credentials before creating any connection", () => {
    expect(() => isiDatabaseConnectionOptions("postgresql://user:fixture@ep-restless-dew-zas989pv.c-2.eu-west-2.aws.neon.tech/neondb")).toThrow("HSI substrate");
    expect(() => isiDatabaseConnectionOptions("postgresql://user:fixture@%65p-restless-dew-zas989pv.c-2.eu-west-2.aws.neon.tech/neondb")).toThrow();
  });
  it("requires remote certificate verification and removes ambiguous URL TLS overrides", () => {
    expect(() => isiDatabaseConnectionOptions("postgresql://user:fixture@isi.example.test/db?sslmode=disable")).toThrow();
    const config = isiDatabaseConnectionOptions("postgresql://user:fixture@isi.example.test/db?sslmode=require&channel_binding=require");
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
    expect(config.url).not.toContain("sslmode");
    expect(config.url).not.toContain("channel_binding");
  });
});
