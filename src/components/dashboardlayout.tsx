import React from 'react';
import { useUser } from '../contexts/UserContext';
import ClientDashboard from '../pages/clientdashboard';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const { userProfile, loading, refreshUserProfile } = useUser();

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    }

    if (!userProfile) {
        return refreshUserProfile()
    }

    if (userProfile.role === 'client' || userProfile.role == "product manager") {
        return (
            <ClientDashboard />
        );
    }

    // For non-client users, render the children (the actual dashboard)
    return <>{children}</>;
};

export default DashboardLayout;