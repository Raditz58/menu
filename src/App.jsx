import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Menu from './pages/Menu';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminLayout from './layouts/AdminLayout';
import AdminCategories from './pages/admin/Categories';
import AdminProducts from './pages/admin/Products';
import AdminTables from './pages/admin/Tables';

import StaffDashboard from './pages/staff/StaffDashboard';
import StaffLayout from './layouts/StaffLayout';

// Simple dashboard home
import DashboardHome from './pages/admin/DashboardHome';

import AdminStaff from './pages/admin/Staff';
import AdminFeedback from './pages/admin/AdminFeedback';
import NotFound from './pages/NotFound';

const RootRedirect = () => {
  const { user, role, userData, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  if (role === 'superadmin') return <Navigate to="/superadmin" replace />;
  if (role === 'admin' && userData?.restaurantId) return <Navigate to={`/admin/${userData.restaurantId}`} replace />;
  if (['kitchen', 'service', 'cashier'].includes(role) && userData?.restaurantId) return <Navigate to="/staff/dashboard" replace />;
  
  return <div>Unknown Access or Missing Restaurant ID</div>;
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/menu/:restaurantSlug/:tableCode" element={<Menu />} />
            
            <Route 
              path="/superadmin" 
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/:restaurantId" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="tables" element={<AdminTables />} />
              <Route path="staff"      element={<AdminStaff />} />
              <Route path="feedback"   element={<AdminFeedback />} />
            </Route>

            <Route 
              path="/staff" 
              element={
                <ProtectedRoute allowedRoles={['kitchen', 'service', 'cashier']}>
                  <StaffLayout />
                </ProtectedRoute>
              } 
            >
              <Route path="dashboard" element={<StaffDashboard />} />
            </Route>

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
