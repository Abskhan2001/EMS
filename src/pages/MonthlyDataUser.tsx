import React, { useState, useEffect } from "react";
import { withRetry } from "../lib/supabase";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, max, min } from "date-fns";



const FilterDataUser = ({ selectedDate, selectedtab }) => {
  // Tab state: "Weekly" or "Monthly" - Always show Monthly for this component
  const [selectedTab, setSelectedTab] = useState("Monthly");
  // Date range state
  const [startdate, setStartdate] = useState("");
  const [enddate, setEnddate] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Use the selectedDate from Dashboard instead of always using today
    const currentDate = selectedDate || new Date();

    if (selectedTab === "Weekly") {
      // Calculate week boundaries
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

      // Calculate month boundaries
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // Adjust week boundaries to only include current month dates
      const adjustedWeekStart = max([weekStart, monthStart]);
      const adjustedWeekEnd = min([weekEnd, monthEnd]);

      setStartdate(adjustedWeekStart.toISOString().split("T")[0]);
      setEnddate(adjustedWeekEnd.toISOString().split("T")[0]);
    } else if (selectedTab === "Monthly") {
      // Use date-fns functions for more reliable month boundary calculation
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const startDateStr = monthStart.toISOString().split("T")[0];
      const endDateStr = monthEnd.toISOString().split("T")[0];

      setStartdate(startDateStr);
      setEnddate(endDateStr);
    }
  }, [selectedTab, selectedDate]);

  return (
    <div>
      {/* <div className="flex gap-4 mb-4">
        <button
          className={px-4 py-2 rounded-lg font-semibold ${selectedTab === "Weekly" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}}
          onClick={() => setSelectedTab("Weekly")}
        >
          Weekly
        </button>
        <button
          className={px-4 py-2 rounded-lg font-semibold ${selectedTab === "Monthly" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}}
          onClick={() => setSelectedTab("Monthly")}
        >
          Monthly
        </button>
      </div> */}
      <MonthlyOrWeeklyTable
        startdate={startdate}
        enddate={enddate}
        search={search}
        selectedtab={"Filter"}
      />
    </div>
  );
};

// The original logic, renamed to MonthlyOrWeeklyTable
const MonthlyOrWeeklyTable = ({ startdate, enddate, search, selectedtab }) => {
  const [Attendance, setAttendance] = useState([]);
  const [absentees, setabsentees] = useState([]);
  const [breaks, setbreaks] = useState([]);
  const [Error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filtereddata, setFilteredData] = useState([]);
  const userID = localStorage.getItem("user_id");
  const [isLoading, setisLoading] = useState(false);

  useEffect(() => {
    setisLoading(true);
    if (!userID || !startdate || !enddate) {
      setisLoading(false);
      return;
    }


    const startDateFormatted = `${startdate}T00:00:00.000Z`;
    const endDateFormatted = `${enddate}T23:59:59.000Z`;




    const fetchattendance = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/attendance?userId=${userID}&startDate=${startDateFormatted}&endDate=${endDateFormatted}`, {
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
        } else {
          setError(result.message || 'Failed to fetch attendance data');
        }
      } catch (error) {
        setError(error.message || 'Failed to fetch attendance data');
      }
    };

    const fetchabsentees = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/absentees?userId=${userID}&startDate=${startDateFormatted}&endDate=${endDateFormatted}`, {
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
        } else {
          setError(result.message || 'Failed to fetch absentees data');
        }
      } catch (error) {
        setError(error.message || 'Failed to fetch absentees data');
      }
    };

    const fetchbreaks = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/breaks?userId=${userID}&startDate=${startDateFormatted}&endDate=${endDateFormatted}`, {
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
        } else {
          setError(result.message || 'Failed to fetch breaks data');
        }
      } catch (error) {
        setError(error.message || 'Failed to fetch breaks data');
      }
    };

    if (selectedtab === "Filter") {
      fetchattendance();
      fetchabsentees();
      fetchbreaks();
    }

    setisLoading(false);
  }, [startdate, enddate, selectedtab, userID]); // Run when date range or tab changes

  useEffect(() => {
    if (!Attendance.length && !absentees.length) return;
    const newfilterdata = [];

    // Create a map to store data by date
    const dataByDate = new Map();

    // Process Attendance Data
    Attendance.forEach((entry) => {
      const date = entry.check_in.split("T")[0]; // Extract the date

      // Additional filter: Only process dates within the queried range
      if (date < startdate || date > enddate) {
        return; // Skip this entry
      }

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

      // Additional filter: Only process dates within the queried range
      if (date < startdate || date > enddate) {
        return; // Skip this entry
      }

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
    setFilteredData(mergedData);
    setisLoading(false);
  }, [Attendance, absentees, startdate, enddate]);

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
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center">
                    <div className="w-full max-w-5xl space-y-4">
                      {[...Array(5)].map((_, index) => (
                        <div
                          key={index}
                          className="w-full h-16 bg-gray-200 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : filtereddata && filtereddata.length > 0 ? (
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
  );
};

// Main component that receives selectedDate from Dashboard
const MonthlyDataUser = ({ selectedDate, selectedtab }) => {
  return <FilterDataUser selectedDate={selectedDate} selectedtab={selectedtab} />;
};

export default MonthlyDataUser;