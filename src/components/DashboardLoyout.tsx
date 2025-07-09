import React from 'react'
import { useUser } from '../contexts/UserContext';
import ClientDashboard from './ClientDashboard';
import Dashboard from '../pages/Dashboard';

const DashboardLoyout = () => {
const { userProfile, loading, refreshUserProfile } = useUser();

if(userProfile?.role=="client"){
    return <ClientDashboard/>
}
  return (
    <Dashboard/>
  )
}

export default DashboardLoyout