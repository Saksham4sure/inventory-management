import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BusinessProvider } from './context/BusinessContext';
import { AppRoutes } from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BusinessProvider>
          <AppRoutes />
        </BusinessProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
