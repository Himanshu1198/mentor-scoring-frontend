"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/config/api";
import { CheckCircle2, Trophy, RefreshCcw } from "lucide-react";

interface RankingRow {
  id: string;
  rank: number;
  name: string;
  verified: boolean;
  overallScore: number;
  strengthTag: string;
  avgScoreTrend: number[];
}

interface Filters {
  subjects: string[];
  languages: string[];
  experienceLevels: string[];
  timeWindows: string[];
}

export default function StudentLeaderboardPage() {
  const router = useRouter();
  useAuth();

  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [filters, setFilters] = useState<Filters>({
    subjects: [],
    languages: [],
    experienceLevels: [],
    timeWindows: ["weekly", "monthly", "alltime"],
  });
  const [subject, setSubject] = useState<string | undefined>();
  const [language, setLanguage] = useState<string | undefined>();
  const [experience, setExperience] = useState<string | undefined>();
  const [timeWindow, setTimeWindow] = useState<string | undefined>("weekly");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch rankings from backend
  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<{ rankings?: RankingRow[] }>(
          API_ENDPOINTS.public.rankings
        );

        const rankingsList = data.rankings || [];

        // Add rank numbers if not present
        const rankedData = rankingsList.map((item, index) => ({
          ...item,
          rank: item.rank || index + 1,
        }));

        setRankings(rankedData);

        // Extract unique filters from mentor data
        const uniqueSubjects = Array.from(
          new Set(rankingsList.map((m) => (m as any).subject).filter(Boolean))
        ) as string[];
        const uniqueLanguages = Array.from(
          new Set(rankingsList.map((m) => (m as any).language).filter(Boolean))
        ) as string[];
        const uniqueExperience = Array.from(
          new Set(
            rankingsList.map((m) => (m as any).experience).filter(Boolean)
          )
        ) as string[];

        setFilters({
          subjects: uniqueSubjects,
          languages: uniqueLanguages,
          experienceLevels: uniqueExperience,
          timeWindows: ["weekly", "monthly", "alltime"],
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, []);

  // Re-fetch when filters change
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<{ rankings?: RankingRow[] }>(
        API_ENDPOINTS.public.rankings
      );

      let rankingsList = data.rankings || [];

      // Apply filters to data on frontend
      if (subject && subject !== "all") {
        rankingsList = rankingsList.filter(
          (m) => (m as any).subject === subject
        );
      }
      if (language && language !== "all") {
        rankingsList = rankingsList.filter(
          (m) => (m as any).language === language
        );
      }
      if (experience && experience !== "all") {
        rankingsList = rankingsList.filter(
          (m) => (m as any).experience === experience
        );
      }

      // Add rank numbers if not present
      const rankedData = rankingsList.map((item, index) => ({
        ...item,
        rank: item.rank || index + 1,
      }));

      setRankings(rankedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBySearch = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rankings;
    return rankings.filter((row) => row.name.toLowerCase().includes(term));
  }, [rankings, search]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-amber-300 text-xs font-semibold uppercase tracking-[0.2em]">
              Global / Institutional Rankings
            </p>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">
              Discover top mentors
            </h1>
            <p className="text-sm text-slate-300">
              Normalized scores only. Raw data is never shown.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 border border-white/10" />
              <div className="h-10 w-10 rounded-full bg-amber-400/30 border border-white/10" />
              <div className="h-10 w-10 rounded-full bg-emerald-400/30 border border-white/10" />
            </div>
            <div>
              <p className="text-sm text-slate-200 font-semibold">
                Trusted by students & universities
              </p>
              <p className="text-xs text-slate-400">
                Weekly + monthly snapshots
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-primary/10">
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search mentor"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full sm:w-56 lg:w-64 bg-white/5 border-white/10 text-slate-50 placeholder:text-slate-400"
          />
          <Select value={subject || "all"} onValueChange={setSubject}>
            <SelectTrigger
              size="sm"
              className="w-[140px] bg-white/5 border-white/10 text-slate-50"
            >
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {filters.subjects.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={language || "all"} onValueChange={setLanguage}>
            <SelectTrigger
              size="sm"
              className="w-[140px] bg-white/5 border-white/10 text-slate-50"
            >
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {filters.languages.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={experience || "all"} onValueChange={setExperience}>
            <SelectTrigger
              size="sm"
              className="w-[160px] bg-white/5 border-white/10 text-slate-50"
            >
              <SelectValue placeholder="Experience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {filters.experienceLevels.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeWindow || "weekly"} onValueChange={setTimeWindow}>
            <SelectTrigger
              size="sm"
              className="w-[130px] bg-white/5 border-white/10 text-slate-50"
            >
              <SelectValue placeholder="Window" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {filters.timeWindows.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="border-white/20 text-slate-50"
          >
            <RefreshCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Rankings Table */}
      <section className="rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-black/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[120px]" />
              <col className="w-[40%]" />
              <col className="w-[140px]" />
              <col className="w-[30%]" />
            </colgroup>
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Rank
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Mentor
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Overall Score
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Strength
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-sm text-slate-300"
                  >
                    Loading rankings...
                  </td>
                </tr>
              ) : filteredBySearch.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-sm text-slate-300"
                  >
                    No mentors match filters.
                  </td>
                </tr>
              ) : (
                filteredBySearch.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/public/mentors/${row.id}`)}
                    className="hover:bg-white/5 transition cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-amber-400 flex-shrink-0" />
                        <span className="font-semibold text-amber-300">
                          {row.rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-50">
                          {row.name}
                        </span>
                        {row.verified && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-semibold text-slate-100">
                        {row.overallScore}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-primary/20 px-3 py-1 text-xs font-medium text-white border border-primary/30">
                        {row.strengthTag}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
