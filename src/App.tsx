// import React, { useEffect, useState } from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
// import { useAuthStore } from './lib/store';
// import EmployeeLayout from './components/EmployeeLayout';
// import Login from './pages/Login';
// import { supabase } from './lib/supabase';
// import Dashboard from './pages/Dashboard';
// import Attendance from './pages/Attendance';
// import Leave from './pages/Leave';
// import Tasks from './pages/Tasks';
// import AdminPage from './pages/AdminPage';
// import SoftwareComplaintSection from './components/SoftwareComplaintSection';
// import OfficeComplaintSection from './components/OfficeComplaintSection';
// import LeaveRequestsAdmin from './pages/LeaveRequestsAdmin';
// import { useNavigate } from 'react-router-dom';
// import ExtraHours from './pages/ExtraHours2';
// import SalaryBreakdown from './components/SalaryBreakdown';
// import TaskBoard from './components/TaskBoard';
// import ProfileCard from './components/Profile';
// import WidgetDemo from './components/WidgetDemo';
// import { getMessaging, onMessage } from "firebase/messaging";
// import { initializeApp } from "firebase/app";
// import { messaging } from "../notifications/firebase";
// import { AttendanceProvider } from './pages/AttendanceContext';
// import { Toaster } from "./component/ui/toaster";
// import { Toaster as Sonner } from "./component/ui/sonner";
// import { TooltipProvider } from "./component/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import Index from './pages/Index';
// import AddNewTask from './AddNewTask';
// import Chatbutton from './components/chatbtn';
// import ChatSidebar from './components/chat';
// import Chat from './components/personchat';
// import Chatlayout from './components/chatlayout';

// const firebaseConfig = {
//   apiKey: "AIzaSyAAUF5qzZrljXJjb96NmesXBydmn9Hmjss",
//   authDomain: "emsm-1d63e.firebaseapp.com",
//   projectId: "emsm-1d63e",
//   storageBucket: "emsm-1d63e.appspot.com",
//   messagingSenderId: "98198623661",
//   appId: "1:98198623661:web:6e75496c45508cf37d7d24",
//   measurementId: "G-T7352X97BH"
// };

// // const app = initializeApp(firebaseConfig);
// // const messaging = getMessaging(app);

// const PrivateRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
//   const user = useAuthStore((state) => state.user);
//   if (!user) return <Navigate to="/login" replace />;
//   return <>{children}</>;
// };

// function App() {
//   const restoreSession = useAuthStore((state) => state.restoreSession);
//   const user = useAuthStore((state) => state.user);
//   const setUser = useAuthStore((state) => state.setUser);



//   useEffect(() => {
//     // ✅ Register Firebase Service Worker
//     if ("serviceWorker" in navigator) {
//       navigator.serviceWorker.register("/firebase-messaging-sw.js")
//         .then((registration) => {
//           console.log("Service Worker registered successfully:", registration);
//         })
//         .catch((error) => {
//           console.error("Service Worker registration failed:", error);
//         });

//         if ('serviceWorker' in navigator) {
//           navigator.serviceWorker.register('/sw.js')
//           .then((registration) => {
//             console.log("SW registered successfully:", registration);
//           })
//           .catch((error) => {
//             console.error("SW registration failed:", error);
//           });

//         }  
//         requestNotificationPermission();
//     }
//   // useEffect(()=> {
//     // Register service worker

//   // })

//     // app.js
// function requestNotificationPermission() {
//   Notification.requestPermission().then((permission) => {
//     if (permission === "granted") {
//       console.log("User allowed notifications!");
//       subscribeToPush(); // Next step
//     } else {
//       console.log("User blocked notifications 😢");
//     }
//   });
// }

// // Call this when the user clicks a button (e.g., "Enable Notifications")



// // app.js
// // Frontend code (e.g., app.js)
// async function subscribeToPush() {
//   // Step 1: Get Service Worker registration
//   const registration = await navigator.serviceWorker.ready;

//   // Step 2: Subscribe to push notifications
//   const subscription = await registration.pushManager.subscribe({
//     userVisibleOnly: true,
//     applicationServerKey: "BFPFkVqWUS4mX-O--KPP3jzy1xyi1pHFREawLt7R9Md2kZpTj8vvbyo9XWE-RIgnsL22pTSpqoX4gOAOsm5flJQ", // Replace with your public key
//   });

