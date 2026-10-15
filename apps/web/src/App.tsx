import { useEffect } from 'react';
import { Navigate, Outlet, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useAuth } from '@/auth/auth';
import { Shell } from '@/components/shell';
import { closeOpenSessions } from '@/device/useDevice';
import { LoginPage, SetupPage } from '@/pages/AuthPages';
import { LivePage } from '@/pages/LivePage';
import { PatientPage } from '@/pages/PatientPage';
import { PatientsPage } from '@/pages/PatientsPage';
import { ReviewPage } from '@/pages/ReviewPage';
import { SettingsPage } from '@/pages/SettingsPage';

export function App() {
  return <RouterProvider router={router} />;
}

function Gate() {
  const ready = useAuth((s) => s.ready);
  const hasPassword = useAuth((s) => s.hasPassword);
  const unlocked = useAuth((s) => s.unlocked);
  useEffect(() => {
    void useAuth.getState().load();
    void closeOpenSessions();
  }, []);
  if (!ready) return <div className="h-full bg-bg" />;
  if (!hasPassword) return <Navigate to="/setup" replace />;
  if (!unlocked) return <Navigate to="/login" replace />;
  return <Outlet />;
}

const router = createBrowserRouter([
  { path: '/setup', element: <SetupPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <Gate />,
    children: [
      {
        element: <Shell />,
        children: [
          { path: '/', element: <PatientsPage /> },
          { path: '/patients/:id', element: <PatientPage /> },
          { path: '/live/:patientId', element: <LivePage /> },
          { path: '/sessions/:id', element: <ReviewPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
