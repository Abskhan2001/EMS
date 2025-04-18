import React, { useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import EmployeeMonthlyAttendanceTable from "./ListViewMonthly";
import { useAuthStore } from '../lib/store';
import EmployeeWeeklyAttendanceTable from "./ListViewWeekly";
import { ChevronLeft, ChevronRight, SearchIcon } from "lucide-react"; // Assuming you're using Lucide icons
import { format, parse, isAfter, addMonths, addWeeks } from "date-fns"; // Import the format function
import { DownloadIcon } from "lucide-react";
import { AttendanceContext } from "./AttendanceContext";
import "./style.css"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Trash2 } from 'lucide-react';
import { forwardRef, useImperativeHandle } from "react";
import "./style.css";
import { useNavigate } from 'react-router-dom';
import AbsenteeComponentAdmin from "./AbsenteeDataAdmin";
import {
  startOfMonth,
  endOfMonth,
  isWeekend,
  eachDayOfInterval
} from 'date-fns';
import { AttendanceProvider } from "./AttendanceContext";
import FilteredDataAdmin from "./filteredListAdmin";
import { id } from "date-fns/locale/id";

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
// const EmployeeAttendanceTable = forwardRef(
//   ({
//   selectedEmployeeId,
//   onEmployeeSelect
// }, ref) => {
//   // onEmployeeSelect(id); // Already updates parent state
//   useImperativeHandle(ref, () => ({
//     handleEmployeeClick: (id: string) => {
//       console.log("id:", id);

