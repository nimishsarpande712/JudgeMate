import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LocalAuthProvider, useLocalAuth } from "@/hooks/useLocalAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Landing from "./pages/Landing";
import StudentLogin from "@/components/StudentLogin";
import ProjectSubmission from "@/components/ProjectSubmission";
import JudgeDashboard from "@/components/JudgeDashboard";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

const queryClient = new QueryClient();

// Route guard for authenticated users
function ProtectedStudentRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useLocalAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== "student") return <Navigate to="/judge" replace />;
  return <>{children}</>;
}

function ProtectedJudgeRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useLocalAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== "judge") return <Navigate to="/submit" replace />;
  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

// Initialize dark mode on app load
function DarkModeInit() {
  useEffect(() => {
    const theme = localStorage.getItem("judgemate_theme");
    if (theme !== "light") {
      document.documentElement.classList.add("dark");
    }
  }, []);
  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LocalAuthProvider>
          <DarkModeInit />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<StudentLogin />} />
              <Route path="/submit" element={<ProtectedStudentRoute><ProjectSubmission /></ProtectedStudentRoute>} />
              <Route path="/judge" element={<ProtectedJudgeRoute><JudgeDashboard /></ProtectedJudgeRoute>} />
              {/* Legacy routes redirect */}
              <Route path="/dashboard" element={<Navigate to="/judge" replace />} />
              <Route path="/demo" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </LocalAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
