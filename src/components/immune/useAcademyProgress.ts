import { useEffect, useState } from "react";
import { useMember } from "@/components/immune/community/chrome";
import { getAcademyProgress, saveAcademyProgress } from "@/lib/academy/progress.functions";
import {
  loadLocalProgress,
  mergeProgress,
  saveLocalProgress,
  type AcademyProgress,
} from "@/lib/academy/progress";

export function useAcademyProgress() {
  const member = useMember();
  const [progress, setProgress] = useState<AcademyProgress>({ visitedLessonIds: [], quizCorrect: [] });
  const [storage, setStorage] = useState<"browser" | "account" | "loading">("loading");

  useEffect(() => {
    const local = loadLocalProgress();
    setProgress(local);
    if (member === undefined) return;
    if (!member) {
      setStorage("browser");
      return;
    }
    let cancel = false;
    getAcademyProgress()
      .then((remote) => {
        if (cancel) return;
        if (!remote.available || !remote.progress) {
          setStorage("browser");
          return;
        }
        const merged = mergeProgress(local, remote.progress);
        saveLocalProgress(merged);
        setProgress(merged);
        setStorage("account");
        saveAcademyProgress({ data: merged }).catch(() => {
          if (!cancel) setStorage("browser");
        });
      })
      .catch(() => {
        if (!cancel) setStorage("browser");
      });
    return () => {
      cancel = true;
    };
  }, [member]);

  function update(next: AcademyProgress) {
    saveLocalProgress(next);
    setProgress(next);
    if (!member) {
      setStorage("browser");
      return;
    }
    saveAcademyProgress({ data: next })
      .then((res) => setStorage(res.available ? "account" : "browser"))
      .catch(() => setStorage("browser"));
  }

  return {
    progress,
    update,
    storage: member === undefined ? "loading" as const : storage,
    signedIn: !!member,
  };
}
