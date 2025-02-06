import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './lib/store';
import EmployeeLayout from './components/EmployeeLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import Tasks from './pages/Tasks';
import AdminPage from './pages/AdminPage'; // Corrected import
import SoftwareComplaintSection from './components/SoftwareComplaintSection';
import OfficeComplaintSection from './components/OfficeComplaintSection'; 

// PrivateRoute component for protected routes
const PrivateRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const user = useAuthStore((state) => state.user);

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route: Login */}
        <Route path="/login" element={<Login />} />

        {/* Admin Route (Protected) */}
        <Route
          path="/admin"
          element={
            <PrivateRoute adminOnly>
              <AdminPage />
            </PrivateRoute>
          }
        />

        {/* Employee Routes (Protected & Nested under EmployeeLayout) */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <EmployeeLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="leave" element={<Leave />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="software-complaint" element={<SoftwareComplaintSection />}/>
          <Route path="office-complaint" element={<OfficeComplaintSection />}/>
        </Route>

        {/* Redirect unknown routes to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App