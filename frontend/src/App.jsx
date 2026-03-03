import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import OfflineBanner from './components/OfflineBanner';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectBoardPage from './pages/ProjectBoardPage';

function App() {
  const { token, loadUser } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      useAuthStore.setState({ isLoading: false });
    }
  }, [token, loadUser]);

  return (
    <>
      <OfflineBanner />
      <div key={location.pathname} className="animate-page-in">
        <Routes location={location}>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Dashboard — full-page layout with its own sidebar / navbar */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Other protected routes use the generic Layout shell */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/projects/:id" element={<ProjectBoardPage />} />
          </Route>

          {/* Catch-all → dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
