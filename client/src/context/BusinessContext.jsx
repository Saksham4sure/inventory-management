import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { businessService } from '../services/businessService';

export const BusinessContext = createContext(null);

export const BusinessProvider = ({ children }) => {
  const { isAuthenticated, hasBusiness, setBusinessConfigured } = useContext(AuthContext);
  const [business, setBusiness] = useState(null);
  const [loadingBusiness, setLoadingBusiness] = useState(false);
  const [error, setError] = useState(null);

  const fetchBusiness = useCallback(async () => {
    if (!isAuthenticated || !hasBusiness) {
      setBusiness(null);
      return;
    }

    try {
      setLoadingBusiness(true);
      setError(null);
      const data = await businessService.getMyBusiness();
      setBusiness(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingBusiness(false);
    }
  }, [isAuthenticated, hasBusiness]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  const setupBusiness = async (formData) => {
    setLoadingBusiness(true);
    try {
      const data = await businessService.setupBusiness(formData);
      setBusiness(data.business);
      setBusinessConfigured(data.business);
      return data.business;
    } finally {
      setLoadingBusiness(false);
    }
  };

  const updateBusiness = async (formData) => {
    setLoadingBusiness(true);
    try {
      const updated = await businessService.updateBusiness(formData);
      setBusiness(updated);
      return updated;
    } finally {
      setLoadingBusiness(false);
    }
  };

  const value = {
    business,
    loadingBusiness,
    error,
    refreshBusiness: fetchBusiness,
    setupBusiness,
    updateBusiness,
  };

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
};
