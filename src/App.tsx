import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import CallDetails from "./pages/CallDetails";
import Settings from "./pages/Settings";
import GoogleAuth from "./pages/GoogleAuth";
import GoogleAuthCallback from "./pages/GoogleAuthCallback";
import SetupGuide from "./pages/SetupGuide";
import AdminDashboard from "./pages/AdminDashboard";
import PostCallDataPage from "./pages/admin/PostCallDataPage";
import BusinessDataRequestsPage from "./pages/admin/BusinessDataRequestsPage";
import CallInitiationFailuresPage from "./pages/admin/CallInitiationFailuresPage";
import ClientToolEventsPage from "./pages/admin/ClientToolEventsPage";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import PricingPage from "./pages/PricingPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Onboarding />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/call/:callId" element={<CallDetails />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/google_auth" element={<GoogleAuth />} />
            <Route path="/google-auth-callback" element={<GoogleAuthCallback />} />
            <Route path="/setup-guide" element={<SetupGuide />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/post-call-data" element={<PostCallDataPage />} />
            <Route path="/admin/business-data-requests" element={<BusinessDataRequestsPage />} />
            <Route path="/admin/call-initiation-failures" element={<CallInitiationFailuresPage />} />
            <Route path="/admin/client-tool-events" element={<ClientToolEventsPage />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
