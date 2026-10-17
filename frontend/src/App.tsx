import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { BrowsePage } from './pages/BrowsePage';
import { ReportItemPage } from './pages/ReportItemPage';
import { ItemDetailsPage } from './pages/ItemDetailsPage';
import { MyReportsPage } from './pages/MyReportsPage';
import { MyClaimsPage } from './pages/MyClaimsPage';
import { ReceivedClaimsPage } from './pages/ReceivedClaimsPage';
import { AiMatchesPage } from './pages/AiMatchesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { MessagesPage } from './pages/MessagesPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Website Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/404" element={<NotFoundPage />} />
          </Route>

          {/* Authenticated / Dashboard Workspace Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="browse" element={<BrowsePage />} />
            <Route path="report" element={<ReportItemPage />} />
            <Route path="items/:id" element={<ItemDetailsPage />} />
            <Route path="my-reports" element={<MyReportsPage />} />
            <Route path="my-claims" element={<MyClaimsPage />} />
            <Route path="received-claims" element={<ReceivedClaimsPage />} />
            <Route path="ai-matches" element={<AiMatchesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="messages" element={<MessagesPage />} />
          </Route>

          {/* Administration Portal Route */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
          </Route>

          {/* Fallback to 404 */}
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
