import { describe, expect, it } from "vitest";
import {
  ACADEMY_TRACKS,
  FOUNDATION_TRACK,
  INTERMEDIATE_TRACK,
  moduleForLesson,
} from "@/data/academyCurriculum";
import { CONTENT } from "@/data/content";
import { byId } from "@/lib/immune/engine";

describe("Academy curriculum honesty", () => {
  it("exposes foundation navigable and intermediate scaffold only", () => {
    expect(ACADEMY_TRACKS).toHaveLength(2);
    expect(FOUNDATION_TRACK.status).toBe("navigable");
    expect(INTERMEDIATE_TRACK.status).toBe("scaffold");
    expect(INTERMEDIATE_TRACK.level).toBe("intermediate");
  });

  it("binds every module to an existing Mechanism lesson and known graph ids", () => {
    const lessonIds = new Set(CONTENT.lessons.map((l: { id: string }) => l.id));
    for (const track of ACADEMY_TRACKS) {
      for (const mod of track.modules) {
        expect(lessonIds.has(mod.lessonId)).toBe(true);
        expect(mod.quiz.length).toBeGreaterThan(0);
        for (const gid of mod.graphIds) {
          expect(byId[gid], `missing graph id ${gid} on ${mod.id}`).toBeTruthy();
        }
      }
    }
  });

  it("resolves moduleForLesson for foundation and intermediate lessons", () => {
    expect(moduleForLesson("tlr4")?.track.id).toBe(FOUNDATION_TRACK.id);
    expect(moduleForLesson("checkpoint")?.track.id).toBe(INTERMEDIATE_TRACK.id);
    expect(moduleForLesson("sting")?.track.id).toBe(INTERMEDIATE_TRACK.id);
  });
});
