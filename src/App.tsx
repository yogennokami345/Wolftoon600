import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { MaintenanceProvider } from "./contexts/MaintenanceContext";
import Index from "./pages/Index";
import { useRealtimeNotifications } from "./hooks/useRealtimeNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence } from "framer-motion";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import MaintenanceGuard from "./components/MaintenanceGuard";
import MaintenanceBanner from "./components/MaintenanceBanner";


const Catalog = lazy(() => import("./pages/Catalog"));
const MangaDetails = lazy(() => import("./pages/MangaDetails"));
const Reader = lazy(() => import("./pages/Reader"));
const Search = lazy(() => import("./pages/Search"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const TitleCreator = lazy(() => import("./pages/TitleCreator"));
const ChapterUpload = lazy(() => import("./pages/ChapterUpload"));
const BatchChapterUpload = lazy(() => import("./pages/BatchChapterUpload"));
const Vip = lazy(() => import("./pages/Vip"));
const VipStatus = lazy(() => import("./pages/VipStatus"));
const Profile = lazy(() => import("./pages/Profile"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Contact = lazy(() => import("./pages/Contact"));
const Dmca = lazy(() => import("./pages/Dmca"));
const Ranking = lazy(() => import("./pages/Ranking"));
const Install = lazy(() => import("./pages/Install"));
const MyList = lazy(() => import("./pages/MyList"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-8 w-3/4 mx-auto" />
      <Skeleton className="h-4 w-1/2 mx-auto" />
      <div className="grid grid-cols-2 gap-4 mt-8">
        <Skeleton className="aspect-[2/3] rounded-xl" />
        <Skeleton className="aspect-[2/3] rounded-xl" />
      </div>
    </div>
  </div>
);

const GlobalHooks = () => {
  useRealtimeNotifications();
  return null;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />} key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/manga/:slug" element={<MangaDetails />} />
          <Route path="/manga/:id/edit" element={<TitleCreator />} />
          <Route path="/read/:id/:chapter" element={<Reader />} />
          <Route path="/search" element={<Search />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/create" element={<TitleCreator />} />
          <Route path="/create" element={<TitleCreator />} />
          {/* Legacy routes redirect to unified creator */}
          <Route path="/admin/create-comic" element={<TitleCreator />} />
          <Route path="/admin/create-novel" element={<TitleCreator />} />
          <Route path="/admin/upload-chapter" element={<ChapterUpload />} />
          <Route path="/admin/batch-upload" element={<BatchChapterUpload />} />
          <Route path="/upload/chapter/:titleId" element={<ChapterUpload />} />
          <Route path="/upload/bulk/:titleId" element={<BatchChapterUpload />} />
          <Route path="/vip" element={<Vip />} />
          <Route path="/vip/status" element={<VipStatus />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/dmca" element={<Dmca />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/install" element={<Install />} />
          <Route path="/my-list" element={<MyList />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <MaintenanceProvider>
        <GlobalHooks />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <MaintenanceGuard>
              <SidebarProvider defaultOpen={false}>
                <div className="min-h-screen flex w-full bg-background">
                  <AppSidebar />
                  <div className="flex-1 min-w-0 flex flex-col">
                    {/* Maintenance banner for admins */}
                    <MaintenanceBanner />
                    <AnimatedRoutes />
                  </div>
                </div>
              </SidebarProvider>
            </MaintenanceGuard>
          </BrowserRouter>
        </TooltipProvider>
      </MaintenanceProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
