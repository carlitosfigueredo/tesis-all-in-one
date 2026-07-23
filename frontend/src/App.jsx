import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import TermsAndConditions from './pages/TermsAndConditions';
import Legal from './pages/Legal';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import ModelML from './pages/ModelML';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/"      element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/legal" element={<Legal />} />

          {/* Rutas protegidas */}
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard"     element={<Dashboard />} />
            <Route path="/employees"     element={<Employees />} />
            <Route path="/employees/:id" element={<EmployeeDetail />} />
            <Route path="/model"         element={<ModelML />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
