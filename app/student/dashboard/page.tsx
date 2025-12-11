"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function StudentDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect student users to the public mentors listing so they can open a mentor's AI clone
    router.replace('/public/mentors');
  }, [router]);

  // Keep route protected but immediately redirect
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-center">Redirecting to mentors list...</p>
      </div>
    </ProtectedRoute>
  );
}

