import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Contextos
import { AuthProvider }      from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';

// Guards
import PrivateRoute from './routes/PrivateRoute';
import AdminRoute   from './routes/AdminRoute';

// Páginas públicas
import Landing            from './pages/Landing';
import Login              from './pages/Login';
import Register           from './pages/Register';
import ForgotPassword     from './pages/ForgotPassword';
import ResetPassword      from './pages/ResetPassword';
import TermsAndConditions from './pages/TermsAndConditions';
import Legal              from './pages/Legal';

// Portal admin (SUPER_ADMIN)
import AdminLogin      from './pages/AdminLogin';
import AdminForgotPassword from './pages/AdminForgotPassword';
import AdminDashboard  from './pages/admin/AdminDashboard';
import AdminCompanies  from './pages/admin/AdminCompanies';
import AdminPlans      from './pages/admin/AdminPlans';
import AdminAuditLogs  from './pages/admin/AdminAuditLogs';

// Portal empresa (COMPANY_ADMIN / ANALYST / VIEWER)
import Dashboard     from './pages/Dashboard';
import Employees     from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import Users         from './pages/Users';
import ModelML       from './pages/ModelML';
import Company       from './pages/Company';
import Checkout      from './pages/Checkout';

export default function App() {
  return (
    <BrowserRouter>
      {/* AdminAuthProvider envuelve todo para que AdminRoute pueda leer el contexto */}
      <AdminAuthProvider>
        <AuthProvider>
          <Routes>

            {/* ── Rutas públicas ─────────────────────────────────────── */}
            <Route path="/"                 element={<Landing />} />
            <Route path="/login"            element={<Login />} />
            <Route path="/register"         element={<Register />} />
            <Route path="/forgot-password"  element={<ForgotPassword />} />
            <Route path="/reset-password"   element={<ResetPassword />} />
            <Route path="/terms"            element={<TermsAndConditions />} />
            <Route path="/legal"            element={<Legal />} />

            {/* ── Portal Super Admin ─────────────────────────────────── */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin"           element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/companies" element={<AdminCompanies />} />
              <Route path="/admin/plans"     element={<AdminPlans />} />
              <Route path="/admin/audit"     element={<AdminAuditLogs />} />
            </Route>

            {/* ── Portal Empresa ─────────────────────────────────────── */}
            <Route path="/checkout" element={<Checkout />} />
            <Route element={<PrivateRoute />}>
              <Route path="/dashboard"      element={<Dashboard />} />
              <Route path="/employees"      element={<Employees />} />
              <Route path="/employees/:id"  element={<EmployeeDetail />} />
              <Route path="/users"          element={<Users />} />
              <Route path="/model"          element={<ModelML />} />
              <Route path="/company"        element={<Company />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </AuthProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
