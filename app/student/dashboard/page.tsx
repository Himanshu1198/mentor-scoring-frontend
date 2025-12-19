"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudentDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to student profile page
    router.replace("/student");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-center">Redirecting...</p>
    </div>
  );
}
