import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { BusinessProvider } from './context/BusinessContext';
import { NotificationProvider } from './context/NotificationContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { SnackbarProvider } from './context/SnackbarContext';
import { AppRoutes } from './routes/AppRoutes';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <BusinessProvider>
            <NotificationProvider>
              <ConfirmProvider>
                <SnackbarProvider>
                  <AppRoutes />
                </SnackbarProvider>
              </ConfirmProvider>
            </NotificationProvider>
          </BusinessProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
