import { useEffect, useState } from "react";

export const REPO = "matheussilvano/mooose";
export const REPO_URL = `https://github.com/${REPO}`;

export type RepoStats = { stars: number; forks: number; issues: number } | null;

// Live numbers from the public GitHub API, cached for 10 minutes. Never blocks rendering.
export function useRepoStats(): RepoStats {
  const [stats, setStats] = useState<RepoStats>(null);
  useEffect(() => {
    let cancelled = false;
    try {
      const cached = JSON.parse(sessionStorage.getItem("mz_repo_stats") || "null");
      if (cached && Date.now() - cached.at < 600_000) {
        setStats(cached.stats);
        return;
      }
    } catch {
      /* ignore */
    }
    fetch(`https://api.github.com/repos/${REPO}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || cancelled || typeof d.stargazers_count !== "number") return;
        const s = { stars: d.stargazers_count, forks: d.forks_count, issues: d.open_issues_count };
        setStats(s);
        try {
          sessionStorage.setItem("mz_repo_stats", JSON.stringify({ at: Date.now(), stats: s }));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return stats;
}
