"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, LogOut, BarChart3, Trophy } from "lucide-react";

export function MentorNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleRankingClick = () => {
    // Dispatch custom event to notify the dashboard to switch tabs
    window.dispatchEvent(new CustomEvent("switchTab", { detail: { tab: "rankings" } }));
  };

  const navItems = [
    { label: "View Dashboard", href: "/mentor/dashboard", icon: BarChart3 },
    { label: "View Public Ranking", onClick: handleRankingClick, icon: Trophy, isButton: true },
  ];

  const isActive = (href: string) => {
    // Keep dashboard button active for both dashboard and public/mentors pages
    if (href === "/mentor/dashboard") {
      return pathname === href || pathname.startsWith("/mentor/dashboard");
    }
    return pathname === href;
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/95">
      <div className="container mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Link href="/mentor/dashboard" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-purple-500/50 transition-shadow">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-slate-50 hidden sm:inline">
              Mentor Hub
            </span>
          </Link>

          {/* Desktop Navigation */}
          {/* <div className="hidden md:flex items-center gap-6">
            {navItems.map((item: any) => {
              const Icon = item.icon;
              if (item.isButton) {
                return (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-slate-300 hover:text-slate-50 hover:bg-white/5"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "text-slate-300 hover:text-slate-50 hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div> */}

          {/* User Section */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-slate-400">Logged in as</p>
              <p className="text-sm font-medium text-slate-200">
                {user?.email || "Mentor"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
            <ThemeToggle />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {isOpen ? (
                <X className="h-5 w-5 text-slate-300" />
              ) : (
                <Menu className="h-5 w-5 text-slate-300" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t border-white/10 py-3 space-y-2">
            {navItems.map((item: any) => {
              const Icon = item.icon;
              if (item.isButton) {
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.onClick();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-slate-300 hover:text-slate-50 hover:bg-white/5"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "text-slate-300 hover:text-slate-50 hover:bg-white/5"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
