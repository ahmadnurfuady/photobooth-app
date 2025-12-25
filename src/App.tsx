import { SentryErrorBoundary } from './components/SentryErrorBoundary';
import AdminDashboard from './pages/AdminDashboard'; // Ganti dengan routing Anda

function App() {
  return (
    <SentryErrorBoundary>
       {/* Komponen Utama / Router Anda ada di sini */}
       <AdminDashboard />
    </SentryErrorBoundary>
  );
}

export default App;