import React, { Profiler, useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from 'react-router-dom';
import { useAuthStore } from './lib/store';
import EmployeeLayout from './components/EmployeeLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { supabase } from './lib/supabase';
import Dashboard from './pages/Dashboard';
import { Provider } from 'react-redux';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import Tasks from './pages/Tasks';
import AdminPage from './pages/AdminPage';
import SoftwareComplaintSection from './components/SoftwareComplaintSection';
import OfficeComplaintSection from './components/OfficeComplaintSection';
import LeaveRequestsAdmin from './pages/LeaveRequestsAdmin';
import { useNavigate } from 'react-router-dom';
import ExtraHours from './pages/ExtraHours2';
import SalaryBreakdown from './components/SalaryBreakdown';
import TaskBoard from './components/TaskBoard';
import ProfileCard from './components/Profile';
import DailyLogs from './pages/DailyLogs';
import WidgetDemo from './components/WidgetDemo';
import { getMessaging, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import { AttendanceProvider } from './pages/AttendanceContext';
import { Toaster as Sonner } from './component/ui/sonner';
import { Toaster } from 'react-hot-toast';
import { TooltipProvider } from './component/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from './pages/Index';
import AddNewTask from './AddNewTask';
import Chatbutton from './components/chatbtn';
import ChatSidebar from './components/chat';
import Chat from './components/personchat';
import GroupChat from './components/groupchat';
import Chatlayout from './components/chatlayout';
import Adminroute, {
  EmployeeRoute,
  SuperAdminRoute,
  UserRoute,
} from './components/adminroute';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './lib/AuthProvider';
import { UserProvider } from './contexts/UserContext';
import SuperAdminPage from './pages/SuperAdminPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Organizations from './pages/Organizations';
import OrganizationDetail from './components/OrganizationDetail';
import DashboardLayout from './components/dashboardlayout';
import TaskBoardLayout from './components/taskboardlayout';
import LandingPage from './pages/landingpage';
import UserPage from './pages/UserPage';
import UserOrganizationDetail from './pages/UserOrganizationDetail';
import SuperAdminComplaint from './pages/superadmincompalint';
import ProjectsAdmin from './components/ProjectsAdmin';
import AdminOrganization from './components/adminorganization';
import EmployeeAttendanceTable from './pages/ListViewOfEmployees';
import EmployeesDetails from './pages/EmployeesDetails';
import AdminClient from './pages/adminclient';
import AdminSoftwareComplaint from './pages/AdminSoftwareComplaint';
import AdminHoliday from './pages/adminHoliday';
import AdminDailyLogs from './components/AdminDailyLogs';
import Updates from './pages/Updates';
import Employeeprofile from './pages/Employeeprofile';
import globalStore from './store';
import TaskBoardAdmin from './components/TaskBoardAdmin';
import ErrorBoundary from './components/ErrorBoundary';
import { websocketService } from './services/websocketService';
import OtpVerificationPage from './pages/OtpVerificationPage';
import SetPassword from './pages/SetPassword';

// Wrapper components for SuperAdmin routing
const OrganizationsWrapper: React.FC = () => {
  const navigate = useNavigate();

  const handleSelectOrganization = (org: any) => {
    navigate(`/superadmin/organizations/${org.id}`);
  };

  const token = localStorage.getItem('accessToken');
  return <Organizations onSelectOrganization={handleSelectOrganization} />;
};

const OrganizationDetailWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setOrganization(data);
      } catch (err) {
        console.error('Error fetching organization:', err);
        navigate('/superadmin/organizations');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [id, navigate]);

  const handleBack = () => {
    navigate('/superadmin/organizations');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9A00FF]"></div>
      </div>
    );
  }

  if (!organization) {
    return <div>Organization not found</div>;
  }

  return <OrganizationDetail organization={organization} onBack={handleBack} />;
};

