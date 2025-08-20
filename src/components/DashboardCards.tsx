import { useState, useEffect } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { startOfYear, endOfYear } from "date-fns";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../lib/store";

// Define leave types with initial values and limits
const initialLeaveData = [
  { type: "Sick Leave", used: 0, total: 22, color: "#24B12B" },
  { type: "Casual Leave", used: 0, total: 22, color: "#3498db" },
  { type: "Unpaid Leave", used: 0, total: 22, color: "#FF355C", countOnly: true },
  { type: "Remote Work", used: 0, total: 22, color: "#C78E2C", countOnly: true },
  { type: "Emergency Leave", used: 0, total: 22, color: "#9A00FF" },
];

// Total shared leave pool (excluding Remote Work)
const TOTAL_SHARED_LEAVE = 22;

export default function DashboardCards() {
  const [selectedDate] = useState(new Date());
  const [leaveData, setLeaveData] = useState(initialLeaveData);
  const [totalUsedLeave, setTotalUsedLeave] = useState(0);
  const [availableLeave, setAvailableLeave] = useState(TOTAL_SHARED_LEAVE);
  const currentUser = useAuthStore((state) => state.user);
  
  // Get start and end of the current year
  const yearStart = startOfYear(selectedDate);
  const yearEnd = endOfYear(selectedDate);

  async function fetchremote() {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', currentUser?.id || localStorage.getItem('user_id'))
      .eq("work_mode", "remote")
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());

    if (error) {
      console.error("Error fetching remote work data:", error);
    }
    else {
      console.log("the workfrom home details", data);
      
      // Process remote work data
      if (data) {
        // Update the leaveData state to include remote work count
        setLeaveData(prevLeaveData => {
          const newLeaveData = [...prevLeaveData];
          const remoteWorkIndex = newLeaveData.findIndex(item => item.type === "Remote Work");
          
          if (remoteWorkIndex !== -1) {
            // Count the number of remote work days
            const remoteWorkCount = data.length;
            newLeaveData[remoteWorkIndex].used = remoteWorkCount;
          }
          
          return newLeaveData;
        });
        
        // After updating remote work count, recalculate total leave
        // This ensures that remote work is included in the total
        fetchAbsentees();
      }
    }
  }

  async function fetchAbsentees() {
    try {
      const { data, error } = await supabase
        .from('absentees')
        .select('*')
        .eq('user_id', currentUser?.id || localStorage.getItem('user_id'))
        .gte('absentee_date', yearStart.toISOString().split('T')[0])
        .lte('absentee_date', yearEnd.toISOString().split('T')[0]);
      
      if (error) {
        console.error('Error fetching absentees:', error);
        return;
      }
      
      console.log("the all absentees for the person", data);
      
      if (data) {
        processAbsenteeData(data);
      }
    } catch (err) {
      console.error('Failed to fetch absentees:', err);
    }
  }
  
  // Process absentee data and update leave counts
  function processAbsenteeData(absenteeData) {
    // Create a copy of the initial leave data
    const updatedLeaveData = JSON.parse(JSON.stringify(initialLeaveData));
    
    // Track total casual and sick leaves to determine if we need to add to unpaid
    let casualLeaveCount = 0;
    let sickLeaveCount = 0;
    let emergencyLeaveCount = 0;
    let halfDayCount = 0;
    
    // Preserve the remote work count from the current state
    const currentRemoteWorkCount = leaveData.find(item => item.type === "Remote Work")?.used || 0;
    
    // Process each absentee record
    absenteeData.forEach(record => {
      switch(record.absentee_Timing) {
        case "Full Day":
          casualLeaveCount++;
          break;
        case "Sick Leave":
          sickLeaveCount++;
          break;
        case "Half Day":
          halfDayCount++;
          break;
        case "Emergency Leave":
          emergencyLeaveCount++;
          break;
        default:
          // Handle any other types if needed
          break;
      }
    });
    
    // Convert half days to casual leaves (2 half days = 1 casual leave)
    const additionalCasualLeaves = Math.floor(halfDayCount / 2);
    casualLeaveCount += additionalCasualLeaves;
    
    // Remaining half day (if odd number of half days)
    const remainingHalfDay = halfDayCount % 2;
    
    // Calculate total leave days used (now INCLUDING Remote Work)
    const totalLeaveUsed = casualLeaveCount + sickLeaveCount + emergencyLeaveCount + currentRemoteWorkCount;
    setTotalUsedLeave(totalLeaveUsed);
    
    // Calculate how many days exceed the shared pool (going to unpaid)
    const unpaidLeaveCount = Math.max(0, totalLeaveUsed - TOTAL_SHARED_LEAVE);
    
    // Calculate how many days are available in the shared pool
    const available = Math.max(0, TOTAL_SHARED_LEAVE - totalLeaveUsed);
    setAvailableLeave(available);
    
    // Update casual leave count
    const casualLeaveIndex = updatedLeaveData.findIndex(item => item.type === "Casual Leave");
    if (casualLeaveIndex !== -1) {
      updatedLeaveData[casualLeaveIndex].used = casualLeaveCount;
      // Add a note about half days if there's a remaining one
      if (remainingHalfDay > 0) {
        updatedLeaveData[casualLeaveIndex].note = `+ ${remainingHalfDay} half day`;
      }
    }
    
    // Update sick leave count
    const sickLeaveIndex = updatedLeaveData.findIndex(item => item.type === "Sick Leave");
    if (sickLeaveIndex !== -1) {
      updatedLeaveData[sickLeaveIndex].used = sickLeaveCount;
    }
    
    // Update emergency leave count
    const emergencyLeaveIndex = updatedLeaveData.findIndex(item => item.type === "Emergency Leave");
    if (emergencyLeaveIndex !== -1) {
      updatedLeaveData[emergencyLeaveIndex].used = emergencyLeaveCount;
    }
    
    // Update remote work count
    const remoteWorkIndex = updatedLeaveData.findIndex(item => item.type === "Remote Work");
    if (remoteWorkIndex !== -1) {
      updatedLeaveData[remoteWorkIndex].used = currentRemoteWorkCount;
    }
    
    // Update unpaid leave count
    const unpaidLeaveIndex = updatedLeaveData.findIndex(item => item.type === "Unpaid Leave");
    if (unpaidLeaveIndex !== -1) {
      updatedLeaveData[unpaidLeaveIndex].used = unpaidLeaveCount;
    }
    
    // Update the state with the new leave data
    setLeaveData(updatedLeaveData);
  }
  
  useEffect(() => {
    if (currentUser) {
      fetchremote();
      // fetchAbsentees is called after fetchremote completes to ensure
      // remote work count is included in the total calculation
    }
  }, [currentUser, selectedDate]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 mb-6 mt-2">
      {leaveData.map((leave, index) => (
        <div
          key={index}
          className="bg-white p-3 sm:p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
        >
          <h2
            className="text-sm sm:text-base font-semibold text-left leading-5 mb-2 sm:mb-3"
            style={{ color: leave.color }}
          >
            {leave.type}
          </h2>
          <div className="flex items-center justify-between gap-3">
            <div className="w-12 sm:w-14 md:w-16">
              <CircularProgressbar
                counterClockwise
                value={leave.countOnly ? 100 : (leave.used / TOTAL_SHARED_LEAVE) * 100}
                text={leave.countOnly ? `${leave.used}` : `${leave.used}/${availableLeave}`}
                styles={buildStyles({
                  textColor: leave.color,
                  pathColor: leave.color,
                  trailColor: "#e5e7eb",
                  textSize: "24px",
                })}
              />
            </div>
            <div className="font-medium text-[#344054] text-[8px] sm:text-[10px]">
              {leave.countOnly ? (
                <p>Used: {leave.used}</p>
              ) : (
                <>
                  <p className="mb-1">
                    Available: {availableLeave}
                  </p>
                  <p>Used: {leave.used} {leave.note && <span>({leave.note})</span>}</p>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}