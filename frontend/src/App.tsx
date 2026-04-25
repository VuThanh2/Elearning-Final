import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { theme } from './theme';
import {
  AuthProvider,
  NotificationProvider,
  ProtectedRoute,
  NotificationSnackbar,
  USER_ROLES,
  NotFoundPage,
} from './modules/shared';

// Auth Pages
import { LoginPage } from './modules/auth';

// Student Pages
import { StudentDashboard } from './modules/student';
import SectionDetailsPage from './modules/student/pages/SectionDetailsPage';
import QuizAttemptPage from './modules/student/pages/QuizAttemptPage';
import QuizResultsPage from './modules/student/pages/QuizResultsPage';
import StudentAnalyticsPage from './modules/student/pages/StudentAnalyticsPage';

// Teacher Pages
import { TeacherDashboard } from './modules/teacher';
import TeacherSectionDetailsPage from './modules/teacher/pages/TeacherSectionDetailsPage';
import QuizEditorPage from './modules/teacher/pages/QuizEditorPage';
import TeacherAnalyticsPage from './modules/teacher/pages/TeacherAnalyticsPage';

// Admin Pages
import { AdminDashboard } from './modules/admin';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <NotificationProvider>
            <NotificationSnackbar />
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />

              {/* Student Routes */}
              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute requiredRole={USER_ROLES.STUDENT}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/sections/:sectionId"
                element={
                  <ProtectedRoute requiredRole={USER_ROLES.STUDENT}>
                    <SectionDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/quiz/:quizId/attempt"
                element={
                  <ProtectedRoute requiredRole={USER_ROLES.STUDENT}>
                    <QuizAttemptPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/quiz/:quizId/results/:attemptId"
                element={
                  <ProtectedRoute requiredRole={USER_ROLES.STUDENT}>
                    <QuizResultsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/quiz/:quizId/results"
                element={
                  <ProtectedRoute requiredRole={USER_ROLES.STUDENT}>
                    <QuizResultsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/sections/:sectionId/analytics"
                element={
                  <ProtectedRoute requiredRole={USER_ROLES.STUDENT}>
                    <StudentAnalyticsPage />
                  </ProtectedRoute>
                }
              />

              {/* Teacher Routes */}
              <Route
                path="/teacher/dashboard"
                element={
                  <ProtectedRoute requiredRole={USER_ROLES.TEACHER}>
                    <TeacherDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/sections/:sectionId"
                element={
                  <ProtectedRoute requiredRole={USER_ROLES.TEACHER}>
                    <TeacherSectionDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/quiz/new"
                element={
                  <ProtectedRoute requiredRole={USER_ROLES.TEACHER}>
                    <QuizEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/quiz/:quizId/edit"
                element={
                  <ProtectedRoute requiredRole={USER_ROLES.TEACHER}>
                    <QuizEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/sections/:sectionId/analytics"
                element={
                  <ProtectedRoute requiredRole={USER_ROLES.TEACHER}>
                    <TeacherAnalyticsPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requiredRole={USER_ROLES.ADMIN}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* 404 Not Found */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
