import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminPage } from './pages/AdminPage';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ParticipantPage } from './pages/ParticipantPage';
import { ReportPage } from './pages/ReportPage';
import { ReportsPage } from './pages/ReportsPage';
import { SurveyBuilderPage } from './pages/SurveyBuilderPage';
import { UserGuidePage } from './pages/UserGuidePage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/guide" element={<UserGuidePage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allow={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/builder/:surveyId?"
          element={
            <ProtectedRoute allow={['admin', 'creator']}>
              <SurveyBuilderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allow={['admin', 'creator']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/:surveyId"
          element={
            <ProtectedRoute allow={['admin', 'creator']}>
              <ReportPage />
            </ProtectedRoute>
          }
        />
        <Route path="/participant/:inviteToken" element={<ParticipantPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
