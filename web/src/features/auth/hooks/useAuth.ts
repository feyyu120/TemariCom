import { useContext } from 'react';
import { AuthContext, AuthContextValue } from '../context/AuthContext';

/**
 * Functional hook to access authentication state and operations.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;