//       // Your existing employee click logic here
//       handleEmployeeClick(id); 
//       // onEmployeeSelect(id); // Update parent's state
//     }
//   })
// );
const EmployeeAttendanceTable = () => {



  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]); // Filtered data for display
  const [error, setError] = useState(null);
  const [absent, setAbsent] = useState(0);
  const [present, setPresent] = useState(0);
  const [DataEmployee, setDataEmployee] = useState(null);
  const [late, setLate] = useState(0);
  const [remote, setRemote] = useState(0); // State for remote employees count
  // const [selectedTab, setSelectedTab] = useState("Daily");
  const [selectedDate, setSelectedDate] = useState(new Date()); // Default to current date
  const [loading, setLoading] = useState(true);
  const [selectedDateM, setselectedDateM] = useState(new Date());
  const [selectedDateW, setselectedDateW] = useState(new Date());
  const [currentFilter, setCurrentFilter] = useState("all"); // Filter state: "all", "present", "absent", "late", "remote"
  const [dataFromWeeklyChild, setDataFromWeeklyChild] = useState("");
  const [selectedEntry, setSelectedEntry] = useState(null);
  // const [newCheckOutTime, setNewCheckOutTime] = useState('00 : 00');
  const [hour, setHour] = useState(12);  // Default hour
  const [minute, setMinute] = useState(0);  // Default minute
  const [isAM, setIsAM] = useState(true);  // AM/PM toggle
  const [updatedCheckOutTime, setupdatedCheckOutTime] = useState('')
  const [isCheckinModalOpen, setisCheckinModalOpen] = useState(false);
  // const [newCheckInTime, setNewCheckInTime] = useState('00 : 00');
  const [hourin, setHourin] = useState(12);  // Default hour
  const [minutein, setMinutein] = useState(0);  // Default minute
  const [isinAM, setIsinAM] = useState(true);  // AM/PM toggle
  const [updatedCheckInTime, setupdatedCheckInTime] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  // const [formattedDate2, setformattedDate2] = useState('');
  const [startdate, setStartdate] = useState('');
  const [enddate, setEnddate] = useState('');
  const [search, setsearch] = useState(false);
  const [isModeOpen, setisModeOpen] = useState(false);
  const [WorkMode, setWorkMode] = useState('selectedEntry.work_mode');
  const [timestamp, settimestamp] = useState(new Date().toISOString().replace('T', ' ').split('.')[0] + '.000+00');
  const [maintab, setmaintab] = useState("TableView");
  const [selectedTab, setSelectedTab] = useState<string>('Daily');
  const [employees, setEmployees] = useState<any[]>([]);
  const [officeComplaints, setofficeComplaints] = useState<any[]>([]);
  const [softwareComplaints, setsoftwareComplaints] = useState<SoftwareComplaint[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedEmployeeid, setSelectedEmployeeid] = useState<any>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [todayBreak, setTodayBreak] = useState<BreakRecord[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [isOpen, setIsOpen] = useState(false);
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
  // const [selectedDate, setSelectedDate] = useState(new Date()); // Default to current date
  const [sideopen, setsideopen] = useState(false);
  //Firebase Notification permission

  // RequestPermission().then((token) => {
  //   if (token) {
  //     console.log("FCM Token:", token);
  //   }
  // });



  const { attendanceDataWeekly, attendanceDataMonthly } = useContext(AttendanceContext);

  
  const handleHourChange = (e) => {
    setHour(e.target.value);
  };

  const handleMinuteChange = (e) => {
    setMinute(e.target.value);
  };

  
  const toggleAMPM = () => {
    setIsAM(!isAM);
  };

  

  const handleCheckInHourChange = (e) => {
    setHourin(e.target.value);
  };

  const handleCheckInMinuteChange = (e) => {
    setMinutein(e.target.value);
  };
  const togglecheckinAMPM = () => {
    setIsinAM(!isinAM);
  };


  //Extracting Hours and Minuates From the previously saved Checkout Time
  const parseCheckOutTime = (checkOutTime) => {
    const regex = /(\d{2}):(\d{2})\s(AM|PM)/;
    const match = checkOutTime.match(regex);
    if (match) {
      const extractedHour = parseInt(match[1], 10);
      const extractedMinute = parseInt(match[2], 10);
      const extractedAMPM = match[3];

      setHour(extractedHour);
      setMinute(extractedMinute);
      setIsAM(extractedAMPM === 'AM');
    }
  };
  //Extracting Hours and Minuates From the previously saved Checkout Time
  const parseCheckInTime = (checkInTime) => {
    const regex = /(\d{2}):(\d{2})\s(AM|PM)/;
    const match = checkInTime.match(regex);
    if (match) {
      const extractedHourin = parseInt(match[1], 10);
      const extractedMinutein = parseInt(match[2], 10);
      const extractedAMPMin = match[3];

      setHourin(extractedHourin);
      setMinutein(extractedMinutein);
      setIsinAM(extractedAMPMin === 'AM');
    }
  };
  // Open modal and set the selected entry and default time
  const handleCheckinOpenModal = (entry) => {
    setSelectedEntry(entry);
    parseCheckInTime(entry.check_in)
    // setNewCheckInTime(entry.check_in || ''); // Set default time
    setisCheckinModalOpen(true);

  };

  // Open modal and set the selected entry and default time
  const handleOpenModal = (entry) => {
    console.log("entry", entry);
    setSelectedEntry(entry);
    parseCheckOutTime(entry.check_out)
    // setNewCheckOutTime(entry.check_out || ''); // Set default time
    setIsModalOpen(true);

  };

  // const handleUpdateCheckInTime = async () => {
  //   console.log("selectedEntry.check_out2:", selectedEntry.check_out2);

  //   // Format hour and minute to two digits
  //   const formattedHourin = hourin < 10 ? `0${hourin}` : hourin;
  //   const formattedMinutein = minutein < 10 ? `0${minutein}` : minutein;

  //   // Decode the encoded string (if coming from URL/query param)
  //   const decodedDateString = decodeURIComponent(selectedEntry.check_out2);

  //   // Parse the date (local time) or default to today if invalid
  //   let originalDate = decodedDateString && decodedDateString !== "N/A"
  //     ? new Date(decodedDateString)
  //     : new Date();

  //   // Convert to UTC format "YYYY-MM-DD"
  //   const formattedUTC = originalDate.toISOString().split("T")[0];

  //   console.log("FormattedUTCCCCCCCCCC Date:", formattedUTC);

  //   // Check for invalid date format
  //   if (isNaN(originalDate.getTime())) {
  //     console.error("Invalid check-out date:", selectedEntry.check_out2);
  //     alert("Error: Invalid check-out date format.");
  //     return;
  //   }

  //   // Convert hour to 24-hour format if PM
  //   const adjustedHourin = isinAM
  //     ? parseInt(formattedHourin, 10)
  //     : (parseInt(formattedHourin, 10) + 12) % 24;

  //   // Construct new date with adjusted time
  //   const newDate = new Date(
  //     originalDate.getFullYear(),
  //     originalDate.getMonth(),
  //     originalDate.getDate(),
  //     adjustedHourin,
  //     parseInt(formattedMinutein, 10),
  //     0,
  //     0
  //   );

  //   // Format the final timestamp as "YYYY-MM-DD HH:mm:ss+00"
  //   const formattedTimestamp = newDate.toISOString().replace("T", " ").split(".")[0] + ".000+00";
  //   settimestamp(formattedTimestamp.split(" ")[0]); // Store only the date part

  //   console.log("Formatted Timestamp:", formattedTimestamp);

  //   // Compare against attendance time limit
  //   const now = new Date(formattedTimestamp);
  //   const checkInTimeLimit = parse("09:30", "HH:mm", now);
  //   const attendanceStatus = isAfter(now, checkInTimeLimit) ? "late" : "present";

  //   setupdatedCheckInTime(formattedTimestamp);
  //   console.log("Check-in Limit:", checkInTimeLimit);
  //   console.log("Attendance Status:", attendanceStatus);

  //   // Update the database by matching only the date
  //   const { data, error } = await supabase
  //     .from("attendance_logs")
  //     .update({
  //       check_in: formattedTimestamp,
  //       status: attendanceStatus,
  //     })
  //     .eq("user_id", selectedEntry.id)
  //     .eq("check_out", selectedEntry.check_out2);
  //   if (error) {
  //     console.error("Error updating check-in time:", error);
  //     alert("Failed to update check-in time.");
  //   } else {
  //     console.log("Update successful:", data);
  //     alert("Check-in time updated successfully.");
  //   }

  //   setisCheckinModalOpen(false);
  // };



  // const handleUpdateCheckInTime = async () => {
  //   console.log("selectedEntry.check_out2:", selectedEntry.check_out2);

  //   // Format hour and minute to ensure two digits
  //   const formattedHourin = hourin < 10 ? `0${hourin}` : hourin;
  //   const formattedMinutein = minutein < 10 ? `0${minutein}` : minutein;

  //   // Parse original date from selectedEntry.check_out2 or default to today
  //   let originalDate;
  //   if (selectedEntry.check_out2 && selectedEntry.check_out2 !== "N/A") {
  //     // Decode and parse the date string
  //     const decodedDateString = decodeURIComponent(selectedEntry.check_out2);
  //     originalDate = new Date(decodedDateString);
  //   } else {
  //     originalDate = new Date();
  //   }

  //   // Ensure originalDate is valid
  //   if (isNaN(originalDate.getTime())) {
  //     console.error("Invalid check-out date:", selectedEntry.check_out2);
  //     alert("Error: Invalid check-out date format.");
  //     return;
  //   }

  //   // Convert hour to 24-hour format if PM
  //   const adjustedHourin = isinAM
  //     ? parseInt(formattedHourin, 10)
  //     : (parseInt(formattedHourin, 10) + 12) % 24;

  //   // Construct new date with adjusted time
  //   const newDate = new Date(
  //     originalDate.getFullYear(),
  //     originalDate.getMonth(),
  //     originalDate.getDate(),
  //     adjustedHourin,
  //     parseInt(formattedMinutein, 10),
  //     0,
  //     0
  //   );

  //   // Convert to UTC ISO string and format as "YYYY-MM-DD HH:mm:ss+00"
  //   const formattedTimestamp = newDate.toISOString().replace("T", " ").split(".")[0] + ".000+00";
  //   settimestamp(formattedTimestamp.split(" ")[0]);

  //   console.log("Formatted Timestamp:", formattedTimestamp);

  //   // Compare against attendance time limit
  //   const now = new Date(formattedTimestamp);
  //   const checkInTimeLimit = parse("09:30", "HH:mm", now);
  //   const attendanceStatus = isAfter(now, checkInTimeLimit) ? "late" : "present";

  //   setupdatedCheckInTime(formattedTimestamp);

  //   console.log("Check-in Limit:", checkInTimeLimit);
  //   console.log("Attendance Status:", attendanceStatus);

  //   // Update database
  //   const { data, error } = await supabase
  //     .from("attendance_logs")
  //     .update({
  //       check_in: formattedTimestamp,
  //       // status: attendanceStatus,
  //     })
  //     .eq("user_id", selectedEntry.id)
  //     .eq("created_at::Date", originalDate.toISOString().split("T")[0]); // Match only the date

  //   if (error) {
  //     console.error("Error updating check-in time:", error);
  //     alert("Failed to update check-in time.");
  //   } else {
  //     console.log("Update successful:", data);
  //     alert("Check-in time updated successfully.");
  //   }

  //   setisCheckinModalOpen(false);
  // };

  const handleUpdateCheckInTime = async () => {
    // Get original created_at date
    // const originalDate = new Date(selectedEntry.created_at);
    // Original local date: Wed Apr 09 2025 09:36:43 GMT+0500
const originalDate = new Date(selectedEntry.created_at);

// Get UTC date components
const utcYear = originalDate.getUTCFullYear(); // 2025
const utcMonth = originalDate.getUTCMonth(); // 3 (April)
const utcDay = originalDate.getUTCDate(); // 9

// Construct UTC date string
const utcDateString = `${utcYear}-${String(utcMonth + 1).padStart(2, '0')}-${String(utcDay).padStart(2, '0')}`;
// Result: "2025-04-09"
    // Create new date in UTC
    const adjustedHourin = isinAM ? hourin : (hourin + 12) % 24;
    const newDate = new Date(Date.UTC(
      originalDate.getUTCFullYear(),
      originalDate.getUTCMonth(),
      originalDate.getUTCDate(),
      adjustedHourin,
      minutein
    ));
  
    // Format timestamp correctly
    const formattedTimestamp = newDate.toISOString().replace("T", " ").replace(/\.\d+Z$/, ".000+00");
  
    // Calculate status using UTC
    const checkInTimeLimit = new Date(Date.UTC(
      newDate.getUTCFullYear(),
      newDate.getUTCMonth(),
      newDate.getUTCDate(),
      9, 30 // 09:30 UTC
    ));
    
    const attendanceStatus = newDate > checkInTimeLimit ? "late" : "present";
    console.log("origional Date" , originalDate );

    console.log("origional Date in api" , utcDateString );
    
  
    // Update with correct filtering
    const { data , error } = await supabase
      .from("attendance_logs")
      .select ('*')
      // .update({
      //   check_in: formattedTimestamp,
      //   status: attendanceStatus
      // })
      // .eq("user_id", selectedEntry.id)
      .eq("created_at::date", utcDateString);
      console.log("Fetched Data " , data);
      
    if (!error) {
      alert("Updated successfully!");
      setisCheckinModalOpen(false);
    }
  };





  const handleCheckInCloseModal = () => {
    setisCheckinModalOpen(false);
  }




  const handleUpdateCheckOutTime = async () => {
    console.log("selectedEntry.check_in2:", selectedEntry.check_in2);

    // Format hour and minute to ensure two digits
    const formattedHour = hour < 10 ? `0${hour}` : hour;
    const formattedMinute = minute < 10 ? `0${minute}` : minute;

    // Extract the date from selectedEntry.check_in2
    let originalDate;
    if (selectedEntry.check_in2 === null || !selectedEntry.check_in2 || selectedEntry.check_in2 === "N/A") {
      originalDate = new Date();
    } else {
      originalDate = new Date(selectedEntry.check_in2);
    }

    // Ensure originalDate is valid
    if (isNaN(originalDate.getTime())) {
      console.error("Error: selectedEntry.check_in2 is not a valid date.");
      alert("Error: Invalid check-in date format.");
      return;
    }

    const year = originalDate.getFullYear();
    const month = originalDate.getMonth(); // Month is zero-indexed
    const day = originalDate.getDate();

    const year2 = new Date().getFullYear();
    const month2 = new Date().getMonth();
    const day2 = new Date().getDate();

    // Adjust for AM/PM (convert to 24-hour format if PM)
    let adjustedHour = isAM ? parseInt(formattedHour, 10) : (parseInt(formattedHour, 10) + 12) % 24;

    // Create a new Date object with the updated time but keeping the original date
    let formattedDate;
    if (selectedEntry.check_in2 === null) {
      formattedDate = new Date(year2, month2, day2, adjustedHour, parseInt(formattedMinute, 10), 0, 0);
    } else {
      formattedDate = new Date(year, month, day, adjustedHour, parseInt(formattedMinute, 10), 0, 0);
    }

    // Convert the Date object to the required format [YYYY-MM-DD HH:MM:SS.000+00]
    const timestamp = formattedDate.toISOString().replace('T', ' ').split('.')[0] + '.000+00';

    console.log("Selected time:", timestamp);

    // Assign the formatted time string to update state
    setupdatedCheckOutTime(timestamp);

    // Update the `check_out` field in the database
    const { data, error } = await supabase
      .from("attendance_logs")
      .update({ check_out: timestamp })  // Updating check_out with the new timestamp
      .eq("user_id", selectedEntry.id)  // Ensure correct entry by user_id
      .eq("check_in", selectedEntry.check_in2); // Match check_in for that specific date

    if (data) {
      console.log("Updated data:", data); // Log success
    }

    if (!error) {
      alert("Check-out time updated successfully.");
    } else {
      console.error("Error updating check-out time:", error);
    }

    // Close modal after update
    setIsModalOpen(false);
  };




  const handleCloseModal = () => {
    setIsModalOpen(false);
  }


  // function handleDataFromChild(attendanceDataWeekly) {
  //   console.log("Data received from child:", attendanceDataWeekly);
  //   setDataFromWeeklyChild(attendanceDataWeekly);
  // }
  const downloadPDF = async () => {
    try {
      const response = await fetch('http://localhost:4000/generate-pdfDaily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: attendanceData }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();

      if (blob.type !== "application/pdf") {
        throw new Error("Received incorrect file format");
      }

      const url = window.URL.createObjectURL(blob);
      const currentDate = new Date().toISOString().split('T')[0];
      const fileName = `attendance_${currentDate}.pdf`;

      // Create and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Open PDF manually
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  // Handle Month change (previous/next)
  const handleMonthChange = (direction) => {
    setselectedDateM((prevDate) =>
      direction === "prev" ? addMonths(prevDate, -1) : addMonths(prevDate, 1)
    );
  };




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



  //  useEffect(() => {
  //    const fetching = async () => {
  //      try {
  //        // Fetch employees from the database
  //        const { data: employees, error: employeesError } = await supabase
  //          .from("users")
  //          .select("id, full_name")
  //         //  .not('full_name', 'in', '("Admin")')
  //         //  .not('full_name', 'in', '("saud")');

  //        if (employeesError) throw employeesError;
  //        if (!employees || employees.length === 0) {
  //          console.warn("No employees found.");
  //          return;
  //        }

  //        // Update state with the fetched employees
  //        setEmployees(employees);
  //        if (DataEmployee === null || DataEmployee === undefined || DataEmployee === "") {
  //         setDataEmployee(employees[0].id);
  //         handleEmployeeClick();
  //       }

  //      } catch (error) {
  //        console.error("Error fetching employees:", error);
  //      }
  //    };

  //    fetching(); // Call the async function

  //  }, [userID]); // Empty dependency array to run only on mount



















  // if (selectedTab === "Employees") {
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

      // if (DataEmployee === null) {
      //   setDataEmployee(employees[0].id);
      //   handleEmployeeClick();
      // }


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

  useEffect(() => {
    fetchEmployees();
  }
    // }
    , [userID, selectedTab]);




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

  useEffect(() => {
    FetchSelectedAttendance(fetchingid);
  }, [selectedDate])


  const FetchSelectedAttendance = async (id) => {
    console.log("Selected ID is", id);
    setLoading(true);
    setAttendanceLogs([]);
    setTodayBreak([]);

    fetchEmployees();
    // const id = DataEmployee;
    try {
      // Fetch employee details.
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      if (userError) throw userError;
      setSelectedEmployee(userData);
      setSelectedEmployeeid(id)
      setUserID(id);

      // Define today's date range.
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      // console.log('startOfDay:', startOfDay, 'endOfDay:', endOfDay);


      const formatDateToUTC = (selectedDate) => {
        const date = new Date(selectedDate);
        return date.toISOString(); // Returns in UTC format
      };

      const formattedDate = formatDateToUTC(selectedDate);

      // Convert formattedDate to a Date object
      const parsedDate = new Date(formattedDate);

      // Extract year, month, and date in UTC
      const year = parsedDate.getUTCFullYear();
      const month = parsedDate.getUTCMonth();
      const day = parsedDate.getUTCDate();
      // const startOfDayFormat = new Date(Date.UTC(year, month, day - 1, 19, 0, 0, 0)).toISOString();
      // const endOfDayFormat = new Date(Date.UTC(year, month, day, 23, 59, 59, 0)).toISOString();
      const startOfDayFormat = new Date(Date.UTC(year, month, day, 0, 0, 0, 0)).toISOString(); // Start of same day
      const endOfDayFormat = new Date(Date.UTC(year, month, day, 23, 59, 59, 999)).toISOString(); // End of same day




      console.log("startOfDayFormat : ", startOfDayFormat);
      console.log("EndOfDayFormat : ", endOfDayFormat);


      // Fetch today's attendance based on check_in time.
      const { data: todayAttendance, error: attendanceError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', id)
        // .gte('check_in', startOfDay.toISOString())
        // .lte('check_in', endOfDay.toISOString())
        .gte('check_in', startOfDayFormat)
        .lte('check_in', endOfDayFormat)
        .order('check_in', { ascending: false })
        .limit(1)
        .single();
      console.log("selectedDate : ", selectedDate);

      console.log('todayAttendance:', todayAttendance);


      if (attendanceError && attendanceError.code !== 'PGRST116') {
        setTodayBreak([])
        throw attendanceError;
      }

      if (todayAttendance && todayAttendance.id !== null) {
        console.log("todayAttendance found:", todayAttendance);
        setAttendanceLogs([todayAttendance]);

        const { data: breakData, error: breakError } = await supabase
          .from('breaks')
          .select('*')
          .eq('attendance_id', todayAttendance.id)
          .order('start_time', { ascending: true });

        if (breakError) {
          console.error("Break fetch error:", breakError);
          throw breakError;
        }

        console.log("Fetched breaks:", breakData);
        setTodayBreak(Array.isArray(breakData) ? breakData : []);
      } else {
        console.log("No todayAttendance found, clearing break state", todayBreak);
        setAttendanceLogs([]);
        setTodayBreak([]);
      }



      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);


      const employeeid = id
      const fetchtableData = async () => {
        const { data, error } = await supabase
          .from("attendance_logs")
          .select("*")
          .eq("user_id", employeeid)
          .gte('check_in', monthStart.toISOString())
          .lte('check_in', monthEnd.toISOString())
          .order('check_in', { ascending: true });;

        if (error) {
          console.error("Error fetching data:", error);
          return;
        }

        setTableData(data); // Assuming setTableData is a state setter
        console.log("data of graphs", data);

      };

      fetchtableData();


      // Calculate monthly statistics.


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


        let totalHours = 0;

        uniqueAttendance.forEach(attendance => {
          const start = new Date(attendance.check_in);
          const end = attendance.check_out
            ? new Date(attendance.check_out)
            : new Date(start.getTime()); // Adds 4 hours
          // If an employee has no CheckOut, assign 4 working hours
          // const end = attendance.check_out 
          //   ? new Date(attendance.check_out) 
          //   : new Date(start.getTime() + 4 * 60 * 60 * 1000); // Adds 4 hours

          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          totalHours += Math.min(hours, 12);
        });

        // Fetch all breaks related to this attendance
        const { data: breaks, error: breaksError } = await supabase
          .from("breaks")
          .select("start_time, end_time")
          .in("attendance_id", uniqueAttendance.map(a => a.id));

        if (breaksError) throw breaksError;

        let totalBreakHours = 0;

        breaks.forEach(breakEntry => {
          const breakStart = new Date(breakEntry.start_time);
          const breakEnd = breakEntry.end_time
            ? new Date(breakEntry.end_time)
            : new Date(breakStart.getTime() + 1 * 60 * 60 * 1000); // Default 1-hour break

          const breakHours = (breakEnd - breakStart) / (1000 * 60 * 60);
          totalBreakHours += Math.min(breakHours, 12);
        });

        // Subtract break hours from total work hours
        totalHours -= totalBreakHours;

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
  }


  const handleEmployeeClick = async (id: any) => {
    FetchSelectedAttendance(id);
    setfetchingid(id);
  };
  // if (loading) return <div>Loading complaints...</div>;
  if (error) return <div>Error: {error}</div>;




  //Graph View Component
  const GraphicViewComponent = ({ selectedEmployee, tableData, attendanceLogs, monthlyStats }) => {
    if (!selectedEmployee) return null;


    // Data for Graphs
    const chartData = [
      { name: "On-site", value: monthlyStats?.onSiteDays || 0 },
      { name: "Remote", value: monthlyStats?.remoteDays || 0 },
    ];
    const colors = ["#4A90E2", "#9B59B6", ""];



    return (
      <div className=" bg-white rounded-lg shadow-lg p-6 mt-6 w-full">
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
          <table className="w-full border-collapse border border-gray-300">
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










  const handleModeOpen = (entry) => {
    setisModeOpen(true);
    setSelectedEntry(entry)
  }

  const handleModeModal = () => {
    setisModeOpen(false)
  }

  const handleUpdateMode = () => {
    const updateMode = async () => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .update({ work_mode: WorkMode })
        .eq("user_id", selectedEntry.id)
        .eq("check_in", selectedEntry.check_in2);

      if (data) {
        console.log("Updated data:", data); // Log success
      }

      if (!error) {
        alert("Work Mode updated successfully.");
      } else {
        console.error("Error updating Work Mode:", error);
      }
    }
    updateMode();
    setisModeOpen(false)
  }















  // const downloadPDFFiltered = async () => {   
  //   // if (!dataFromWeeklyChild || dataFromWeeklyChild.length === 0) {
  //   //   console.error("No data available to generate PDF");
  //   //   return;
  //   // } 
  //   try {
  //     const response = await fetch('http://localhost:4000/generate-Filtered', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ data: attendanceDataFiltered }),
  //     });

  //     if (!response.ok) {
  //       throw new Error('Failed to generate PDF');
  //     }

  //     const blob = await response.blob();

  //     if (blob.type !== "application/pdf") {
  //       throw new Error("Received incorrect file format");
  //     }

  //     const url = window.URL.createObjectURL(blob);
  //     const currentDate = new Date().toISOString().split('T')[0];
  //     const fileName = `attendance_${currentDate}.pdf`;

  //     // Create and trigger download
  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = fileName;
  //     document.body.appendChild(a);
  //     a.click();
  //     a.remove();

  //     // Open PDF manually
  //     window.open(url, '_blank');
  //   } catch (error) {
  //     console.error('Error downloading PDF:', error);
  //   }
  // };

















  const downloadPDFFiltered = async () => {
    // if (!dataFromWeeklyChild || dataFromWeeklyChild.length === 0) {
    //   console.error("No data available to generate PDF");
    //   return;
    // } 
    try {
      const response = await fetch('http://localhost:4000/generate-Filtered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: AttendanceDataFiltered }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();

      if (blob.type !== "application/pdf") {
        throw new Error("Received incorrect file format");
      }

      const url = window.URL.createObjectURL(blob);
      const currentDate = new Date().toISOString().split('T')[0];
      const fileName = `attendance_${currentDate}.pdf`;

      // Create and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Open PDF manually
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployeesearch, setDataEmployeesearch] = useState(null);

  const filteredEmployees = employees.filter(employee =>
    employee.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );







  const downloadPDFWeekly = async () => {
    // if (!dataFromWeeklyChild || dataFromWeeklyChild.length === 0) {
    //   console.error("No data available to generate PDF");
    //   return;
    // } 
    try {
      const response = await fetch('http://localhost:4000/generate-pdfWeekly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: attendanceDataWeekly }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();

      if (blob.type !== "application/pdf") {
        throw new Error("Received incorrect file format");
      }

      const url = window.URL.createObjectURL(blob);
      const currentDate = new Date().toISOString().split('T')[0];
      const fileName = `attendance_${currentDate}.pdf`;

      // Create and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Open PDF manually
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };



  const downloadPDFMonthly = async () => {
    // if (!dataFromWeeklyChild || dataFromWeeklyChild.length === 0) {
    //   console.error("No data available to generate PDF");
    //   return;
    // } 
    try {
      const response = await fetch('http://localhost:4000/generate-pdfMonthly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: attendanceDataMonthly }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();

      if (blob.type !== "application/pdf") {
        throw new Error("Received incorrect file format");
      }

      const url = window.URL.createObjectURL(blob);
      const currentDate = new Date().toISOString().split('T')[0];
      const fileName = `attendance_${currentDate}.pdf`;

      // Create and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Open PDF manually
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };



  // Handle week change (previous/next)
  const handleWeekChange = (direction) => {
    setselectedDateW((prevDate) =>
      direction === "prev" ? addWeeks(prevDate, -1) : addWeeks(prevDate, 1)
    );
  };

  useEffect(() => {
    fetchAttendanceData(selectedDate);
  }, [selectedDate]);

  // Fetch attendance data
  const fetchAttendanceData = async (date) => {
    setLoading(true);
    const formattedDate = date.toISOString().split("T")[0]; // YYYY-MM-DD format

    try {
      // Fetch all users
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, full_name")
        .neq("role", "admin");

      if (usersError) throw usersError;

      // Fetch attendance logs for the selected date
      const { data: attendanceLogs, error: attendanceError } = await supabase
        .from("attendance_logs")
        .select("user_id, check_in, check_out, work_mode, status, created_at , autocheckout")
        .gte("check_in", `${formattedDate}T00:00:00`)
        .lte("check_in", `${formattedDate}T23:59:59`);

      if (attendanceError) throw attendanceError;

      // Map attendance data by user_id
      const attendanceMap = new Map(attendanceLogs.map((log) => [log.user_id, log]));

      // Build final list with text colors
      const finalAttendanceData = users.map((user) => {
        const log = attendanceMap.get(user.id);
        const formatTime = (dateString) => {
          if (!dateString || dateString === "N/A") return "N/A";

          const date = new Date(dateString);
          return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true, // Ensures AM/PM format
          });
        };

        if (!log) {
          return {
            id: user.id,
            full_name: user.full_name,
            check_in: "N/A",
            check_in2: "N/A",
            created_at: "N/A",
            check_out2: "N/A",
            check_out: "N/A",
            autocheckout: "",
            work_mode: "N/A",
            status: "Absent",
            textColor: "text-red-500",
          };
        }

        return {
          id: user.id,
          full_name: user.full_name,
          check_in2: log.check_in ? log.check_in : "N/A",
          check_out2: log.check_out ? log.check_out : "",
          created_at: log.created_at ? log.created_at : "N/A",
          // created_at: log.created_at ?  new Date(log.created_at).toISOString().split('.')[0] + "+00:00" : "N/A",
          check_in: log.check_in ? formatTime(log.check_in) : "N/A",
          check_out: log.check_out ? formatTime(log.check_out) : "N/A",
          autocheckout: log.autocheckout || "",
          work_mode: log.work_mode || "N/A",
          status: log.status || "Absent",
          textColor:
            log.status.toLowerCase() === "present"
              ? "text-green-500"
              : log.status.toLowerCase() === "late"
                ? "text-yellow-500"
                : "text-red-500",
        };
      });

      setAttendanceData(finalAttendanceData);
      setFilteredData(finalAttendanceData); // Initialize filtered data with all data

      // Calculate counts
      const lateCount = finalAttendanceData.filter((entry) => entry.status.toLowerCase() === "late").length;
      setLate(lateCount);
      const presentCount = finalAttendanceData.filter((entry) => entry.status.toLowerCase() === "present").length;
      setPresent(presentCount);
      const absentCount = finalAttendanceData.filter((entry) => entry.status.toLowerCase() === "absent").length;
      setAbsent(absentCount);
      const remoteCount = finalAttendanceData.filter((entry) => entry.work_mode === "remote").length;
      setRemote(remoteCount);
    } catch (error) {
      setError(error.message);
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const [fetchingid, setfetchingid] = useState('')


  // Pakistan is in UTC+5, so add 5 hours to the UTC time
  const offset = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
  const pakistanTime = new Date(now.getTime() + offset);
  // Handle day change (previous/next)
  const handleDayChange = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === "prev" ? -1 : 1));
    setSelectedDate(newDate);
    // console.log("passing time : " , newDate);
    // console.log("pakistan time time : " , pakistanTime);
    if (DetailedVieww === true) {
      FetchSelectedAttendance(fetchingid)
    }
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    setCurrentFilter(filter);
    switch (filter) {
      case "all":
        setFilteredData(attendanceData);
        break;
      case "present":
        setFilteredData(attendanceData.filter((entry) => entry.status.toLowerCase() === "present"));
        break;
      case "absent":
        setFilteredData(attendanceData.filter((entry) => entry.status.toLowerCase() === "absent"));
        break;
      case "late":
        setFilteredData(attendanceData.filter((entry) => entry.status.toLowerCase() === "late"));
        break;
      case "remote":
        setFilteredData(attendanceData.filter((entry) => entry.work_mode === "remote"));
        break;
      default:
        setFilteredData(attendanceData);
    }
  };
  const handlenotification = () => {
    Notification.requestPermission()
      .then(() => {
        const notification = new Notification("Office Time Update", {
          body: "Please note that our office time is from 9:00 AM to 4:00 PM.",
          icon: "./efficiency.png"
        })
      })
  }

  const handleDateFilter = () => {
    setSelectedTab("Filter")
    setsearch((prev) => !prev)
  }

  //  const handletableview = () => {
  //   console.log("abc");


  //  }
  //  const handleDetailview = (y:any) => {
  //   setmaintab(y)
  //   console.log(y);
  //  }
  const [DetailedVieww, setDetailedVieww] = useState(false)
  const handleGraphicViewClick = () => {
    setgraphicview(true)
  }
  const handleDetailedViewClick = () => {
    setgraphicview(false)
    setDetailedVieww(true);
  }
  const handleTableViewClick = () => {
    setgraphicview(false)
  }



  return (
    <div className="flex flex-col justify-center items-center min-h-full min-w-full bg-gray-100 ">
      {/* Heading */}
      <div className=" w-full max-w-5xl justify-between items-center flex">
        {maintab === "TableView" && (
          <h1 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Employee Attendance
          </h1>
        )}
        {maintab === "DetailedView" && (
          <h1 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Employee Details
          </h1>
        )}
        {maintab === "GraphicView" && (
          <h1 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Graph Data
          </h1>
        )}
        <select
          className="p-2 mb-3 border border-gray-300 transition-all ease-in-out rounded-md focus:outline-none focus:ring-2 focus:ring-[#9A00FF] ml-10"
          onChange={(e) => {
            setmaintab(e.target.value);
            if (e.target.value === "GraphicView") {
              handleGraphicViewClick(); // Call the event for the third option
            }
            if (e.target.value === "DetailedView") {
              handleDetailedViewClick(); // Call the event for the third option
            }
            if (e.target.value === "TableView") {
              handleTableViewClick(); // Call the event for the third option
            }
          }}
        >
          <option value="TableView">Table View</option>
          <option value="DetailedView">Detailed View</option>
          <option value="GraphicView">Graphic View</option>
        </select>


      </div>
      {/* Buttons and Date Navigation */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-6">
        {/* Buttons Row */}
        {maintab === "DetailedView" && (
          <div></div>
        )}
        {maintab === "TableView" && (
          <div className="w-[40%] flex space-x-4">
            {/* <button
            onClick={() => handlenotification()}
            className={`px-4 py-2 rounded-lg transition-all ${
              selectedTab === "Daily"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            notify
          </button> */}
            <button
              onClick={() => setSelectedTab("Daily")}
              className={`px-4 py-2 rounded-lg transition-all ${selectedTab === "Daily"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
            >
              Daily
            </button>
            <button
              onClick={() => setSelectedTab("Weekly")}
              className={`px-4 py-2 rounded-lg transition-all ${selectedTab === "Weekly"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-200"
                }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setSelectedTab("Monthly")}
              className={`px-4 py-2 rounded-lg transition-all ${selectedTab === "Monthly"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-200"
                }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedTab("Filter")}
              className={`px-4 py-2 rounded-lg transition-all ${selectedTab === "Filter"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-200"
                }`}
            >
              Filter
            </button>
          </div>
        )}
        <div className="flex flex-row gap-5">
          {/* Date Navigation */}
          {maintab === "DetailedView" && (
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleDayChange("prev")}
                className="p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xl font-semibold">
                {format(selectedDate, "MMMM d, yyyy")}
              </span>
              <button
                onClick={() => handleDayChange("next")}
                className="p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}


          {maintab === "TableView" && selectedTab === "Daily" && (
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleDayChange("prev")}
                className="p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xl font-semibold">
                {format(selectedDate, "MMMM d, yyyy")}
              </span>
              <button
                onClick={() => handleDayChange("next")}
                className="p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
          {maintab === "TableView" && selectedTab === "Monthly" && (
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => handleMonthChange("prev")}
                className="p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="mx-4 text-xl font-semibold">
                {format(selectedDateM, "MMMM yyyy")}
              </span>
              <button
                onClick={() => handleMonthChange("next")}
                className="p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
          {maintab === "TableView" && selectedTab === "Weekly" && (
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => handleWeekChange("prev")}
                className="p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="mx-4 text-xl font-semibold">
                {format(selectedDateW, "MMMM yyyy")}
              </span>
              <button
                onClick={() => {
                  handleWeekChange("next")
                  // console.log("selectedDateW", selectedDateW);
                }}
                className="p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
          {maintab === "TableView" && selectedTab === "Filter" && (
            <div className="flex items-center justify-center space-x-4">
              {/* Date Range Inputs */}
              <input
                type="date"
                value={startdate} // State variable for the start date
                onChange={(e) => setStartdate(e.target.value)} // Update start date
                className="p-2 border ml-10 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="mx-2 text-xl font-semibold">to</span>
              <input
                type="date"
                value={enddate} // State variable for the end date
                onChange={(e) => setEnddate(e.target.value)} // Update end date
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Search Button */}
              <button
                onClick={() => {
                  // const enddate2 = endDate.toString() + "T23:59:59";
                  // console.log("Start Date:", startDate.toString() + "T00:00:00");
                  // console.log("End Date:", enddate2);
                  handleDateFilter()
                }}
                className="p-2 hover:bg-gray-300 rounded-2xl px-5 py-3 transition-all"
              >
                <SearchIcon className="w-5 h-5" />
              </button>
            </div>
          )}
          {maintab === "TableView" && selectedTab === "Daily" && (
            <button className="hover:bg-gray-300 px-6 py-2 rounded-2xl transition-all"
              onClick={downloadPDF}><DownloadIcon /> </button>
          )}
          {maintab === "TableView" && selectedTab === "Weekly" && (
            <button className="hover:bg-gray-300 px-6 py-2 rounded-2xl transition-all"
              onClick={async () => { await downloadPDFWeekly() }}><DownloadIcon /> </button>
          )}
          {maintab === "TableView" && selectedTab === "Monthly" && (
            <button className="hover:bg-gray-300 px-6 py-2 rounded-2xl transition-all"
              onClick={downloadPDFMonthly}><DownloadIcon /> </button>
          )}
          {maintab === "TableView" && selectedTab === "Filter" && (
            <button className="hover:bg-gray-300 px-6 py-2 rounded-2xl transition-all"
              onClick={downloadPDFFiltered}
            >
              <DownloadIcon /> </button>
          )}
        </div>
      </div>

      {/* Loading Animation */}
      {loading && (
        <div className="w-full max-w-5xl space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="w-full h-16 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Attendance Summary */}
      {!loading && maintab === "TableView" && selectedTab === "Daily" && (
        <>
          <div className="w-full max-w-5xl bg-white p-6 rounded-lg shadow-lg mb-6">
            <div className="flex justify-between items-center text-lg font-medium">
              <button
                onClick={() => handleFilterChange("all")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-3xl hover:bg-gray-200 transition-all ${currentFilter === "all" ? "bg-gray-200" : ""
                  }`}
              >
                <span className="w-4 h-4 bg-gray-600 rounded-full"></span>
                <h2 className="text-gray-600">
                  Total: <span className="font-bold">{present + absent + late}</span>
                </h2>
              </button>
              <button
                onClick={() => handleFilterChange("present")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-3xl hover:bg-green-100 transition-all${currentFilter === "present" ? "bg-green-200" : ""
                  }`}
              >
                <span className="w-4 h-4 bg-green-500 rounded-full"></span>
                <h2 className="text-green-600">
                  Present: <span className="font-bold">{present}</span>
                </h2>
              </button>
              <button
                onClick={() => handleFilterChange("absent")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-3xl hover:bg-red-100 transition-all${currentFilter === "absent" ? "bg-red-100" : ""
                  }`}
              >
                <span className="w-4 h-4 bg-red-500 rounded-full"></span>
                <h2 className="text-red-600">
                  Absent: <span className="font-bold">{absent}</span>
                </h2>
              </button>
              <button
                onClick={() => handleFilterChange("late")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-3xl hover:bg-yellow-200 transition-all${currentFilter === "late" ? "bg-yellow-100" : ""
                  }`}
              >
                <span className="w-4 h-4 bg-yellow-500 rounded-full"></span>
                <h2 className="text-yellow-600">
                  Late: <span className="font-bold">{late}</span>
                </h2>
              </button>
              <button
                onClick={() => handleFilterChange("remote")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-3xl hover:bg-purple-100 transition-all${currentFilter === "remote" ? "bg-purple-100" : ""
                  }`}
              >
                <span className="w-4 h-4 bg-purple-500 rounded-full"></span>
                <h2 className="text-purple-600">
                  Remote: <span className="font-bold">{remote}</span>
                </h2>
              </button>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="w-full max-w-5xl bg-white p-6 rounded-lg shadow-lg">
            {error && <p className="text-red-500 text-center">{error}</p>}
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50 text-gray-700 uppercase text-sm leading-normal">
                  <tr>
                    <th className="py-3 px-6 text-left">Employee Name</th>
                    <th className="py-3 px-6 text-left">Check-in</th>
                    <th className="py-3 px-6 text-left">Check-out</th>
                    <th className="py-3 px-6 text-left">Work Mode</th>
                    <th className="py-3 px-6 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="text-md font-normal">
                  {filteredData.map((entry, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-all">
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 ${entry.status === "present"
                              ? "text-green-600"
                              : entry.status === "late"
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                        >
                          {entry.full_name.charAt(0).toUpperCase() + entry.full_name.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6 hover:cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          handleCheckinOpenModal(entry)
                          // setNewCheckinTime(entry.check_in)
                        }
                        }
                      >{entry.check_in}</td>
                      <td className="py-4 px-6 hover:cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          handleOpenModal(entry)
                          // setNewCheckOutTime(entry.check_out)
                        }
                        }
                      > {`${entry.check_out}`}
                        {entry.autocheckout ? (
                          <div className="relative inline-block">
                            <span
                              className="text-yellow-600 bg-yellow-100 px-2 py-1 font-semibold rounded-xl ml-2 cursor-pointer"
                            // onMouseEnter={(e) => {
                            //   const tooltip = e.target.nextSibling;
                            //   tooltip.classList.remove('hidden');
                            // }}
                            // onMouseLeave={(e) => {
                            //   const tooltip = e.target.nextSibling;
                            //   tooltip.classList.add('hidden');
                            // }}
                            >
                              Auto
                            </span>
                            {/* Tooltip */}
                            <div className="hidden absolute bg-gray-400 text-white text-sm px-2 py-1 w-max rounded mt-1 -ml-2">
                              Change CheckOut Time
                            </div>
                          </div>
                        ) : null}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleModeOpen(entry)}
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${entry.work_mode === "on_site"
                              ? "bg-blue-100 text-blue-800"
                              : entry.work_mode === "remote"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-white text-black"
                            }`}
                        >
                          {entry.work_mode === "on_site" ? "On-site" : entry.work_mode === "remote" ? "Remote" : "-----"}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${entry.status === "present"
                              ? "bg-green-100 text-green-800"
                              : entry.status === "late"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {isModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">Change CheckOut Time</h2>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-gray-700">New CheckOut Time</label>

                  {/* Time Picker Container */}
                  <div className="time-picker-container">
                    <div className="clock bg-gray-100 p-4 rounded-lg shadow-md">
                      <div className="time-display text-4xl font-bold text-center text-gray-800 mb-4">
                        <span>{hour.toString().padStart(2, '0').slice(0, 2)}:</span>
                        <span>{minute.toString().padStart(2, '0').slice(0, 2)}</span>

                      </div>

                      {/* AM/PM Toggle */}
                      <div className="am-pm-toggle flex justify-center space-x-4">
                        <button
                          onClick={toggleAMPM}
                          className={`am-pm-btn px-4 py-2 rounded-full text-lg ${isAM ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
                        >
                          AM
                        </button>
                        <button
                          onClick={toggleAMPM}
                          className={`am-pm-btn px-4 py-2 rounded-full text-lg ${!isAM ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
                        >
                          PM
                        </button>
                      </div>
                    </div>

                    {/* Input Section for Hour and Minute */}
                    <div className="input-section grid grid-cols-2 gap-4 mt-6">
                      <div className="input-group">
                        <label className="text-sm font-medium text-gray-700">Hour</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={hour}
                            onChange={handleHourChange}
                            min="1"
                            max="12"
                            onInput={(e) => {
                              // Ensure the input is only a 2-digit number
                              const value = e.target.value;
                              if (value.length > 2) {
                                e.target.value = value.slice(0, 2);  // Trim to 2 digits if more than 2 characters
                              }
                            }}
                            className="input px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-center"
                          />
                          <div className="absolute top-1/2 transform -translate-y-1/2 right-2 flex space-x-2">
                            <button
                              onClick={() => handleHourChange({ target: { value: Math.min(12, hour + 1) } })}
                              className="text-xl text-gray-600 w-4 hover:text-blue-500"
                            >
                              &#8593;
                            </button>
                            <button
                              onClick={() => handleHourChange({ target: { value: Math.max(1, hour - 1) } })}
                              className="text-xl text-gray-600 w-4 hover:text-blue-500"
                            >
                              &#8595;
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="input-group">
                        <label className="text-sm font-medium text-gray-700">Minute</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={minute}
                            onChange={handleMinuteChange}
                            min="0"
                            max="59"
                            onInput={(e) => {
                              // Ensure the input is only a 2-digit number
                              const value = e.target.value;
                              if (value.length > 2) {
                                e.target.value = value.slice(0, 2);  // Trim to 2 digits if more than 2 characters
                              }
                            }}
                            className="input px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-center"
                          />
                          <div className="absolute top-1/2 transform -translate-y-1/2 right-2 flex space-x-2">
                            <button
                              onClick={() => handleMinuteChange({ target: { value: Math.min(59, minute + 1) } })}
                              className="text-xl text-gray-600 w-4 hover:text-blue-500"
                            >
                              &#8593;
                            </button>
                            <button
                              onClick={() => handleMinuteChange({ target: { value: Math.max(0, minute - 1) } })}
                              className="text-xl text-gray-600 w-4 hover:text-blue-500"
                            >
                              &#8595;
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleCloseModal}
                    className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateCheckOutTime}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg ml-4 hover:bg-blue-600 transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}


          {isModeOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white p-6 rounded-lg w-96">
                <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">Change Work Mode</h2>

                <div className="flex flex-col w-full text-xl mt-3 text-gray-800 gap-2">
                  <button className="flex items-center px-4 py-2 hover:bg-purple-200 rounded-lg transition-all">
                    <input
                      type="radio"
                      name="work_mode"
                      value="remote"
                      // checked={work_mode === "Remote"}
                      onChange={(e) => setWorkMode(e.target.value)}
                      className="mr-2"
                    />
                    Remote
                  </button>

                  <button className="flex items-center px-4 py-2 hover:bg-blue-200 rounded-lg transition-all">
                    <input
                      type="radio"
                      name="work_mode"
                      value="on_site"
                      // checked={work_mode === "On-Site"}
                      onChange={(e) => setWorkMode(e.target.value)}
                      className="mr-2"
                    />
                    On-Site
                  </button>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleModeModal}
                    className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdateMode()}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg ml-4 hover:bg-blue-600 transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}



          {/* Checkin Time Changing Model */}
          {isCheckinModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">Change CheckIn Time</h2>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-gray-700">New CheckIn Time</label>

                  {/* Time Picker Container */}
                  <div className="time-picker-container">
                    <div className="clock bg-gray-100 p-4 rounded-lg shadow-md">
                      <div className="time-display text-4xl font-bold text-center text-gray-800 mb-4">
                        <span>{hourin.toString().padStart(2, '0').slice(0, 2)}:</span>
                        <span>{minutein.toString().padStart(2, '0').slice(0, 2)}</span>
                      </div>

                      {/* AM/PM Toggle */}
                      <div className="am-pm-toggle flex justify-center space-x-4">
                        <button
                          onClick={togglecheckinAMPM}
                          className={`am-pm-btn px-4 py-2 rounded-full text-lg ${isinAM ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
                        >
                          AM
                        </button>
                        <button
                          onClick={togglecheckinAMPM}
                          className={`am-pm-btn px-4 py-2 rounded-full text-lg ${!isinAM ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
                        >
                          PM
                        </button>
                      </div>
                    </div>

                    {/* Input Section for Hour and Minute */}
                    <div className="input-section grid grid-cols-2 gap-4 mt-6">
                      <div className="input-group">
                        <label className="text-sm font-medium text-gray-700">Hour</label>
                        <div className="relative">
                          <input className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-center"
                            type="number"
                            value={hourin}
                            onChange={handleCheckInHourChange}
                            max="12"
                            min="01"
                            onInput={(e) => {
                              // Ensure the input is only a 2-digit number
                              const value = e.target.value;
                              if (value.length > 2) {
                                e.target.value = value.slice(0, 2);  // Trim to 2 digits if more than 2 characters
                              }
                            }}
                          // className="input px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-center"
                          />
                          <div className="absolute top-1/2 transform -translate-y-1/2 right-2 flex space-x-2">
                            <button
                              onClick={() => handleCheckInHourChange({ target: { value: Math.min(12, hourin + 1) } })}
                              className="text-xl text-gray-600 w-4 hover:text-blue-500"
                            >
                              &#8593;
                            </button>
                            <button
                              onClick={() => handleCheckInHourChange({ target: { value: Math.max(1, hourin - 1) } })}
                              className="text-xl text-gray-600 w-4 hover:text-blue-500"
                            >
                              &#8595;
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="input-group">
                        <label className="text-sm font-medium text-gray-700">Minute</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={minutein}
                            onChange={handleCheckInMinuteChange}
                            min="0"
                            max="59"
                            onInput={(e) => {
                              // Ensure the input is only a 2-digit number
                              const value = e.target.value;
                              if (value.length > 2) {
                                e.target.value = value.slice(0, 2);  // Trim to 2 digits if more than 2 characters
                              }
                            }}
                            className="input px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-center"
                          />
                          <div className="absolute top-1/2 transform -translate-y-1/2 right-2 flex space-x-2">
                            <button
                              onClick={() => handleCheckInMinuteChange({ target: { value: Math.min(59, minutein + 1) } })}
                              className="text-xl text-gray-600 w-4 hover:text-blue-500"
                            >
                              &#8593;
                            </button>
                            <button
                              onClick={() => handleCheckInMinuteChange({ target: { value: Math.max(0, minutein - 1) } })}
                              className="text-xl text-gray-600 w-4 hover:text-blue-500"
                            >
                              &#8595;
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleCheckInCloseModal}
                    className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateCheckInTime}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg ml-4 hover:bg-blue-600 transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}




        </>
      )}

      {/* Monthly View */}
      {!loading && maintab === "TableView" && selectedTab === "Monthly" && (
        <EmployeeMonthlyAttendanceTable
          selectedDateM={selectedDateM}
        />

      )}
      {!loading && maintab === "TableView" && selectedTab === "Weekly" && <EmployeeWeeklyAttendanceTable selectedDateW={selectedDateW} />}
      {!loading && maintab === "TableView" && selectedTab === "Filter" && <FilteredDataAdmin search={search} startdate={startdate} enddate={enddate} />}
      {!loading && maintab === "GraphicView" && (
        <div className='col-span-12 sm:col-span-4 md:col-span-3 lg:col-span-3'>
          <GraphicViewComponent
            selectedEmployee={selectedEmployee}
            attendanceLogs={attendanceLogs}
            monthlyStats={monthlyStats}
            tableData={tableData}
          />
        </div>
      )}
      {!loading && maintab === "DetailedView" && (
        <>
          <div className="flex-1">
            <div className='flex flex-row justify-between'>
              <div></div>
              {/* <h1 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Admin Dashboard
          </h1> */}
              {/* <div className='flex gap-1'>
          <button className='bg-white rounded-lg px-3 py-2 hover:bg-gray-200'
          onClick={() => {setgraphicview(true)}}>Graphic View</button>
          <button className='bg-white rounded-lg px-3 py-2 hover:bg-gray-200'
          onClick={() => {setgraphicview(false)}}>General View</button>
          </div> */}
            </div>

            <div className="grid grid-cols-4 gap-1">
              {/* Employee List Disktop*/}
              {!isSmallScreen && (
                // <div className="col-span-1 ">
                //   {/* <h2 className="text-xl font-semibold mb-4">Employee List</h2> */}
                //   <input 
                //      type="search" 
                //      name="search" 
                //      placeholder="Search Employee..." 
                //      aria-label="Search"
                //      className ="w-full max-w-sm px-4 py-1 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition duration-200"
                //    />
                //   <ul className="space-y-2 max-h-[500px] overflow-y-auto rounded-lg pr-2.5 custom-scrollbar">
                //     {employees.map((employee) => (
                //       <li
                //       key={employee.id}
                //       onClick={() =>{
                //         setDataEmployee(employee.id)
                //         handleEmployeeClick(employee.id)

                //       } }
                //       className={`p-3 rounded-lg cursor-pointer transition-colors ${
                //         selectedEmployee?.id === employee.id
                //           ? "bg-blue-100 text-blue-600 hover:bg-gray-50"
                //           : "hover:bg-gray-100"
                //       } ${employeeStats[employee.id] < 6 ? "text-red-600" : ""}`} // Apply red color if hours < 7
                //     >
                //       <div className='flex justify-between'>
                //       {employee.full_name}
                //       <button className='hover:bg-gray-300 transition-all ease-in-out px-3 py-1 rounded-xl' onClick={(e) => {
                //         e.stopPropagation();
                //         handleEmployeeDelete(employee.id)}}>
                //       <Trash2/>
                //       </button>
                //       </div>
                //     </li>
                //     ))}
                //   </ul>
                // </div>
                <div className="col-span-1">
                  <input
                    type="search"
                    name="search"
                    placeholder="Search Employee..."
                    aria-label="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-sm px-4 py-1 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition duration-200 mb-4"
                  />

                  <ul className="space-y-2 max-h-[500px] overflow-y-auto rounded-lg pr-2.5 custom-scrollbar">
                    {filteredEmployees.map((employee) => (
                      <li
                        key={employee.id}
                        onClick={() => {
                          setDataEmployeesearch(employee);
                          handleEmployeeClick(employee.id);
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedEmployeesearch?.id === employee.id
                            ? "bg-blue-100 text-blue-600 hover:bg-gray-50"
                            : "hover:bg-gray-100"
                          } ${employeeStats[employee.id] < 6 ? "text-red-600" : ""}`}
                      >
                        <div className='flex justify-between items-center'>
                          {employee.full_name}
                          <button
                            className='hover:bg-gray-300 transition-all ease-in-out px-3 py-1 rounded-xl'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEmployeeDelete(employee.id);
                            }}
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}





              {/* Employee Dashboard */}
              {selectedEmployee && !graphicview && (
                <div className=" col-span-12 sm:col-span-4 md:col-span-3 lg:col-span-3">
                  <div className="bg-gray-100 rounded-lg shadow-md p-3">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold">
                        {selectedEmployee.full_name}'s Dashboard
                      </h2>
                      {/* <div > 
                       <p className="text-gray-600">
                        {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                       </p>
  
                  </div> */}
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
                              todayBreak.map((breakItem, index) => {
                                console.log("==>", breakItem)
                                return (
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
                                )
                              })
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
                                        {(7 * monthlyStats.expectedWorkingDays)}h
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
                          {/* <AbsenteeComponentAdmin userID={userID} /> */}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
// );

export default EmployeeAttendanceTable;