function App() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Initialize WebSocket connection when user is authenticated
  useEffect(() => {
    if (user) {
      websocketService.connect().catch(console.error);
    } else {
      websocketService.disconnect();
    }

    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
    };
  }, [user]);

  // Initialize chat state
  const [chatperson, setchatperson] = useState<boolean>(false);
  const [selecteduser, setselecteduser] = useState<null | string>(null);
  const [ischatopen, setischatopen] = useState<boolean>(false);
  const [groupchat, setgroupchat] = useState<boolean>(false);
  const [selectedgroup, setselectedgroup] = useState<null | string>(null);

  const openchatperson = (id: string) => {
    setselecteduser(id);
    setchatperson(true);
  };

  const opengroup = (id: string) => {
    console.log('App opengroup called with id:', id);
    setselectedgroup(id);
    setgroupchat(true);
  };

  // Functions to open and close chat
  const openChat = () => {
    setischatopen(true);
  };

  const closeChat = () => {
    setischatopen(false);
  };

  const closechatperson = () => {
    setchatperson(false);
    setselecteduser(null);
  };

  const closegroupchat = () => {
    setgroupchat(false);
    setselectedgroup(null);
  };

  // Register Service Worker
  useEffect(() => {
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered');
        } catch (error) {
          console.error('SW registration failed:', error);
        }
      }
      handleEnableNotifications();
    };
    registerSW();
  }, []);

  // Notification Permission Handler
  const handleEnableNotifications = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey:
          'BFPFkVqWUS4mX-O--KPP3jzy1xyi1pHFREawLt7R9Md2kZpTj8vvbyo9XWE-RIgnsL22pTSpqoX4gOAOsm5flJQ',
      });

      // Save to Supabase
      const { error } = await supabase
        .from('users')
        .update({ push_subscription: subscription })
        .eq('id', user?.id || '');

      if (!error) console.log('Subscription saved!');
    }
  };

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Provider store={globalStore}>
          <UserProvider>
          <Toaster />
          <Router>
            {/* Chat Sidebar - LinkedIn style */}
            <AnimatePresence>
              {ischatopen && (
                <div className="fixed inset-0 z-50 flex pointer-events-none">
                  {/* Invisible overlay to capture clicks outside the sidebar */}
                  <div
                    className="fixed inset-0 pointer-events-auto"
                    onClick={closeChat}
                  ></div>
                  {/* The actual sidebar */}
                  <div className="relative ml-auto w-full max-w-xs pointer-events-auto">
                    <ChatSidebar
                      closechat={closeChat}
                      openchatperson={openchatperson}
                      opengroup={(id: string) => {
                        console.log(
                          'ChatSidebar received opengroup call with id:',
                          id
                        );
                        opengroup(id);
                      }}
                    />
                  </div>
                </div>
              )}
            </AnimatePresence>
            {chatperson && (
              <Chat id={selecteduser ?? ''} closechatperson={closechatperson} />
            )}
            {groupchat && (
              <GroupChat
                groupId={selectedgroup ?? ''}
                closegroupchat={closegroupchat}
              />
            )}
            {!ischatopen && (
              <Chatlayout>
                <Chatbutton openchat={openChat} />
              </Chatlayout>
            )}

            {/* App Routes */}
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/home" element={<LandingPage />} />
              <Route path="/otp-verification" element={<OtpVerificationPage />} />
              <Route path="/set-password/:token" element={<SetPassword />} />

              {/* Widget Demo Route */}
              <Route path="/widget-demo" element={<WidgetDemo />} />

              {/* User Routes (Protected) */}
              <Route
                path="/user"
                element={
                  <PrivateRoute>
                    <UserRoute>
                      <UserPage />
                    </UserRoute>
                  </PrivateRoute>
                }
              />
              <Route
                path="/user/:organizationId"
                element={
                  <PrivateRoute>
                    <UserRoute>
                      <UserOrganizationDetail />
                    </UserRoute>
                  </PrivateRoute>
                }
              />

              {/* SuperAdmin Routes (Protected) */}
              <Route
                path="/superadmin"
                element={
                  <PrivateRoute>
                    <SuperAdminRoute>
                      <SuperAdminPage />
                    </SuperAdminRoute>
                  </PrivateRoute>
                }
              >
                <Route
                  index
                  element={<Navigate to="/superadmin/dashboard" replace />}
                />
                <Route path="dashboard" element={<SuperAdminDashboard />} />
                <Route
                  path="organizations"
                  element={<OrganizationsWrapper />}
                />
                <Route
                  path="softwarecomplaint"
                  element={<SuperAdminComplaint />}
                />
                <Route
                  path="organizations/:id"
                  element={<OrganizationDetailWrapper />}
                />
              </Route>

              {/* Admin Route (Protected) */}
              <Route
                path="/admin"
                element={
                  <PrivateRoute adminOnly>
                    <AttendanceProvider>
                      <Adminroute>
                        <AdminPage />
                      </Adminroute>
                    </AttendanceProvider>
                  </PrivateRoute>
                }
              >
                <Route
                  index
                  element={<Navigate to="employeAttandanceTable" replace />}
                />
                <Route path="projects" element={<ProjectsAdmin />}>
                  <Route path=":id" element={<TaskBoardAdmin setSelectedTAB={undefined} selectedTAB={undefined} ProjectId={undefined} devopss={undefined} />} />
                </Route>
                <Route path="organization" element={<AdminOrganization />} />
                <Route
                  path="employeAttandanceTable"
                  element={<EmployeeAttendanceTable />}
                />

                <Route path="employeeDetails" element={<EmployeesDetails employeeid={undefined} employee={undefined} employeeview={undefined} setemployeeview={undefined} />} />

                <Route path="Clients" element={<AdminClient />} />
                <Route path="OfficeComplaints" />
                <Route
                  path="softwareComplaints"
                  element={<AdminSoftwareComplaint />}
                />
                <Route path="Holidays" element={<AdminHoliday />} />
                <Route path="leaverequest" />
                <Route path="dailylogs" element={<AdminDailyLogs />} />
                <Route path="officealerts" element={<Updates />} />
                <Route path="profile/:Id" element={<Employeeprofile />} />
              </Route>

              {/* Employee Routes (Protected & Nested under EmployeeLayout) */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <EmployeeRoute>
                      <EmployeeLayout />
                    </EmployeeRoute>
                  </PrivateRoute>
                }
              >
                <Route
                  index
                  element={
                    <DashboardLayout>
                      <Dashboard />
                    </DashboardLayout>
                  }
                />
                <Route path="attendance" element={<Attendance />} />
                <Route path="leave" element={<Leave />} />
                <Route path="tasks" element={<Tasks />} />
                <Route
                  path="software-complaint"
                  element={<SoftwareComplaintSection />}
                />
                <Route
                  path="office-complaint"
                  element={<OfficeComplaintSection />}
                />
                <Route path="overtime" element={<ExtraHours />} />
                <Route path="salary-breakdown" element={<SalaryBreakdown />} />
                <Route path="board/:id" element={<TaskBoardLayout />} />
                <Route path="profile" element={<ProfileCard />} />
                <Route path="dailylogs" element={<DailyLogs />} />
              </Route>

              {/* Redirect unknown routes to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </UserProvider>
      </Provider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

const PrivateRoute: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
}> = ({ children, adminOnly }) => {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/home" replace />;
  return <>{children}</>;
};

export default App;
