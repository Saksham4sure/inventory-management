import { useContext } from 'react';
import { ConfirmContext } from '../context/confirm-context';

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export default useConfirm;
