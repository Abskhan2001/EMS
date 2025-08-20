import React, { useContext, useEffect, useState, Fragment } from 'react';
import { supabase } from '../lib/supabase';
import EmployeeMonthlyAttendanceTable from './ListViewMonthly';
import { useAuthStore } from '../lib/store';
import EmployeeWeeklyAttendanceTable from './ListViewWeekly';
import PersonAttendanceDetail from './PersonAttendanceDetail';
import { ChevronLeft, ChevronRight, SearchIcon } from 'lucide-react'; // Assuming you're using Lucide icons
import { format, parse, isAfter, addMonths, addWeeks, set } from 'date-fns'; // Import the format function
import { DownloadIcon } from 'lucide-react';
import { AttendanceContext } from './AttendanceContext';
import './style.css';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import { Trash2 } from 'lucide-react';
import { forwardRef, useImperativeHandle } from 'react';
import './style.css';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition, RadioGroup } from '@headlessui/react';
import TaskModalAdmin from '../component/TaskModalAdmin';

import AbsenteeComponentAdmin from './AbsenteeDataAdmin';
import {
  startOfMonth,
  endOfMonth,
  isWeekend,
  eachDayOfInterval,
} from 'date-fns';
import { AttendanceProvider } from './AttendanceContext';
import FilteredDataAdmin from './filteredListAdmin';
import { id } from 'date-fns/locale/id';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import toast from 'react-hot-toast';
import {
  fetchUserAbsentees,
  useFetchUserAbsenteesQuery,
} from '../services/AttendanceAPI';
import { setUserAbsentCount } from '../slices/userAbsenteesSlice';

// --- TaskCell Component ---
const TaskCell = ({ task }) => {
  const [showAll, setShowAll] = useState(false);
  if (!task) return <span className="text-gray-400 italic">No task</span>;
  const shortTask = task.length > 60 ? task.slice(0, 60) + '...' : task;
  return (
    <div>
      <span>{showAll ? task : shortTask}</span>
      {task.length > 60 && (
        <button
          className="text-blue-600 ml-2 text-xs underline"
          onClick={(e) => {
            e.stopPropagation();
            setShowAll(!showAll);
          }}
        >
          {showAll ? 'See less' : 'See more'}
        </button>
      )}
    </div>
  );
};

