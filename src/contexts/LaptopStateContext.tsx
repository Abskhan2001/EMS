import React, { createContext, useContext, useEffect, useRef } from 'react';
import LaptopStateMonitor from '../services/laptopStateMonitor';
import { useUser } from './UserContext';

interface LaptopStateContextType {
  monitor: LaptopStateMonitor | null;
}

const LaptopStateContext = createContext<LaptopStateContextType>({
  monitor: null,
});

export const useLaptopStateMonitor = () => {
  const context = useContext(LaptopStateContext);
  if (!context) {
    throw new Error('useLaptopStateMonitor must be used within a LaptopStateProvider');
  }
  return context;
};

interface LaptopStateProviderProps {
  children: React.ReactNode;
}

export const LaptopStateProvider: React.FC<LaptopStateProviderProps> = ({ children }) => {
  const { userProfile } = useUser();
  const monitorRef = useRef<LaptopStateMonitor | null>(null);

  useEffect(() => {
    // Initialize laptop state monitoring for all authenticated users
    if (userProfile?.id) {
      console.log('Initializing laptop state monitor for user:', userProfile.id, 'role:', userProfile.role);

      // Create and initialize the monitor
      monitorRef.current = new LaptopStateMonitor(userProfile.id);
      monitorRef.current.initialize();

      // Cleanup function
      return () => {
        if (monitorRef.current) {
          monitorRef.current.destroy();
          monitorRef.current = null;
        }
      };
    }
  }, [userProfile?.id]);

  return (
    <LaptopStateContext.Provider value={{ monitor: monitorRef.current }}>
      {children}
    </LaptopStateContext.Provider>
  );
};

export default LaptopStateProvider;