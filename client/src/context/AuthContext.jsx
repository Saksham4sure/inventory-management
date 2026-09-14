import { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { storage } from '../utils/storage';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(storage.getUser());
  const [token, setToken] = useState(storage.getToken());
  const [hasBusiness, setHasBusiness] = useState(Boolean(storage.getUser()?.businessId));
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const existingToken = storage.getToken();
    if (!existingToken) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await authService.getMe();
      setUser(data.user);
      setHasBusiness(data.hasBusiness);
      storage.setUser(data.user);
    } catch {
      storage.clear();
      setUser(null);
      setToken(null);
      setHasBusiness(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    storage.setToken(data.token);
    storage.setUser(data.user);
    setToken(data.token);
    setUser(data.user);
    setHasBusiness(data.hasBusiness);
    return data;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);
    storage.setToken(data.token);
    storage.setUser(data.user);
    setToken(data.token);
    setUser(data.user);
    setHasBusiness(false);
    return data;
  };

  const logout = () => {
    storage.clear();
    setUser(null);
    setToken(null);
    setHasBusiness(false);
  };

  const setBusinessConfigured = (businessData) => {
    setHasBusiness(true);
    if (user) {
      const updatedUser = { ...user, businessId: businessData._id };
      setUser(updatedUser);
      storage.setUser(updatedUser);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    hasBusiness,
    isLoading,
    login,
    register,
    logout,
    checkAuth,
    setBusinessConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
