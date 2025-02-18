import React, { useState, useEffect } from 'react';
import { Menu } from "lucide-react"; // Icons from Lucide React (or use any icon library)
import { useAuthStore } from '../lib/store';
import LeaveRequestsAdmin from './LeaveRequestsAdmin';
import AbsenteeComponentAdmin from './AbsenteeDataAdmin';



import {
  ShieldCheck,
  LogOut,
  BarChart,
  Coffee
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  isWeekend,
  eachDayOfInterval
} from 'date-fns';
import AbsenteeComponent from './AbsenteesData';
import { id } from 'date-fns/locale/id';

interface AttendanceRecord {
  id: string;
  check_in: string;
  check_out: string | null;
  work_mode: 'on_site' | 'remote';
  status: string;
  latitude: number;
  longitude: number;
}

interface BreakRecord {
  start_time: string;
  end_time: string | null;
  status: string | null;
}

interface MonthlyStats {
  totalWorkingDays: number;
  presentDays: number;
  lateDays: number;
  onSiteDays: number;
  remoteDays: number;
  averageWorkHours: number;
  expectedWorkingDays: number;
}
interface SoftwareComplaint {
  id: number;
  complaint_text: string;
  created_at: string;
  user_id:string;
}

const AdminPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<string>('Employees');
  const [employees, setEmployees] = useState<any[]>([]);
  const [officeComplaints, setofficeComplaints] = useState<any[]>([]);
  const [softwareComplaints, setsoftwareComplaints] = useState<SoftwareComplaint[]>([]);
  // const [softwarePendingComplaints, setsoftwarePendingComplaints] = useState<any[]>([]);
  // const [softwareResolvedComplaints, setsoftwareResolvedComplaints] = useState<any[]>([]);
  // const [officePendingComplaints, setsofficePedingComplaints] = useState<any[]>([]);
  // const [officeResolvedComplaints, setofficeResolvedComplaints] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [employeeTasks, setEmployeeTasks] = useState<any[]>([]);
  const [todayBreak, setTodayBreak] = useState<BreakRecord[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const user = useAuthStore((state) => state.user);
  const [leaveRequests , setleaveRequests] = useState(false)
  const [PendingLeaveRequests , setPendingLeaveRequests] = useState<any[]>([]);
  const setUser = useAuthStore((state) => state.setUser);
  const [userID , setUserID] = useState<string>('');
  
  


  
  
  // const [selectedTab, setSelectedTab] = useState("");
//Checking For Session Expiry 
  useEffect(() => {
    const checksession = () => {
      const sessionsExpiry = localStorage.getItem('sessionExpiresAt');
      if (sessionsExpiry && Date.now() >= Number(sessionsExpiry)) {
        handleSignOut();
      }
    }
    checksession();
    const interval = setInterval(checksession, 4 * 60 * 1000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [navigate]);


 //Checking Resposive Screen Size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 795);
    };

    // Initial check
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const fetchPendingCount = async () => {
      const { count, error } = await supabase
        .from("leave_requests")
        .select("*", { count: "exact", head: true }) // Fetch count only
        .eq("status", "pending");

      if (error) {
        console.error("Error fetching count:", error);
      } else {
        setPendingLeaveRequests(count || 0); // Ensure count is not null     
           
      }
    };

    fetchPendingCount();
  }, []); // Empty dependency array ensures it runs once on mount


  

  //Fetching Software Complaints From Database

    const fetchsoftwareComplaints = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
        .from('software_complaints')
        .select('*, users:users(email, full_name)') // Join users table
        .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        if (data) {
          console.log("Complaints Data are: ",data);
          setsoftwareComplaints(data);
          
          
        }
        console.log("officeComplaints : ", officeComplaints);

      } catch (err) {
        console.error('Error fetching complaints:', err);
        // setError(err instanceof Error ? err.message : 'Failed to fetch complaints');
      } finally {
        setLoading(false);
      }
    };
  const handleSoftwareComplaintsClick = () => {
    fetchsoftwareComplaints();
   }

   


     //Fetching Office Complaints From Database
     const fetchofficeComplaints = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
        .from('office_complaints')
        .select('*, users:users(email, full_name)') // Join users table
        .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        if (data) {
          console.log("Complaints Data are: ",data);
          setofficeComplaints(data);
          
          
        }
        // console.log("softwareComplaints : ", softwareComplaints);

      } catch (err) {
        console.error('Error fetching complaints:', err);
        // setError(err instanceof Error ? err.message : 'Failed to fetch complaints');
      } finally {
        setLoading(false);
      }
    };
  const handleOfficeComplaintsClick = () => {
    fetchofficeComplaints();
   }




  // Fetch employees when the "Employees" tab is active.
  useEffect(() => {
    if (selectedTab === 'Employees') {
      const fetchEmployees = async () => {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name');
        if (error) {
          console.error('Error fetching employees:', error.message);
        } else {
          setEmployees(data || []);
        }
      };
      fetchEmployees();
    }
  }, [selectedTab]);

  const handleSignOut = async () => {
    setUser(null)
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/login');
  };

  const calculateDuration = (start: string, end: string | null) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const diffInMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const getTotalBreakDuration = () => {
    let totalMinutes = 0;
    todayBreak.forEach(breakRecord => {
      if (breakRecord.end_time) {
        const start = new Date(breakRecord.start_time);
        const end = new Date(breakRecord.end_time);
        totalMinutes += Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }
    });
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return totalMinutes > 0 ? `${hours}h ${minutes}m` : '0h 0m';
  };
  
  const handleEmployeeClick = async (id: string) => {
    setLoading(true);
    try {
      // Fetch employee details.
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      if (userError) throw userError;
      setSelectedEmployee(userData);
      setUserID(id);

      // Define today's date range.
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      // console.log('startOfDay:', startOfDay, 'endOfDay:', endOfDay);

      // Fetch today's attendance based on check_in time.
      const { data: todayAttendance, error: attendanceError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', id)
        .gte('check_in', startOfDay.toISOString())
        .lte('check_in', endOfDay.toISOString())
        .order('check_in', { ascending: false })
        .limit(1)
        .single();
      // console.log('todayAttendance:', todayAttendance);

      if (attendanceError && attendanceError.code !== 'PGRST116') throw attendanceError;
      
      if (todayAttendance) {
        setAttendanceLogs([todayAttendance]);

        // Fetch break records associated with today's attendance.
        const { data: breakData, error: breakError } = await supabase
          .from('breaks')
          .select('*')
          .eq('attendance_id', todayAttendance.id)
          .order('start_time', { ascending: true });
        if (breakError) throw breakError;
        setTodayBreak(breakData || []);
      } else {
        setAttendanceLogs([]);
        setTodayBreak([]);
      }

      
      // Calculate monthly statistics.
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);

      const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const workingDaysInMonth = allDaysInMonth.filter(date => !isWeekend(date)).length;
      

      const { data: monthlyAttendance, error: monthlyError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', id)
        .gte('check_in', monthStart.toISOString())
        .lte('check_in', monthEnd.toISOString())
        .order('check_in', { ascending: true });

      if (monthlyError) throw monthlyError;

      if (monthlyAttendance) {
        // Group attendance by day (taking the earliest record for each day).
        const attendanceByDate = monthlyAttendance.reduce((acc, curr) => {
          const date = format(new Date(curr.check_in), 'yyyy-MM-dd');
          if (!acc[date] || new Date(curr.check_in) < new Date(acc[date].check_in)) {
            acc[date] = curr;
          }
          return acc;
        }, {} as Record<string, AttendanceRecord>);

        const uniqueAttendance: AttendanceRecord[] = Object.values(attendanceByDate);
      

     
      //Below commented Code is the test Code for the purpose of counting Duplicate Checkin Entries


      // if (monthlyAttendance) {
      //   // Group attendance by day, allowing duplicates (all records for the same date will be stored).
      //   const attendanceByDate = monthlyAttendance.reduce((acc, curr) => {
      //     const date = format(new Date(curr.check_in), 'yyyy-MM-dd');
          
      //     // If the date is already present, add the current record to the array
      //     if (acc[date]) {
      //       acc[date].push(curr);
      //     } else {
      //       // If the date is not present, initialize it with an array containing the current record
      //       acc[date] = [curr];
      //     }
          
      //     return acc;
      //   }, {} as Record<string, AttendanceRecord[]>);
      
      //   // Convert the accumulator object into an array of attendance records
      //   const uniqueAttendance: AttendanceRecord[] = Object.values(attendanceByDate).flat();
      
      


        let totalHours = 0;
        uniqueAttendance.forEach(attendance => {
          const start = new Date(attendance.check_in);
          const end = attendance.check_out ? new Date(attendance.check_out) : new Date();
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          totalHours += Math.min(hours, 24);
        });
        

        setMonthlyStats({
          expectedWorkingDays: workingDaysInMonth,
          totalWorkingDays: uniqueAttendance.length,
          presentDays: uniqueAttendance.filter((a) => a.status === 'present').length,
          lateDays: uniqueAttendance.filter((a) => a.status === 'late').length,
          onSiteDays: uniqueAttendance.filter(a => a.work_mode === 'on_site').length,
          remoteDays: uniqueAttendance.filter(a => a.work_mode === 'remote').length,
          averageWorkHours: uniqueAttendance.length ? totalHours / uniqueAttendance.length : 0
        });
        
      } else {
        setMonthlyStats(null);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };



  // if (loading) return <div>Loading complaints...</div>;
  if (error) return <div>Error: {error}</div>;
  return (
    <div className="min-h-screen bg-gray-100 flex overflow-hidden ">
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar Space Filler */}
      <div className="bg-white w-64 p-4 shadow-lg h-full hidden lg:block"></div>

      {/* Menu Button (For Small Screens) */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white shadow-md rounded-md"
        onClick={() => setIsOpen((prev) => !prev)}
        >
        <Menu size={24} />
      </button>

      {/* Overlay (Only for Small Screens when Sidebar is Open) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Sidebar (Fixed) */}
      <div
        className={`bg-white w-64 p-4 shadow-lg fixed left-0 top-0 bottom-0 transform transition-transform duration-300 ease-in-out 
        ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >

        {/* Logo */}
        <div className="mb-4 flex justify-center">
          <ShieldCheck className="w-16 h-16 text-blue-600" />
        </div>

        {/* Sidebar Buttons */}
        <div className="space-y-4">
          <button
            onClick={() => {setSelectedTab("Employees")
              setShowEmployeeList(!showEmployeeList); // Toggle employee list visibility
            }}
            className={`w-full text-left p-2 rounded ${
              selectedTab === "Employees"
                ? "bg-blue-100 text-blue-600"
                : "text-gray-700 hover:bg-gray-200"
            }`}
          >
            Employees
          </button>
          {/* Employee List (Mobile) */}
          {isSmallScreen && showEmployeeList && (
          <div className="mt-2 bg-white rounded-lg shadow-md max-h-[300px] overflow-y-auto custom-scrollbar">
            <ul className="space-y-2 p-2">
              {employees.map((employee) => (
                <li
                  key={employee.id}
                  onClick={() => {handleEmployeeClick(employee.id)

                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedEmployee?.id === employee.id
                      ? "bg-blue-100 text-blue-600 "
                      : "hover:bg-gray-100"
                  }`}
                >
                  {employee.full_name}
                </li>
              ))}
            </ul>
          </div>
        )}

          <button
            onClick={() => {
              setSelectedTab("OfficeComplaints");
              handleOfficeComplaintsClick();
              setIsOpen(false);
            }}
            className={`w-full text-left p-2 rounded ${
              selectedTab === "OfficeComplaints"
                ? "bg-blue-100 text-blue-600"
                : "text-gray-700 hover:bg-gray-200"
            }`}
          >
            Office Complaints
          </button>

          <button
            onClick={() => {
              setSelectedTab("SoftwareComplaints");
              handleSoftwareComplaintsClick();
              setIsOpen(false);
            }}
            className={`w-full text-left p-2 rounded ${
              selectedTab === "SoftwareComplaints"
                ? "bg-blue-100 text-blue-600"
                : "text-gray-700 hover:bg-gray-200"
            }`}
          >
            Software Complaints
          </button>

          <button
            onClick={() => {
              setSelectedTab("leaveRequests");
              setIsOpen(false);
            }}
            className={`w-full text-left p-2 rounded ${
              selectedTab === "leaveRequests"
                ? "bg-blue-100 text-blue-600"
                : "text-gray-700 hover:bg-gray-200"
            }`}
          >
            Leave Requests
            {PendingLeaveRequests > 0 && (
              <span className="bg-blue-500 text-white rounded-full px-3 pb-[2px] ml-4 text-md">
                {PendingLeaveRequests}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              handleSignOut();
              setIsOpen(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </div>
    </div>

      
      {/* Main Content */}
      {selectedTab === 'Employees' && (
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-4">
          Admin Dashboard
        </h1>

        <div className="grid grid-cols-4 gap-6">
          {/* Employee List Disktop*/}
          {!isSmallScreen && (
          <div className="col-span-1 ">
            <h2 className="text-xl font-semibold mb-4">Employee List</h2>
            <ul className="space-y-2 max-h-[500px] overflow-y-auto rounded-lg pr-2.5 custom-scrollbar">
              {employees.map((employee) => (
                <li
                  key={employee.id}
                  onClick={() => handleEmployeeClick(employee.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedEmployee?.id === employee.id
                      ? "bg-blue-100 text-blue-600 hover:bg-gray-50"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {employee.full_name}
                </li>
              ))}
            </ul>
          </div>
        )}

          {/* Employee Dashboard */}
          {selectedEmployee && (
            <div className=" col-span-12 sm:col-span-4 md:col-span-3 lg:col-span-3">
              <div className="bg-gray-100 rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">
                    {selectedEmployee.full_name}'s Dashboard
                  </h2>
                  <p className="text-gray-600">
                    {format(new Date(), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    {/* Today's Status */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-3">Today's Status</h3>
                        {attendanceLogs[0] ? (
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span>Check-in:</span>
                              <span>{format(new Date(attendanceLogs[0].check_in), 'h:mm a')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Check-out:</span>
                              <span>
                                {attendanceLogs[0].check_out
                                  ? format(new Date(attendanceLogs[0].check_out), 'h:mm a')
                                  : 'Not checked out'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Work Mode:</span>
                              <span className={`px-2 py-1 rounded-full text-sm ${
                                attendanceLogs[0].work_mode === 'on_site'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {attendanceLogs[0].work_mode}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Duration:</span>
                              <span>
                                {calculateDuration(attendanceLogs[0].check_in, attendanceLogs[0].check_out)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500">No attendance record for today</p>
                        )}
                      </div>

                       {/* Break Summary */}
                       <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-3">Break Records</h3>
                        {todayBreak.length > 0 ? (
                          todayBreak.map((breakItem, index) => (
                            <div key={index} className="space-y-3">
                              <div className="flex justify-between">
                                <span>Start:</span>
                                <span>{format(new Date(breakItem.start_time), 'hh:mm a')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>End:</span>
                                <span>{breakItem.end_time ? format(new Date(breakItem.end_time), 'hh:mm a') : 'Ongoing'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Status:</span>
                                <span>{breakItem.status || 'N/A'}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500">No break records for today</p>
                        )}


              </div>
                    </div>

                    {/* Monthly Overview */}
                    {monthlyStats && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-3">Monthly Overview</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Attendance</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Expected Days:</span>
                                <span>{monthlyStats.expectedWorkingDays}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Days Attended:</span>
                                <span className="font-medium">{monthlyStats.totalWorkingDays}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Present Days:</span>
                                <span className="text-green-600">{monthlyStats.presentDays}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Late Days:</span>
                                <span className="text-yellow-600">{monthlyStats.lateDays}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Work Mode</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>On-site:</span>
                                <span>{monthlyStats.onSiteDays}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Remote:</span>
                                <span>{monthlyStats.remoteDays}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Work Hours</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Average Daily:</span>
                                <span>{monthlyStats.averageWorkHours.toFixed(1)}h</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Hours:</span>
                                <span>
                                  {(monthlyStats.averageWorkHours * monthlyStats.totalWorkingDays).toFixed(1)}h
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Optional: Additional Tasks or Overview */}
                    <div className="mt-6">
                      <div className="lg:col-span-3 bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center mb-6">
                          <BarChart className="w-6 h-6 text-blue-600 mr-2" />
                          <h2 className="text-xl font-semibold">Monthly Overview - {format(new Date(), 'MMMM yyyy')}</h2>
                        </div>

                        {monthlyStats ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gray-50 rounded-lg p-4">
                              <h3 className="text-sm font-medium text-gray-500 mb-3">Attendance Summary</h3>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">Expected Working Days:</span>
                                  <span className="font-medium">{monthlyStats.expectedWorkingDays}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">Days Attended:</span>
                                  <span className="font-medium">{monthlyStats.totalWorkingDays}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">Present Days:</span>
                                  <span className="font-medium text-green-600">{monthlyStats.presentDays}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">Late Days:</span>
                                  <span className="font-medium text-yellow-600">{monthlyStats.lateDays}</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                              <h3 className="text-sm font-medium text-gray-500 mb-3">Work Mode Distribution</h3>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">On-site Days:</span>
                                  <span className="font-medium text-blue-600">{monthlyStats.onSiteDays}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">Remote Days:</span>
                                  <span className="font-medium text-purple-600">{monthlyStats.remoteDays}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">Attendance Rate:</span>
                                  <span className="font-medium">
                                    {((monthlyStats.totalWorkingDays / monthlyStats.expectedWorkingDays) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                              <h3 className="text-sm font-medium text-gray-500 mb-3">Work Hours</h3>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">Average Daily Hours:</span>
                                  <span className="font-medium">
                                    {monthlyStats.averageWorkHours.toFixed(1)}h
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">Total Hours:</span>
                                  <span className="font-medium">
                                    {(monthlyStats.averageWorkHours * monthlyStats.totalWorkingDays).toFixed(1)}h
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">Expected Hours:</span>
                                  <span className="font-medium">
                                    {(8 * monthlyStats.expectedWorkingDays)}h
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            No attendance records found for this month
                          </div>
                        )}
                      </div>
                    </div>
                    <div className='mt-5'>
                      <AbsenteeComponentAdmin userID={userID} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

 {/* These two components Shows a Bar For Pending Complaints And Resolved Complaints */}
{/* {selectedTab === 'OfficeComplaints' && (

  <div className="flex-1 p-8">
    <h1 className="text-3xl font-bold text-center text-gray-900 mb-4">
        Admin Dashboard
      </h1>

      <div className="grid grid-cols-4 gap-5">
        <div className="col-span-1">
          <h2 className="text-xl font-semibold mb-6">Office Complaints</h2>
          <div className="space-y-4">
            <div>
            
              <h3 onClick={() => setSelectedTab('officePendingComplaints')}
              className={`w-full text-left p-2 rounded ${
              selectedTab === 'officePendingComplaints'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-700 hover:bg-gray-200'
                 }`}>Pending Complaints</h3>
            </div>
           <div >
              <h3  onClick={() => setSelectedTab('officeResolvedComplaints')} 
              className={`w-full text-left p-2 rounded ${
              selectedTab === 'officeResolvedComplaints'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-700 hover:bg-gray-200'
                 }`}>Resolved Complaints</h3>
            </div>
          </div>
        </div>
        </div>
      </div>
      )}
      */}


{/* Test Complaints Showing
     {selectedTab === "officePendingComplaints" && (
        <div className="bg-white rounded-2xl shadow-md p-6 mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">
            Office Pending Complaints
          </h1>

          <div className="space-y-4">
            {complaints.map((complaint) => (
              <div key={complaint.id} className="bg-gray-100 p-4 rounded-lg">
                <p className="text-lg font-semibold text-gray-800">
                  Complaint By: {complaint.complainant}
                </p>
                <p className="text-sm text-gray-600">{complaint.timestamp}</p>
                <p className="text-gray-700 mt-2">{complaint.description}</p>
              </div>
            ))}
          </div>
        </div>
      )} */}

{/* 
{selectedTab === 'SoftwareComplaints' && (
  <div className="flex-1 p-8">
    <h1 className="text-3xl font-bold text-center text-gray-900 mb-4">
      Admin Dashboard
    </h1>

    <div className="grid grid-cols-4 gap-5">
      <div className="col-span-1">
        <div >
          <h2 className="text-xl font-semibold mb-6">Software Complaints</h2>
          <div className="space-y-4">
            <div>
              <h3
                onClick={() => setSelectedTab('softwarePendingComplaints')}
                className={`w-full text-left p-2 rounded ${
                  selectedTab === 'softwarePendingComplaints'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending Complaints
              </h3>
            </div>
            <div>
              <h3
                onClick={() => setSelectedTab('softwareResolvedComplaints')}
                className={`w-full text-left p-2 rounded ${
                  selectedTab === 'softwareResolvedComplaints'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                Resolved Complaints
              </h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)} */}

   {selectedTab === 'SoftwareComplaints' && (
      <div className="flex-1 p-8">
      <h1 className="text-3xl font-bold text-center text-gray-900 mb-6">
        Admin Dashboard
      </h1>

      <div className="bg-white shadow-lg rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Software Complaints</h2>
        {softwareComplaints.length === 0 ? (
          <p className="text-gray-600 text-center">No complaints found.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {softwareComplaints.map((softwareComplaints, index) => (
              <div key={index} className="bg-gray-100 p-4 rounded-lg shadow">
                {/* <h3 className="text-lg font-medium text-gray-900">{softwareComplaints.title}</h3> */}
                <p className="text-15px text-gray-700 mt-1">{softwareComplaints.complaint_text}</p>
                <p className="text-17px text-gray-800 mt-3">By : {softwareComplaints.users?.full_name || 'Unknown'}</p>
                <p className="text-17px text-gray-800 mt-0.6"> {new Date(softwareComplaints.created_at).toLocaleString('en-US', {
                                   year: 'numeric',
                                   month: 'short', // "Feb"
                                   day: 'numeric',
                                   hour: '2-digit',
                                   minute: '2-digit',
                                   hour12: true, // AM/PM format
                                 })}                               </p>
                <span
                  className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded ${
                    softwareComplaints.status === "Pending"
                      ? "bg-yellow-300 text-yellow-800"
                      : "bg-green-300 text-green-800"
                  }`}
                >
                  {softwareComplaints.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
   )}

     
      {selectedTab === 'OfficeComplaints' && (
      <div className="flex-1 p-8">
      <h1 className="text-3xl font-bold text-center text-gray-900 mb-6">
        Admin Dashboard
      </h1>

      <div className="bg-white shadow-lg rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Office Complaints</h2>
        {officeComplaints.length === 0 ? (
          <p className="text-gray-600 text-center">No complaints found.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {officeComplaints.map((officeComplaints, index) => (
              <div key={index} className="bg-gray-100 p-4 rounded-lg shadow">
                {/* <h3 className="text-lg font-medium text-gray-900">{officeComplaints.title}</h3> */}
                <p className="text-15px text-gray-700 mt-1">{officeComplaints.complaint_text}</p>
                <p className="text-17px text-gray-900 mt-3">By : {officeComplaints.users?.full_name || 'Unknown'}</p>
                <p className="text-17px text-gray-900 mt-0.6"> {new Date(officeComplaints.created_at).toLocaleString('en-US', {
                                year: 'numeric',
                                 month: 'short', // "Feb"
                                 day: 'numeric',
                                 hour: '2-digit',
                                 minute: '2-digit',
                                 hour12: true, // AM/PM format
                               })}</p>
                <span
                  className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded ${
                    officeComplaints.status === "Pending"
                      ? "bg-yellow-300 text-yellow-800"
                      : "bg-green-300 text-green-800"
                  }`}
                >
                  {officeComplaints.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
   )}
      {selectedTab === 'leaveRequests' && (
      <div className="flex-1 p-8">
      <h1 className="text-3xl font-bold text-center text-gray-900 mb-6">
        Admin Dashboard
      </h1>

      <div className="bg-white shadow-lg rounded-2xl p-6">
        <LeaveRequestsAdmin/>
      </div>
    </div>
   )}


    </div>
  );
};

export default AdminPage;