// --- Utility to fetch daily tasks ---
async function fetchDailyTasks(date) {
  const { data, error } = await supabase
    .from('daily check_in task')
    .select('user_id, content, created_at')
    .gte('created_at', `${date}T00:00:00`)
    .lte('created_at', `${date}T23:59:59`);
  if (error) throw error;
  const dailyTasksMap = new Map();
  if (data) {
    data.forEach((task) => {
      dailyTasksMap.set(task.user_id, task.content);
    });
  }
  return dailyTasksMap;
}
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
  totalHours: number;
  totalOvertimeHours: number;
}
interface SoftwareComplaint {
  id: number;
  complaint_text: string;
  created_at: string;
  user_id: string;
}

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
  const [absentid, setabsentid] = useState<null | number>(null);
  const [selecteduser, setslecteduser] = useState<null | string>(null);
  const [filteredData, setFilteredData] = useState([]); // Filtered data for display
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState(null);
  const [absent, setAbsent] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMode, setSelectedMode] = useState('remote');
  const [present, setPresent] = useState(0);
  const [leaveRequestsData, setLeaveRequestsData] = useState([]);
  const [leaveRequestsLoading, setLeaveRequestsLoading] = useState(false);

  const [DataEmployee, setDataEmployee] = useState(null);
  const [late, setLate] = useState(0);
  const [remote, setRemote] = useState(0); // State for remote employees count
  // const [selectedTab, setSelectedTab] = useState("Daily");
  const [selectedDate, setSelectedDate] = useState(new Date()); // Default to current date
  const [loading, setLoading] = useState(true);
  const [selectedDateM, setselectedDateM] = useState(new Date());
  const [selectedDateW, setselectedDateW] = useState(new Date());
  const [currentFilter, setCurrentFilter] = useState('all'); // Filter state: "all", "present", "absent", "late", "remote"
  const [dataFromWeeklyChild, setDataFromWeeklyChild] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  // const [newCheckOutTime, setNewCheckOutTime] = useState('00 : 00');
  const [hour, setHour] = useState(12); // Default hour
  const [minute, setMinute] = useState(0); // Default minute
  const [isAM, setIsAM] = useState(true); // AM/PM toggle
  const [updatedCheckOutTime, setupdatedCheckOutTime] = useState('');
  const [isCheckinModalOpen, setisCheckinModalOpen] = useState(false);
  // const [newCheckInTime, setNewCheckInTime] = useState('00 : 00');
  const [hourin, setHourin] = useState(12); // Default hour
  const [minutein, setMinutein] = useState(0); // Default minute
  const [isinAM, setIsinAM] = useState(true); // AM/PM toggle
  const [updatedCheckInTime, setupdatedCheckInTime] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [absentloading, setabsentloading] = useState(false);
  const [absentError, setAbsentError] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  // const [formattedDate2, setformattedDate2] = useState('');
  const [startdate, setStartdate] = useState('');
  const [enddate, setEnddate] = useState('');
  const [search, setsearch] = useState(false);
  const [isModeOpen, setisModeOpen] = useState(false);
  const [WorkMode, setWorkMode] = useState('selectedEntry.work_mode');
  const [timestamp, settimestamp] = useState(
    new Date().toISOString().replace('T', ' ').split('.')[0] + '.000+00'
  );
  const [maintab, setmaintab] = useState('TableView');
  const [selectedTab, setSelectedTab] = useState<string>('Daily');
  const [employees, setEmployees] = useState<any[]>([]);
  const [officeComplaints, setofficeComplaints] = useState<any[]>([]);
  const [softwareComplaints, setsoftwareComplaints] = useState<
    SoftwareComplaint[]
  >([]);
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
  const [leaveRequests, setleaveRequests] = useState(false);
  const [PendingLeaveRequests, setPendingLeaveRequests] = useState<any[]>([]);
  const setUser = useAuthStore((state) => state.setUser);
  const [absentees, setabsentees] = useState('');
  const [leaves, setleaves] = useState('');
  const [userID, setUserID] = useState<string>('');
  const [employeeStats, setEmployeeStats] = useState<Record<string, number>>(
    {}
  );
  const [graphicview, setgraphicview] = useState(false);
  const [tableData, setTableData] = useState('');
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  // const [selectedDate, setSelectedDate] = useState(new Date()); // Default to current date
  const [sideopen, setsideopen] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  function handleabsentclosemodal() {
    setabsentid(null);
    setslecteduser(null);
    setAbsentError(null);
    setModalVisible(false);
  }

  async function handleopenabsentmodal(id: string) {
    setabsentloading(true);
    setAbsentError(null);
    setslecteduser(id);
    setModalVisible(true);
    console.log('absent id', id);

    try {
      let selectdate = new Date(selectedDate);
      const today = selectdate.toISOString().split('T')[0];

      // Note: This would need to be replaced with a proper API call to your backend
      // For now, we'll simulate the response
      const data = [];
      const error = null;

      if (error) {
        console.error('Error fetching attendance:', error);
        setAbsentError('Failed to load attendance data. Please try again.');
        return;
      } else {
        if (data.length) {
          let dataid = data[0].id;
          setabsentid(dataid);
        }
        console.log("Today's attendance:", data);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setAbsentError('An unexpected error occurred. Please try again.');
    } finally {
      setabsentloading(false);
    }
  }

  async function handleSaveChanges() {
    setSaveLoading(true);
    setSaveError(null);

    try {
      console.log('the absent id is', absentid);
      console.log('Selected work mode:', selectedMode);

      let updateSuccess = false;
      let newAbsenteeData = null;

      // Check if the user already has an attendance record for today
      if (selecteduser) {
        const today = new Date(selectedDate).toISOString().split('T')[0];

        // Check for existing attendance record
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_logs')
          .select('id, status')
          .eq('user_id', selecteduser)
          .gte('check_in', `${today}T00:00:00`)
          .lte('check_in', `${today}T23:59:59`);

        if (attendanceError) {
          console.error('Error checking attendance record:', attendanceError);
          setSaveError('Failed to check existing attendance record.');
          return;
        } else if (attendanceData && attendanceData.length > 0) {
          // User has an attendance record for today (present or late)
          console.log(
            'Found existing attendance record, deleting before marking absent/leave'
          );

          // Delete the attendance record
          const { error: deleteError } = await supabase
            .from('attendance_logs')
            .delete()
            .eq('user_id', selecteduser)
            .gte('check_in', `${today}T00:00:00`)
            .lte('check_in', `${today}T23:59:59`);

          if (deleteError) {
            console.error('Error deleting attendance record:', deleteError);
            setSaveError('Failed to delete existing attendance record.');
            return;
          } else {
            console.log('Successfully deleted attendance record');
          }
        }
      }

      if (absentid) {
        const { data, error } = await supabase
          .from('absentees')
          .update({
            absentee_Timing: selectedMode,
            absentee_type: selectedMode == 'Absent' ? 'Absent' : 'leave',
          })
          .eq('id', absentid);

        if (error) {
          console.error('Error updating absentee type:', error);
          setSaveError('Failed to update absentee record. Please try again.');
          return;
        } else {
          updateSuccess = true;
          // Sometimes Supabase returns an array, sometimes object, handle both
          newAbsenteeData = Array.isArray(data) ? data[0] : data;
        }
      } else {
        if (selecteduser) {
          const { data, error } = await supabase
            .from('absentees') // your table name
            .insert([
              {
                user_id: selecteduser,
                absentee_Timing: selectedMode,
                absentee_type: selectedMode == 'Absent' ? 'Full Day' : 'leave',
              },
            ])
            .select(); // So we get inserted row(s) back

          if (error) {
            console.error('Error creating absentee record:', error);
            setSaveError('Failed to create absentee record. Please try again.');
            return;
          } else {
            updateSuccess = true;
            // Take the first inserted record (Supabase returns array)
            newAbsenteeData = Array.isArray(data) ? data[0] : data;
          }
        }
      }

      // UI UPDATE LOGIC
      // Try to update attendanceData and filteredData in local state so UI is refreshed instantly.
      if (updateSuccess && newAbsenteeData) {
        setAttendanceData((prev) =>
          prev.map((item) =>
            item.id === (newAbsenteeData.user_id || selecteduser)
              ? {
                ...item,
                status: newAbsenteeData.absentee_type,
                textColor:
                  newAbsenteeData.absentee_type === 'Absent'
                    ? 'text-red-500'
                    : 'text-blue-500',
              }
              : item
          )
        );
        setFilteredData((prev) =>
          prev.map((item) =>
            item.id === (newAbsenteeData.user_id || selecteduser)
              ? {
                ...item,
                status: newAbsenteeData.absentee_type,
                textColor:
                  newAbsenteeData.absentee_type === 'Absent'
                    ? 'text-red-500'
                    : 'text-blue-500',
              }
              : item
          )
        );
      } else if (updateSuccess && selecteduser) {
        // If new absentee but Supabase did not return newAbsenteeData
        setAttendanceData((prev) =>
          prev.map((item) =>
            item.id === selecteduser
              ? {
                ...item,
                status: selectedMode == 'Absent' ? 'Absent' : 'leave',
                textColor:
                  selectedMode == 'Absent' ? 'text-red-500' : 'text-blue-500',
              }
              : item
          )
        );
        setFilteredData((prev) =>
          prev.map((item) =>
            item.id === selecteduser
              ? {
                ...item,
                status: selectedMode == 'Absent' ? 'Absent' : 'leave',
                textColor:
                  selectedMode == 'Absent' ? 'text-red-500' : 'text-blue-500',
              }
              : item
          )
        );
      }

      // Show success message and close modal
      toast.success('Employee status updated successfully!');
      handleabsentclosemodal();

    } catch (err) {
      console.error('Unexpected error in handleSaveChanges:', err);
      setSaveError('An unexpected error occurred. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  }
  // ... (rest of the code remains unchanged below this)

  const { attendanceDataWeekly, attendanceDataMonthly } =
    useContext(AttendanceContext);

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
  const handleCheckinOpenModal = async (entry) => {
    setSelectedEntry(entry);
    parseCheckInTime(entry.check_in);

    setisCheckinModalOpen(true);
  };

  // Open modal and set the selected entry and default time
  const handleOpenModal = (entry) => {
    console.log('entry', entry);
    setSelectedEntry(entry);
    parseCheckOutTime(entry.check_out);
    setIsModalOpen(true);
  };
  const handleUpdateCheckInTime = async () => {
    const originalDate = new Date(selectedEntry.created_at);

    // Get UTC date components
    const utcYear = originalDate.getUTCFullYear(); // 2025
    const utcMonth = originalDate.getUTCMonth(); // 3 (April)
    const utcDay = originalDate.getUTCDate(); // 9

    // Construct UTC date string
    const utcDateString = `${utcYear}-${String(utcMonth + 1).padStart(
      2,
      '0'
    )}-${String(utcDay).padStart(2, '0')}`;
    // Result: "2025-04-09"
    // Create new date in UTC
    const adjustedHourin = isinAM ? hourin : (hourin + 12) % 24;
    const newDate = new Date(
      Date.UTC(
        originalDate.getUTCFullYear(),
        originalDate.getUTCMonth(),
        originalDate.getUTCDate(),
        adjustedHourin,
        minutein
      )
    );

    // Format timestamp correctly
    const formattedTimestamp = newDate
      .toISOString()
      .replace('T', ' ')
      .replace(/\.\d+Z$/, '.000+00');

    // Calculate status using UTC
    const checkInTimeLimit = new Date(
      Date.UTC(
        newDate.getUTCFullYear(),
        newDate.getUTCMonth(),
        newDate.getUTCDate(),
        9,
        30 // 09:30 UTC
      )
    );

    const attendanceStatus = newDate > checkInTimeLimit ? 'late' : 'present';
    console.log('origional Date', originalDate);

    console.log('origional Date in api', utcDateString);

    // Update with correct filtering
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('created_at::date', utcDateString);
    console.log('Fetched Data ', data);

    if (!error) {
      alert('Updated successfully!');
      setisCheckinModalOpen(false);
    }
  };

  const handleCheckInCloseModal = () => {
    setisCheckinModalOpen(false);
  };

  const handleUpdateCheckOutTime = async () => {
    console.log('selectedEntry.check_in2:', selectedEntry.check_in2);

    // Format hour and minute to ensure two digits
    const formattedHour = hour < 10 ? `0${hour}` : hour;
    const formattedMinute = minute < 10 ? `0${minute}` : minute;

    // Extract the date from selectedEntry.check_in2
    let originalDate;
    if (
      selectedEntry.check_in2 === null ||
      !selectedEntry.check_in2 ||
      selectedEntry.check_in2 === 'N/A'
    ) {
      originalDate = new Date();
    } else {
      originalDate = new Date(selectedEntry.check_in2);
    }

    // Ensure originalDate is valid
    if (isNaN(originalDate.getTime())) {
      console.error('Error: selectedEntry.check_in2 is not a valid date.');
      alert('Error: Invalid check-in date format.');
      return;
    }

    const year = originalDate.getFullYear();
    const month = originalDate.getMonth(); // Month is zero-indexed
    const day = originalDate.getDate();

    const year2 = new Date().getFullYear();
    const month2 = new Date().getMonth();
    const day2 = new Date().getDate();

    // Adjust for AM/PM (convert to 24-hour format if PM)
    let adjustedHour = isAM
      ? parseInt(formattedHour, 10)
      : (parseInt(formattedHour, 10) + 12) % 24;

    // Create a new Date object with the updated time but keeping the original date
    let formattedDate;
    if (selectedEntry.check_in2 === null) {
      formattedDate = new Date(
        year2,
        month2,
        day2,
        adjustedHour,
        parseInt(formattedMinute, 10),
        0,
        0
      );
    } else {
      formattedDate = new Date(
        year,
        month,
        day,
        adjustedHour,
        parseInt(formattedMinute, 10),
        0,
        0
      );
    }

    // Convert the Date object to the required format [YYYY-MM-DD HH:MM:SS.000+00]
    const timestamp =
      formattedDate.toISOString().replace('T', ' ').split('.')[0] + '.000+00';

    console.log('Selected time:', timestamp);

    // Assign the formatted time string to update state
    setupdatedCheckOutTime(timestamp);

    // Update the `check_out` field in the database
    const { data, error } = await supabase
      .from('attendance_logs')
      .update({ check_out: timestamp }) // Updating check_out with the new timestamp
      .eq('user_id', selectedEntry.id) // Ensure correct entry by user_id
      .eq('check_in', selectedEntry.check_in2); // Match check_in for that specific date

    if (data) {
      console.log('Updated data:', data); // Log success
    }

    if (!error) {
      alert('Check-out time updated successfully.');
    } else {
      console.error('Error updating check-out time:', error);
    }

    // Close modal after update
    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // function handleDataFromChild(attendanceDataWeekly) {
  //   console.log("Data received from child:", attendanceDataWeekly);
  //   setDataFromWeeklyChild(attendanceDataWeekly);
  // }
  const downloadPDF = async () => {
    try {
      const response = await fetch(
        'https://ems-server-0bvq.onrender.com/generate-pdfDaily',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: attendanceData }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();

      if (blob.type !== 'application/pdf') {
        throw new Error('Received incorrect file format');
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
      direction === 'prev' ? addMonths(prevDate, -1) : addMonths(prevDate, 1)
    );
  };

  // Fetching the pending Leave Requests Count
  const fetchPendingCount = async () => {
    const { count, error } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true }) // Fetch count only
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching count:', error);
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
    if (selectedTab === 'Employees' || selectedTab === 'Daily') {
      const fetchleaves = async () => {
        const { count, error } = await supabase
          .from('absentees')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userID)
          .eq('absentee_type', 'leave')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        if (error) {
          console.log('Error Fetching Absentees Count', error);
        } else {
          console.log('absentees Count :', count);
          setleaves(count || 0);
          console.log('leaves', count);
        }
      };
      fetchleaves();
    }
  }, [userID]);

  useEffect(() => {
    // Fetch leave data from absentees table when component mounts or selectedDate changes
    const fetchLeaveRequests = async () => {
      if (!user?.id) return;

      setLeaveRequestsLoading(true);
      try {
        // Fetch user profile using REST API
        const userResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/users/${user?.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!userResponse.ok) {
          console.error('Error fetching user profile:', userResponse.status);
          setLeaveRequestsData([]);
          return;
        }

        const userResult = await userResponse.json();
        if (!userResult.success || !userResult.user) {
          console.error('Error fetching user profile: Invalid response');
          setLeaveRequestsData([]);
          return;
        }

        const userprofile = {
          id: userResult.user._id || userResult.user.id,
          organization_id: userResult.user.organizationId || userResult.user.organization_id
        };

        const today = selectedDate.toISOString().split('T')[0];
        console.log(
          '🔍 Fetching leave data for date:',
          today,
          'and organization:',
          userprofile?.organization_id
        );

        // First, let's check all leave records from absentees table for debugging
        const { data: allLeaveRecords, error: allError } = await supabase
          .from('absentees')
          .select('*')
          .eq('absentee_type', 'leave');

        console.log('🔍 All leave records from absentees:', allLeaveRecords);

        // Log the dates to see what dates we have
        if (allLeaveRecords && allLeaveRecords.length > 0) {
          const uniqueDates = [
            ...new Set(
              allLeaveRecords.map(
                (req) => req.absentee_date || req.created_at.split('T')[0]
              )
            ),
          ].sort();
          console.log('🔍 Available leave dates:', uniqueDates);
          console.log('🔍 Looking for date:', today);
        }

        // Get users from the same organization to filter leave records
        const orgUsersResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/users?organizationId=${userprofile?.organization_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!orgUsersResponse.ok) {
          console.error('Error fetching organization users:', orgUsersResponse.status);
          setLeaveRequestsData([]);
          return;
        }

        const orgUsersResult = await orgUsersResponse.json();
        const orgUsers = orgUsersResult.success && orgUsersResult.users ? orgUsersResult.users.map((u: any) => ({
          id: u._id || u.id,
          full_name: u.fullName || u.full_name,
          email: u.email
        })) : [];

        if (!orgUsers || orgUsers.length === 0) {
          console.warn('No organization users found');
          setLeaveRequestsData([]);
          return;
        }

        const orgUserIds = orgUsers.map((user) => user.id);
        console.log('🔍 Organization user IDs:', orgUserIds);

        // Now fetch leave records from absentees table with proper filtering
        // First try to get records with absentee_date matching today
        const { data: leaveDataByDate, error: dateError } = await supabase
          .from('absentees')
          .select('*')
          .eq('absentee_type', 'leave')
          .in('user_id', orgUserIds)
          .eq('absentee_date', today);

        // If no records found by absentee_date, try by created_at date
        let leaveData = leaveDataByDate;
        if ((!leaveDataByDate || leaveDataByDate.length === 0) && !dateError) {
          const { data: leaveDataByCreated, error: createdError } = await supabase
            .from('absentees')
            .select('*')
            .eq('absentee_type', 'leave')
            .in('user_id', orgUserIds)
            .gte('created_at', `${today}T00:00:00`)
            .lte('created_at', `${today}T23:59:59`);

          leaveData = leaveDataByCreated;
          console.log('🔍 Fallback query by created_at:', { data: leaveDataByCreated, error: createdError });
        }

        const error = dateError;

        console.log('🔍 Leave records query result:', {
          data: leaveData,
          error,
          today,
          orgId: userprofile?.organization_id,
          dataLength: leaveData?.length || 0,
        });

        if (error) {
          console.warn('❌ Error fetching leave records:', error);
          setLeaveRequestsData([]);
        } else {
          // Transform absentees data to match the expected format
          const transformedData =
            leaveData?.map((record) => {
              const user = orgUsers.find((u) => u.id === record.user_id);
              return {
                id: record.id,
                full_name: user?.full_name || 'Unknown User',
                user_email: user?.email || 'No email',
                status: 'approved', // Since it's already in absentees table
                leave_type: record.absentee_Timing || 'Full Day',
                leave_date:
                  record.absentee_date || record.created_at.split('T')[0],
                user_id: record.user_id,
                organization_id: userprofile?.organization_id,
              };
            }) || [];

          console.log(
            '✅ Successfully fetched and transformed leave records:',
            transformedData
          );
          setLeaveRequestsData(transformedData);
        }
      } catch (err) {
        console.error('Error fetching leave records:', err);
        setLeaveRequestsData([]);
      } finally {
        setLeaveRequestsLoading(false);
      }
    };

    fetchLeaveRequests();
  }, [user?.id, selectedDate]);

  useEffect(() => {
    console.log('selected tab on Leaves Fetching :', selectedTab);

    if (selectedTab === 'Employees' || selectedTab === 'Daily') {
      const fetchabsentees = async () => {
        const { count, error } = await supabase
          .from('absentees')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userID)
          .eq('absentee_type', 'Absent')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());
        if (error) {
          console.error('Error Fetching Absentees Count', error);
        } else {
          console.log('absentees Count :', count);
          setabsentees(count || 0);
          console.log('Absentees', count);
        }
      };
      fetchabsentees();
    }
  }, [userID]);

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
        console.log('Complaints Data are: ', data);
        setsoftwareComplaints(data);
      }
      console.log('officeComplaints : ', officeComplaints);
    } catch (err) {
      console.error('Error fetching complaints:', err);
      // setError(err instanceof Error ? err.message : 'Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };
  const handleSoftwareComplaintsClick = () => {
    fetchsoftwareComplaints();
  };

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
        console.log('Complaints Data are: ', data);
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
  };

  const fetchEmployees = async () => {
    try {
      // Fetch the current user's organization ID
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/users/${user?.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }

      const userResult = await response.json();
      if (!userResult.success || !userResult.user) {
        throw new Error('Failed to fetch user profile');
      }

      const userprofile = {
        id: userResult.user._id || userResult.user.id,
        organization_id: userResult.user.organizationId || userResult.user.organization_id
      };

      // Fetch all employees in the same organization
      const employeesResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/users?organizationId=${userprofile?.organization_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!employeesResponse.ok) {
        throw new Error(`Failed to fetch employees: ${employeesResponse.status}`);
      }

      const employeesResult = await employeesResponse.json();
      if (!employeesResult.success || !employeesResult.users) {
        console.warn('No employees found.');
        return;
      }

      const employees = employeesResult.users.map((emp: any) => ({
        id: emp._id || emp.id,
        full_name: emp.fullName || emp.full_name
      }));

      if (!employees || employees.length === 0) {
        console.warn('No employees found.');
        return;
      }

      setEmployees(employees);

      const today = new Date();
      const formattedDate = format(today, 'yyyy-MM-dd'); // for daily task
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      const allDaysInMonth = eachDayOfInterval({
        start: monthStart,
        end: monthEnd,
      });
      const workingDaysInMonth = allDaysInMonth.filter(
        (date) => !isWeekend(date)
      ).length;

      // Fetch all attendance logs for the month
      const { data: attendanceLogs, error: attendanceError } = await supabase
        .from('attendance_logs')
        .select('id, user_id, check_in, check_out')
        .gte('check_in', monthStart.toISOString())
        .lte('check_in', monthEnd.toISOString())
        .order('check_in', { ascending: true });

      if (attendanceError) throw attendanceError;

      // Fetch all breaks
      const { data: allBreaksData, error: allBreaksError } = await supabase
        .from('breaks')
        .select('start_time, end_time, attendance_id');

      if (allBreaksError) {
        console.error('Error fetching all breaks:', allBreaksError);
      }

      // Organize breaks by attendance ID
      const allBreaksByAttendance = {};
      if (allBreaksData) {
        allBreaksData.forEach((b) => {
          if (!allBreaksByAttendance[b.attendance_id])
            allBreaksByAttendance[b.attendance_id] = [];
          allBreaksByAttendance[b.attendance_id].push(b);
        });
      }

      const employeeStats = {};

      for (const employee of employees) {
        const employeeLogs = (attendanceLogs || []).filter(
          (log) => log?.user_id === employee?.id
        );

        const attendanceByDate = employeeLogs.reduce((acc, curr) => {
          const date = format(new Date(curr.check_in), 'yyyy-MM-dd');
          if (
            !acc[date] ||
            new Date(curr.check_in) < new Date(acc[date].check_in)
          ) {
            acc[date] = curr;
          }
          return acc;
        }, {});

        const uniqueAttendance = Object.values(attendanceByDate);

        let totalHours = 0;

        uniqueAttendance.forEach((attendance) => {
          const start = new Date(attendance.check_in);

          let end;
          if (attendance.check_out) {
            end = new Date(attendance.check_out);
          } else {
            const currentTime = new Date();
            const maxEndTime = new Date(start);
            maxEndTime.setHours(maxEndTime.getHours() + 8);
            end = currentTime < maxEndTime ? currentTime : maxEndTime;
          }

          let hoursWorked = Math.max(
            0,
            (end.getTime() - start.getTime()) / (1000 * 60 * 60)
          );

          const breaks = allBreaksByAttendance[attendance.id] || [];
          let breakHours = 0;

          breaks.forEach((b) => {
            if (b.start_time) {
              const breakStart = new Date(b.start_time);
              const breakEnd = b.end_time
                ? new Date(b.end_time)
                : new Date(breakStart.getTime() + 1 * 60 * 60 * 1000);
              breakHours +=
                (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60);
            }
          });

          totalHours += Math.min(Math.max(0, hoursWorked - breakHours), 12);
        });

        employeeStats[employee.id] = uniqueAttendance.length
          ? totalHours / uniqueAttendance.length
          : 0;
      }

      // ✅ Fetch today's daily check-in tasks
      const { data: dailyTasksData, error: dailyTasksError } = await supabase
        .from('daily check_in task') // Keep this if your table name has spaces
        .select('id, user_id, content, created_at')
        .gte('created_at', `${formattedDate}T00:00:00`)
        .lte('created_at', `${formattedDate}T23:59:59`);

      if (dailyTasksError) throw dailyTasksError;

      const dailyTasksMap = new Map();
      if (dailyTasksData) {
        dailyTasksData.forEach((task) => {
          dailyTasksMap.set(task.user_id, task.content);
        });
      }

      setEmployeeStats(employeeStats);
      console.log('Daily Tasks:', dailyTasksMap);
    } catch (error) {
      console.error('Error fetching employees and stats:', error);
    }
  };

  useEffect(
    () => {
      fetchEmployees();
    },
    // }
    [userID, selectedTab]
  );

  const handleSignOut = async () => {
    setUser(null);
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/home');
  };

  const calculateDuration = (start: string, end: string | null) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const diffInMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / (1000 * 60)
    );
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const getTotalBreakDuration = () => {
    let totalMinutes = 0;
    todayBreak.forEach((breakRecord) => {
      if (breakRecord.end_time) {
        const start = new Date(breakRecord.start_time);
        const end = new Date(breakRecord.end_time);
        totalMinutes += Math.round(
          (end.getTime() - start.getTime()) / (1000 * 60)
        );
      }
    });
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return totalMinutes > 0 ? `${hours}h ${minutes}m` : '0h 0m';
  };

  useEffect(() => {
    FetchSelectedAttendance(fetchingid);
  }, [selectedDate]);

  const fetchtodaybreak = async () => {
    const today = selectedDate.toISOString().split('T')[0]; // 'YYYY-MM-DD'

    const { data: breaks, error: breaksError } = await supabase
      .from('breaks')
      .select('*')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);
    if (breaksError) {
      console.error(breaksError);
    } else {
      setTodayBreak(breaks);
    }
  };

  function formatToTimeString(isoString: string) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  let getuserbreakdate = (id: string) => {
    let secondcheckin = todayBreak.filter(
      (breaks) => breaks.attendance_id === id
    );

    let second = secondcheckin[0]?.end_time != null;

    // let secondcheckinlength = secondcheckin.end_time != null ;
    let autoend = secondcheckin[0]?.ending === 'auto';
    if (second && !autoend) {
      let oneattendce = secondcheckin[0];
      const formateddate = formatToTimeString(oneattendce?.end_time);
      if (formateddate == 'Invalid Date') {
        return 'N/A';
      }
      return formateddate;
    } else {
      return 'N/A';
    }
  };

  // const breakone=getuserbreakdate("191c5732-20a9-48ef-92d8-2c593656bf98")
  // console.log("the break one is", breakone)

  useEffect(() => {
    fetchtodaybreak();
  }, [selectedDate]);

  const FetchSelectedAttendance = async (id) => {
    console.log('Selected ID is', id);
    setLoading(true);
    setAttendanceLogs([]);
    setTodayBreak([]);

    fetchEmployees();
    // const id = DataEmployee;
    try {
      // Fetch employee details using REST API
      const userResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/users/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error(`Failed to fetch user data: ${userResponse.status}`);
      }

      const userResult = await userResponse.json();
      if (!userResult.success || !userResult.user) {
        throw new Error('User not found');
      }

      const userData = {
        id: userResult.user._id || userResult.user.id,
        full_name: userResult.user.fullName || userResult.user.full_name,
        email: userResult.user.email,
        role: userResult.user.role,
        department: userResult.user.department,
        organization_id: userResult.user.organizationId || userResult.user.organization_id
      };
      setSelectedEmployee(userData);
      setSelectedEmployeeid(id);
      setUserID(id);

      // Define today's date range.
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59
      );
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
      const startOfDayFormat = new Date(
        Date.UTC(year, month, day, 0, 0, 0, 0)
      ).toISOString(); // Start of same day
      const endOfDayFormat = new Date(
        Date.UTC(year, month, day, 23, 59, 59, 999)
      ).toISOString(); // End of same day

      console.log('startOfDayFormat : ', startOfDayFormat);
      console.log('EndOfDayFormat : ', endOfDayFormat);

      // Fetch today's attendance based on check_in time.
      const { data: todayAttendance, error: attendanceError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', id)
        .gte('check_in', startOfDayFormat)
        .lte('check_in', endOfDayFormat)
        .order('check_in', { ascending: false })
        .limit(1)
        .single();
      console.log('selectedDate : ', selectedDate);

      console.log('todayAttendance:', todayAttendance);

      if (attendanceError && attendanceError.code !== 'PGRST116') {
        setTodayBreak([]);
        throw attendanceError;
      }

      if (todayAttendance && todayAttendance.id !== null) {
        console.log('todayAttendance found:', todayAttendance);
        setAttendanceLogs([todayAttendance]);

        const { data: breakData, error: breakError } = await supabase
          .from('breaks')
          .select('*')
          .eq('attendance_id', todayAttendance.id)
          .order('start_time', { ascending: true });

        if (breakError) {
          console.error('Break fetch error:', breakError);
          throw breakError;
        }

        console.log('Fetched breaks:', breakData);
        setTodayBreak(Array.isArray(breakData) ? breakData : []);
      } else {
        console.log(
          'No todayAttendance found, clearing break state',
          todayBreak
        );
        setAttendanceLogs([]);
        setTodayBreak([]);
      }

      // Get selected date's year and month
      const selectedYear = year;
      const selectedMonth = month; // Already 0-based from parsedDate.getUTCMonth()
      const monthStart = new Date(
        Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0, 0)
      );

      // Get the last day of the month
      const monthEnd = new Date(
        Date.UTC(selectedYear, selectedMonth + 1, 0, 0, 0, 0, -1)
      ); // Last millisecond of the last day of the month

      const employeeid = id;
      const fetchtableData = async () => {
        const { data, error } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('user_id', employeeid)
          .gte('check_in', monthStart.toISOString())
          .lte('check_in', monthEnd.toISOString())
          .order('check_in', { ascending: true });

        if (error) {
          console.error('Error fetching data:', error);
          return;
        }

        setTableData(data); // Assuming setTableData is a state setter
        console.log('data of graphs', data);
      };

      fetchtableData();
      // Fetch holidays
      const { data: holidays, error: holidaysError } = await supabase
        .from('holidays')
        .select('*');

      if (holidaysError) {
        console.error('Error fetching holidays:', holidaysError);
      }

      // Create set of holiday dates for faster lookup
      const holidayDates = new Set();
      if (holidays) {
        holidays.forEach((holiday) => {
          holiday.dates.forEach((dateStr) => {
            const holidayDate = new Date(dateStr);
            holidayDates.add(holidayDate.toDateString());
          });
        });
      }
      console.error('hello sir');
      // Calculate monthly statistics.

      const allDaysInMonth = eachDayOfInterval({
        start: monthStart,
        end: monthEnd,
      });

      console.log('Month Start:', monthStart);
      console.log('Month End:', monthEnd);
      console.log('All days in month:', allDaysInMonth.length);
      console.log(
        'Selected Year:',
        selectedYear,
        'Selected Month:',
        selectedMonth
      );

      const workingDaysInMonth = allDaysInMonth.filter(
        (date) => !isWeekend(date) && !holidayDates.has(date.toDateString())
      ).length;

      console.log(
        'Working days in month (excluding holidays):',
        workingDaysInMonth
      );

      const { data: monthlyAttendance, error: monthlyError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', id)
        .gte('check_in', monthStart.toISOString())
        .lte('check_in', monthEnd.toISOString())
        .order('check_in', { ascending: true });

      console.log('Monthyldfkhaskjhfkjdsahfkjsa', monthlyAttendance);

      console.log('Start of Month', monthStart.toISOString());
      console.log('End of Month', monthEnd.toISOString());

      if (monthlyError) throw monthlyError;

      if (monthlyAttendance) {
        // Group attendance by day (taking the earliest record for each day).
        const attendanceByDate = monthlyAttendance.reduce((acc, curr) => {
          const date = format(new Date(curr.check_in), 'yyyy-MM-dd');
          if (
            !acc[date] ||
            new Date(curr.check_in) < new Date(acc[date].check_in)
          ) {
            acc[date] = curr;
          }
          return acc;
        }, {} as Record<string, AttendanceRecord>);

        const uniqueAttendance: AttendanceRecord[] =
          Object.values(attendanceByDate);

        // Calculate total working hours and break hours separately
        let totalRawWorkHours = 0;
        let totalBreakHours = 0;
        let totalNetWorkHours = 0;

        uniqueAttendance.forEach((attendance) => {
          const start = new Date(attendance.check_in);
          const end = attendance.check_out
            ? new Date(attendance.check_out)
            : new Date(start.getTime()); // If no check-out, use check-in time (0 hours)

          let hoursWorked =
            (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          totalRawWorkHours += Math.min(hoursWorked, 12); // Cap at 12 hours per day
        });

        // Fetch all breaks related to this attendance
        const { data: breaks, error: breaksError } = await supabase
          .from('breaks')
          .select('start_time, end_time, attendance_id')
          .in(
            'attendance_id',
            uniqueAttendance.map((a) => a.id)
          );

        if (breaksError) throw breaksError;

        // Group breaks by attendance_id for more efficient processing
        const breaksByAttendance = {};
        breaks.forEach((b) => {
          if (!breaksByAttendance[b.attendance_id])
            breaksByAttendance[b.attendance_id] = [];
          breaksByAttendance[b.attendance_id].push(b);
        });

        // Calculate break hours and net working hours for each attendance record
        uniqueAttendance.forEach((attendance) => {
          const start = new Date(attendance.check_in);
          const end = attendance.check_out
            ? new Date(attendance.check_out)
            : new Date(start.getTime());

          let hoursWorked =
            (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          // Handle negative values by using Math.max(0, hoursWorked)
          hoursWorked = Math.max(0, hoursWorked);

          // Calculate breaks for this attendance record
          const attendanceBreaks = breaksByAttendance[attendance.id] || [];
          let breakHoursForThisLog = 0;

          attendanceBreaks.forEach((b) => {
            if (b.start_time) {
              const breakStart = new Date(b.start_time);
              // If end_time is missing, calculate only 1 hour of break
              const breakEnd = b.end_time
                ? new Date(b.end_time)
                : new Date(breakStart.getTime() + 1 * 60 * 60 * 1000); // 1 hour default

              const thisBreakHours =
                (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60);
              breakHoursForThisLog += thisBreakHours;
              totalBreakHours += thisBreakHours;
            }
          });

          // Calculate net hours for this attendance record
          const netHoursForThisLog = Math.max(
            0,
            Math.min(hoursWorked - breakHoursForThisLog, 12)
          );
          totalNetWorkHours += netHoursForThisLog;

          // Log details for each attendance record
          console.log(
            `Attendance ID ${attendance.id}: Raw Hours = ${hoursWorked.toFixed(
              2
            )}h, Break Hours = ${breakHoursForThisLog.toFixed(
              2
            )}h, Net Hours = ${netHoursForThisLog.toFixed(2)}h`
          );
        });

        // Log the totals
        console.log(
          `TOTAL: Raw Working Hours = ${totalRawWorkHours.toFixed(
            2
          )}h, Total Break Hours = ${totalBreakHours.toFixed(
            2
          )}h, Net Working Hours = ${totalNetWorkHours.toFixed(2)}h`
        );

        // Fetch overtime data for the selected month
        const { data: overtimeData, error: overtimeError } = await supabase
          .from('extrahours')
          .select('id, check_in, check_out')
          .eq('user_id', id)
          .gte('check_in', monthStart.toISOString())
          .lte('check_in', monthEnd.toISOString());

        if (overtimeError) {
          console.error('Error fetching overtime data:', overtimeError);
        }

        // Calculate overtime hours
        let totalOvertimeHours = 0;

        if (overtimeData && overtimeData.length > 0) {
          // Fetch breaks for overtime
          const { data: remoteBreakData, error: remoteBreakError } =
            await supabase
              .from('Remote_Breaks')
              .select('start_time, end_time, Remote_Id')
              .in(
                'Remote_Id',
                overtimeData.map((a) => a.id)
              );

          if (remoteBreakError) {
            console.error('Error fetching remote breaks:', remoteBreakError);
          }

          // Group remote breaks by Remote_Id
          const remoteBreaksByAttendance = {};
          if (remoteBreakData) {
            remoteBreakData.forEach((b) => {
              if (!remoteBreaksByAttendance[b.Remote_Id])
                remoteBreaksByAttendance[b.Remote_Id] = [];
              remoteBreaksByAttendance[b.Remote_Id].push(b);
            });
          }

          // Calculate total overtime hours
          overtimeData.forEach((log) => {
            if (log.check_in && log.check_out) {
              const checkIn = new Date(log.check_in);
              const checkOut = new Date(log.check_out);

              let hoursWorked =
                (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

              // Subtract remote breaks
              const remoteBreaks = remoteBreaksByAttendance[log.id] || [];
              let remoteBreakHours = 0;

              remoteBreaks.forEach((b) => {
                if (b.start_time) {
                  const breakStart = new Date(b.start_time);
                  // If end_time is missing, calculate only 1 hour of break
                  const breakEnd = b.end_time
                    ? new Date(b.end_time)
                    : new Date(breakStart.getTime() + 1 * 60 * 60 * 1000); // 1 hour default

                  remoteBreakHours +=
                    (breakEnd.getTime() - breakStart.getTime()) /
                    (1000 * 60 * 60);
                }
              });

              totalOvertimeHours += Math.max(0, hoursWorked - remoteBreakHours);
            }
          });
        }

        console.log('Total Overtime Hours:', totalOvertimeHours.toFixed(2));

        console.log(
          'Setting monthlyStats with workingDaysInMonth:',
          workingDaysInMonth
        );
        setMonthlyStats({
          expectedWorkingDays: workingDaysInMonth,
          totalWorkingDays: uniqueAttendance.length,
          presentDays: uniqueAttendance.filter((a) => a.status === 'present')
            .length,
          lateDays: uniqueAttendance.filter((a) => a.status === 'late').length,
          onSiteDays: uniqueAttendance.filter((a) => a.work_mode === 'on_site')
            .length,
          remoteDays: uniqueAttendance.filter((a) => a.work_mode === 'remote')
            .length,
          averageWorkHours: uniqueAttendance.length
            ? totalNetWorkHours / uniqueAttendance.length
            : 0,
          totalHours: totalNetWorkHours,
          totalOvertimeHours: totalOvertimeHours,
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

  const handleEmployeeClick = async (id: any) => {
    FetchSelectedAttendance(id);
    setfetchingid(id);
  };

  //Graph View Component
  const GraphicViewComponent = ({
    selectedEmployee,
    tableData,
    attendanceLogs,
    monthlyStats,
  }) => {
    if (!selectedEmployee) return null;

    // Data for Graphs
    const chartData = [
      { name: 'On-site', value: monthlyStats?.onSiteDays || 0 },
      { name: 'Remote', value: monthlyStats?.remoteDays || 0 },
    ];
    const colors = ['#4A90E2', '#9B59B6', ''];

    return (
      <div className=" bg-white rounded-lg shadow-lg p-6 mt-6 w-full">
        <h2 className="text-2xl font-bold mb-4">
          {selectedEmployee.full_name}'s Dashboard
        </h2>

        {/* Graphical View */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Pie Chart */}
          <div className="w-full bg-gray-100 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">
              Work Mode Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                >
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
        <div className="w-full  bg-white p-4 rounded-lg shadow-md overflow-x-auto">
          <h3 className="text-lg font-semibold mb-3">Attendance Records</h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                {['Date', 'Check-in', 'Check-out', 'Work Mode'].map(
                  (header, idx) => (
                    <th key={idx} className="border p-2">
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {tableData.length > 0 ? (
                tableData.map(({ id, check_in, check_out, work_mode }) => {
                  return (
                    <tr key={id} className="text-center border-b">
                      {/* Format Date */}
                      <td className="border p-2">
                        {new Date(check_in).toLocaleDateString()}
                      </td>
                      {/* Format Time */}
                      <td className="border p-2">
                        {new Date(check_in).toLocaleTimeString()}
                      </td>
                      <td className="border p-2">
                        {check_out
                          ? new Date(check_out).toLocaleTimeString()
                          : 'N/A'}
                      </td>
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
    const isConfirmed = window.confirm(
      'Are you sure you want to delete this user?'
    );

    if (!isConfirmed) return; // If user cancels, do nothing

    // TODO: Replace with proper API call to delete user
    const error = null; // Temporary placeholder

    if (error) {
      console.error('Error deleting user:', error.message);
      alert('Failed to delete user!'); // Simple error alert
    } else {
      console.log('User deleted successfully!');
      alert('User deleted successfully!');
    }
  };

  const handleModeOpen = (entry) => {
    setisModeOpen(true);
    setSelectedEntry(entry);
  };

  const handleModeModal = () => {
    setisModeOpen(false);
  };

  const handleUpdateMode = () => {
    const updateMode = async () => {
      const { data, error } = await supabase
        .from('attendance_logs')
        .update({ work_mode: WorkMode })
        .eq('user_id', selectedEntry.id)
        .eq('check_in', selectedEntry.check_in2);

      if (data) {
        console.log('Updated data:', data); // Log success
      }

      if (!error) {
        toast.success('Work Mode updated successfully.');
      } else {
        console.error('Error updating Work Mode:', error);
      }
    };
    updateMode();
    setisModeOpen(false);
  };

  const handleShowTasks = (taskIds, projectId) => {
    setSelectedTaskIds(taskIds);
    setSelectedProjectId(projectId);
    setIsTasksModalOpen(true);
  };

  const handleCloseTasksModal = () => {
    setIsTasksModalOpen(false);
    setSelectedTaskIds([]);
    setSelectedProjectId('');
  };
  const downloadPDFFiltered = async () => {
    try {
      const response = await fetch(
        'https://ems-server-0bvq.onrender.com/generate-Filtered',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: AttendanceDataFiltered }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();

      if (blob.type !== 'application/pdf') {
        throw new Error('Received incorrect file format');
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

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeesearch, setDataEmployeesearch] = useState(null);

  const filteredEmployees = (employees || []).filter((employee) =>
    employee?.full_name?.toLowerCase()?.includes(searchTerm.toLowerCase())
  );

  const downloadPDFWeekly = async () => {
    try {
      const response = await fetch(
        'https://ems-server-0bvq.onrender.com/generate-pdfWeekly',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: attendanceDataWeekly }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();

      if (blob.type !== 'application/pdf') {
        throw new Error('Received incorrect file format');
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
    try {
      const response = await fetch(
        'https://ems-server-0bvq.onrender.com/generate-pdfMonthly',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: attendanceDataMonthly }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();

      if (blob.type !== 'application/pdf') {
        throw new Error('Received incorrect file format');
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
      direction === 'prev' ? addWeeks(prevDate, -1) : addWeeks(prevDate, 1)
    );
  };

  useEffect(() => {
    fetchAttendanceData(selectedDate);
  }, [selectedDate]);

  // Fetch attendance data
  const fetchAttendanceData = async (date) => {
    setLoading(true);
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      // Get current user profile
      const userResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/users/${user?.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error(`Failed to fetch user profile: ${userResponse.status}`);
      }

      const userResult = await userResponse.json();
      if (!userResult.success || !userResult.user) {
        throw new Error('Failed to fetch user profile');
      }

      const userprofile = {
        id: userResult.user._id || userResult.user.id,
        full_name: userResult.user.fullName || userResult.user.full_name,
        organization_id: userResult.user.organizationId || userResult.user.organization_id
      };

      // Fetch all users in same organization (excluding admin roles)
      const usersResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/users?organizationId=${userprofile.organization_id}&excludeRoles=client,admin,superadmin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!usersResponse.ok) {
        throw new Error(`Failed to fetch users: ${usersResponse.status}`);
      }

      const usersResult = await usersResponse.json();
      const users = usersResult.success && usersResult.users ? usersResult.users.map((u: any) => ({
        id: u._id || u.id,
        full_name: u.fullName || u.full_name
      })) : [];

      // TODO: Replace with proper API calls to fetch attendance logs
      // For now, using empty data to prevent errors
      const attendanceLogs = [];
      const attendanceError = null;

      // TODO: Replace with proper API calls to fetch breaks
      // For now, using empty data to prevent errors
      const breaksData = [];
      const breaksError = null;

      // Create breaks map
      const breaksMap = new Map();
      if (breaksData) {
        breaksData.forEach((breakItem) => {
          if (!breaksMap.has(breakItem.attendance_id)) {
            breaksMap.set(breakItem.attendance_id, []);
          }
          breaksMap.get(breakItem.attendance_id).push(breakItem);
        });
      }

      // TODO: Replace with proper API calls to fetch absentees
      // For now, using empty data to prevent errors
      const absenteesByDate = [];
      const absenteesByDateError = null;
      const absenteesByCreated = [];
      const absenteesByCreatedError = null;

      // Combine both results, prioritizing absentee_date matches
      let absentees = [];
      if (!absenteesByDateError && absenteesByDate && Array.isArray(absenteesByDate)) {
        absentees = [...absenteesByDate];
      }
      if (!absenteesByCreatedError && absenteesByCreated && Array.isArray(absenteesByCreated)) {
        // Add records from created_at query that aren't already included
        const existingUserIds = new Set((absentees || []).map(a => a?.user_id).filter(Boolean));
        const additionalAbsentees = absenteesByCreated.filter(a => a?.user_id && !existingUserIds.has(a.user_id));
        absentees = [...(absentees || []), ...additionalAbsentees];
      }

      console.log('🔍 Fetched absentees for date:', formattedDate, 'Count:', absentees.length);
      console.log('🔍 Absentees data:', absentees);

      if (absenteesByDateError && absenteesByCreatedError) throw absenteesByDateError;

      // TODO: Replace with proper API call to fetch daily tasks
      // For now, using empty data to prevent errors
      const dailyTasks = [];
      // Map attendance, absentees, and tasks
      const attendanceMap = new Map(
        (attendanceLogs || []).map((log) => [log?.user_id, log])
      );
      const absenteesMap = new Map(
        (absentees || []).map((absent) => [absent?.user_id, absent?.absentee_type])
      );
      const tasksMap = new Map();
      (dailyTasks || []).forEach((task) => {
        if (!tasksMap.has(task.user_id)) {
          tasksMap.set(task.user_id, {
            content: task.content,
            task_ids: task.task_ids || [],
            project_id: task.project_id,
          });
        }
      });

      // Format time helper
      const formatTime = (dateString) => {
        if (!dateString || dateString === 'N/A') return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      };

      // Final data map
      const finalAttendanceData = users.map((user) => {
        const log = attendanceMap.get(user.id);
        const taskData = tasksMap.get(user.id) || {
          content: 'No Task',
          task_ids: [],
          project_id: null,
        };

        if (!log) {
          const absenteeType = absenteesMap.get(user.id);
          return {
            id: user.id,
            full_name: user.full_name,
            check_in: 'N/A',
            check_in2: 'N/A',
            created_at: 'N/A',
            check_out2: 'N/A',
            check_out: 'N/A',
            autocheckout: '',
            work_mode: 'N/A',
            today_task: taskData.content,
            task_ids: taskData.task_ids,
            project_id: taskData.project_id,
            status: absenteeType || 'Absent',
            break_start: 'N/A',
            break_status: 'N/A',
            textColor: absenteeType ? 'text-blue-500' : 'text-red-500',
          };
        }

        const userBreaks = breaksMap.get(log.id) || [];
        const firstBreak = userBreaks[0];
        const currentMonth = new Date().getMonth(); // 0 = January, 11 = December

        return {
          id: user.id,
          full_name: user.full_name,
          attendance_id: log.id,
          check_in2: log.check_in || 'N/A',
          check_out2: log.check_out || '',
          created_at: log.created_at || 'N/A',
          check_in: formatTime(log.check_in),
          check_out: log.check_out ? formatTime(log.check_out) : 'N/A',
          autocheckout: log.autocheckout || '',
          work_mode: log.work_mode || 'N/A',
          today_task: taskData.content,
          task_ids: taskData.task_ids,
          project_id: taskData.project_id,
          status: log.status || 'Absent',
          break_start: firstBreak ? formatTime(firstBreak.start_time) : 'N/A',
          break_status: firstBreak
            ? firstBreak.end_time
              ? 'ended'
              : 'active'
            : 'N/A',
          textColor:
            log.status?.toLowerCase() === 'present'
              ? 'text-green-500'
              : log.status?.toLowerCase() === 'late'
                ? 'text-yellow-500'
                : 'text-red-500',
        };
      });

      const monthForAttendance = new Date();
      const ids = finalAttendanceData.map((eachUser) => eachUser.id);
      console.log('supabase idfdnkdsjfkjasfdkjanfjkdjjjjjjjjjjjjjj', ids);
      ids.forEach(async (userId) => {
        try {
          const result = await dispatch(
            fetchUserAbsentees.initiate({ userId, monthForAttendance })
          ).unwrap(); // ✅ use unwrap() to access data

          const count = result.length || 0;
        } catch (err) {
          console.error('Error fetching absentee:', err);
        }
      });

      // Set data and stats
      setAttendanceData(finalAttendanceData);
      setFilteredData(finalAttendanceData);

      const safeAttendanceData = finalAttendanceData || [];

      const lateCount = safeAttendanceData.filter(
        (entry) => entry?.status?.toLowerCase() === 'late'
      ).length;
      setLate(lateCount);

      const presentCount = safeAttendanceData.filter(
        (entry) => entry?.status?.toLowerCase() === 'present'
      ).length;
      setPresent(presentCount);

      const absentCount = safeAttendanceData.filter(
        (entry) => entry?.status?.toLowerCase() === 'absent'
      ).length;
      setAbsent(absentCount);

      const remoteCount = safeAttendanceData.filter(
        (entry) => entry?.work_mode === 'remote'
      ).length;
      setRemote(remoteCount);

      // Count leave entries separately to include in total
      const leaveCount = safeAttendanceData.filter(
        (entry) => entry?.status?.toLowerCase() === 'leave' ||
          entry?.status?.toLowerCase() === 'full day' ||
          entry?.status?.toLowerCase() === 'half day' ||
          entry?.status?.toLowerCase() === 'sick leave' ||
          entry?.status?.toLowerCase() === 'emergency leave'
      ).length;

      console.log('🔍 Status counts:', {
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        leave: leaveCount,
        total: presentCount + lateCount + absentCount + leaveCount
      });
    } catch (error) {
      setError(error.message);
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const [fetchingid, setfetchingid] = useState('');

  // Pakistan is in UTC+5, so add 5 hours to the UTC time
  const offset = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
  const pakistanTime = new Date(now.getTime() + offset);
  // Handle day change (previous/next)
  const handleDayChange = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'prev' ? -1 : 1));
    setSelectedDate(newDate);

    // console.log("passing time : " , newDate);
    // console.log("pakistan time time : " , pakistanTime);
    if (DetailedVieww === true) {
      FetchSelectedAttendance(fetchingid);
    }
  };
  const handleFilterChange = async (filter) => {
    setCurrentFilter(filter);
    switch (filter) {
      case 'all':
        setFilteredData(attendanceData);
        break;
      case 'present':
        setFilteredData(
          attendanceData.filter(
            (entry) => entry.status.toLowerCase() === 'present'
          )
        );
        break;
      case 'absent':
        setFilteredData(
          attendanceData.filter(
            (entry) => entry.status.toLowerCase() === 'absent'
          )
        );
        break;
      case 'late':
        setFilteredData(
          attendanceData.filter(
            (entry) => entry.status.toLowerCase() === 'late'
          )
        );
        break;
      case 'remote':
        setFilteredData(
          attendanceData.filter((entry) => entry.work_mode === 'remote')
        );
        break;
      case 'leave':
        // Use the already fetched leave requests data
        setFilteredData([]);
        break;
      default:
        setFilteredData(attendanceData);
    }
  };

  // Handle row click to show detailed view
  const handleRowClickDaily = (userId: string, userName: string) => {
    setSelectedUserForDetail({ id: userId, name: userName });
  };

  // Handle closing the detail view
  const handleCloseDetailDaily = () => {
    setSelectedUserForDetail(null);
  };

  const handlenotification = () => {
    Notification.requestPermission().then(() => {
      const notification = new Notification('Office Time Update', {
        body: 'Please note that our office time is from 9:00 AM to 4:00 PM.',
        icon: './efficiency.png',
      });
    });
  };

  const handleDateFilter = () => {
    setSelectedTab('Filter');
    setsearch((prev) => !prev);
  };

  const [DetailedVieww, setDetailedVieww] = useState(false);
  const handleGraphicViewClick = () => {
    setgraphicview(true);
  };
  const handleDetailedViewClick = () => {
    setgraphicview(false);
    setDetailedVieww(true);
  };
  const handleTableViewClick = () => {
    setgraphicview(false);
  };
  const isSideBarOpen = useSelector((state: RootState) => state.sideBar.isOpen);
  const statusFonts = ` ${isSideBarOpen ? 'text-xl' : 'text-xl'}`;
  const tableHeading = `py-1 xs:py-1.5 sm:py-2 md:py-3 px-1 xs:px-2 sm:px-3 md:px-6 text-left whitespace-nowrap ${isSideBarOpen ? 'text-[8px]' : 'text-[12px]'
    }`;

  // Handle error state
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-full bg-gray-100 w-full">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col  justify-center  items-center min-h-full  bg-gray-10 w-full ">
      {/* Heading */}
      <div className=" w-full  max-w-full flex justify-start items-center text-start ">
        {maintab === 'TableView' && (
          <h1 className="sm:text-2xl text-xl   font-bold text-gray-800 mb-4 border-gray-200 pb-2">
            Employee Attendance
          </h1>
        )}
        {maintab === 'DetailedView' && (
          <h1 className="sm:text-2xl  font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Employee Details
          </h1>
        )}
        {maintab === 'GraphicView' && (
          <h1 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Graph Data
          </h1>
        )}
        <select
          className="p-2 mb-3 transition-all ease-in-out rounded-md focus:outline-none focus:ring-2 focus:ring-[#9A00FF] ml-10"
          onChange={(e) => {
            setmaintab(e.target.value);
            if (e.target.value === 'GraphicView') {
              handleGraphicViewClick(); // Call the event for the third option
            }
            if (e.target.value === 'DetailedView') {
              handleDetailedViewClick(); // Call the event for the third option
            }
            if (e.target.value === 'TableView') {
              handleTableViewClick(); // Call the event for the third option
            }
          }}
        >
          <option value="TableView" className="mt-4">
            Table View
          </option>
          <option value="DetailedView">Detailed View</option>
          <option value="GraphicView">Graphic View</option>
        </select>
      </div>
      {/* Buttons and Date Navigation */}
      <div className="w-full max-w-full flex flex-wrap justify-between items-center mb-6">
        {/* Buttons Row */}
        {maintab === 'DetailedView' && <div></div>}
        {maintab === 'TableView' && (
          <>
            <div className="sm:w-[40%] w-[100%]  hidden sm:mx-0 mx-auto  md:flex justify-start md:space-x-4 space-x-2 ">
              <button
                onClick={() => setSelectedTab('Daily')}
                className={`px-4 py-2 rounded-lg transition-all ${selectedTab === 'Daily'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
              >
                Daily
              </button>
              <button
                onClick={() => setSelectedTab('Weekly')}
                className={`px-4 py-2 rounded-lg transition-all ${selectedTab === 'Weekly'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setSelectedTab('Monthly')}
                className={`px-4 py-2 rounded-lg transition-all ${selectedTab === 'Monthly'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setSelectedTab('Filter')}
                className={`px-4 py-2 rounded-lg transition-all ${selectedTab === 'Filter'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Filter
              </button>
            </div>

            <div className="md:hidden block mx-auto">
              <select
                className="p-2 mb-3 border border-gray-300 transition-all ease-in-out rounded-md focus:outline-none focus:ring-2 focus:ring-[#9A00FF] w-full sm:w-auto"
                value={selectedTab}
                onChange={(e) => setSelectedTab(e.target.value)}
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Filter">Filter</option>
              </select>
            </div>
          </>
        )}
        <div className="flex flex-row sm:gap-5  lg:flex-nowrap flex-wrap justify-cente md:mx-0 mx-auto">
          {/* Date Navigation */}
          {maintab === 'DetailedView' && (
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleDayChange('prev')}
                className="p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <input
                className="md:text-xl ml-0 text-sm font-semibold"
                type="date"
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
              />

              <button
                onClick={() => handleDayChange('next')}
                className="p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {maintab === 'TableView' && selectedTab === 'Daily' && (
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleDayChange('prev')}
                className="p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {/* <span className="md:text-xl font-semibold ">
                {format(selectedDate, "MMMM d, yyyy")}
              </span> */}
              <input
                className="md:text-xl ml-0 text-sm font-semibold"
                type="date"
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
              />
              <button
                onClick={() => handleDayChange('next')}
                className="p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
          {maintab === 'TableView' && selectedTab === 'Monthly' && (
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => handleMonthChange('prev')}
                className="p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="mx-4 text-xl font-semibold">
                {format(selectedDateM, 'MMMM yyyy')}
              </span>
              <button
                onClick={() => handleMonthChange('next')}
                className="p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
          {maintab === 'TableView' && selectedTab === 'Weekly' && (
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => handleWeekChange('prev')}
                className="md:p-2 p-0 hover:bg-gray-200 rounded-full transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {/* <span className="mx-4 text-xl font-semibold">
                {format(selectedDateW, "MMMM yyyy")}
              </span> */}
              <input
                className="md:text-xl ml-0 text-sm font-semibold"
                type="date"
                value={selectedDateW ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setSelectedDateW(new Date(e.target.value))}
              />
              <button
                onClick={() => {
                  handleWeekChange('next');
                  // console.log("selectedDateW", selectedDateW);
                }}
                className="md:p-2 p-0 hover:bg-gray-200 rounded-full transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
          {maintab === 'TableView' && selectedTab === 'Filter' && (
            <>
              {/* Mobile: Button to open modal */}
              <div className="smi:hidden flex justify-center mb-4">
                <button
                  onClick={() => setIsDateModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                  Filter Dates
                </button>
              </div>

              {/* Desktop: Inline layout */}
              <div className="hidden smi:flex md:flex-nowrap flex-wrap items-center justify-center space-x-4">
                <input
                  type="date"
                  value={startdate}
                  onChange={(e) => setStartdate(e.target.value)}
                  className="p-2 border ml-10 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="mx-2 text-xl font-semibold">to</span>
                <input
                  type="date"
                  value={enddate}
                  onChange={(e) => setEnddate(e.target.value)}
                  className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleDateFilter}
                  className="p-2 hover:bg-gray-300 rounded-2xl px-5 py-3 transition-all"
                >
                  <SearchIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Modal for small screens */}
              <Transition appear show={isDateModalOpen} as={Fragment}>
                <Dialog
                  as="div"
                  className="relative z-10 smi:hidden"
                  onClose={() => setIsDateModalOpen(false)}
                >
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                  </Transition.Child>

                  <div className="fixed inset-0 overflow-y-auto flex items-center justify-center">
                    <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-xl shadow-xl">
                      <Dialog.Title className="text-lg font-semibold mb-4">
                        Select Date Range
                      </Dialog.Title>
                      <div className="space-y-4">
                        <input
                          type="date"
                          value={startdate}
                          onChange={(e) => setStartdate(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="date"
                          value={enddate}
                          onChange={(e) => setEnddate(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => {
                            handleDateFilter();
                            setIsDateModalOpen(false);
                          }}
                          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
                        >
                          <SearchIcon className="inline-block w-5 h-5 mr-2" />
                          Search
                        </button>
                      </div>
                    </Dialog.Panel>
                  </div>
                </Dialog>
              </Transition>
            </>
          )}
          {maintab === 'TableView' && selectedTab === 'Daily' && (
            <button
              className="hover:bg-gray-300 px-6 py-2 rounded-2xl transition-all"
              onClick={downloadPDF}
            >
              <DownloadIcon />{' '}
            </button>
          )}
          {maintab === 'TableView' && selectedTab === 'Weekly' && (
            <button
              className="hover:bg-gray-300 px-6 py-2 rounded-2xl transition-all"
              onClick={async () => {
                await downloadPDFWeekly();
              }}
            >
              <DownloadIcon />{' '}
            </button>
          )}
          {maintab === 'TableView' && selectedTab === 'Monthly' && (
            <button
              className="hover:bg-gray-300 px-6 py-2 rounded-2xl transition-all"
              onClick={downloadPDFMonthly}
            >
              <DownloadIcon />{' '}
            </button>
          )}
          {maintab === 'TableView' && selectedTab === 'Filter' && (
            <button
              className="hover:bg-gray-300 px-6 py-2 rounded-2xl transition-all md:ml-0 sm:ml-10 mx-auto"
              onClick={downloadPDFFiltered}
            >
              <DownloadIcon />{' '}
            </button>
          )}
        </div>
      </div>

      {/* Loading Animation */}
      {loading && (
        <div className="w-full max-w-7xl space-y-4">
          {[...Array(5)].map((_, index) => (
            <div
              key={index}
              className="w-full h-16 bg-gray-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Attendance Summary */}
      {!loading && maintab === 'TableView' && selectedTab === 'Daily' && (
        <>
          <div
            className={`w-full overflow-x-auto bg-white p-6 rounded-lg shadow-lg mb-6`}
          >
            <div
              className={`flex sm:flex-nowrap justify-between flex-wrap ${isSideBarOpen ? ' space-x-5' : ''
                } items-center text-lg font-medium`}
            >
              <button
                onClick={() => handleFilterChange('all')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-3xl hover:bg-gray-200 transition-all ${currentFilter === 'all' ? 'bg-gray-200' : ''
                  }`}
              >
                <span className="md:w-4 md:h-4   bg-gray-600 rounded-full"></span>
                <h2 className={`${statusFonts} text-gray-600`}>
                  Total:{' '}
                  <span className="font-bold">{present + absent + late + (leaveRequestsData?.length || 0)}</span>
                </h2>
              </button>
              <button
                onClick={() => handleFilterChange('present')}
                className={`flex  items-center space-x-2 px-4 py-2 rounded-3xl hover:bg-green-100 transition-all${currentFilter === 'present' ? 'bg-green-200' : ''
                  }`}
              >
                <span className="md:w-4 md:h-4 bg-green-500 rounded-full"></span>
                <h2 className={`${statusFonts}text-green-600`}>
                  Present: <span className="font-bold">{present}</span>
                </h2>
              </button>
              <button
                onClick={() => handleFilterChange('late')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-3xl hover:bg-yellow-200 transition-all${currentFilter === 'late' ? 'bg-yellow-100' : ''
                  }`}
              >
                <span className="md:w-4 md:h-4 bg-yellow-500 rounded-full"></span>
                <h2 className={`${statusFonts} text-yellow-600`}>
                  Late: <span className="font-bold">{late}</span>
                </h2>
              </button>
              <button
                onClick={() => handleFilterChange('remote')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-3xl hover:bg-purple-100 transition-all${currentFilter === 'remote' ? 'bg-purple-100' : ''
                  }`}
              >
                <span className="md:w-4 md:h-4 bg-purple-500 rounded-full"></span>
                <h2 className="text-purple-600 md:text-xl text-sm">
                  Remote: <span className="font-bold">{remote}</span>
                </h2>
              </button>
              <button
                onClick={() => handleFilterChange('leave')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-3xl hover:bg-purple-100 transition-all${currentFilter === 'leave' ? ' bg-purple-100' : ''
                  }`}
              >
                <span className="md:w-4 md:h-4 bg-purple-500 rounded-full"></span>
                <h2 className="text-purple-600 md:text-xl text-sm">
                  Leave:{' '}
                  <span className="font-bold">
                    {leaveRequestsData?.length || 0}
                  </span>
                </h2>
              </button>
              <button
                onClick={() => handleFilterChange('absent')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-3xl hover:bg-red-100 transition-all${currentFilter === 'absent' ? 'bg-red-100' : ''
                  }`}
              >
                <span className="md:w-4 md:h-4 bg-red-500 rounded-full"></span>
                <h2 className="text-red-600 md:text-xl text-sm">
                  Absent: <span className="font-bold">{absent}</span>
                </h2>
              </button>
            </div>
          </div>
          {currentFilter === 'leave' ? (
            // Leave Requests View
            <div className="w-full overflow-x-auto max-w-7xl bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-purple-700">
                  Approved Leave Requests
                </h2>
                <div className="text-sm text-gray-500">
                  {format(selectedDate, 'MMMM d, yyyy')} •{' '}
                  {leaveRequestsData.length}{' '}
                  {leaveRequestsData.length === 1 ? 'person' : 'people'} on
                  leave
                </div>
              </div>
              {leaveRequestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-2 text-gray-600">
                    Loading leave requests...
                  </span>
                </div>
              ) : leaveRequestsData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white text-sm border border-gray-200">
                    <thead className="bg-gray-50 text-gray-700 uppercase">
                      <tr>
                        <th className="py-3 px-4 text-left border-b">
                          FULL NAME
                        </th>
                        <th className="py-3 px-4 text-left border-b">EMAIL</th>
                        <th className="py-3 px-4 text-left border-b">
                          LEAVE TYPE
                        </th>
                        <th className="py-3 px-4 text-left border-b">DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequestsData.map((req, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">
                            {req.full_name}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {req.user_email}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                              {req.leave_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {req.leave_date}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-6xl mb-4">📅</div>
                  <p className="text-gray-500 text-lg font-medium mb-2">
                    No approved leave requests for today
                  </p>
                  <p className="text-gray-400 text-sm">
                    {format(selectedDate, 'MMMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Regular Attendance View
            <div className="w-full border  overflow-x-auto  bg-white  rounded-lg shadow-lg">
              {error && <p className="text-red-500 text-center">{error}</p>}
              <div className="overflow-x-auto">
                <div className="w-full shadow-sm rounded-lg">
                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="min-w-[320px] w-full bg-white text-[11px] xs:text-[12px] sm:text-sm">
                      <thead className="bg-gray-50 text-gray-700 uppercase text-[10px]   sm:text-xs md:text-sm leading-normal">
                        <tr>
                          <th className={tableHeading}>Name</th>
                          <th className={tableHeading}>Check-in</th>
                          <th className={tableHeading}>Check-out</th>
                          <th className={tableHeading}>Break Start</th>

                          <th className={tableHeading}>Break End</th>
                          <th className={tableHeading}>Today's Task</th>
                          <th className={tableHeading}>Mode</th>
                          <th className={tableHeading}>Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-[10px] xs:text-[11px] sm:text-sm md:text-md font-normal">
                        {filteredData.map((entry, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-200 hover:bg-gray-50 transition-all cursor-pointer"
                            onClick={() =>
                              handleRowClickDaily(entry.id, entry.full_name)
                            }
                          >
                            <td className="py-1.5 xs:py-2 sm:py-3 md:py-4 px-1 xs:px-2 sm:px-3 md:px-6 truncate max-w-[80px] xs:max-w-[100px] sm:max-w-none">
                              <span
                                className={` py-0.5 xs:py-1 ${entry.status === 'present'
                                    ? 'text-green-600'
                                    : entry.status === 'late'
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                  }`}
                                title={entry.full_name}
                              >
                                {entry.full_name.charAt(0).toUpperCase() +
                                  entry.full_name.slice(1)}
                              </span>
                            </td>
                            <td
                              className="py-1.5 xs:py-2 sm:py-3 text-[8px] font-bold md:py-4 px-1 xs:px-2 sm:px-3 md:px-6 hover:cursor-pointer hover:bg-gray-100"
                              onClick={() => handleCheckinOpenModal(entry)}
                            >
                              {entry.check_in}
                            </td>
                            <td
                              className="py-1.5 xs:py-2 sm:py-3 md:py-4 text-[8px] font-bold px-1 xs:px-2 sm:px-3 md:px-6 hover:cursor-pointer hover:bg-gray-100"
                              onClick={() => handleOpenModal(entry)}
                            >
                              <div className="flex items-center">
                                <span className="truncate">
                                  {entry.check_out}
                                </span>
                                {entry.autocheckout ? (
                                  <div className="relative inline-block ml-0.5 xs:ml-1 sm:ml-2">
                                    <span className="text-yellow-600 bg-yellow-100 px-0.5 xs:px-1 sm:px-2 py-0.5 font-semibold rounded-xl text-[9px] xs:text-[10px] sm:text-xs">
                                      Auto
                                    </span>
                                    {/* Tooltip */}
                                    <div className="hidden group-hover:block absolute bg-gray-400 text-white text-[9px] xs:text-xs md:text-sm px-1 xs:px-2 py-0.5 w-max rounded mt-1 -ml-2 z-10">
                                      Change CheckOut Time
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </td>

                            <td className="py-1.5 xs:py-2 sm:py-3 md:py-4 px-1 xs:px-2 sm:px-3 md:px-6 text-[8px] font-bold">
                              {entry.break_start || 'N/A'}
                            </td>

                            <td className="py-1.5 xs:py-2 sm:py-3 md:py-4 px-1 xs:px-2 sm:px-3 md:px-6 hover:cursor-pointer hover:bg-gray-100">
                              <div className="flex items-center">
                                <span className="truncate text-[8px] font-bold">
                                  {getuserbreakdate(entry?.attendance_id)}
                                </span>
                                {entry.break_in ? (
                                  <div className="relative inline-block ml-0.5 xs:ml-1 sm:ml-2">
                                    <span className="text-yellow-600 bg-yellow-100 px-0.5 xs:px-1 sm:px-2 py-0.5 font-semibold rounded-xl text-[9px] xs:text-[10px] sm:text-xs">
                                      Auto
                                    </span>
                                    {/* Tooltip */}
                                    <div className="hidden group-hover:block absolute bg-gray-400 text-white text-[9px] xs:text-xs md:text-sm px-1 xs:px-2 py-0.5 w-max rounded mt-1 -ml-2 z-10">
                                      Change CheckOut Time
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </td>

                            <td className="relative group pl-6">
                              {entry.today_task ? (
                                <div
                                  className={
                                    isSideBarOpen ? 'text-[10px]' : 'text-sm'
                                  }
                                >
                                  <span className="text-gray-400">
                                    {entry.today_task}
                                  </span>

                                  <div className="hidden group-hover:block absolute bg-gray-300 text-white left-px px-1 xs:px-2 py-0.5 w-max rounded mt-1 -ml-2 z-10">
                                    {/* Tooltip content here if needed */}
                                  </div>

                                  {entry.task_ids &&
                                    entry.task_ids.length > 0 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleShowTasks(
                                            entry.task_ids,
                                            entry.project_id
                                          );
                                        }}
                                        className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors w-fit mt-1"
                                      >
                                        Show Tasks
                                      </button>
                                    )}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">
                                  No task
                                </span>
                              )}
                            </td>

                            <td className="py-1.5 xs:py-2 sm:py-3 md:py-4 px-1 xs:px-2 sm:px-3 md:px-6">
                              <button
                                onClick={() => handleModeOpen(entry)}
                                className={`px-0.5 xs:px-1 sm:px-2 md:px-3 py-0.5 xs:py-1 rounded-full text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-semibold ${entry.work_mode === 'on_site'
                                    ? 'bg-blue-100 text-blue-800'
                                    : entry.work_mode === 'remote'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-white text-black'
                                  }`}
                              >
                                {entry.work_mode === 'on_site'
                                  ? 'On-site'
                                  : entry.work_mode === 'remote'
                                    ? 'Remote'
                                    : '---'}
                              </button>
                            </td>
                            <td className="py-1.5 sm:py-3 md:py-4 px-1 sm:px-3 md:px-6">
                              <button
                                type="button"
                                onClick={() => handleopenabsentmodal(entry.id)}
                              >
                                <span
                                  className={`px-1 sm:px-2 md:px-3 py-1 rounded-full text-[10px] sm:text-xs md:text-sm font-semibold ${entry.status === 'present'
                                      ? 'bg-green-100 text-green-800'
                                      : entry.status === 'late'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : entry.status === 'leave'
                                          ? 'text-purple-900 bg-purple-300'
                                          : 'bg-red-100 text-red-800'
                                    }`}
                                >
                                  {entry.status == 'Full Day'
                                    ? 'Leave'
                                    : entry.status}
                                </span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Card view for small screens */}
                  <div className="sm:hidden">
                    {filteredData.map((entry, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-lg shadow-sm mb-3 p-3 text-[11px] xs:text-[12px] cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() =>
                          handleRowClickDaily(entry.id, entry.full_name)
                        }
                      >
                        <div className="flex justify-between items-center mb-2 border-b pb-2">
                          <span
                            className={`font-medium text-[12px] xs:text-[13px] ${entry.status === 'present'
                                ? 'text-green-600'
                                : entry.status === 'late'
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            title={entry.full_name}
                          >
                            {entry.full_name.charAt(0).toUpperCase() +
                              entry.full_name.slice(1)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleopenabsentmodal(entry.id)}
                            className="focus:outline-none"
                          >
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[9px] xs:text-[10px] font-semibold ${entry.status === 'present'
                                  ? 'bg-green-100 text-green-800'
                                  : entry.status === 'late'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                            >
                              {entry.status == 'Full Day'
                                ? 'Leave'
                                : entry.status}
                            </span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[8px]">
                              Check-in
                            </span>
                            <div
                              className="font-medium hover:bg-gray-50 p-1 rounded cursor-pointer"
                              onClick={() => handleCheckinOpenModal(entry)}
                            >
                              {entry.check_in || '---'}
                            </div>
                          </div>

                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[10px] xs:text-[11px]">
                              Check-out
                            </span>
                            <div
                              className="font-medium hover:bg-gray-50 p-1 rounded cursor-pointer flex items-center"
                              onClick={() => handleOpenModal(entry)}
                            >
                              <span className="truncate mr-1">
                                {entry.check_out || '---'}
                              </span>
                              {entry.autocheckout ? (
                                <span className="text-yellow-600 bg-yellow-100 px-1 py-0.5 font-semibold rounded-xl text-[9px]">
                                  Auto
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[8px]">
                              Break Start
                            </span>
                            <div className="font-medium p-1">
                              {entry.break_start || '---'}
                            </div>
                          </div>

                          {/* Added 2nd Check-in for mobile view */}
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[8px]">
                              2nd Check-in
                            </span>
                            <div className="font-medium hover:bg-gray-50 p-1 rounded cursor-pointer flex items-center">
                              <span className="truncate mr-1">
                                {getuserbreakdate(entry?.attendance_id) ||
                                  '---'}
                              </span>
                              <span>
                                <TaskCell task={entry.today_task} />
                              </span>
                              {entry.break_in ? (
                                <span className="text-yellow-600 bg-yellow-100 px-1 py-0.5 font-semibold rounded-xl text-[9px]">
                                  Auto
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[10px] xs:text-[11px]">
                              Today's Task
                            </span>
                            <div className="font-medium p-1">
                              <TaskCell task={entry.today_task} />
                              {entry.task_ids && entry.task_ids.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowTasks(
                                      entry.task_ids,
                                      entry.project_id
                                    );
                                  }}
                                  className="px-2 py-0.5 bg-blue-500 text-white rounded text-[9px] hover:bg-blue-600 transition-colors mt-1"
                                >
                                  Show Tasks
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[10px] xs:text-[11px]">
                              Mode
                            </span>
                            <div className="mt-1">
                              <button
                                onClick={() => handleModeOpen(entry)}
                                className={`px-2 py-0.5 rounded-full text-[9px] xs:text-[10px] font-semibold ${entry.work_mode === 'on_site'
                                    ? 'bg-blue-100 text-blue-800'
                                    : entry.work_mode === 'remote'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                              >
                                {entry.work_mode === 'on_site'
                                  ? 'On-site'
                                  : entry.work_mode === 'remote'
                                    ? 'Remote'
                                    : '---'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Transition appear show={modalVisible} as={Fragment}>
                      <Dialog
                        as="div"
                        className="relative z-10"
                        onClose={handleabsentclosemodal}
                      >
                        <Transition.Child
                          as={Fragment}
                          enter="ease-out duration-300"
                          enterFrom="opacity-0"
                          enterTo="opacity-100"
                          leave="ease-in duration-200"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <div className="fixed inset-0 bg-black bg-opacity-25" />
                        </Transition.Child>

                        <div className="fixed inset-0 overflow-y-auto">
                          <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                              as={Fragment}
                              enter="ease-out duration-300"
                              enterFrom="opacity-0 scale-95"
                              enterTo="opacity-100 scale-100"
                              leave="ease-in duration-200"
                              leaveFrom="opacity-100 scale-100"
                              leaveTo="opacity-0 scale-95"
                            >
                              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                  as="h3"
                                  className="text-lg font-medium leading-6 text-gray-900 text-center mb-6"
                                >
                                  Mark Him Leave
                                </Dialog.Title>

                                {/* Loading State */}
                                {absentloading && (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <span className="ml-3 text-gray-600">Loading...</span>
                                  </div>
                                )}

                                {/* Error State */}
                                {absentError && !absentloading && (
                                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                                    <div className="flex">
                                      <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                      <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">
                                          Error
                                        </h3>
                                        <div className="mt-2 text-sm text-red-700">
                                          {absentError}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Form Content - Only show if no error and not loading */}
                                {!absentError && !absentloading && (
                                  <div className="mt-4">
                                    <RadioGroup
                                      value={selectedMode}
                                      onChange={setSelectedMode}
                                      className="space-y-4"
                                    >
                                      <RadioGroup.Option value="Absent">
                                        {({ checked }) => (
                                          <div className="flex items-center">
                                            <div
                                              className={`w-5 h-5 rounded-full border ${checked
                                                ? 'border-4 border-blue-500'
                                                : 'border border-gray-300'
                                                }`}
                                            />
                                            <span className="ml-3 text-gray-800">
                                              Absent
                                            </span>
                                          </div>
                                        )}
                                      </RadioGroup.Option>
                                      <RadioGroup.Option value="Full Day">
                                        {({ checked }) => (
                                          <div className="flex items-center">
                                            <div
                                              className={`w-5 h-5 rounded-full border ${checked
                                                ? 'border-4 border-blue-500'
                                                : 'border border-gray-300'
                                                }`}
                                            />
                                            <span className="ml-3 text-gray-800">
                                              Casual Leave
                                            </span>
                                          </div>
                                        )}
                                      </RadioGroup.Option>
                                      <RadioGroup.Option value="Half Day">
                                        {({ checked }) => (
                                          <div className="flex items-center">
                                            <div
                                              className={`w-5 h-5 rounded-full border ${checked
                                                ? 'border-4 border-blue-500'
                                                : 'border border-gray-300'
                                                }`}
                                            />
                                            <span className="ml-3 text-gray-800">
                                              Half Day Leave
                                            </span>
                                          </div>
                                        )}
                                      </RadioGroup.Option>
                                      <RadioGroup.Option value="Sick Leave">
                                        {({ checked }) => (
                                          <div className="flex items-center">
                                            <div
                                              className={`w-5 h-5 rounded-full border ${checked
                                                ? 'border-4 border-blue-500'
                                                : 'border border-gray-300'
                                                }`}
                                            />
                                            <span className="ml-3 text-gray-800">
                                              Sick Leave
                                            </span>
                                          </div>
                                        )}
                                      </RadioGroup.Option>

                                      <RadioGroup.Option value="Emergency Leave">
                                        {({ checked }) => (
                                          <div className="flex items-center">
                                            <div
                                              className={`w-5 h-5 rounded-full border ${checked
                                                ? 'border-4 border-blue-500'
                                                : 'border border-gray-300'
                                                }`}
                                            />
                                            <span className="ml-3 text-gray-800">
                                              Emergency Leave
                                            </span>
                                          </div>
                                        )}
                                      </RadioGroup.Option>
                                    </RadioGroup>
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="mt-8 flex justify-end space-x-3">
                                  <button
                                    type="button"
                                    className="inline-flex justify-center rounded-md border border-gray-300 bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none"
                                    onClick={handleabsentclosemodal}
                                  >
                                    Cancel
                                  </button>
                                  {/* Only show Save button if no error */}
                                  {!absentError && (
                                    <button
                                      type="button"
                                      disabled={absentloading}
                                      className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none ${absentloading
                                          ? 'bg-gray-400 cursor-not-allowed'
                                          : 'bg-blue-500 hover:bg-blue-600'
                                        }`}
                                      onClick={handleSaveChanges}
                                    >
                                      {absentloading ? (
                                        <div className="flex items-center">
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                          Saving...
                                        </div>
                                      ) : (
                                        'Save'
                                      )}
                                    </button>
                                  )}
                                </div>
                              </Dialog.Panel>
                            </Transition.Child>
                          </div>
                        </div>
                      </Dialog>
                    </Transition>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">
                  Change CheckOut Time
                </h2>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    New CheckOut Time
                  </label>

                  {/* Time Picker Container */}
                  <div className="time-picker-container">
                    <div className="clock bg-gray-100 p-4 rounded-lg shadow-md">
                      <div className="time-display text-4xl font-bold text-center text-gray-800 mb-4">
                        <span>
                          {hour.toString().padStart(2, '0').slice(0, 2)}:
                        </span>
                        <span>
                          {minute.toString().padStart(2, '0').slice(0, 2)}
                        </span>
                      </div>

                      {/* AM/PM Toggle */}
                      <div className="am-pm-toggle flex justify-center space-x-4">
                        <button
                          onClick={toggleAMPM}
                          className={`am-pm-btn px-4 py-2 rounded-full text-lg ${isAM ? 'bg-blue-500 text-white' : 'bg-gray-300'
                            }`}
                        >
                          AM
                        </button>
                        <button
                          onClick={toggleAMPM}
                          className={`am-pm-btn px-4 py-2 rounded-full text-lg ${!isAM ? 'bg-blue-500 text-white' : 'bg-gray-300'
                            }`}
                        >
                          PM
                        </button>
                      </div>
                    </div>

                    {/* Input Section for Hour and Minute */}
                    <div className="input-section grid grid-cols-2 gap-4 mt-6">
                      <div className="input-group">
                        <label className="text-sm font-medium text-gray-700">
                          Hour
                        </label>
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
                                e.target.value = value.slice(0, 2); // Trim to 2 digits if more than 2 characters
                              }
                            }}
                            className="input px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-center"
                          />
                          <div className="absolute top-1/2 transform -translate-y-1/2 right-2 flex space-x-2">
                            <button
                              onClick={() =>
                                handleHourChange({
                                  target: { value: Math.min(12, hour + 1) },
                                })
                              }
                              className="text-xl text-gray-600 w-4 hover:text-blue-500"
                            >
                              &#8593;
                            </button>
                            <button
                              onClick={() =>
                                handleHourChange({
                                  target: { value: Math.max(1, hour - 1) },
                                })
                              }
                              className="text-xl text-gray-600 w-4 hover:text-blue-500"
                            >
                              &#8595;
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="input-group">
                        <label className="text-sm font-medium text-gray-700">
                          Minute
                        </label>
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
                                e.target.value = value.slice(0, 2); // Trim to 2 digits if more than 2 characters
                              }
                            }}
                            className="input px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-center"
                          />
                          <div className="absolute top-1/2 transform -translate-y-1/2 right-2 flex space-x-2">
                            <button
                              onClick={() =>
                                handleMinuteChange({
                                  target: { value: Math.min(59, minute + 1) },
                                })
                              }
                              className="text-xl text-gray-600 w-4 hover:text-blue-500"
                            >
                              &#8593;
                            </button>
                            <button
                              onClick={() =>
                                handleMinuteChange({
                                  target: { value: Math.max(0, minute - 1) },
                                })
                              }
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
                <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">
                  Change Work Mode
                </h2>

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
                <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">
                  Change CheckIn Time
                </h2>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    New CheckIn Time
                  </label>

                  {/* Time Picker Container */}
                  <div className="time-picker-container">
                    <div className="clock bg-gray-100 p-4 rounded-lg shadow-md">
                      <div className="time-display text-4xl font-bold text-center text-gray-800 mb-4">
                        <span>
                          {hourin.toString().padStart(2, '0').slice(0, 2)}:
                        </span>
                        <span>
                          {minutein.toString().padStart(2, '0').slice(0, 2)}
                        </span>
                      </div>

                      {/* AM/PM Toggle */}
                      <div className="am-pm-toggle flex justify-center space-x-4">
                        <button
                          onClick={togglecheckinAMPM}
                          className={`am-pm-btn px-4 py-2 rounded-full text-lg ${isinAM ? 'bg-blue-500 text-white' : 'bg-gray-300'
                            }`}
                        >
                          AM
                        </button>
                        <button
                          onClick={togglecheckinAMPM}
                          className={`am-pm-btn px-4 py-2 rounded-full text-lg ${!isinAM ? 'bg-blue-500 text-white' : 'bg-gray-300'
                            }`}
                        >
                          PM
                        </button>
                      </div>
                    </div>

                    {/* Input Section for Hour and Minute */}
                    <div className="input-section grid grid-cols-2 gap-4 mt-6">
                      <div className="input-group">
                        <label className="text-sm font-medium text-gray-700">
                          Hour
                        </label>
                        <div className="relative">
                          <input
                            className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-center"
                            type="number"
                            value={hourin}
                            onChange={handleCheckInHourChange}
                            max="12"
                            min="01"
                            onInput={(e) => {
                              // Ensure the input is only a 2-digit number
                              const value = e.target.value;
                              if (value.length > 2) {
                                e.target.value = value.slice(0, 2); // Trim to 2 digits if more than 2 characters
                              }
                            }}
                          // className="input px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-center"
                          />
                          <div className="absolute top-1/2 transform -translate-y-1/2 right-2 flex space-x-2">
                            <button
                              onClick={() =>
                                handleCheckInHourChange({
                                  target: { value: Math.min(12, hourin + 1) },
                                })
                              }
                              className="text-xl text-gray-600 w-4 hover:text-blue-500"
                            >
                              &#8593;
                            </button>
                            <button
                              onClick={() =>
                                handleCheckInHourChange({
                                  target: { value: Math.max(1, hourin - 1) },
                                })
                              }
                              className="text-xl text-gray-600 w-4 hover:text-blue-500"
                            >
                              &#8595;
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="input-group">
                        <label className="text-sm font-medium text-gray-700">
                          Minute
                        </label>
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
                                e.target.value = value.slice(0, 2); // Trim to 2 digits if more than 2 characters
                              }
                            }}
                            className="input px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-center"
                          />
                          <div className="absolute top-1/2 transform -translate-y-1/2 right-2 flex space-x-2">
                            <button
                              onClick={() =>
                                handleCheckInMinuteChange({
                                  target: { value: Math.min(59, minutein + 1) },
                                })
                              }
                              className="text-xl text-gray-600 w-4 hover:text-blue-500"
                            >
                              &#8593;
                            </button>
                            <button
                              onClick={() =>
                                handleCheckInMinuteChange({
                                  target: { value: Math.max(0, minutein - 1) },
                                })
                              }
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
      {!loading && maintab === 'TableView' && selectedTab === 'Monthly' && (
        <EmployeeMonthlyAttendanceTable selectedDateM={selectedDateM} />
      )}
      {!loading && maintab === 'TableView' && selectedTab === 'Weekly' && (
        <EmployeeWeeklyAttendanceTable selectedDateW={selectedDateW} />
      )}
      {!loading && maintab === 'TableView' && selectedTab === 'Filter' && (
        <FilteredDataAdmin
          search={search}
          startdate={startdate}
          enddate={enddate}
        />
      )}
      {!loading && maintab === 'GraphicView' && (
        <div className="col-span-12 sm:col-span-4 md:col-span-3 lg:col-span-3">
          <GraphicViewComponent
            selectedEmployee={selectedEmployee}
            attendanceLogs={attendanceLogs}
            monthlyStats={monthlyStats}
            tableData={tableData}
          />
        </div>
      )}
      {!loading && maintab === 'DetailedView' && (
        <>
          <div className="flex-1">
            <div className="flex flex-row justify-between">
              <div></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4">
              {/* Employee List for small screens - initially hidden, shows when button is clicked */}
              <div className="sm:hidden w-full mb-4">
                {!showEmployeeList ? (
                  <button
                    onClick={() => setShowEmployeeList(true)}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg shadow-md hover:bg-blue-600 transition-all flex items-center justify-center"
                  >
                    <SearchIcon className="w-4 h-4 mr-2" />
                    Search Employees
                  </button>
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">Employee Search</h3>
                      <button
                        onClick={() => setShowEmployeeList(false)}
                        className="text-gray-500 hover:text-gray-700"
                        aria-label="Close employee list"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>

                    <input
                      type="search"
                      name="search"
                      placeholder="Search Employee..."
                      aria-label="Search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition duration-200 mb-3 text-sm"
                      autoFocus
                    />

                    <ul className="space-y-2 max-h-[40vh] overflow-y-auto rounded-lg pr-1 custom-scrollbar">
                      {filteredEmployees.map((employee) => (
                        <li
                          key={employee.id}
                          onClick={() => {
                            setDataEmployeesearch(employee);
                            handleEmployeeClick(employee.id);
                            setShowEmployeeList(false); // Hide list after selection on mobile
                          }}
                          className={`p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${selectedEmployeesearch?.id === employee.id
                              ? 'bg-blue-100 text-blue-600'
                              : 'hover:bg-gray-100'
                            } ${employeeStats[employee.id] < 6 ? 'text-red-600' : ''
                            }`}
                        >
                          <span className="truncate mr-2 text-sm">
                            {employee.full_name}
                          </span>
                          <button
                            className="hover:bg-gray-300 transition-all ease-in-out px-2 py-1 rounded-xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEmployeeDelete(employee.id);
                            }}
                            aria-label="Delete employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Employee List for desktop - always visible */}
              <div className="hidden sm:block col-span-1 w-full">
                <input
                  type="search"
                  name="search"
                  placeholder="Search Employee..."
                  aria-label="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition duration-200 mb-3 text-sm sm:text-base"
                />

                <ul className="space-y-2 max-h-[40vh] sm:max-h-[50vh] md:max-h-[60vh] lg:max-h-[500px] overflow-y-auto rounded-lg pr-1 sm:pr-2.5 custom-scrollbar">
                  {filteredEmployees.map((employee) => (
                    <li
                      key={employee.id}
                      onClick={() => {
                        setDataEmployeesearch(employee);
                        handleEmployeeClick(employee.id);
                      }}
                      className={`p-2 sm:p-3 rounded-lg cursor-pointer transition-colors flex-shrink-0 flex items-center justify-between ${selectedEmployeesearch?.id === employee.id
                          ? 'bg-blue-100 text-blue-600 hover:bg-gray-50'
                          : 'hover:bg-gray-100'
                        } ${employeeStats[employee.id] < 6 ? 'text-red-600' : ''
                        }`}
                    >
                      <span className="truncate mr-2 text-xs sm:text-base">
                        {employee.full_name}
                      </span>
                      <button
                        className="hover:bg-gray-300 transition-all ease-in-out px-2 py-1 sm:px-3 sm:py-1 rounded-xl flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmployeeDelete(employee.id);
                        }}
                        aria-label="Delete employee"
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Employee Dashboard */}
              {selectedEmployee && !graphicview && (
                <div className="col-span-1 sm:col-span-3 w-full mt-4 sm:mt-0">
                  <div className="bg-gray-100 rounded-lg shadow-md p-2 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
                      <h2 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-0">
                        {selectedEmployee.full_name}'s Dashboard
                      </h2>
                    </div>

                    {loading ? (
                      <div className="flex items-center justify-center h-40 sm:h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <>
                        {/* Today's Status & Breaks */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5 mb-4 sm:mb-6">
                          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">
                              Today's Status
                            </h3>
                            {attendanceLogs[0] ? (
                              <div className="space-y-2 sm:space-y-3 text-xs sm:text-base">
                                <div className="flex justify-between">
                                  <span>Check-in:</span>
                                  <span>
                                    {format(
                                      new Date(attendanceLogs[0].check_in),
                                      'h:mm a'
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Check-out:</span>
                                  <span>
                                    {attendanceLogs[0].check_out
                                      ? format(
                                        new Date(attendanceLogs[0].check_out),
                                        'h:mm a'
                                      )
                                      : 'Not checked out'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Work Mode:</span>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs sm:text-sm ${attendanceLogs[0].work_mode === 'on_site'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-purple-100 text-purple-800'
                                      }`}
                                  >
                                    {attendanceLogs[0].work_mode}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Duration:</span>
                                  <span>
                                    {calculateDuration(
                                      attendanceLogs[0].check_in,
                                      attendanceLogs[0].check_out
                                    )}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-xs sm:text-base">
                                No attendance record for today
                              </p>
                            )}
                          </div>

                          {/* Break Summary */}
                          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">
                              Break Records
                            </h3>
                            {todayBreak.length > 0 ? (
                              todayBreak.map((breakItem, index) => (
                                <div
                                  key={index}
                                  className="space-y-2 sm:space-y-3 text-xs sm:text-base"
                                >
                                  <div className="flex justify-between">
                                    <span>Start:</span>
                                    <span>
                                      {format(
                                        new Date(breakItem.start_time),
                                        'hh:mm a'
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>End:</span>
                                    <span>
                                      {breakItem.end_time
                                        ? format(
                                          new Date(breakItem.end_time),
                                          'hh:mm a'
                                        )
                                        : 'Ongoing'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Status:</span>
                                    <span>{breakItem.status || 'N/A'}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-gray-500 text-xs sm:text-base">
                                No break records for today
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Monthly Overview */}
                        <div className="mt-4 sm:mt-6">
                          <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
                            <div className="flex items-center mb-4 sm:mb-6">
                              <BarChart className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mr-2" />
                              <h2 className="text-base sm:text-xl font-semibold">
                                Monthly Overview -{' '}
                                {format(new Date(), 'MMMM yyyy')}
                              </h2>
                            </div>

                            {monthlyStats ? (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
                                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-2 sm:mb-3">
                                    {/* right monthly status */}
                                    Attendance Summary
                                  </h3>
                                  <div className="space-y-2 sm:space-y-3 text-xs sm:text-base">
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-600">
                                        Expected Working Days:
                                      </span>
                                      <span className="font-medium">
                                        {monthlyStats.expectedWorkingDays}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-600">
                                        Days Attended:
                                      </span>
                                      <span className="font-medium">
                                        {monthlyStats.totalWorkingDays}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-600">
                                        Present Days:
                                      </span>
                                      <span className="font-medium text-green-600">
                                        {monthlyStats.presentDays}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-600">
                                        Late Days:
                                      </span>
                                      <span className="font-medium text-yellow-600">
                                        {monthlyStats.lateDays}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                      <span>Absentees:</span>
                                      <span className="text-red-600">
                                        {absentees || 0}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                      <span>Leaves:</span>
                                      <span className="text-green-600">
                                        {leaves || 0}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-2 sm:mb-3">
                                    Work Mode Distribution
                                  </h3>
                                  <div className="space-y-2 sm:space-y-3 text-xs sm:text-base">
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-600">
                                        On-site Days:
                                      </span>
                                      <span className="font-medium text-blue-600">
                                        {monthlyStats.onSiteDays}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-600">
                                        Remote Days:
                                      </span>
                                      <span className="font-medium text-purple-600">
                                        {monthlyStats.remoteDays}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-600">
                                        Attendance Rate:
                                      </span>
                                      <span className="font-medium">
                                        {(
                                          (monthlyStats.totalWorkingDays /
                                            monthlyStats.expectedWorkingDays) *
                                          100
                                        ).toFixed(1)}
                                        %
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-2 sm:mb-3">
                                    Work Hours
                                  </h3>
                                  <div className="space-y-2 sm:space-y-3 text-xs sm:text-base">
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-600">
                                        Average Daily Hours:
                                      </span>
                                      <span className="font-medium">
                                        {monthlyStats.averageWorkHours.toFixed(
                                          1
                                        )}
                                        h
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-600">
                                        Total Hours:
                                      </span>
                                      <span className="font-medium">
                                        {monthlyStats.totalHours.toFixed(1)}h
                                      </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-600">
                                        Overtime Hours:
                                      </span>
                                      <span className="font-medium text-purple-600">
                                        {monthlyStats.totalOvertimeHours.toFixed(
                                          1
                                        )}
                                        h
                                      </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-600">
                                        Expected Hours:
                                      </span>
                                      <span className="font-medium">
                                        {7 * monthlyStats.expectedWorkingDays}h
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-6 sm:py-8 text-gray-500 text-xs sm:text-base">
                                No attendance records found for this month
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 sm:mt-5">
                          <AbsenteeComponentAdmin userID={userID} />
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

      {/* Tasks Modal */}
      <TaskModalAdmin
        isOpen={isTasksModalOpen}
        onClose={handleCloseTasksModal}
        taskIds={selectedTaskIds}
        projectId={selectedProjectId}
      />
    </div>
    // );
  );
};

export default EmployeeAttendanceTable;
