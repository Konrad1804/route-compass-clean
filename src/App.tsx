import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import UserPicker from "./pages/UserPicker";
import RoutePage from "./pages/RoutePage";
import PlacesPage from "./pages/PlacesPage";
import TodosPage from "./pages/TodosPage";
import LogPage from "./pages/LogPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UserProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/route-compass-clean">
          <Routes>
            <Route path="/" element={<UserPicker />} />
            <Route path="/route" element={<RoutePage />} />
            <Route path="/places" element={<PlacesPage />} />
            <Route path="/todos" element={<TodosPage />} />
            <Route path="/log" element={<LogPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
