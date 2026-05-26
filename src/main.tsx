import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import "./index.css";
import { ThemeProvider } from "./lib/themeContext";
import Dashboard from "./pages/Dashboard";
import CalendarBooking from "./pages/CalendarBooking";
import PublicBooking from "./pages/PublicBooking";
import NotificationsSettings from "./pages/NotificationsSettings";

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicBooking />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/:tab" element={<Dashboard />} />
          <Route path="/calendar" element={<CalendarBooking />} />
          <Route path="/notifications" element={<NotificationsSettings />} />
        </Routes>
      </BrowserRouter>
      </ThemeProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </StrictMode>,
);
