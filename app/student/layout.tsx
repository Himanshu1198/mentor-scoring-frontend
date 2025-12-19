import { StudentNavbar } from "@/components/StudentNavbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-50">
        <StudentNavbar />
        <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-8 max-w-7xl">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