//   // Step 3: Save subscription to Supabase
//   const { error } = await supabase
//     .from('users')
//     .update({ 
//       push_subscription: JSON.stringify(subscription) // Save as JSON string
//     })
//     .eq('id', localStorage.getItem("user_id")); // Replace with your user ID logic

//   if (error) {
//     console.error("Supabase save error:", error);
//   } else {
//     console.log("Subscription saved to Supabase!");
//   }
// }

// // // Example: Send subscription to your backend
// // function sendSubscriptionToServer(subscription) {
// //   fetch("/save-subscription", {
// //     method: "POST",
// //     body: JSON.stringify(subscription),
// //     headers: {
// //       "Content-Type": "application/json",
// //     },
// //   });
// // }

//     // ✅ Enable Foreground Notifications
//     onMessage(messaging, (payload) => {
//       console.log("🔥 Foreground message received:", payload);
//       alert(`🔔 New Notification: ${payload.notification.title}`);
//     });

//   }, []);

//   useEffect(() => {
//     const checkSession = async () => {
//       const { data: { session } } = await supabase.auth.getSession();
//       if (session?.user) {
//         setUser(session.user); // Re-populate Zustand if needed
//       }
//     };

//     checkSession();
//   }, []);

//   useEffect(() => {
//     // Initial session restore
//     useAuthStore.getState().restoreSession();

//     // Auth state listener
//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange((_event, session) => {
//       setUser(session?.user ?? null);
//     });

//     return () => {
//       subscription.unsubscribe();
//     };
//   }, []);


//   //   return (
//   //       <Router>
//   //           <Routes>
//   //               <Route path="/login" element={<Login />} />
//   //               <Route path="/admin" element={
//   //                   <PrivateRoute adminOnly>
//   //                       <AttendanceProvider>
//   //                           <AdminPage />
//   //                       </AttendanceProvider>
//   //                   </PrivateRoute>
//   //               } />

//   //               <Route path="/" element={
//   //                   <PrivateRoute>
//   //                       <EmployeeLayout />
//   //                   </PrivateRoute>
//   //               }>
//   //                   <Route index element={<Dashboard />} />
//   //                   <Route path="attendance" element={<Attendance />} />
//   //                   <Route path="leave" element={<Leave />} />
//   //                   <Route path="tasks" element={<Tasks />} />
//   //                   <Route path="software-complaint" element={<SoftwareComplaintSection />} />
//   //                   <Route path="office-complaint" element={<OfficeComplaintSection />} />
//   //                   <Route path="leaveRequests" element={<LeaveRequestsAdmin />} />
//   //                   <Route path="overtime" element={<ExtraHours />} />
//   //               </Route>

//   //               <Route path="*" element={<Navigate to="/login" replace />} />
//   //           </Routes>
//   //       </Router>
//   //   );
//   // }



//   return (
//     <Router>
//       <Chatlayout><Chatbutton></Chatbutton></Chatlayout>
//       <Routes>
//         {/* Public Route: Login */}
//         <Route path="/login" element={<Login />} />

//         {/* Widget Demo Route */}
//         <Route path="/widget-demo" element={<WidgetDemo />} />

//         {/* Admin Route (Protected) */}
//         <Route
//           path="/admin"
//           element={
//             <PrivateRoute adminOnly>
//               <AttendanceProvider>
//                 <AdminPage />
//               </AttendanceProvider>
//             </PrivateRoute>
//           }
//         />

//         {/* Employee Routes (Protected & Nested under EmployeeLayout) */}
//         <Route
//           path="/"
//           element={
//             <PrivateRoute>
//               <EmployeeLayout />
//             </PrivateRoute>
//           }
//         >
//           <Route index element={<Dashboard />} />
//           <Route path="attendance" element={<Attendance />} />
//           <Route path="leave" element={<Leave />} />
//           <Route path="tasks" element={<Tasks />} />
//           <Route path="software-complaint" element={<SoftwareComplaintSection />} />
//           <Route path="office-complaint" element={<OfficeComplaintSection />} />
//           <Route path="leaveRequests" element={<LeaveRequestsAdmin />} />
//           <Route path="overtime" element={<ExtraHours />} />
//           <Route path="salary-breakdown" element={<SalaryBreakdown />} />
//           <Route path="board/:id" element={<TaskBoard />} />
//           <Route path="profile" element={<ProfileCard />} />
//           <Route path='chat' element={<ChatSidebar/>}></Route>
//           <Route path="chat/:id" element={<Chat />} />
//         </Route>

