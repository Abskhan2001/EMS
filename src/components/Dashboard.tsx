import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addWeeks, addMonths, startOfMonth, startOfWeek, isAfter, endOfMonth, isWithinInterval, isWeekend, eachDayOfInterval } from 'date-fns';
import { useAuthStore } from '../lib/store';
import { supabase, withRetry, handleSupabaseError } from '../lib/supabase';
import { Clock, Calendar, AlertCircle, Coffee, MapPin, User, BarChart, LogOut, CalendarIcon } from 'lucide-react';
import AbsenteeComponent from './AbsenteesData';
import DashboardCards from '../components/DashboardCards';
import { Dialog } from "@headlessui/react";
import DailyStatusTable from '../components/DailyStatusTable';
import BreakRecordsTable from '../components/BreakRecordTable';
import MonthlyRecord from '../components/MonthlyRecords';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SalesChart } from '../components/GraphComponent';
import { ChevronLeft, SearchIcon, ChevronRight } from 'lucide-react';
import WeeklyDataUser from './WeeklyDataUser';
import MonthlyDataUser from './MonthlyDataUser';
import FilterDataUser from './FilterDataUser';

// Beautiful Calendar Component
const BeautifulCalendar = ({ selectedDate, onDateSelect, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = new Date(startOfWeek(addWeeks(monthEnd, 1)).getTime() - 1);

  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
      const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
      const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');

      days.push(
        <div
          className={`w-10 h-10 flex items-center justify-center cursor-pointer rounded-lg transition-all ${!isCurrentMonth
            ? 'text-gray-300'
            : isSelected
              ? 'bg-blue-600 text-white'
              : isToday
                ? 'bg-blue-100 text-blue-600 font-semibold'
                : 'hover:bg-gray-100'
            }`}
          key={day}
          onClick={() => {
            if (cloneDay <= new Date()) {
              onDateSelect(cloneDay);
              onClose();
            }
          }}
        >
          <span>{formattedDate}</span>
        </div>
      );
      day = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    }
    rows.push(
      <div className="grid grid-cols-7 gap-1" key={day}>
        {days}
      </div>
    );
    days = [];
  }

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 w-80">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => {
            const nextMonth = addMonths(currentMonth, 1);
            if (nextMonth <= new Date()) {
              setCurrentMonth(nextMonth);
            }
          }}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="w-10 h-8 flex items-center justify-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {rows}
      </div>
    </div>
  );
};


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

