"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import {
  Search,
  Filter,
  Users,
  Video,
  Clock,
  Star,
  CheckCircle2,
  Play,
  X,
} from "lucide-react";

interface Mentor {
  id: string;
  name: string;
  verified: boolean;
  overallScore: number;
  strengthTag: string;
  subject: string;
  language: string;
  experience: string;
  avatar?: string;
}

interface VideoContent {
  id: string;
  title: string;
  mentor: string;
  subject: string;
  duration: number;
  views: number;
  rating: number;
  language: string;
}

interface ExploreFilters {
  subjects: string[];
  languages: string[];
  experienceLevels: string[];
  contentTypes: string[];
}

type ContentType = "mentors" | "videos";

export default function ExplorePage() {
  useAuth();
  const router = useRouter();

  // Sample videos for now
  const sampleVideos: VideoContent[] = [
    {
      id: "1",
      title: "Calculus Fundamentals - Part 1",
      mentor: "Dr. Sarah Johnson",
      subject: "Mathematics",
      duration: 45,
      views: 2340,
      rating: 4.9,
      language: "English",
    },
    {
      id: "2",
      title: "Quantum Physics Basics",
      mentor: "Prof. Michael Chen",
      subject: "Physics",
      duration: 60,
      views: 1850,
      rating: 4.8,
      language: "English",
    },
    {
      id: "3",
      title: "Organic Chemistry Introduction",
      mentor: "Dr. Emma Williams",
      subject: "Chemistry",
      duration: 52,
      views: 1220,
      rating: 4.7,
      language: "English",
    },
    {
      id: "4",
      title: "Cellular Biology Overview",
      mentor: "Prof. David Kumar",
      subject: "Biology",
      duration: 55,
      views: 980,
      rating: 4.6,
      language: "Hindi",
    },
  ];

  const [contentType, setContentType] = useState<ContentType>("mentors");
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [videos] = useState<VideoContent[]>(sampleVideos);
  const [filters, setFilters] = useState<ExploreFilters>({
    subjects: [],
    languages: [],
    experienceLevels: [],
    contentTypes: ["mentors", "videos"],
  });
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<{
    subject?: string;
    language?: string;
    experience?: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch mentors from backend
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get<{ rankings?: Mentor[] }>(
          API_ENDPOINTS.public.rankings
        );

        // Extract unique subjects and languages from mentors
        const mentorsList = data.rankings || [];
        setMentors(mentorsList);

        // Extract unique filters from mentor data
        const uniqueSubjects = Array.from(
          new Set(mentorsList.map((m) => m.subject).filter(Boolean))
        ) as string[];
        const uniqueLanguages = Array.from(
          new Set(mentorsList.map((m) => m.language).filter(Boolean))
        ) as string[];
        const uniqueExperience = Array.from(
          new Set(mentorsList.map((m) => m.experience).filter(Boolean))
        ) as string[];

        setFilters({
          subjects: uniqueSubjects,
          languages: uniqueLanguages,
          experienceLevels: uniqueExperience,
          contentTypes: ["mentors", "videos"],
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMentors();
  }, []);

  const filteredContent = useMemo(() => {
    const searchTerm = search.toLowerCase();
    let content: (Mentor | VideoContent)[] =
      contentType === "mentors" ? mentors : videos;

    // Apply search filter
    content = content.filter((item: Mentor | VideoContent) => {
      let searchableText = "";
      
      if (contentType === "mentors") {
        const mentor = item as Mentor;
        searchableText = `${mentor.name} ${mentor.subject} ${mentor.strengthTag}`.toLowerCase();
      } else {
        const video = item as VideoContent;
        searchableText = `${video.title} ${video.mentor} ${video.subject}`.toLowerCase();
      }

      return searchableText.includes(searchTerm);
    });

    // Apply category filters
    if (selectedFilters.subject) {
      content = content.filter(
        (item) =>
          (contentType === "mentors"
            ? (item as Mentor).subject
            : (item as VideoContent).subject) === selectedFilters.subject
      );
    }

    if (selectedFilters.language) {
      content = content.filter(
        (item) =>
          (contentType === "mentors"
            ? (item as Mentor).language
            : (item as VideoContent).language) === selectedFilters.language
      );
    }

    if (contentType === "mentors" && selectedFilters.experience) {
      content = content.filter(
        (item) => (item as Mentor).experience === selectedFilters.experience
      );
    }

    return content;
  }, [search, contentType, selectedFilters, mentors, videos]);

  const clearFilters = () => {
    setSearch("");
    setSelectedFilters({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-50">
          Explore
        </h1>
        <p className="text-slate-400 mt-2">
          Discover mentors and learning content
        </p>
      </section>

      {/* Content Type Selector */}
      <div className="flex gap-3">
        <Button
          onClick={() => {
            setContentType("mentors");
            setSearch("");
            setSelectedFilters({});
          }}
          variant={contentType === "mentors" ? "default" : "outline"}
          size="lg"
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Mentors
        </Button>
        <Button
          onClick={() => {
            setContentType("videos");
            setSearch("");
            setSelectedFilters({});
          }}
          variant={contentType === "videos" ? "default" : "outline"}
          size="lg"
          className="gap-2"
        >
          <Video className="h-4 w-4" />
          Videos
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-3 flex-col md:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={
                contentType === "mentors"
                  ? "Search mentors..."
                  : "Search videos..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-white/5 border-white/10 text-slate-50 placeholder:text-slate-400"
            />
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2 md:w-auto"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur">
            <Select
              value={selectedFilters.subject || "all"}
              onValueChange={(value) =>
                setSelectedFilters({
                  ...selectedFilters,
                  subject: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-slate-50">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {filters.subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedFilters.language || "all"}
              onValueChange={(value) =>
                setSelectedFilters({
                  ...selectedFilters,
                  language: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-slate-50">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {filters.languages.map((language) => (
                  <SelectItem key={language} value={language}>
                    {language}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {contentType === "mentors" && (
              <Select
                value={selectedFilters.experience || "all"}
                onValueChange={(value) =>
                  setSelectedFilters({
                    ...selectedFilters,
                    experience: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-slate-50">
                  <SelectValue placeholder="Experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {filters.experienceLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button variant="outline" onClick={clearFilters} className="gap-2">
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        )}

        {/* Active Filters Display */}
        {(search ||
          selectedFilters.subject ||
          selectedFilters.language ||
          selectedFilters.experience) && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-slate-400">Active filters:</span>
            {search && (
              <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-sm text-blue-200 flex items-center gap-2">
                Search: {search}
                <button
                  onClick={() => setSearch("")}
                  className="hover:text-blue-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {selectedFilters.subject && (
              <div className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-200 flex items-center gap-2">
                {selectedFilters.subject}
                <button
                  onClick={() =>
                    setSelectedFilters({
                      ...selectedFilters,
                      subject: undefined,
                    })
                  }
                  className="hover:text-purple-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {selectedFilters.language && (
              <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-sm text-emerald-200 flex items-center gap-2">
                {selectedFilters.language}
                <button
                  onClick={() =>
                    setSelectedFilters({
                      ...selectedFilters,
                      language: undefined,
                    })
                  }
                  className="hover:text-emerald-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {selectedFilters.experience && (
              <div className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-sm text-amber-200 flex items-center gap-2">
                {selectedFilters.experience}
                <button
                  onClick={() =>
                    setSelectedFilters({
                      ...selectedFilters,
                      experience: undefined,
                    })
                  }
                  className="hover:text-amber-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {filteredContent.length}{" "}
            {contentType === "mentors" ? "mentors" : "videos"} found
          </p>
        </div>

        {filteredContent.length === 0 ? (
          <Card className="border-white/10 bg-white/5 backdrop-blur">
            <CardContent className="py-12 text-center">
              <p className="text-slate-400">
                No {contentType} found matching your criteria.
              </p>
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contentType === "mentors"
              ? (filteredContent as Mentor[]).map((mentor) => (
                  <Card
                    key={mentor.id}
                    className="border-white/10 bg-white/5 backdrop-blur hover:border-blue-500/30 hover:bg-white/10 transition-all cursor-pointer group"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">
                              {mentor.name}
                            </CardTitle>
                            {mentor.verified && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            )}
                          </div>
                          <CardDescription className="text-slate-400 text-xs mt-1">
                            {mentor.strengthTag}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Rating</span>
                          <span className="text-amber-300 font-semibold flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-300" />
                            {mentor.overallScore}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Subject</span>
                          <span className="text-slate-200">
                            {mentor.subject}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Language</span>
                          <span className="text-slate-200">
                            {mentor.language}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Experience</span>
                          <span className="text-blue-300">
                            {mentor.experience}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() =>
                          router.push(`/public/mentors/${mentor.id}`)
                        }
                        className="w-full gap-2"
                        size="sm"
                      >
                        <Play className="h-4 w-4" />
                        View Profile
                      </Button>
                    </CardContent>
                  </Card>
                ))
              : (filteredContent as VideoContent[]).map((video) => (
                  <Card
                    key={video.id}
                    className="border-white/10 bg-white/5 backdrop-blur hover:border-blue-500/30 hover:bg-white/10 transition-all cursor-pointer overflow-hidden"
                  >
                    <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center group">
                      <Play className="h-12 w-12 text-white/50 group-hover:text-white/70 transition-colors" />
                    </div>
                    <CardHeader className="pb-3">
                      <div>
                        <CardTitle className="text-lg line-clamp-2">
                          {video.title}
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-sm mt-1">
                          by {video.mentor}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Subject</span>
                          <span className="text-slate-200">
                            {video.subject}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Duration
                          </span>
                          <span className="text-slate-200">
                            {video.duration} min
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Rating</span>
                          <span className="text-amber-300 font-semibold flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-300" />
                            {video.rating}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Views</span>
                          <span className="text-slate-200">
                            {video.views.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <Button className="w-full gap-2" size="sm">
                        <Play className="h-4 w-4" />
                        Watch Now
                      </Button>
                    </CardContent>
                  </Card>
                ))}
          </div>
        )}
      </div>
    </div>
  );
}
