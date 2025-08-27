import React, { useState, useEffect } from "react";
import { withRetry } from "../lib/supabase";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isWeekend } from "date-fns";

const FilterDataUser = ({ startdate, enddate, search, selectedtab }) => {
  const [attendance, setAttendance] = useState([]);
  const [absentees, setabsentees] = useState([]);
  const [breaks, setbreaks] = useState([]);
  const [Error, setError] = useState("");
  const [filtereddata, setFilteredData] = useState([]);
  const [isLoading, setisLoading] = useState(false);
  const userID = localStorage.getItem("user_id");



  const func1 = async () => {
    setisLoading(true);
    setFilteredData([]); // Reset filtered data before fetching new data

    const startDateFormatted = `${startdate}T00:00:00.000Z`;
    const endDateFormatted = `${enddate}T23:59:59.000Z`;

    try {
      // Fetch attendance data
      const attendanceResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/attendance?userId=${userID}&startDate=${startDateFormatted}&endDate=${endDateFormatted}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!attendanceResponse.ok) {
        throw new Error(`HTTP error! status: ${attendanceResponse.status}`);
      }

      const attendanceResult = await attendanceResponse.json();
      if (attendanceResult.success) {
        const attendanceData = attendanceResult.data || [];
        setAttendance(attendanceData);
        console.log("AttendAnceData", attendanceData);
      } else {
        setError(attendanceResult.message || 'Failed to fetch attendance data');
        return;
      }

      // Fetch absentee data
      const absenteesResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/absentees?userId=${userID}&startDate=${startDateFormatted}&endDate=${endDateFormatted}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!absenteesResponse.ok) {
        throw new Error(`HTTP error! status: ${absenteesResponse.status}`);
      }

      const absenteesResult = await absenteesResponse.json();
      if (absenteesResult.success) {
        const absenteesData = absenteesResult.data || [];
        setabsentees(absenteesData);
        console.log("Absentees Data", absenteesData);
      } else {
        setError(absenteesResult.message || 'Failed to fetch absentees data');
        return;
      }

      // Fetch breaks data
      const breaksResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/breaks?userId=${userID}&startDate=${startDateFormatted}&endDate=${endDateFormatted}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!breaksResponse.ok) {
        throw new Error(`HTTP error! status: ${breaksResponse.status}`);
      }

      const breaksResult = await breaksResponse.json();
      if (breaksResult.success) {
        const breaksData = breaksResult.data || [];
        setbreaks(breaksData);
        console.log("Breaks", breaksData);
      } else {
        setError(breaksResult.message || 'Failed to fetch breaks data');
        return;
      }

    } catch (error) {
      setError(error.message || 'Failed to fetch data');
    }

    setisLoading(false);
  };

  const func2 = () => {
    if (!startdate || !enddate) return;

    const dataByDate = new Map();

    // Generate all days between start and end date
    const startDateObj = new Date(startdate);
    const endDateObj = new Date(enddate);
    const allDays = eachDayOfInterval({ start: startDateObj, end: endDateObj });

    // Initialize all days with default status
    allDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const isWeekendDay = isWeekend(day);

      dataByDate.set(dateStr, {
        date: dateStr,
        checkIn: isWeekendDay ? "Weekend" : "No Record",
        checkOut: isWeekendDay ? "Weekend" : "No Record",
        status: isWeekendDay ? "Weekend" : "No Record",
        work_mode: "N/A",
      });
    });

    // Process Attendance Data - Override default entries with actual data
    attendance.forEach((entry) => {
      const date = entry.check_in.split("T")[0];

      // Additional filter: Only process dates within the queried range
      if (date < startdate || date > enddate) {
        return; // Skip this entry
      }

      const checkInTime = new Date(entry.check_in).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const checkOutTime = entry.check_out
        ? new Date(entry.check_out).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
        : "N/A";

      // Override the default "No Record" entry with actual attendance data
      dataByDate.set(date, {
        date,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        status: entry.status,
        work_mode: entry.work_mode || "N/A",
      });
    });

    // Process Absentees Data - Override default entries with absence data
    absentees.forEach((entry) => {
      const date = entry.created_at.split("T")[0];

      // Additional filter: Only process dates within the queried range
      if (date < startdate || date > enddate) {
        return; // Skip this entry
      }

      // Only override if there's no attendance record and it's not a weekend
      const existingEntry = dataByDate.get(date);
      if (existingEntry && existingEntry.status === "No Record") {
        dataByDate.set(date, {
          date,
          checkIn: "Absent",
          checkOut: "Absent",
          status: "Absent",
          work_mode: "N/A",
        });
      }
    });

    // Merge all data
    const mergedData = Array.from(dataByDate.values());
    mergedData.sort((a, b) => new Date(a.date) - new Date(b.date));

    setFilteredData(mergedData);
    setisLoading(false); // Set loading false after data is merged
  };

  useEffect(() => {
    // Only run if we have valid start and end dates
    if (!startdate || !enddate || !userID) {
      return;
    }

    const runit = async () => {
      await func1();
      // Always call func2 to generate all days in range
      func2();
    };
    runit();
  }, [startdate, enddate, userID]);

  // Also call func2 whenever attendance or absentees data changes
  useEffect(() => {
    func2();
  }, [attendance, absentees, startdate, enddate]);

  return (
    <>
      <div className="width-full bg-red rounded-3xl shadow-lg max-w-7xl">
        <div className="overflow-x-auto overflow-y-auto max-h-96 rounded-2xl">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50 p-4 text-gray-900 font-semibold text-md leading-normal">
              <td className="px-3 py-6 text-center">Date</td>
              <td className="px-3 py-6 text-center">Check-In</td>
              <td className="px-3 py-6 text-center">Check-Out</td>
              <td className="px-3 py-6 text-center">Status</td>
              <td className="px-3 py-6 text-center">Work Mode</td>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 py-4">
                    <div className="w-full max-w-5l space-y-4 px-10">
                      {[...Array(4)].map((_, index) => (
                        <div key={index} className="w-full h-16 bg-gray-200 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && filtereddata.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 py-4">
                    No Data Available for the Selected Date Range
                  </td>
                </tr>
              )}
              {!isLoading && filtereddata.length > 0 && (
                filtereddata.map((data, index) => (
                  <tr key={index} className="text-gray-700">
                    <td className="px-3 py-4 text-center">{data.date}</td>
                    <td className="px-3 py-4 text-center">{data.checkIn}</td>
                    <td className="px-3 py-4 text-center">{data.checkOut}</td>
                    <td className="px-3 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${data.status === "present"
                          ? "bg-green-100 text-green-800"
                          : data.status === "late"
                            ? "bg-yellow-100 text-yellow-800"
                            : data.status === "Weekend"
                              ? "bg-blue-100 text-blue-800"
                              : data.status === "No Record"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-red-100 text-red-800"
                          }`}
                      >
                        {data.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${data.work_mode === "on_site"
                          ? "bg-blue-100 text-blue-800"
                          : data.work_mode === "remote"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-white text-black"
                          }`}
                      >
                        {data.work_mode === "on_site"
                          ? "On-site"
                          : data.work_mode === "remote"
                            ? "Remote"
                            : "-----"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default FilterDataUser;