interface UserProfile {
  full_name: string;
  department: string | null;
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


const Dashboard: React.FC = ({ isSmallScreen, isSidebarOpen }) => {
  // const user = useAuthStore((state) => state.user);
  const sessionData = localStorage.getItem('supabaseSession');
  const session = sessionData ? JSON.parse(sessionData) : null;
  const user = session?.user;
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [todayBreak, setTodayBreak] = useState<BreakRecord[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [absentees, setabsentees] = useState('');
  const [view, setView] = useState('default');
  const [leaves, setleaves] = useState('');
  const [weeklyData, setWeeklyData] = useState<null>(null);
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [chartData, setChartData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new (Date));
  const [selectedtab, setSelectedtab] = useState("Dailydata");
  const userID = localStorage.getItem('user_id')
  const [startdate, setStartdate] = useState("");
  const [enddate, setEndate] = useState("");
  const [search, setsearch] = useState(false);

  // Initialize filter dates when component mounts
  useEffect(() => {
    const today = new Date();
    const currentMonthStart = startOfMonth(today).toISOString().split("T")[0];
    const currentMonthEnd = endOfMonth(today).toISOString().split("T")[0];

    if (!startdate) setStartdate(currentMonthStart);
    if (!enddate) setEndate(currentMonthEnd);
  }, []);
  const todayDate = selectedDate;
  //  const today = new Date();

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  console.log("selectedDate", selectedDate);
  console.log("todayDate", todayDate);



  const fetchleaves = async () => {
    const { count, error } = await supabase
      .from("absentees")
      .select("*", { count: "exact", head: true })
      .eq('user_id', userID)
      .eq('absentee_type', "leave")
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())
    if (error) {
      console.error("Error Fetching Absentees Count", error);
    } else {
      console.log("Leaves Count :", count);
      if (count > 0) {
        setleaves(count)
      } else {
        setleaves(0)
      }
    }
  }
  useEffect(() => {
    fetchleaves();
  }, [userID, selectedDate])






  const fetchabsentees = async () => {
    const { count, error } = await supabase
      .from("absentees")
      .select("*", { count: "exact", head: true })
      .eq('user_id', userID)
      .eq('absentee_type', "Absent")
      .gte('absentee_date', monthStart.toISOString().split('T')[0])
      .lte('absentee_date', monthEnd.toISOString().split('T')[0]);
    if (error) {
      console.error("Error Fetching Absentees Count", error);
    } else {
      console.log("absentees Count :", count);
      if (count > 0) {
        setabsentees(count)
      } else {
        setabsentees(0)
      }
    }
  }
  useEffect(() => {
    fetchabsentees();
  }, [userID, selectedDate])



  useEffect(() => {

    const loadTodayData = async () => {

      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true)
        // Load user profile with retry mechanism
        const { data: profileData, error: profileError } = await withRetry(() =>
          supabase
            .from('users')
            .select('full_name, department, personal_email, slack_id,joining_date ')
            .eq('id', user.id)
            .single()
        );


        if (profileError) throw profileError;
        if (profileData) setUserProfile(profileData);

        const startOfDay = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
        const endOfDay = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 23, 59, 59)

        const { data: attendanceData, error: attendanceError } = await withRetry(() =>
          supabase
            .from('attendance_logs')
            .select('*')
            .eq('user_id', user.id)
            .gte('check_in', startOfDay.toISOString())
            .lte('check_in', endOfDay.toISOString())
            .order('check_in', { ascending: false })
            .limit(1)
            .single()
        );
        if (attendanceError && attendanceError.code !== 'PGRST116') throw attendanceError;
        console.log("Attendance Data", attendanceData);
        if (!attendanceData) setTodayAttendance(null);
        setLoading(false);
        if (attendanceData) {
          setTodayAttendance(attendanceData);

          // Get break records if checked in
          const { data: breakData, error: breakError } = await withRetry(() =>
            supabase
              .from('breaks')
              .select('*')
              .eq('attendance_id', attendanceData.id)
            // .order('date', { ascending: true })

            // .order('date', { ascending: true })
          );
          if (breakError) throw breakError;
          if (breakData) setTodayBreak(breakData);
          if (!breakData) setTodayBreak(null);
        }
        // Holidays data
        const holidays = [
          {
            id: "25725d2-907f-46ab-a2da-45af96e4080f",
            created_at: "2025-04-29 04:53:47.272115+04",
            dates: ["2025-08-14T09:06:25.000Z"],
            name: "Independence Day of Pakistan"
          },
          {
            id: "b1b83dec-3fc9-490d-a647-1b14d072e691",
            created_at: "2025-06-05 06:14:57.458794+00",
            dates: [
              "2025-06-06T06:12:38.000Z",
              "2025-06-07T06:12:38.000Z",
              "2025-06-08T06:12:38.000Z"
            ],
            name: "eid-al-adha 2025"
          }
        ];

        // Get all holiday dates in the current month and year
        const holidayDatesInMonth = [];
        holidays.forEach(holiday => {
          holiday.dates.forEach(dateStr => {
            const holidayDate = new Date(dateStr);
            if (holidayDate.getFullYear() === selectedDate.getFullYear() &&
              holidayDate.getMonth() === selectedDate.getMonth()) {
              holidayDatesInMonth.push(holidayDate.toDateString());
            }
          });
        });

        console.log('Holiday dates in current month:', holidayDatesInMonth);
        console.log('Selected date:', selectedDate.getFullYear(), selectedDate.getMonth());

        // Calculate expected working days (excluding weekends and holidays)
        const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const workingDaysInMonth = allDaysInMonth.filter(date =>
          !isWeekend(date) && !holidayDatesInMonth.includes(date.toDateString())
        ).length;

        console.log('Total days in month:', allDaysInMonth.length);
        console.log('Working days after excluding weekends and holidays:', workingDaysInMonth);

        const { data: monthlyAttendance, error: monthlyError } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('check_in', monthStart.toISOString())
          .lte('check_in', monthEnd.toISOString())
          .order('check_in', { ascending: true });

        if (monthlyError) throw monthlyError;

        if (monthlyAttendance) {
          // Group attendance by date to avoid counting multiple check-ins on the same day
          const attendanceByDate = monthlyAttendance.reduce((acc, curr) => {
            const date = format(new Date(curr.check_in), 'yyyy-MM-dd');
            if (!acc[date] || new Date(curr.check_in) < new Date(acc[date].check_in)) {
              acc[date] = curr;
            }
            return acc;
          }, {} as Record<string, AttendanceRecord>);

          const uniqueAttendance = Object.values(attendanceByDate);

          const stats: MonthlyStats = {
            expectedWorkingDays: workingDaysInMonth,
            totalWorkingDays: uniqueAttendance.length,
            presentDays: uniqueAttendance.filter(a => a.status === 'present').length,
            lateDays: uniqueAttendance.filter(a => a.status === 'late').length,
            onSiteDays: uniqueAttendance.filter(a => a.work_mode === 'on_site').length,
            remoteDays: uniqueAttendance.filter(a => a.work_mode === 'remote').length,
            averageWorkHours: 0
          };
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

          stats.averageWorkHours = totalHours / uniqueAttendance.length;

          setMonthlyStats(stats);
        }

      } catch (err) {
        console.error('Error in loadTodayData:', err);
        setError(handleSupabaseError(err));
      } finally {
        setLoading(false);
      }
    };
    loadTodayData();
    // const interval = setInterval(loadTodayData, 60000);
    // return () => clearInterval(interval);
  }, [selectedDate, userID]);

  // Update filter dates when selectedDate changes (for month navigation)
  useEffect(() => {
    if (selectedtab === "Filter") {
      const monthStart = startOfMonth(selectedDate).toISOString().split("T")[0];
      const monthEnd = endOfMonth(selectedDate).toISOString().split("T")[0];
      setStartdate(monthStart);
      setEndate(monthEnd);
    }
  }, [selectedDate, selectedtab]);

  const calculateDuration = (start: string, end: string | null) => {
    if (!end) {
      end = new Date().toISOString();
    }
    const startTime = new Date(start);
    const endTime = new Date(end);
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
    return totalMinutes > 0 ? `${hours}h ${minutes}m` : null;
  };

  useEffect(() => {
    const fetchData = async () => {
      let startDate, endDate;

      const today = new Date();

      if (viewMode === 'daily') {
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59);
      } else if (viewMode === 'weekly') {
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Start of the week (Sunday)
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // End of the week (Saturday)
      } else if (viewMode === 'monthly') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      }

      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_in', startDate.toISOString())
        .lte('check_in', endDate.toISOString());

      if (error) {
        console.error('Error fetching attendance data:', error);
        return;
      }

      // Process data into a format for the SalesChart
      const formattedData = processAttendanceData(data, viewMode);
      setChartData(formattedData);
    };

    fetchData();
  }, [viewMode, user.id]);

  // Function to format data
  const processAttendanceData = (data, mode) => {
    if (mode === 'daily') {
      // Group by hour for daily view
      const hourlyData = {};
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Initialize all hours with 0
      for (let hour = 0; hour < 24; hour++) {
        const hourStr = hour.toString().padStart(2, '0') + ':00';
        hourlyData[hourStr] = 0;
      }

      // Count check-ins by hour
      data.forEach(entry => {
        const entryDate = new Date(entry.check_in);
        const hourStr = format(entryDate, 'HH:00');
        hourlyData[hourStr] = (hourlyData[hourStr] || 0) + 1;
      });

      // Convert to array format for chart
      return Object.keys(hourlyData)
        .sort()
        .map(hour => ({
          name: hour,
          value: hourlyData[hour],
        }));
    }

    if (mode === 'weekly') {
      // Create an object with all days of the week
      const weekDays = {
        'Sun': 0,
        'Mon': 0,
        'Tue': 0,
        'Wed': 0,
        'Thu': 0,
        'Fri': 0,
        'Sat': 0
      };

      // Count check-ins by day
      data.forEach(entry => {
        const day = format(new Date(entry.check_in), 'EEE'); // Short weekday name
        weekDays[day] = (weekDays[day] || 0) + 1;
      });

      // Convert to array format for chart, maintaining day order
      return Object.keys(weekDays).map(day => ({
        name: day,
        value: weekDays[day],
      }));
    }

    if (mode === 'monthly') {
      // Get current month's days
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

      // Initialize all days with 0
      const monthlyData = {};
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = day.toString().padStart(2, '0');
        monthlyData[dayStr] = 0;
      }

      // Count check-ins by day of month
      data.forEach(entry => {
        const day = format(new Date(entry.check_in), 'dd');
        monthlyData[day] = (monthlyData[day] || 0) + 1;
      });

      // Convert to array format for chart
      return Object.keys(monthlyData)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(day => ({
          name: day,
          value: monthlyData[day],
        }));
    }

    return [];
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }


  const handleDayNext = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight
    newDate.setHours(0, 0, 0, 0); // Normalize to midnight

    if (newDate <= today) {
      setSelectedDate(newDate);
      // loadTodayData2(newDate);
    }
  };

  const handleDayPrev = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
    // loadTodayData2(newDate);
  };

  // Handle week change (previous/next)
  const handleWeekChange = (direction) => {
    setSelectedDate((prevDate) => {
      if (direction === "prev") {
        return addWeeks(prevDate, -1);
      } else if (direction === "next") {
        const newDate = addWeeks(prevDate, 1);
        const currentWeekStart = startOfWeek(new Date());
        const newWeekStart = startOfWeek(newDate);
        return isAfter(newWeekStart, currentWeekStart) ? prevDate : newDate;
      }
      return prevDate; // Default case, though direction is typically "prev" or "next"
    });
  };

  // Handle Month change (previous/next)
  const handleMonthChange = (direction) => {
    setSelectedDate((prevDate) => {
      if (direction === "prev") {
        return addMonths(prevDate, -1);
      } else if (direction === "next") {
        const newDate = addMonths(prevDate, 1);
        const currentMonthStart = startOfMonth(new Date());
        const newMonthStart = startOfMonth(newDate);
        if (isAfter(newMonthStart, currentMonthStart)) {
          return prevDate;
        } else {
          return newDate;
        }
      }
      return prevDate;
    });
  };

  const handleDateFilter = () => {
    // Toggle search state to trigger data refresh
    setsearch((prev) => !prev)
  }


  if (error) {
    return (
      <div className='max-w-7xl mx-auto  px-4 '>
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>Error loading dashboard: {error}</p>
        </div>
      </div>
    );
  }


  return (
    <div className='max-w-7xl mx-auto  px-4 lg:py-8'>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <div className={`${selectedtab === 'filter' ? 'flex flex-col' : ''} `}>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-left text-center">
              Welcome, {userProfile?.full_name || 'Employee'}
            </h1>
            <div className={`flex gap-3 mt-3 items-center  justify-center mb-2 sm:mx-0 mx-auto`}>
              {
                view === 'default' && (
                  <>

                    <div className="flex flex-col sm:flex-row">
                      {/* Dropdown for small screens */}
                      <div className="block xs:hidden w-full mb-2 ">
                        <select
                          value={selectedtab}
                          onChange={(e) => setSelectedtab(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a36fd4] focus:border-transparent"
                        >
                          <option value="Dailydata">Daily</option>
                          <option value="Weeklydata">Weekly</option>
                          <option value="Monthlydata">Monthly</option>
                          <option value="Filter">Filter</option>
                        </select>
                      </div>

                      {/* Buttons for larger screens */}
                      <div className="hidden xs:flex justify-center  sm:space-x-2">
                        <button
                          onClick={() => setSelectedtab("Dailydata")}
                          className={`px-3 py-1 h-[28px]  rounded-2xl hover:bg-gray-300 transition-all ease-in-out ${selectedtab === "Dailydata"
                            ? "bg-[#a36fd4] text-white"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                          Daily
                        </button>

                        <button
                          onClick={() => setSelectedtab("Weeklydata")}
                          className={`px-3 py-1 rounded-2xl h-[28px]  hover:bg-gray-300 transition-all ease-in-out ${selectedtab === "Weeklydata"
                            ? "bg-[#a36fd4] text-white"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                          Weekly
                        </button>

                        <button
                          onClick={() => setSelectedtab("Monthlydata")}
                          className={`px-3 py-1 h-[28px] rounded-2xl hover:bg-gray-300 transition-all ease-in-out ${selectedtab === "Monthlydata"
                            ? "bg-[#a36fd4] text-white"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                          Monthly
                        </button>

                        <button
                          onClick={() => setSelectedtab("Filter")}
                          className={`px-3 py-1 rounded-2xl h-[28px]  hover:bg-[#c799f3] hover:text-black transition-all ease-in-out ${selectedtab === "Filter"
                            ? "bg-[#8c4fc5] text-white"
                            : "bg-white text-gray-700 hover:bg-[#c799f3]"
                            }`}
                        >
                          Filter
                        </button>
                      </div>
                    </div>
                  </>
                )
              }
            </div >
          </div>

          {/* {userProfile?.department && (
            <p className="text-gray-600 mt-1">Department: {userProfile.department}</p>

          )} */}
          {/* <div className='lg:text-right lg:hidden sm:block hidden'>
            <select
              name="view"
              id="view"
              className='w-[160px] h-[40px] rounded-[8px] border py-1 px-3 border-[#D0D5DD] bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7E69AB] focus:border-[#7E69AB] transition-all'
              onChange={(e) => setView(e.target.value)}
              value={view}
            >
              <option value="default">Default View</option>
              <option value="table">Table View</option>
              <option value="graph">Graph View</option>
            </select>
          </div> */}
        </div>
        <div >
          <div className="flex items-left justify-end lg:flex-row flex-col ">

            <div className="flex flex-row gap-5 lg:mx-0 mx-auto">

              {/* Date Navigation - Only show in Default View */}
              {view === 'default' && selectedtab === "Dailydata" && (
                <div className="flex items-center  space-x-4">
                  <button
                    onClick={() => handleDayPrev()}
                    className="p-2 hover:bg-gray-200 rounded-full transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />left
                  </button>
                  <button
                    onClick={() => {
                      console.log('Calendar button clicked');
                      setIsCalendarOpen(true);
                    }}
                    className="text-lg font-semibold hover:bg-gray-100 px-3 py-1 rounded-lg transition-all cursor-pointer"
                  >
                    {format(selectedDate, "MMMM d, yyyy")}
                  </button>
                  <button
                    onClick={() => handleDayNext()}
                    className="p-2 hover:bg-gray-200 rounded-full transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
              {view === 'default' && selectedtab === "Monthlydata" && (
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={() => handleMonthChange("prev")}
                    className="p-2 hover:bg-gray-200 rounded-full transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsCalendarOpen(true)}
                    className="mx-4 text-lg font-semibold hover:bg-gray-100 px-3 py-1 rounded-lg transition-all cursor-pointer"
                  >
                    {format(selectedDate, "MMMM yyyy")}
                  </button>
                  <button
                    onClick={() => handleMonthChange("next")}
                    className="p-2 hover:bg-gray-200 rounded-full transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
              {view === 'default' && selectedtab === "Weeklydata" && (
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={() => handleWeekChange("prev")}
                    className="p-2 hover:bg-gray-200 rounded-full transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsCalendarOpen(true)}
                    className="mx-4 text-lg font-semibold hover:bg-gray-100 px-3 py-1 rounded-lg transition-all cursor-pointer"
                  >
                    {format(selectedDate, "MMMM yyyy")}
                  </button>
                  <button
                    onClick={() => handleWeekChange("next")}
                    className="p-2 hover:bg-gray-200 rounded-full transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
              {/* dates  */}
              {view === 'default' && selectedtab === "Filter" && (
                <div className="w-full flex items-center justify-center">
                  {/* Desktop Date Picker */}
                  <div className="hidden xl:flex flex-wrap items-center justify-center space-x-4">
                    <input
                      type="date"
                      value={startdate}
                      onChange={(e) => {
                        setStartdate(e.target.value);
                        // If start date is after end date, update end date
                        if (enddate && e.target.value > enddate) {
                          setEndate(e.target.value);
                        }
                      }}
                      className="px-2 py-1 border ml-10 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="mx-2 text-xl font-semibold">to</span>
                    <input
                      type="date"
                      value={enddate}
                      onChange={(e) => {
                        setEndate(e.target.value);
                        // If end date is before start date, update start date
                        if (startdate && e.target.value < startdate) {
                          setStartdate(e.target.value);
                        }
                      }}
                      className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleDateFilter}
                      className="p-2 hover:bg-gray-300 rounded-2xl px-5 py-3 transition-all"
                    >
                      <SearchIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Mobile Date Picker */}
                  <div className="xl:hidden">
                    <button
                      onClick={() => setIsDateDialogOpen(true)}
                      className="flex items-center bg-white space-x-2 border px-4 py-2 rounded-lg shadow-md"
                    >
                      <CalendarIcon className="w-5 h-5" />
                      <span>Select Date</span>
                    </button>

                    <Dialog open={isDateDialogOpen} onClose={() => setIsDateDialogOpen(false)} className="relative z-50">
                      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                      <div className="fixed inset-0 flex items-center justify-center p-4">
                        <Dialog.Panel className="w-full max-w-sm rounded-lg bg-white p-6">
                          <Dialog.Title className="text-lg font-bold mb-4">Select Date Range</Dialog.Title>
                          <div className="flex flex-col gap-4">
                            <input
                              type="date"
                              value={startdate}
                              onChange={(e) => {
                                setStartdate(e.target.value);
                                // If start date is after end date, update end date
                                if (enddate && e.target.value > enddate) {
                                  setEndate(e.target.value);
                                }
                              }}
                              className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="date"
                              value={enddate}
                              onChange={(e) => {
                                setEndate(e.target.value);
                                // If end date is before start date, update start date
                                if (startdate && e.target.value < startdate) {
                                  setStartdate(e.target.value);
                                }
                              }}
                              className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => {
                                handleDateFilter()
                                setIsDateDialogOpen(false)
                              }}
                              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                            >
                              Search
                            </button>
                          </div>
                        </Dialog.Panel>
                      </div>
                    </Dialog>
                  </div>
                </div>
              )}

            </div>
            {/* selecter */}
            <div className='lg:text-right  text-center '>
              <select
                name="view"
                id="view"
                className='w-[160px] h-[40px] rounded-[8px] border py-1 px-3 border-[#D0D5DD] bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7E69AB] focus:border-[#7E69AB] transition-all'
                onChange={(e) => setView(e.target.value)}
                value={view}
              >
                <option value="default">Default View</option>
                <option value="table">Table View</option>
                <option value="graph">Graph View</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      <DashboardCards />

      {
        selectedtab === "Weeklydata" && (
          <WeeklyDataUser selectedtab={selectedtab} selectedDate={selectedDate} />
        )
      }
      {
        selectedtab === "Monthlydata" && (
          <MonthlyDataUser selectedtab={selectedtab} selectedDate={selectedDate} />
        )
      }
      {view === 'default' && selectedtab === "Filter" && (
        <FilterDataUser startdate={startdate} enddate={enddate} search={search} selectedtab={selectedtab} />
      )}

      {/* Table View - Show DailyStatusTable, BreakRecordsTable, and MonthlyRecord */}
      {
        view === 'table' && selectedtab === "Dailydata" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Daily Status</h2>
              {todayAttendance ? (
                <DailyStatusTable
                  todayAttendance={{
                    check_in: todayAttendance.check_in,
                    check_out: todayAttendance.check_out || '',
                    work_mode: todayAttendance.work_mode,
                    latitude: todayAttendance.latitude,
                    longitude: todayAttendance.longitude,
                    totalTime: calculateDuration(todayAttendance.check_in, todayAttendance.check_out),
                    breakTime: getTotalBreakDuration() || '0h 0m',
                    status: todayAttendance.status,
                    checkInStatus: !todayAttendance.check_out ? 'Working' : 'Completed',
                    totalBreaks: todayBreak.length,
                    breakHours: getTotalBreakDuration() || '0h 0m',
                  }}
                  todayBreak={todayBreak.map(breakRecord => ({
                    break_in: breakRecord.start_time,
                    break_out: breakRecord.end_time || '',
                  }))}
                  calculateDuration={calculateDuration}
                  getTotalBreakDuration={getTotalBreakDuration}
                />
              ) : (
                <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-gray-600">Not checked in yet</p>
                    <p className="text-sm text-gray-500 mt-1">Check in from the Attendance page to start your day</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Break Records</h2>
              <BreakRecordsTable
                todayBreak={todayBreak.map(breakRecord => ({
                  start_time: breakRecord.start_time,
                  end_time: breakRecord.end_time || '',
                  duration: breakRecord.end_time
                    ? calculateDuration(breakRecord.start_time, breakRecord.end_time)
                    : 'In progress',
                  status: breakRecord.status || '',
                }))}
              />
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Monthly Records</h2>
              {monthlyStats && (
                <MonthlyRecord
                  monthlyStats={{
                    expectedWorkingDays: monthlyStats.expectedWorkingDays,
                    daysAttended: monthlyStats.totalWorkingDays,
                    presentDays: monthlyStats.presentDays,
                    lateDays: monthlyStats.lateDays,
                    absentees: parseInt(absentees) || 0,
                    leaves: parseInt(leaves) || 0,
                    totalWorkingDays: monthlyStats.totalWorkingDays,
                    averageDailyHours: monthlyStats.averageWorkHours.toFixed(1) + 'h',
                    expectedHours: (6 * monthlyStats.expectedWorkingDays) + 'h',
                    expectedWorkHours: 6 * monthlyStats.expectedWorkingDays,
                    averageWorkHours: monthlyStats.averageWorkHours,
                  }}
                  leaves={parseInt(leaves) || 0}
                  absentees={parseInt(absentees) || 0}
                />
              )}
            </div>
          </div>
        )
      }

      {/* Graph View - Already implemented */}
      {
        view === 'graph' && selectedtab === "Dailydata" && (
          <>
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-4 py-2 rounded-md transition-all ${viewMode === 'daily'
                  ? 'bg-[#7E69AB] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Daily
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-4 py-2 rounded-md transition-all ${viewMode === 'weekly'
                  ? 'bg-[#7E69AB] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}

              //     className={`px-4 py-2 rounded-md transition-all ${viewMode === 'weekly'
              //       ? 'bg-[#7E69AB] text-white shadow-md'
              //         ? 'bg-[#7E69AB] text-white shadow-md'
              //         : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              // }`}
              >
                Monthly
              </button>
            </div>
            <div className='mb-16'>
              <SalesChart
                activeTab={viewMode}
                data={chartData}
              />
            </div>
          </>
        )
      }

      {/* Default View - Show the current UI */}
      {
        (view === 'default' && selectedtab === "Dailydata") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Status Card */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Clock className="w-6 h-6 text-blue-600 mr-2" />
                  <h2 className="text-xl font-semibold">Today's Status</h2>
                </div>
                {todayAttendance && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${todayAttendance.status === 'present'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {todayAttendance.status}
                  </span>
                )}
              </div>

              {todayAttendance ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Check-in/out Details */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500 mb-3">Attendance Details</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Check-in:</span>
                          <span className="font-medium">
                            {format(new Date(todayAttendance.check_in), 'h:mm a')}
                          </span>
                        </div>
                        {todayAttendance.check_out && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Check-out:</span>
                            <span className="font-medium">
                              {format(new Date(todayAttendance.check_out), 'h:mm a')}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Work Mode:</span>
                          <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${todayAttendance.work_mode === 'on_site'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                            }`}>
                            {todayAttendance.work_mode}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Location:</span>
                          <span className="font-medium text-sm">
                            {todayAttendance.latitude.toFixed(4)}, {todayAttendance.longitude.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Work Duration */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500 mb-3">Work Duration</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Total Time:</span>
                          <span className="font-medium">
                            {calculateDuration(todayAttendance.check_in, todayAttendance.check_out)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Break Time:</span>
                          <span className="font-medium">
                            {getTotalBreakDuration() || '0h 0m'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${!todayAttendance.check_out
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                            }`}>
                            {!todayAttendance.check_out ? 'Working' : 'Completed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Break Records */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Break Records</h3>
                    {todayBreak.length > 0 ? (
                      <div className="space-y-3">
                        {todayBreak.map((breakRecord, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Coffee className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">Break {index + 1}:</span>
                              <span className="ml-2">
                                {format(new Date(breakRecord.start_time), 'h:mm a')}
                                {breakRecord.end_time && (
                                  <> - {format(new Date(breakRecord.end_time), 'h:mm a')}</>
                                )}
                              </span>
                            </div>
                            {breakRecord.status && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${breakRecord.status === 'on_time'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                {breakRecord.status}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No breaks taken today</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-gray-600">Not checked in yet</p>
                    <p className="text-sm text-gray-500 mt-1">Check in from the Attendance page to start your day</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-6">
                <Calendar className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold">Quick Stats</h2>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Today's Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Check-in:</span>
                      <span className="font-medium">
                        {todayAttendance
                          ? format(new Date(todayAttendance.check_in), 'h:mm a')
                          : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Check-out:</span>
                      <span className="font-medium">
                        {todayAttendance?.check_out
                          ? format(new Date(todayAttendance.check_out), 'h:mm a')
                          : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Latest Break:</span>
                      <span className="font-medium">
                        {todayBreak.length > 0
                          ? format(new Date(todayBreak[todayBreak.length - 1].start_time), 'h:mm a')
                          : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Work Mode:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${todayAttendance?.work_mode === 'on_site'
                        ? 'bg-blue-100 text-blue-800'
                        : todayAttendance?.work_mode === 'remote'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}>
                        {todayAttendance?.work_mode || 'Not Set'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Break Summary</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Breaks:</span>
                      <span className="font-medium">{todayBreak.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Break Duration:</span>
                      <span className="font-medium">
                        {getTotalBreakDuration() || '0h 0m'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Overview Card */}
            <div className="lg:col-span-3 bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-6">
                <BarChart className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold">Monthly Overview   - {format(selectedDate, 'MMMM yyyy')}</h2>
              </div>

              {monthlyStats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Attendance Summary edited </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Expected Working Days: edited</span>
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
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Absentees:</span>
                        <span className="font-medium text-red-600">{absentees || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Leaves:</span>
                        <span className="font-medium text-green-600">{leaves}</span>
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

            {/* Absentees Details */}
            <div className="lg:col-span-3 bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-6">
                <BarChart className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold">Absentees Details - {format(selectedDate, 'MMMM yyyy')}</h2>
              </div>

              <div>
                {/* Absentee Data Div */}
                <AbsenteeComponent selectedDate={selectedDate} />
              </div>
            </div>
          </div>
        )
      }

      {/* Beautiful Calendar Modal */}
      {isCalendarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsCalendarOpen(false)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsCalendarOpen(false)}
              className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100 z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <BeautifulCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onClose={() => setIsCalendarOpen(false)}
            />
          </div>
        </div>
      )}
      {console.log('isCalendarOpen:', isCalendarOpen)}
    </div>
  );
};

export default Dashboard;