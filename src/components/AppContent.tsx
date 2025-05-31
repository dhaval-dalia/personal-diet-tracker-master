import React from 'react';
import { useAuth } from '@/hooks/useAuth';

const AppContent: React.FC = () => {
  const { user, isAuthReady } = useAuth() as { user: any; isAuthReady: boolean };

  if (!isAuthReady) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {user ? (
        <div>Welcome, {user.email}</div>
      ) : (
        <div>Please log in</div>
      )}
    </div>
  );
};

export default AppContent; 