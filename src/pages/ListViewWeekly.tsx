import React, { useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, addWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Assuming you're using Lucide icons
import { AttendanceContext } from './AttendanceContext';
import { DownloadIcon } from 'lucide-react';

interface User {
  id: string;
  full_name: string;
  // Add other user fields as needed
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

const EmployeeWeeklyAttendanceTable: React.FC = ({ selectedDateW  }) => {
  const [attendanceDataWeekly, setattendanceDataWeekly] = useState<EmployeeStats[]>([]);
  const [filteredData, setFilteredData] = useState<EmployeeStats[]>([]); // Filtered data for display
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState('all'); // Filter state: "all", "poor", "good", "excellent"
  const { setAttendanceDataWeekly } = useContext(AttendanceContext);


    // const downloadPDFWeekly = async () => {    
    //   try {
    //     const response = await fetch('http://localhost:4000/generate-pdfWeekly', {
    //       method: 'POST',
    //       headers: {
    //         'Content-Type': 'application/json',
    //       },
    //       body: JSON.stringify({ data: attendanceDataWeekly }),
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
      


  // Fetch data for the selected week
  const fetchAllEmployeesStats = async (date: Date) => {
    setLoading(true);
    try {
      // Fetch all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .not('full_name', 'in', '("Admin")')
        .not('full_name', 'in', '("saud")'); 

      if (usersError) throw usersError;

      const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Start of the week (Monday)
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // End of the week (Sunday)

      // Fetch all attendance records for the selected week in one go
      const { data: weeklyAttendance, error: weeklyError } = await supabase
        .from('attendance_logs')
        .select('*')
        .gte('check_in', weekStart.toISOString())
        .lte('check_in', weekEnd.toISOString())
        .order('check_in', { ascending: true });

      if (weeklyError) throw weeklyError;

      // Fetch all breaks in one go
      const { data: breaks, error: breaksError } = await supabase
        .from('breaks')
        .select('*')
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString());

      if (breaksError) throw breaksError;

      // Fetch all absentees in one go
      const { data: absentees, error: absenteesError } = await supabase
        .from('absentees')
        .select('*')
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString());

      if (absenteesError) throw absenteesError;

      // Calculate expected working days
      const allDaysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
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

        // Calculate total break hours for the user
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

        // Calculate absent days
        const userAbsentees = absentees.filter(absentee => absentee.user_id === id);
        const leavesCount = userAbsentees.filter(absentee => absentee.absentee_type === 'leave').length;
        const absenteesCount = userAbsentees.filter(absentee => absentee.absentee_type === 'Absent').length;

        const presentDays = uniqueAttendance.filter(a => a.status === 'present' || 'late').length;
        const absentDays = leavesCount + absenteesCount;

        // Calculate working hours percentage
        const workingHoursPercentage = (totalHours / (workingDaysInWeek * 8)) * 100; // Assuming 8 hours per day

        return {
          user: { id, full_name },
          presentDays,
          absentDays,
          totalHoursWorked: totalHours,
          workingHoursPercentage,
        };
      }));

      setattendanceDataWeekly(stats);
      setFilteredData(stats); // Initialize filtered data with all data
      setAttendanceDataWeekly(stats);      
    } catch (error) {
      console.error('Error fetching employee data:', error);
      setError('Error fetching employee data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when the selected date changes
  useEffect(() => {
    fetchAllEmployeesStats(selectedDateW);
  }, [selectedDateW]);

  // function handleClick() {
    // sendDataToParent(attendanceDataWeekly);
  // }
  // handleClick();






  useContext

  // Handle filter change
  const handleFilterChange = (filter) => {
    setCurrentFilter(filter);
    switch (filter) {
      case 'all':
        setFilteredData(attendanceDataWeekly);
        break;
      case 'poor':
        setFilteredData(attendanceDataWeekly.filter((entry) => entry.workingHoursPercentage < 70));
        break;
      case 'good':
        setFilteredData(attendanceDataWeekly.filter((entry) => entry.workingHoursPercentage >= 70 && entry.workingHoursPercentage < 80));
        break;
      case 'excellent':
        setFilteredData(attendanceDataWeekly.filter((entry) => entry.workingHoursPercentage >= 80));
        break;
      default:
        setFilteredData(attendanceDataWeekly);
    }
  };

  // Calculate counts for each category
  const totalEmployees = attendanceDataWeekly.length;
  const poorCount = attendanceDataWeekly.filter((entry) => entry.workingHoursPercentage < 70).length;
  const goodCount = attendanceDataWeekly.filter((entry) => entry.workingHoursPercentage >= 70 && entry.workingHoursPercentage < 80).length;
  const excellentCount = attendanceDataWeekly.filter((entry) => entry.workingHoursPercentage >= 80).length;

  return (
    <div className="flex flex-col justify-center items-center min-h-full min-w-full bg-gray-100 p-0">
      {/* Loading Animation */}
      {loading && (
        <div className="w-full max-w-5xl space-y-6">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="w-full h-16 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Filter Div */}
      {!loading && (
        <div className="w-full max-w-5xl bg-white p-6 rounded-lg shadow-lg mb-6">
          <div className="flex justify-between items-center text-lg font-medium">
            <button
              onClick={() => handleFilterChange('all')}
              className={`flex items-center space-x-2 ${
                currentFilter === 'all' ? 'font-bold' : ''
              }`}
            >
              <span className="w-4 h-4 bg-gray-600 rounded-full"></span>
              <h2 className="text-gray-600">
                Total: <span className="font-bold">{totalEmployees}</span>
              </h2>
            </button>
            <button
              onClick={() => handleFilterChange('poor')}
              className={`flex items-center space-x-2 ${
                currentFilter === 'poor' ? 'font-bold' : ''
              }`}
            >
              <span className="w-4 h-4 bg-red-500 rounded-full"></span>
              <h2 className="text-red-600">
                Bad : <span className="font-bold">{poorCount}</span>
              </h2>
            </button>
            <button
              onClick={() => handleFilterChange('good')}
              className={`flex items-center space-x-2 ${
                currentFilter === 'good' ? 'font-bold' : ''
              }`}
            >
              <span className="w-4 h-4 bg-yellow-500 rounded-full"></span>
              <h2 className="text-yellow-600">
                Fair: <span className="font-bold">{goodCount}</span>
              </h2>
            </button>
            <button
              onClick={() => handleFilterChange('excellent')}
              className={`flex items-center space-x-2 ${
                currentFilter === 'excellent' ? 'font-bold' : ''
              }`}
            >
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <h2 className="text-green-600">
                Good: <span className="font-bold">{excellentCount}</span>
              </h2>
            </button>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      {!loading && (
        <div className="w-full max-w-5xl bg-white p-6 rounded-lg shadow-lg">
          {error && <p className="text-red-500 text-center">{error}</p>}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50 text-gray-700 uppercase text-sm leading-normal">
                <tr>
                  <th className="py-3 px-6 text-left">Employee Name</th>
                  <th className="py-3 px-6 text-left">Present Days</th>
                  <th className="py-3 px-6 text-left">Absent Days</th>
                  <th className="py-3 px-6 text-left">Total Hours Worked</th>
                  <th className="py-3 px-6 text-left">Working Hours %</th>
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
                      <td className="py-4 px-6">{entry.totalHoursWorked.toFixed(2)} hrs</td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${percentageColor}`}
                        >
                          {entry.workingHoursPercentage.toFixed(2)}%
                        </span>

                      </td>
                      <button className='w-full h-full'> <DownloadIcon className='mt-3 p-1 hover:bg-gray-300 transition-all rounded-2xl text-gray-500'/></button>

                    </tr>
                  );
                })}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-gray-500">
                      No attendance records found for this week.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeWeeklyAttendanceTable;