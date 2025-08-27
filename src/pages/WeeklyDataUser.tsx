import React from "react";
import { useState, useEffect } from "react";
import { withRetry } from "../lib/supabase";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, max, min } from "date-fns";
import Attendance from "./Attendance";

const WeeklyDataUser = ({ selectedDate, selectedtab }) => {
  const [Attendance, setAttendance] = useState([]);
  const [absentees, setabsentees] = useState([]);
  const [breaks, setbreaks] = useState([]);
  const [Error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [Weeklydata, setWeeklyData] = useState([]);

  const userID = localStorage.getItem("user_id")

  // Calculate week boundaries
  const weekstart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);

  // Calculate month boundaries
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  // Adjust week boundaries to only include current month dates
  const adjustedWeekStart = max([weekstart, monthStart]);
  const adjustedWeekEnd = min([weekEnd, monthEnd]);

  //Extracting Month From the Seletced Date
  const monthName = selectedDate.toLocaleString('default', { month: 'long' });
  const year = selectedDate.getFullYear();

  useEffect(() => {

    const fetchattendance = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/attendance?userId=${userID}&startDate=${adjustedWeekStart.toISOString()}&endDate=${adjustedWeekEnd.toISOString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          const attendanceData = result.data || [];
          setAttendance(attendanceData);
          console.log("AttendAnceData", attendanceData);
        } else {
          setError(result.message || 'Failed to fetch attendance data');
        }
      } catch (error) {
        setError(error.message || 'Failed to fetch attendance data');
      }
    }

    const fetchabsentees = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/absentees?userId=${userID}&startDate=${adjustedWeekStart.toISOString()}&endDate=${adjustedWeekEnd.toISOString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          const absenteesData = result.data || [];
          setabsentees(absenteesData);
          console.log("Absentees Data", absenteesData);
        } else {
          setError(result.message || 'Failed to fetch absentees data');
        }
      } catch (error) {
        setError(error.message || 'Failed to fetch absentees data');
      }
    }

    const fetchbreaks = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/breaks?userId=${userID}&startDate=${adjustedWeekStart.toISOString()}&endDate=${adjustedWeekEnd.toISOString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          const breaksData = result.data || [];
          setbreaks(breaksData);
          console.log("Breaks", breaksData);
        } else {
          setError(result.message || 'Failed to fetch breaks data');
        }
      } catch (error) {
        setError(error.message || 'Failed to fetch breaks data');
      }
    }

    if (selectedtab === "Weeklydata") {
      fetchattendance();
      fetchabsentees();
      fetchbreaks();
    }
  }, [selectedtab, userID])


  // useEffect(() => {
  //     if (!Attendance.length && !absentees.length) return;

  //     const newWeeklyData = [];
  // //   if (!Attendance) return;
  //     // Process Attendance Data
  //     Attendance.forEach((entry) => {
  //             const checkInTime = new Date(entry.check_in).toLocaleTimeString("en-US", {
  //                 hour: "2-digit",
  //                 minute: "2-digit",
  //                 hour12: true, // Use false for 24-hour format
  //             });

  //             const checkOutTime = entry.check_out
  //                 ? new Date(entry.check_out).toLocaleTimeString("en-US", {
  //                     hour: "2-digit",
  //                     minute: "2-digit",
  //                     hour12: true,
  //                 })
  //                 : "N/A";
  //         newWeeklyData.push({
  //             date: entry.check_in.split("T")[0], 
  //             checkIn: checkInTime,
  //             checkOut: checkOutTime || "N/A",
  //             status: entry.status,
  //             work_mode: entry.work_mode || "N/A",
  //         });
  //     });

  //     // if (!absentees) return;
  //     // Process Absentees Data
  //     absentees.forEach((entry) => {
  //         newWeeklyData.push({
  //             date: entry.created_at.split("T")[0],  
  //             checkIn: "Absent",
  //             checkOut: "Absent",
  //             status: "Absent",
  //             work_mode: "N/A",
  //         });
  //     });

  //     setWeeklyData(newWeeklyData);
  //     // console.log("Weekly Data",newWeeklyData);
  // }, [Attendance, absentees]);
  useEffect(() => {
    if (!Attendance.length && !absentees.length) return;

    const newWeeklyData = [];

    // Create a map to store data by date
    const dataByDate = new Map();

    // Process Attendance Data
    Attendance.forEach((entry) => {
      const date = entry.check_in.split("T")[0]; // Extract the date
      const checkInTime = new Date(entry.check_in).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true, // Use false for 24-hour format
      });

      const checkOutTime = entry.check_out
        ? new Date(entry.check_out).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
        : "N/A";

      // Add or update the entry for this date
      dataByDate.set(date, {
        date,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        status: entry.status,
        work_mode: entry.work_mode || "N/A",
      });
    });

    // Process Absentees Data
    absentees.forEach((entry) => {
      const date = entry.created_at.split("T")[0]; // Extract the date

      // If there's already an attendance entry for this date, skip adding the absentee entry
      if (dataByDate.has(date)) {
        return;
      }

      // Add the absentee entry for this date
      dataByDate.set(date, {
        date,
        checkIn: "Absent",
        checkOut: "Absent",
        status: "Absent",
        work_mode: "N/A",
      });
    });

    // Convert the map values to an array
    const mergedData = Array.from(dataByDate.values());

    // Sort the data by date (optional)
    mergedData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Update the state
    setWeeklyData(mergedData);
  }, [Attendance, absentees]);





  return (
    <>
      <div>
        <h3 className="mb-3 font-semibold text-xl text-gray-900">Weekly Overview - {monthName + " " + year}</h3>
      </div>
      <div className="width-full bg-red rounded-3xl shadow-lg max-w-7xl">
        {Error && <p className="text-red-500 text-center">{Error}</p>}
        <div className="overflow-x-auto overflow-y-auto max-h-96 rounded-2xl">
          <table className="min-w-full   bg-white">
            <thead className="bg-gray-50 p-4 text-gray-900  font-semibold  text-md leading-normal">
              <td className="px-3 py-6 text-center">Date</td>
              <td className="px-3 py-6 text-center">Check-In</td>
              <td className="px-3 py-6 text-center">Check-Out</td>
              <td className="px-3 py-6 text-center">Status</td>
              <td className="px-3 py-6 text-center">Work Mode</td>
            </thead>
            <tbody>
              {Weeklydata && Weeklydata.length > 0 ? (
                Weeklydata.map((data, index) => (
                  <tr key={index} className="text-gray-700">
                    <td className="px-3 py-4 text-center">{data.date}</td>
                    <td className="px-3 py-4 text-center">{data.checkIn}</td>
                    <td className="px-3 py-4 text-center">{data.checkOut}</td>
                    {/* <td className="px-3 py-4 text-center">{data.status}</td>  */}
                    <td className="px-3 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${data.status === "present"
                          ? "bg-green-100 text-green-800"
                          : data.status === "late"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                          }`}
                      >
                        {data.status}
                      </span>
                    </td>
                    {/* <td className="px-3 py-4 text-center">{data.work_mode}</td>  */}
                    <td className="px-3 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${data.work_mode === "on_site"
                          ? "bg-blue-100 text-blue-800"
                          : data.work_mode === "remote"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-white text-black"
                          }`}
                      >
                        {data.work_mode === "on_site" ? "On-site" : data.work_mode === "remote" ? "Remote" : "-----"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 py-4">
                    No Data Available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </>
  )
};
export default WeeklyDataUser;