//         {/* Redirect unknown routes to login */}
//         <Route path="*" element={<Navigate to="/login" replace />} />
//       </Routes>
//     </Router>
//   );
// }

// export default App;



import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './lib/store';
import EmployeeLayout from './components/EmployeeLayout';
import Login from './pages/Login';
import { supabase } from './lib/supabase';
import Dashboard from './pages/Dashboard';
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
import { getMessaging, onMessage } from "firebase/messaging";
import { initializeApp } from "firebase/app";
import { messaging } from "../notifications/firebase";
import { AttendanceProvider } from './pages/AttendanceContext';
import { Toaster } from "./component/ui/toaster";
import { Toaster as Sonner } from "./component/ui/sonner";
import { TooltipProvider } from "./component/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from './pages/Index';
import AddNewTask from './AddNewTask';
import Chatbutton from './components/chatbtn';
import ChatSidebar from './components/chat';
import Chat from './components/personchat';
import Chatlayout from './components/chatlayout';
import Adminroute from './components/adminroute';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './lib/AuthProvider';
import { UserProvider } from './contexts/UserContext';
import ClientDashboard from './components/ClientDashboard';
import DashboardLoyout from './components/DashboardLoyout';



function App() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Initialize chat state
  const [chatperson, setchatperson] = useState<boolean>(false);
  const [selecteduser, setselecteduser] = useState<null | string>(null);
  const [ischatopen, setischatopen] = useState<boolean>(false);

  const openchatperson = (id: string) => {
    setselecteduser(id);
    setchatperson(true);
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
        applicationServerKey: "BFPFkVqWUS4mX-O--KPP3jzy1xyi1pHFREawLt7R9Md2kZpTj8vvbyo9XWE-RIgnsL22pTSpqoX4gOAOsm5flJQ"
      });

      // Save to Supabase
      const { error } = await supabase
        .from('users')
        .update({ push_subscription: subscription })
        .eq('id', user?.id);

      if (!error) console.log('Subscription saved!');
    }
  };



  return (
    <AuthProvider>
      <UserProvider>
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
                  <ChatSidebar closechat={closeChat} openchatperson={openchatperson} />
                </div>
              </div>
            )}
          </AnimatePresence>
          {chatperson && <Chat id={selecteduser} closechatperson={closechatperson} />}
          {!ischatopen && <Chatlayout><Chatbutton openchat={openChat} /></Chatlayout>}

          {/* App Routes */}
          <Routes>
        {/* Public Route: Login */}
        <Route path="/login" element={<Login />} />

        {/* Widget Demo Route */}
        <Route path="/widget-demo" element={<WidgetDemo />} />


        {/* Admin Route (Protected) */}
        <Route
          path="/admin"
          element={
            <PrivateRoute adminOnly>
              <AttendanceProvider>

                <Adminroute><AdminPage /></Adminroute>
              </AttendanceProvider>
            </PrivateRoute>
          }
        />

        {/* Employee Routes (Protected & Nested under EmployeeLayout) */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <EmployeeLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardLoyout />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="leave" element={<Leave />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="software-complaint" element={<SoftwareComplaintSection />} />
          <Route path="office-complaint" element={<OfficeComplaintSection />} />
          <Route path="leaveRequests" element={<LeaveRequestsAdmin />} />
          <Route path="overtime" element={<ExtraHours />} />
          <Route path="salary-breakdown" element={<SalaryBreakdown />} />
          <Route path="board/:id" element={<TaskBoard />} />
          <Route path="profile" element={<ProfileCard />} />
          <Route path="dailylogs" element={<DailyLogs />} />
          <Route path='chat' element={<ChatSidebar />}></Route>
          <Route path="chat/:id" element={<Chat />} />
          {/* <Route path='client-dashboard' element={<ClientDashboard/>} */}

        </Route>

            {/* Redirect unknown routes to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </UserProvider>
    </AuthProvider>
  );
}

const PrivateRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly
}) => {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default App;