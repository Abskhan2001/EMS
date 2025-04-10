import React, { useState, useEffect, useCallback } from 'react';
import { Menu } from "lucide-react"; // Icons from Lucide React (or use any icon library)
import { useAuthStore } from '../lib/store';
import LeaveRequestsAdmin from './LeaveRequestsAdmin';
import AbsenteeComponentAdmin from './AbsenteeDataAdmin';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import EmployeeAttendanceTable from './ListViewOfEmployees';
import ListViewMonthly from './ListViewMonthly';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Trash2 } from 'lucide-react';
import { motion } from "framer-motion";
import EmployeesDetails from './EmployeesDetails';
import ProjectsAdmin from '../components/ProjectsAdmin';
import "./style.css";
import { useRef } from 'react';
import {
  ShieldCheck,
  LogOut,
  PanelLeftClose,} from "lucide-react";
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
import {
  PanelRightClose,
  Coffee
} from 'lucide-react';
import { error } from 'console';

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
  user_id: string;
}

const AdminPage: React.FC = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  const childRef = useRef<{ handleEmployeeClick: (id: string) => void }>(null);

  // Button click handler
  // const handleEmployeeSelection = (id: string) => {
  //   setSelectedEmployeeId(id); // Update parent state
  //   if (childRef.current) {
  //     childRef.current.handleEmployeeClick(id); // Update child
  //   }
  // };
  const handleEmployeeSelection = (id: string) => {
    setSelectedEmployeeId(id);
  };

  const [selectedTab, setSelectedTab] = useState<string>('ListView');
  const [employees, setEmployees] = useState<any[]>([]);
  const [officeComplaints, setofficeComplaints] = useState<any[]>([]);
  const [softwareComplaints, setsoftwareComplaints] = useState<SoftwareComplaint[]>([]);
  const [sideOpen, setSideOpen] = useState(false);
  const [employeeListOpen, setEmployeeListOpen] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedEmployeeid, setSelectedEmployeeid] = useState<any>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [employeeTasks, setEmployeeTasks] = useState<any[]>([]);
  const [todayBreak, setTodayBreak] = useState<BreakRecord[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const user = useAuthStore((state) => state.user);
  const [leaveRequests, setleaveRequests] = useState(false)
  const [PendingLeaveRequests, setPendingLeaveRequests] = useState<any[]>([]);
  const setUser = useAuthStore((state) => state.setUser);
  const [absentees, setabsentees] = useState('')
  const [leaves, setleaves] = useState('')
  const [userID, setUserID] = useState<string>('');
  const [employeeStats, setEmployeeStats] = useState<Record<string, number>>({});
  const [graphicview, setgraphicview] = useState(false);
  const [tableData, setTableData] = useState('');
  const [breaks, setbreak] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date()); // Default to current date
  const [sideopen, setsideopen] = useState(false);
  const [permanentopen, setPermanentopen] = useState(true);
  // console.log("isopen" , isOpen);
  console.log("permanentopen", permanentopen);




  useEffect(() => {
    // Show sidebar when mouse moves to the left edge
    const handleMouseMove = (e) => {
      if (e.clientX < 50) {
        setsideopen(true);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleClose = () => {
    setsideopen(false);
  };
  const handleOpen = () => {
    setsideopen(true);
  };



  // useEffect(() => {
  //   const checksession = () => {
  //     const sessionsExpiry = localStorage.getItem('sessionExpiresAt');
  //     if (sessionsExpiry && Date.now() >= Number(sessionsExpiry)) {
  //       handleSignOut();
  //     }
  //   }
  //   checksession();
  //   const interval = setInterval(checksession, 4 * 60 * 1000); // Check every 30 seconds
  //   return () => clearInterval(interval);
  // }, [navigate]);


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


  // Fetching the pending Leave Requests Count
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

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  useEffect(() => {
    fetchPendingCount();
  }, [userID]); // Empty dependency array ensures it runs once on mount


  useEffect(() => {
    if (selectedTab === "Employees") {
      const fetchleaves = async () => {
        const { count, error } = await supabase
          .from("absentees")
          .select("*", { count: "exact", head: true })
          .eq('user_id', userID)
          .eq('absentee_type', "leave")
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        if (error) {
          console.log("Error Fetching Absentees Count", error);
        } else {
          console.log("absentees Count :", count);
          setleaves(count || 0)
        }
      }
      fetchleaves();
    }
  }, [userID])


  useEffect(() => {
    if (selectedTab === "Employees") {
      const fetchabsentees = async () => {
        const { count, error } = await supabase
          .from("absentees")
          .select("*", { count: "exact", head: true })
          .eq('user_id', userID)
          .eq('absentee_type', "Absent")
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());
        if (error) {
          console.error("Error Fetching Absentees Count", error);
        } else {
          console.log("absentees Count :", count);
          setabsentees(count || 0)
        }
      }
      fetchabsentees();
    }
  }, [userID])





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
        console.log("Complaints Data are: ", data);
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
        console.log("Complaints Data are: ", data);
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



  useEffect(() => {
    const fetching = async () => {
      try {
        // Fetch employees from the database
        const { data: employees, error: employeesError } = await supabase
          .from("users")
          .select("id, full_name")
        //  .not('full_name', 'in', '("Admin")')
        //  .not('full_name', 'in', '("saud")');

        if (employeesError) throw employeesError;
        if (!employees || employees.length === 0) {
          console.warn("No employees found.");
          return;
        }

        // Update state with the fetched employees
        setEmployees(employees);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };

    fetching(); // Call the async function

  }, [selectedTab]); // Empty dependency array to run only on mount












  useEffect(() => {
    if (selectedTab === "Employees") {
      const fetchEmployees = async () => {
        try {
          // Fetch all employees except excluded ones
          const { data: employees, error: employeesError } = await supabase
            .from("users")
            .select("id, full_name")

          if (employeesError) throw employeesError;
          if (!employees || employees.length === 0) {
            console.warn("No employees found.");
            return;
          }

          setEmployees(employees);

          // handleEmployeeClick(employees[0].id);

          const today = new Date();
          const monthStart = startOfMonth(today);
          const monthEnd = endOfMonth(today);

          const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
          const workingDaysInMonth = allDaysInMonth.filter(date => !isWeekend(date)).length;

          // Fetch all attendance logs for all employees in one query
          const { data: attendanceLogs, error: attendanceError } = await supabase
            .from("attendance_logs")
            .select("id, user_id, check_in, check_out")
            .gte("check_in", monthStart.toISOString())
            .lte("check_in", monthEnd.toISOString())
            .order("check_in", { ascending: true });

          if (attendanceError) throw attendanceError;

          // Process data to compute stats for each employee
          const employeeStats = {};

          employees.forEach(employee => {
            const employeeLogs = attendanceLogs.filter(log => log.user_id === employee.id);

            // Group attendance by date (earliest record per day)
            const attendanceByDate = employeeLogs.reduce((acc, curr) => {
              const date = format(new Date(curr.check_in), "yyyy-MM-dd");
              if (!acc[date] || new Date(curr.check_in) < new Date(acc[date].check_in)) {
                acc[date] = curr;
              }
              return acc;
            }, {});

            const uniqueAttendance = Object.values(attendanceByDate);

            let totalHours = 0;
            uniqueAttendance.forEach(attendance => {
              const start = new Date(attendance.check_in);
              const end = attendance.check_out ? new Date(attendance.check_out) : new Date();
              const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
              totalHours += Math.min(hours, 12);
            });

            // Store stats for each employee
            employeeStats[employee.id] = uniqueAttendance.length
              ? totalHours / uniqueAttendance.length
              : 0;
          });

          setEmployeeStats(employeeStats);
          console.log("Employee Stats:", employeeStats);

        } catch (error) {
          console.error("Error fetching employees and stats:", error);
        }
      };

      fetchEmployees();
    }
  }, [userID, selectedTab]);


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


  if (error) return <div>Error: {error}</div>;

  const GraphicViewComponent = ({ selectedEmployee, tableData, attendanceLogs, monthlyStats }) => {


    if (!selectedEmployee) return null;


    // Data for Graphs
    const chartData = [
      { name: "On-site", value: monthlyStats?.onSiteDays || 0 },
      { name: "Remote", value: monthlyStats?.remoteDays || 0 },
    ];
    const colors = ["#4A90E2", "#9B59B6"];



    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mt-6 w-full max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">{selectedEmployee.full_name}'s Dashboard</h2>

        {/* Graphical View */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Pie Chart */}
          <div className="w-full bg-gray-100 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Work Mode Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="w-full bg-gray-100 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Attendance Overview</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#4A90E2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table View */}
        <div className="w-full bg-white p-4 rounded-lg shadow-md overflow-x-auto">
          <h3 className="text-lg font-semibold mb-3">Attendance Records</h3>
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                {['Date', 'Check-in', 'Check-out', 'Work Mode'].map((header, idx) => (
                  <th key={idx} className="border p-2">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.length > 0 ? (
                tableData.map(({ id, check_in, check_out, work_mode }) => {
                  return (
                    <tr key={id} className="text-center border-b">
                      {/* Format Date */}
                      <td className="border p-2">{new Date(check_in).toLocaleDateString()}</td>
                      {/* Format Time */}
                      <td className="border p-2">{new Date(check_in).toLocaleTimeString()}</td>
                      <td className="border p-2">{check_out ? new Date(check_out).toLocaleTimeString() : "N/A"}</td>
                      <td className="border p-2">{work_mode}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-gray-500">
                    No attendance records available.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>
    );
  };





  const handleEmployeeDelete = async (userID) => {
    const isConfirmed = window.confirm("Are you sure you want to delete this user?");

    if (!isConfirmed) return; // If user cancels, do nothing

    const { error } = await supabase.from("users").delete().eq("id", userID);

    if (error) {
      console.error("Error deleting user:", error.message);
      alert("Failed to delete user!"); // Simple error alert
    } else {
      console.log("User deleted successfully!");
      alert("User deleted successfully!");
    }
  };



















  return (

    <>
      <div className="min-h-screen bg-gray-100 flex overflow-hidden ">
        <div className='flex flex-col'>
          <PanelRightClose className={`${permanentopen ? "hidden" : "display-block"} 
        box-border-2 border-gray-300 rounded-full  m-2 fixed top-2 left-[-20px] z-40  size-[50px] p-3 text-[#7e26b8] hover:bg-gray-200 shadow-lg cursor-pointer `}
            onClick={() => setPermanentopen(true)}
          />
          <div className="min-h-screen bg-gray-100 flex">
            {/* <motion.div
              className="fixed top-0 left-0 h-full w-64 bb-white text-white shadow-lg p-4 z-20"
              initial={{ x: "-100%" }}
              animate={{ 
                x: permanentopen ? "0%" : (isOpen ? "0%" : "-100%")
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }} // Smooth transition
              onMouseEnter={() => setIsOpen(!isOpen)}
              onMouseLeave={() => {
                setIsOpen(!isOpen);
                if (!permanentopen) {
                  handleClose();
                }
              }}
            > */}

            <motion.div
              className="fixed top-0 left-0 h-full w-64 bb-white text-white shadow-lg p-4 z-20"
              initial={{ x: "-100%" }}
              animate={{
                x: permanentopen ? "0%" : "-100%"
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }} // Smooth transition
              onMouseLeave={() => {
                if (!permanentopen) {
                  handleClose();
                }
              }}
            >




              {/* Sidebar Space Filler */}
              {/* <div className="bg-white w-64 p-4 shadow-lg h-full hidden lg:block"></div> */}

              {/* Menu Button (For Small Screens) */}
              <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white shadow-md rounded-md"
              >
                <Menu size={24} />
              </button>

              {/* Overlay (Only for Small Screens when Sidebar is Open) */}


              {/* Sidebar (Fixed) */}
              <div
                className={`bg-black w-64 p-4 shadow-lg fixed left-0 top-0 bottom-0 transform transition-transform duration-300 ease-in-out
  ${permanentopen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 h-screen flex flex-col`}
              >

                {/* Logo */}
                <div className="mb-8 flex justify-between items-center">

                  <h1 className='font-semibold text-[26px]'>Talent Sync</h1>
                  <PanelRightClose className={`${permanentopen ? "hidden" : "display-block"}`}
                    onClick={() => setPermanentopen(true)}
                  />
                  <PanelLeftClose className={`${permanentopen ? "display-block" : "hidden"}`}
                    onClick={() => setPermanentopen(false)}
                  />
                </div>

                {/* Sidebar Buttons Container (Ensures Space Between) */}
                <div className="flex flex-col flex-grow justify-between">
                  <div className="space-y-4">

                    <button
                      onClick={() => {
                        setSelectedTab("ListView");
                        setShowEmployeeList(!showEmployeeList);
                        handleClose()
                        setEmployeeListOpen(true)
                        // setListView(!ListView);
                      }}
                      className={`w-full text-left p-2 rounded ${selectedTab === "ListView"
                        ? "bg-[#9A00FF] text-White"
                        : "text-white hover:bg-[#9A00FF]"
                        ///////////////
                        }`}
                    >
                      Dashboard
                    </button>

                    <button
                      onClick={() => {
                        setSelectedTab("EmployeesDetails");
                        // setShowEmployeeList(!showEmployeeList);
                        handleClose()
                      }}
                      className={`w-full text-left p-2 rounded ${selectedTab === "Employees"
                        ? "bg-[#9A00FF] text-White"
                        : "text-white hover:bg-[#9A00FF]"
                        }`}
                    >
                      Employees
                    </button>

                    {/* Employee List (Mobile) */}
                    {/* {isSmallScreen && showEmployeeList && (
        <div className="mt-2 bg-white rounded-lg shadow-md max-h-[300px] overflow-y-auto custom-scrollbar">
          <ul className="space-y-2 p-2">
      {employees.map((employee) => (
        <li
          key={employee.id}
          onClick={() => {
            setEmployeeListOpen(false);
            handleEmployeeSelection(employee.id)
            // handleEmployeeClick(employee.id);
            handleClose();
            childRef.current?.handleEmployeeClick(employee.id);
          }}
          className={`p-3 text-sm rounded-lg cursor-pointer transition-colors ${
            selectedEmployee?.id === employee.id
              ? "bg-[#9A00FF] text-white hover:bg-[#9A00FF]"
              : "hover:bg-[#9A00FF]"
          }`}
        >
          {employee.full_name}
        </li>
      ))}
      <EmployeeAttendanceTable
        ref={childRef}
        selectedEmployeeId={selectedEmployeeId}
        onEmployeeSelect={handleEmployeeSelection}/>
    </ul>
        </div>
      )} */}

                    <button
                      onClick={() => {
                        setSelectedTab("Projects");
                        // setShowEmployeeList(!showEmployeeList);
                        handleClose()
                      }}
                      className={`w-full text-left p-2 rounded ${selectedTab === "Projects"
                        ? "bg-[#9A00FF] text-White"
                        : "text-white hover:bg-[#9A00FF]"
                        }`}
                    >
                      Projects
                    </button>


                    <button
                      onClick={() => {
                        handleClose()
                        setSelectedTab("OfficeComplaints");
                        handleOfficeComplaintsClick();
                      }}
                      className={`w-full text-left p-2 rounded ${selectedTab === "OfficeComplaints"
                        ? "bg-[#9A00FF] text-White"
                        : "text-white hover:bg-[#9A00FF]"
                        }`}
                    >
                      Office Complaints
                    </button>

                    <button
                      onClick={() => {
                        handleClose()
                        setSelectedTab("SoftwareComplaints");
                        handleSoftwareComplaintsClick();
                      }}
                      className={`w-full text-left p-2 rounded ${selectedTab === "SoftwareComplaints"
                        ? "bg-[#9A00FF] text-White"
                        : "text-white hover:bg-[#9A00FF]"
                        }`}
                    >
                      Software Complaints
                    </button>

                    <button
                      onClick={() => {
                        handleClose();
                        setSelectedTab("leaveRequests");
                      }}
                      className={`w-full text-left p-2 rounded ${selectedTab === "leaveRequests"
                        ? "bg-[#9A00FF] text-White"
                        : "text-white hover:bg-[#9A00FF]"
                        }`}
                    >
                      Leave Requests
                      {PendingLeaveRequests > 0 && (
                        <span className="bg-blue-500 text-white rounded-full px-3 pb-[2px] ml-4 text-md">
                          {PendingLeaveRequests}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Sign Out Button (Placed at the Bottom) */}
                  <div>
                    <button
                      onClick={() => {
                        handleSignOut();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      Sign Out
                    </button>
                  </div>
                  {/* Employee List (Slide-In on Hover) */}
                  {/* <motion.div
                className="fixed top-0 left-64 h-full  w-[200px] bg-[#191616] shadow-lg p-1 z-20 overflow-y-auto ease-in-out custom-scrollbar"
                initial={{ x: "-300%" }}
                animate={{ x: employeeListOpen ? "0%" : "-300%" }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                // onMouseEnter={() => setEmployeeListOpen(true)}
                // onMouseLeave={() => setEmployeeListOpen(false)}
              >
                <h2 className='p-2 pt-10 justify-center font-semibold text-[20px]'>Employee List</h2>
                <ul className="space-y-2 p-2" ref={childRef}>
      {employees.map((employee) => (
        <li
          key={employee.id}
          onClick={() => {
            setEmployeeListOpen(false);
            handleEmployeeSelection(employee.id)
            handleClose();
            childRef.current?.handleEmployeeClick(employee.id);
          }}
          className={`p-3 text-sm rounded-lg cursor-pointer transition-colors ${
            selectedEmployee?.id === employee.id
              ? "bg-[#9A00FF] text-white hover:bg-[#9A00FF]"
              : "hover:bg-[#9A00FF]"
          }`}
        >
          {employee.full_name}
        </li>
      ))}
 <EmployeeAttendanceTable
        ref={childRef}
        selectedEmployeeId={selectedEmployeeId}
        onEmployeeSelect={handleEmployeeSelection}/>    </ul>
              </motion.div> */}
                </div>
              </div>
            </motion.div>

            <div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {selectedTab === "ListView" && (
          <div className={`flex-1 py-10 transition-all duration-300 ${permanentopen ? 'ml-64' : 'ml-0'}`}>
            <EmployeeAttendanceTable />
          </div>
        )}
        {selectedTab === "EmployeesDetails" && (
          <div className={`flex-1 transition-all duration-300 ${permanentopen ? 'ml-64' : 'ml-0'}`}>
            <EmployeesDetails selectedTab={selectedTab} />
          </div>
        )}
        {selectedTab === "Projects" && (
          <div className={`flex-1 py-10 px-10 transition-all duration-300 ${permanentopen ? 'ml-64' : 'ml-0'}`}>
            <ProjectsAdmin />
          </div>
        )}
        {selectedTab === 'Employees' && (
          <div className={`flex-1 px-20 py-8 transition-all duration-300 ${permanentopen ? 'ml-64' : 'ml-0'}`}>
            <div className='flex flex-row justify-between px-10'>
              <div></div>
              <h1 className="text-3xl font-bold text-center text-gray-900 mb-4">
                Admin Dashboard
              </h1>
              <div className='flex gap-1'>
                <button className='bg-white rounded-lg px-3 py-2 hover:bg-gray-200'
                  onClick={() => { setgraphicview(true) }}>Graphic View</button>
                <button className='bg-white rounded-lg px-3 py-2 hover:bg-gray-200'
                  onClick={() => { setgraphicview(false) }}>General View</button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-6">
              {/* Employee List Disktop*/}
              {!isSmallScreen && (
                <div className="col-span-1 ">
                  <h2 className="text-xl font-semibold mb-4">Employee List</h2>
                  <ul className="space-y-2 max-h-[500px] overflow-y-auto rounded-lg pr-2.5 custom-scrollbar">
                    {employees.map((employee) => (
                      <li
                        key={employee.id}
                        // onClick={() => handleEmployeeClick(employee.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedEmployee?.id === employee.id
                          ? "bg-blue-100 text-blue-600 hover:bg-gray-50"
                          : "hover:bg-gray-100"
                          } ${employeeStats[employee.id] < 6 ? "text-red-600" : ""}`} // Apply red color if hours < 7
                      >
                        <div className='flex justify-between'>
                          {employee.full_name}
                          <button className='hover:bg-gray-300 transition-all ease-in-out px-3 py-1 rounded-xl' onClick={(e) => {
                            e.stopPropagation();
                            handleEmployeeDelete(employee.id)
                          }}>
                            <Trash2 />
                          </button>
                        </div>

                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedEmployee && graphicview && (
                <div className='w-full max-w-5xl mx-auto'>
                  <GraphicViewComponent
                    selectedEmployee={selectedEmployee}
                    attendanceLogs={attendanceLogs}
                    monthlyStats={monthlyStats}
                    tableData={tableData}
                  />
                </div>
              )}
              {/* Employee Dashboard */}
              {selectedEmployee && !graphicview && (
                <div className=" col-span-12 sm:col-span-4 md:col-span-2 lg:col-span-3 max-w-5xl mx-auto">
                  <div className="bg-gray-100 rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold">
                        {selectedEmployee.full_name}'s Dashboard
                      </h2>
                      <div >
                        <p className="text-gray-600">
                          {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                        </p>

                      </div>
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
                                  <span className={`px-2 py-1 rounded-full text-sm ${attendanceLogs[0].work_mode === 'on_site'
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
                                    <div className="flex justify-between text-gray-600">
                                      <span>Absentees:</span>
                                      <span className="text-red-600">{absentees || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                      <span>Leaves:</span>
                                      <span className="text-green-600">{leaves || 0}</span>
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
                                        {(6 * monthlyStats.expectedWorkingDays)}h
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


        {selectedTab === 'SoftwareComplaints' && (
          <div className={`flex-1 px-10 py-8 transition-all duration-300 ${permanentopen ? 'ml-64' : 'ml-0'}`}>
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
                        className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded ${softwareComplaints.status === "Pending"
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
          <div className={`flex-1 px-10 py-8 transition-all duration-300 ease-in-out ${permanentopen ? 'ml-64' : 'ml-0'}`}>
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
                        className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded ${officeComplaints.status === "Pending"
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
          <div className={`flex-1 px-10 py-8 transition-all ease-in-out duration-300 ${permanentopen ? 'ml-64' : 'ml-0'}`}>
            <h1 className="text-3xl font-bold text-center text-gray-900 mb-6">
              Admin Dashboard
            </h1>

            <div className="bg-white shadow-lg rounded-2xl p-6">
              <LeaveRequestsAdmin fetchPendingCount={fetchPendingCount} />
            </div>
          </div>
        )}


      </div>
    </>
  );
};

export default AdminPage;
