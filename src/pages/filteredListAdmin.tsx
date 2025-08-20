import React, { useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend } from 'date-fns';
import { DownloadIcon } from 'lucide-react'; // Assuming you're using Lucide icons
import { AttendanceContext } from './AttendanceContext';
import { useAuthStore } from '../lib/store';

interface User {
  id: string;
  full_name: string;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  check_in: string; // ISO 8601 timestamp
  check_out: string | null; // ISO 8601 timestamp
  status: string;
  work_mode: string;
}

interface EmployeeStats {
  user: User;
  presentDays: number;
  absentDays: number;
  totalHoursWorked: number;
  workingHoursPercentage: number;
}

interface DailyAttendance {
  date: string;
  status: 'present' | 'absent';
  workingHours: number;
}

const FilteredDataAdmin: React.FC = ({ startdate, enddate, search }) => {
  //   const [FilteredData, setFilteredData] = useState<EmployeeStats[]>([]);
  const [attendanceDataFiltered, setattendanceDataFiltered] = useState<EmployeeStats[]>([]);
  const [filteredData, setFilteredData] = useState<EmployeeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [status, setStatus] = useState('');
  const [workmode, setworkmode] = useState('');
  const { AttendanceDataFiltered } = useContext(AttendanceContext);

  // setattendanceDataFiltered

  const fetchAllEmployeesStats = async () => {
    setLoading(true);
    try {
      // Format the start and end dates correctly
      console.log("Start Date", startdate)
      const startDateFormatted = `${startdate}T00:00:00.000Z`;
      const endDateFormatted = `${enddate}T23:59:59.000Z`;
      console.log("Formatted Date", startDateFormatted)

      // Fetch all users
      const { data: userprofile, error: userprofileerror } = await supabase.from("users").select("id, full_name,organization_id").eq("id", user?.id).single();
      if (userprofileerror) throw userprofileerror;

      // Fetch all users
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, full_name")
        .not("role", "in", "(client,admin,superadmin)")
        .eq("organization_id", userprofile.organization_id);
      if (usersError) throw usersError;

      //   const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      //   const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

      // Fetch all attendance records for the selected week
      const { data: weeklyAttendance, error: weeklyError } = await supabase
        .from('attendance_logs')
        .select('*')
        .gte('check_in', startDateFormatted)
        .lte('check_in', endDateFormatted)
        .order('check_in', { ascending: true });


      if (weeklyError) throw weeklyError;

      // Fetch all breaks
      const { data: breaks, error: breaksError } = await supabase
        .from('breaks')
        .select('*')
        .gte('start_time', startDateFormatted)
        .lte('start_time', endDateFormatted);

      if (breaksError) throw breaksError;


      const startdate2 = new Date(startdate);
      const endDate2 = new Date(enddate);
      const year = startdate2.getFullYear();
      const month = String(startdate2.getMonth() + 1).padStart(2, '0'); // Months are zero-based
      const day = String(startdate2.getDate()).padStart(2, '0');
      const startdateformate = `${year}-${month}-${day}`; // Correct format: YYYY-MM-DD

      const year1 = endDate2.getFullYear();
      const month1 = String(endDate2.getMonth() + 1).padStart(2, '0'); // Months are zero-based
      const day1 = String(endDate2.getDate()).padStart(2, '0');
      const enddateformate = `${year1}-${month1}-${day1}`; // Correct format: YYYY-MM-DD





      // Fetch all absentees
      const { data: absentees, error: absenteesError } = await supabase
        .from('absentees')
        .select('*')
        .gte('absentee_date', startdateformate)
        .lte('absentee_date', enddateformate)
      // .eq("absentee_Timing" , "Full Day");        


      if (absenteesError) throw absenteesError;

      // Calculate expected working days
      const allDaysInWeek = eachDayOfInterval({ start: startdate, end: enddate });
      const workingDaysInWeek = allDaysInWeek.filter(date => !isWeekend(date)).length;

      const stats: EmployeeStats[] = await Promise.all(users.map(async (user) => {
        const { id, full_name } = user;

        // Filter attendance records for the current user
        const userAttendance = weeklyAttendance.filter(record => record.user_id === id);

        // Calculate unique attendance days
        const attendanceByDate = userAttendance.reduce((acc, curr) => {
          const date = format(new Date(curr.check_in), 'yyyy-MM-dd');
          if (!acc[date] || new Date(curr.check_in) < new Date(acc[date].check_in)) {
            acc[date] = curr;
          }
          return acc;
        }, {} as Record<string, AttendanceRecord>);

        const uniqueAttendance: AttendanceRecord[] = Object.values(attendanceByDate);

        // Calculate total working hours
        let totalHours = 0;

        uniqueAttendance.forEach(attendance => {
          const start = new Date(attendance.check_in);
          const end = attendance.check_out
            ? new Date(attendance.check_out)
            : new Date(start.getTime() + 4 * 60 * 60 * 1000); // Default 4 hours if no checkout

          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          totalHours += Math.min(hours, 12); // Cap at 12 hours per day
        });

        // Calculate total break hours
        const userBreaks = breaks.filter(breakEntry => uniqueAttendance.some(a => a.id === breakEntry.attendance_id));
        let totalBreakHours = 0;

        userBreaks.forEach(breakEntry => {
          const breakStart = new Date(breakEntry.start_time);
          const breakEnd = breakEntry.end_time
            ? new Date(breakEntry.end_time)
            : new Date(breakStart.getTime() + 1 * 60 * 60 * 1000); // Default 1-hour break

          const breakHours = (breakEnd - breakStart) / (1000 * 60 * 60);
          totalBreakHours += Math.min(breakHours, 12); // Cap at 12 hours per break
        });

        totalHours -= totalBreakHours;






        //Deleting Duplicates
        // const data = absentees

        //         // Helper function to extract the date from the `created_at` field
        // const extractDate = (created_at) => created_at.split('T')[0];

        // // Track occurrences of each user_id and date combination
        // const occurrenceMap = new Map();

        // // Check for duplicates
        // const duplicates = [];

        // data.forEach((record) => {
        //   const date = extractDate(record.created_at);
        //   const key = `${record.user_id}-${date}`;

        //   if (occurrenceMap.has(key)) {
        //     // If the key already exists, it's a duplicate
        //     duplicates.push({ ...record, duplicateOf: occurrenceMap.get(key) });
        //   } else {
        //     // Otherwise, store the key with the record's ID
        //     occurrenceMap.set(key, record.id);
        //   }
        // });

        // // Output duplicates
        // if (duplicates.length > 0) {
        //   console.log('Duplicate records found:', duplicates);
        // } else {
        //   console.log('No duplicate records found.');
        // }

        // const DuplicateIDS = duplicates.map((record) => record.id )
        // const {error: DeleteError} = await supabase
        // .from ("absentees")
        // .delete()
        // .in("id" , DuplicateIDS)


















        // Calculate absent days
        const userAbsentees = absentees.filter(absentee => absentee.user_id === id);
        const leavesCount = userAbsentees.filter(absentee => absentee.absentee_type === 'leave').length;
        const absenteesCount = userAbsentees.filter(absentee => absentee.absentee_type === 'Absent').length;
        const remoteDays = uniqueAttendance.filter(a => a.work_mode === 'remote').length;
        const presentDays = uniqueAttendance.filter(a => a.status === 'present' || 'late').length;
        const absentDays = absenteesCount;

        // Calculate working hours percentage
        const workingHoursPercentage = (totalHours / (workingDaysInWeek * 8)) * 100; // Assuming 8 hours per day

        return {
          user: { id, full_name },
          presentDays,
          absentDays,
          remoteDays,
          totalHoursWorked: totalHours,
          workingHoursPercentage,
          leavedays: leavesCount,
        };
      }));
      setattendanceDataFiltered(stats);
      setFilteredData(stats);
      AttendanceDataFiltered(stats);

    } catch (error) {
      //   console.error('Error fetching employee data:', error);
      //   setError('Error fetching employee data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when the selected date changes
  useEffect(() => {
    fetchAllEmployeesStats();
  }, [search]);

  // Handle filter change
  const handleFilterChange = (filter) => {
    setCurrentFilter(filter);
    switch (filter) {
      case 'all':
        setFilteredData(attendanceDataFiltered);
        break;
      case 'poor':
        setFilteredData(attendanceDataFiltered.filter((entry) => entry.workingHoursPercentage < 70));
        break;
      case 'good':
        setFilteredData(attendanceDataFiltered.filter((entry) => entry.workingHoursPercentage >= 70 && entry.workingHoursPercentage < 80));
        break;
      case 'excellent':
        setFilteredData(attendanceDataFiltered.filter((entry) => entry.workingHoursPercentage >= 80));
        break;
      default:
        setFilteredData(attendanceDataFiltered);
    }
  };


  const handleDownload = async (userId: string, fullName: string) => {
    try {
      // const weekStart = startOfWeek(selectedDateW, { weekStartsOn: 1 });
      // const weekEnd = endOfWeek(selectedDateW, { weekStartsOn: 1 });
      const startDateFormatted = `${startdate}T00:00:00.000Z`;
      const endDateFormatted = `${enddate}T23:59:59.000Z`;
      // Fetch attendance records
      const { data: weeklyAttendance, error: attendanceError } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("check_in", startDateFormatted)
        .lte("check_in", endDateFormatted)
        .order("check_in", { ascending: true });

      if (attendanceError) throw attendanceError;

      // Fetch absentees with absentee_timing and absentee_type using absentee_date
      const { data: absentees, error: absenteesError } = await supabase
        .from("absentees")
        .select("absentee_date, absentee_Timing, absentee_type")
        .eq("user_id", userId)
        .gte("absentee_date", startDateFormatted)
        .lte("absentee_date", endDateFormatted);

      if (absenteesError) throw absenteesError;

      // Get all days in the week
      const allDaysInWeek = eachDayOfInterval({ start: startdate, end: enddate });

      const dailyAttendance = allDaysInWeek.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");

        // Find attendance record
        const attendance = weeklyAttendance.find(
          (a) => format(new Date(a.check_in), "yyyy-MM-dd") === dateStr
        );

        // Find absentee record using absentee_date
        const absentee = absentees.find(
          (a) => a.absentee_date === dateStr
        );

        let status = "Null"; // Default to present
        let workmode = "Null"; // Default to On Site
        let workingHours = 0;
        let checkIn = null;
        let checkOut = null;

        if (attendance) {
          status = "Present"
          const formatDate = (date: Date) => {
            return new Intl.DateTimeFormat('en-US', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }).format(date);
          };

          // Example usage in your code
          workmode = attendance.work_mode
          checkIn = formatDate(new Date(attendance.check_in));
          checkOut = formatDate(new Date(attendance.check_out || new Date(new Date(checkIn).getTime() + 4 * 60 * 60 * 1000)));
          // workingHours = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60);
          // workingHours = Math.min(workingHours, 12); // Cap at 12 hours

          console.log("Attendance", attendance);
        }

        if (absentee) {
          if (absentee && !attendance) { workmode === "null" }
          if (absentee.absentee_Timing === "Full Day" && absentee.absentee_type === "Absent") {
            status = "Absent";
          } else if (absentee.absentee_Timing === "Half Day" && absentee.absentee_type === "Absent") {
            status = "Half Day Absent";
          } else if (absentee.absentee_Timing === "Half Day" && absentee.absentee_type === "leave") {
            status = "Half Day Leave";
          } else if (absentee.absentee_type === "Sick Leave") {
            status = "Sick Leave";
          }
        }

        return {
          date: dateStr,
          status: status,
          Check_in: checkIn,
          Check_out: checkOut,
          workmode: workmode,
          fullname: fullName,
        };
      });

      console.log(`Filtered Attendance for ${fullName}:`, dailyAttendance);

      // Filter out undefined values
      const filteredDailyAttendance = dailyAttendance.filter((entry) => entry);

      downloadPDF(filteredDailyAttendance, fullName);

    } catch (error) {
      console.error("Error fetching weekly data:", error);
      alert("Error fetching weekly data");
    }
  };

  const downloadPDF = async (filteredDailyAttendance, fullName) => {
    try {
      const response = await fetch('https://ems-server-0bvq.onrender.com/generate-pdfFilteredOfEmployee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: filteredDailyAttendance }),
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
      const fileName = `Weekly attendance_${currentDate} of ${fullName}.pdf`;

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



















  const totalEmployees = AttendanceDataFiltered.length;
  const badCount = AttendanceDataFiltered.filter((entry) => entry.workingHoursPercentage < 50).length;
  const betterCount = AttendanceDataFiltered.filter((entry) => entry.workingHoursPercentage >= 50 && entry.workingHoursPercentage < 80).length;
  const bestCount = AttendanceDataFiltered.filter((entry) => entry.workingHoursPercentage >= 80).length;

  return (
    <div className="flex flex-col justify-center items-center min-h-full min-w-full bg-gray-100 p-0">
      {/* Loading Animation */}
      {loading && (
        <div className="w-full max-w-7xl space-y-6">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="w-full h-16 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Filter Div */}
      {!loading && (
        <div className="w-full max-w-7xl bg-white p-6 rounded-lg shadow-lg mb-6">
          <div className="flex justify-between items-center text-lg font-medium">
            <button
              onClick={() => handleFilterChange('all')}
              className={`flex items-center space-x-2 ${currentFilter === 'all' ? 'font-bold' : ''
                }`}
            >
              <span className=" sm:block hidden w-4 h-4 bg-gray-600 rounded-full"></span>
              <h2 className="text-gray-600 sm:text-xl text-sm ">
                Total: <span className="font-bold">{totalEmployees}</span>
              </h2>
            </button>
            <button
              onClick={() => handleFilterChange('poor')}
              className={`flex items-center space-x-2 ${currentFilter === 'poor' ? 'font-bold' : ''
                }`}
            >
              <span className=" sm:block hidden w-4 h-4 bg-red-500 rounded-full"></span>
              <h2 className="text-red-600  sm:text-xl text-sm">
                Bad : <span className="font-bold">{badCount}</span>
              </h2>
            </button>
            <button
              onClick={() => handleFilterChange('good')}
              className={`flex items-center space-x-2 ${currentFilter === 'good' ? 'font-bold' : ''
                }`}
            >
              <span className="sm:block hidden w-4 h-4 bg-yellow-500 rounded-full"></span>
              <h2 className="text-yellow-600 sm:text-xl text-sm ">
                Fair: <span className="font-bold">{betterCount}</span>
              </h2>
            </button>
            <button
              onClick={() => handleFilterChange('excellent')}
              className={`flex items-center space-x-2 ${currentFilter === 'excellent' ? 'font-bold' : ''
                }`}
            >
              <span className="sm:block hidden w-4 h-4 bg-green-500 rounded-full"></span>
              <h2 className="text-green-600 sm:text-xl text-sm">
                Good: <span className="font-bold">{bestCount}</span>
              </h2>
            </button>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      {!loading && (

        <div className="max-w-7xl">
          {/* Table for larger screens (hidden on small screens) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="max-w-7xl mx-auto bg-white">
              <thead className="bg-gray-50 text-gray-700 uppercase text-sm leading-normal">
                <tr>
                  <th className="py-3 px-6 text-left">Employee Name </th>
                  <th className="py-3 px-6 text-left">Present Days</th>
                  <th className="py-3 px-6 text-left">Absent Days</th>
                  <th className="py-3 px-6 text-left">Leave Days</th>
                  <th className="py-3 px-6 text-left">Remote Work</th>
                  <th className="py-3 px-6 text-left">Total Hours Worked</th>
                  <th className="py-3 px-6 text-left">Working Hours %</th>
                  {/* <th className="py-3 px-6 text-left">Actions</th> */}
                </tr>
              </thead>
              <tbody className="text-md font-normal">
                {filteredData.map((entry, index) => {
                  const percentageColor =
                    entry.workingHoursPercentage < 70
                      ? 'bg-red-500 text-white'
                      : entry.workingHoursPercentage >= 70 && entry.workingHoursPercentage < 80
                        ? 'bg-yellow-500 text-white'
                        : 'bg-green-500 text-white';

                  const nameColor =
                    entry.workingHoursPercentage < 70
                      ? 'text-red-500'
                      : 'text-gray-800';

                  return (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-all">
                      <td className={`py-4 px-6 ${nameColor}`}>{entry.user.full_name}</td>
                      <td className="py-4 px-6">{entry.presentDays}</td>
                      <td className="py-4 px-6">{entry.absentDays}</td>
                      <td className="py-4 px-6">{entry.leavedays}</td>
                      <td className="py-4 px-6">{entry.remoteDays}</td>
                      <td className="py-4 px-6">{entry.totalHoursWorked.toFixed(2)} hrs</td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${percentageColor}`}
                        >
                          {entry.workingHoursPercentage.toFixed(2)}%
                        </span>
                      </td>
                      {/* <td className="py-3 pl-10">
                <button
                  onClick={() => handleDownload(entry.user.id, entry.user.full_name)}
                  className="p-1 hover:bg-gray-300 transition-all rounded-2xl text-gray-500"
                  aria-label="Download attendance report"
                >
                  <DownloadIcon />
                </button>
              </td> */}
                    </tr>
                  );
                })}
                {AttendanceDataFiltered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500">
                      No attendance records found for this Filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Card view for mobile screens (shown only on small screens) */}
          <div className="sm:hidden">
            {filteredData.length > 0 ? (
              <div className="space-y-4">
                {filteredData.map((entry, index) => {
                  const percentageColor =
                    entry.workingHoursPercentage < 70
                      ? 'bg-red-500 text-white'
                      : entry.workingHoursPercentage >= 70 && entry.workingHoursPercentage < 80
                        ? 'bg-yellow-500 text-white'
                        : 'bg-green-500 text-white';

                  const nameColor =
                    entry.workingHoursPercentage < 70
                      ? 'text-red-500'
                      : 'text-gray-800';

                  return (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className={`font-medium ${nameColor}`}>{entry.user.full_name}</h3>
                        <button
                          onClick={() => handleDownload(entry.user.id, entry.user.full_name)}
                          className="p-1 hover:bg-gray-300 transition-all rounded-2xl text-gray-500"
                          aria-label="Download attendance report"
                        >
                          <DownloadIcon size={18} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex flex-col">
                          <span className="text-gray-500">Present Days</span>
                          <span className="font-medium">{entry.presentDays}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500">Absent Days</span>
                          <span className="font-medium">{entry.absentDays}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500">Hours Worked</span>
                          <span className="font-medium">{entry.totalHoursWorked.toFixed(2)} hrs</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500">Working Hours %</span>
                          <span
                            className={`mt-1 px-2 py-0.5 rounded-full text-xs font-semibold text-center ${percentageColor}`}
                          >
                            {entry.workingHoursPercentage.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-lg shadow-sm">
                <p className="text-gray-500">No attendance records found for this Filter</p>
              </div>
            )}
          </div>
        </div>

      )}
    </div>
  );
};

export default FilteredDataAdmin;