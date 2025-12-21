"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  User,
  Mail,
  Calendar,
  TrendingUp,
  Award,
  BookOpen,
  Activity,
  Settings,
} from "lucide-react";

interface StudentProfile {
  id: string;
  email: string;
  joinedDate?: string;
  totalSessions?: number;
  averageScore?: number;
  rank?: number;
  recentActivity?: Activity[];
}

interface Activity {
  id: string;
  type: string;
  description: string;
  date: string;
}

export default function StudentProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);

      // Use fallback data for now - endpoint doesn't exist yet
      setProfile({
        id: user?.id || "",
        email: user?.email || "",
        joinedDate: new Date().toISOString().split("T")[0],
        totalSessions: 12,
        averageScore: 4.5,
        rank: 45,
        recentActivity: [
          {
            id: "1",
            type: "watched",
            description: "Watched Calculus Fundamentals - Part 1",
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          },
          {
            id: "2",
            type: "session",
            description: "Completed session with Dr. Sarah Johnson",
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          },
          {
            id: "3",
            type: "watched",
            description: "Watched Quantum Physics Basics",
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          },
        ],
      });

      setLoading(false);
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50">
              My Profile
            </h1>
            <p className="text-slate-400 mt-2">
              View and manage your student profile
            </p>
          </div>
          <Button
            variant="outline"
            size="lg"
            className="gap-2 md:w-auto w-full"
          >
            <Settings className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </section>

      {/* Profile Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Basic Info Card */}
        <Card className="border-white/10 bg-white/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-200">
                Email
              </CardTitle>
              <Mail className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400 break-all">{profile?.email}</p>
          </CardContent>
        </Card>

        {/* Rank Card */}
        <Card className="border-white/10 bg-white/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-200">
                Rank
              </CardTitle>
              <Award className="h-4 w-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-300">
              #{profile?.rank || "-"}
            </p>
            <p className="text-xs text-slate-400">Global ranking</p>
          </CardContent>
        </Card>

        {/* Sessions Card */}
        <Card className="border-white/10 bg-white/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-200">
                Sessions
              </CardTitle>
              <BookOpen className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-300">
              {profile?.totalSessions || 0}
            </p>
            <p className="text-xs text-slate-400">Learning sessions</p>
          </CardContent>
        </Card>

        {/* Average Score Card */}
        <Card className="border-white/10 bg-white/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-200">
                Avg Score
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-300">
              {(profile?.averageScore || 0).toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400">Performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Details */}
        <Card className="border-white/10 bg-white/5 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-400" />
              <div>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>Your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Full Name
                </label>
                <p className="text-slate-200 mt-2">Student Account</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Email
                </label>
                <p className="text-slate-200 mt-2">{profile?.email}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Role
                </label>
                <p className="text-slate-200 mt-2">Student</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Joined
                </label>
                <p className="text-slate-200 mt-2">
                  {profile?.joinedDate || new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-400" />
              <div>
                <CardTitle>Quick Stats</CardTitle>
                <CardDescription>Your progress</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Learning Streak</span>
                <span className="text-sm font-semibold text-amber-300">
                  7 days
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">This Month</span>
                <span className="text-sm font-semibold text-blue-300">
                  12 sessions
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Total Watched</span>
                <span className="text-sm font-semibold text-emerald-300">
                  45 hours
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200">
                  Watched a mentor video
                </p>
                <p className="text-xs text-slate-400">Today at 2:30 PM</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Award className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200">
                  Completed learning session
                </p>
                <p className="text-xs text-slate-400">Yesterday at 5:15 PM</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200">
                  Improved your rank
                </p>
                <p className="text-xs text-slate-400">2 days ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}