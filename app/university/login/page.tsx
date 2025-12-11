'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UniversityLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Remove the university-specific login UI — redirect to the shared login page
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to the main login page...</p>
    </div>
  );
}

