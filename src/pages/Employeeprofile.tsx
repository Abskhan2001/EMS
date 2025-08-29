// Utility functions (place near your imports)
const getWorkingDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  let workingDays = 0;

  while (date.getMonth() === month) {
    const day = date.getDay();
    // Monday (1) to Friday (5) only
    if (day >= 1 && day <= 5) workingDays++;
    date.setDate(date.getDate() + 1);
  }

  return workingDays;
};

const calculateExpectedHours = (year: number, month: number) => {
  return getWorkingDaysInMonth(year, month) * 7;
};

const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

// Function to calculate overtime earnings based on new rules
const calculateOvertimeEarnings = (overtimeHours: number, basicPerHourRate: number) => {
  if (overtimeHours <= 0) return 0;

  let overtimeRate = 0;
  if (overtimeHours <= 20) {
    overtimeRate = basicPerHourRate * 0.8; // 80% of basic rate
  } else if (overtimeHours <= 40) {
    overtimeRate = basicPerHourRate * 0.75; // 75% of basic rate
  } else {
    overtimeRate = basicPerHourRate * 0.7; // 70% of basic rate
  }

  return overtimeHours * overtimeRate;
};

import React, { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import ChangePasswordAdminModal from "../components/ChangePasswordAdminModal";
import {
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Globe,
  Building2,
  Slack,
  Briefcase,
  X,
  ArrowLeft,
} from "lucide-react";
import { FaEdit } from "react-icons/fa";
import { startOfMonth } from "date-fns";
import {
  CheckCircle,
  PieChart,
  Users,
  CalendarClock,
  Moon,
  AlarmClockOff,
  Watch,
  Info,
  Landmark,
  Clock,
  DollarSign,
  FileMinusIcon,
  TrendingDown,
  TrendingUp,
  FileText,
  History,
  Key,
} from "lucide-react";

const Employeeprofile = ({
  employeeid,
  employee,
  employeeview,
  setemployeeview,
}) => {
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [incrementModel, setIncrementModel] = useState(false);
  const [expectedHours, setExpectedHours] = useState<number | null>(null);
  const [lastIncrement, setLastIncrement] = useState(null); // Changed from increment to lastIncrement for clarity
  const [selectedmonth, setselectedmonth] = useState(getCurrentMonth());
  const [startdate, setStartdate] = useState("");
  const [enddate, setEnddate] = useState("");
  const [monthlyData, setMonthlyData] = useState({
    totalAttendance: 0,
    totalAbsents: 0,
    totalLeaves: 0,
    totalWorkingHours: "0",
    totalOvertimeHours: "0",
    overtimePay: "0",
    activeTaskCount: 0,
    completedTaskCount: 0,
    completedTasksScore: 0,
    projectsCount: 0,
  });

  // Deductions state
  const [deductionsData, setDeductionsData] = useState({
    advance_pay: "0",
    property_damage: "0",
    deducted: "0",
    month: "",
  });
  const [selectedDeductionMonth, setSelectedDeductionMonth] = useState(getCurrentMonth());
  const [isEditingDeductions, setIsEditingDeductions] = useState(false);
  const [deductionsLoading, setDeductionsLoading] = useState(false);

  // Add Deduction state (for admin to add monthly deductions)
  const [addDeductionData, setAddDeductionData] = useState({
    deducted: "0",
    month: getCurrentMonth(),
  });
  const [isAddingDeduction, setIsAddingDeduction] = useState(false);
  const [addDeductionLoading, setAddDeductionLoading] = useState(false);

  // Add this right after your imports

  // Function to fetch deductions data for a specific month
  const fetchDeductionsData = async (monthToFetch?: string) => {
    try {
      setDeductionsLoading(true);
      const targetMonth = monthToFetch || selectedDeductionMonth;

      if (!targetMonth) {
        // If no month is selected, reset to default values
        setDeductionsData({
          advance_pay: "0",
          property_damage: "0",
          deducted: "0",
          month: "",
        });
        return;
      }

      const { data, error } = await supabase
        .from("deductions")
        .select("advance_pay, property_damage, deducted, month")
        .eq("user_id", employeeid)
        .eq("month", targetMonth)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error("Error fetching deductions:", error);
        return;
      }

      if (data) {
        setDeductionsData({
          advance_pay: data.advance_pay?.toString() || "0",
          property_damage: data.property_damage?.toString() || "0",
          deducted: data.deducted?.toString() || "0",
          month: data.month || targetMonth,
        });
      } else {
        // No deductions found for this month, set defaults
        setDeductionsData({
          advance_pay: "0",
          property_damage: "0",
          deducted: "0",
          month: targetMonth,
        });
      }
    } catch (err) {
      console.error("Error in fetchDeductionsData:", err);
    } finally {
      setDeductionsLoading(false);
    }
  };

  // Function to save deductions data
  const saveDeductionsData = async () => {
    try {
      setDeductionsLoading(true);

      // Validate that a month is selected
      if (!selectedDeductionMonth) {
        alert("Please select a month before saving deductions.");
        return;
      }

      const deductionRecord = {
        user_id: employeeid,
        advance_pay: parseFloat(deductionsData.advance_pay) || 0,
        property_damage: parseFloat(deductionsData.property_damage) || 0,
        month: selectedDeductionMonth,
      };

      // Try to find existing record for this user and month
      const { data: existingData, error: fetchError } = await supabase
        .from("deductions")
        .select("id")
        .eq("user_id", employeeid)
        .eq("month", selectedDeductionMonth)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingData) {
        // Update existing record for this month
        const { error: updateError } = await supabase
          .from("deductions")
          .update(deductionRecord)
          .eq("user_id", employeeid)
          .eq("month", selectedDeductionMonth);

        if (updateError) throw updateError;
        console.log("Deductions updated successfully for month:", selectedDeductionMonth);
      } else {
        // Insert new record for this month
        const { error: insertError } = await supabase
          .from("deductions")
          .insert([deductionRecord]);

        if (insertError) throw insertError;
        console.log("Deductions inserted successfully for month:", selectedDeductionMonth);
      }

      setIsEditingDeductions(false);

      // Update the deductions data state with the saved month
      setDeductionsData(prev => ({
        ...prev,
        month: selectedDeductionMonth
      }));

    } catch (err) {
      console.error("Error saving deductions:", err);
      alert("Failed to save deductions: " + (err as any).message);
    } finally {
      setDeductionsLoading(false);
    }
  };

  // Function to handle deductions input change
  const handleDeductionsChange = (field: string, value: string) => {
    setDeductionsData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Function to calculate total deductions (advance pay + property damage - deducted)
  const calculateTotalDeductions = () => {
    const advancePay = parseFloat(deductionsData.advance_pay) || 0;
    const propertyDamage = parseFloat(deductionsData.property_damage) || 0;
    const deducted = parseFloat(deductionsData.deducted) || 0;
    return Math.max(0, advancePay + propertyDamage - deducted).toFixed(2);
  };

  // Function to handle deduction month change
  const handleDeductionMonthChange = (newMonth: string) => {
    setSelectedDeductionMonth(newMonth);
    fetchDeductionsData(newMonth);
  };

  // Function to save monthly deduction amount
  const saveMonthlyDeduction = async () => {
    try {
      setAddDeductionLoading(true);

      // Validate that a month is selected
      if (!addDeductionData.month) {
        alert("Please select a month before saving deduction.");
        return;
      }

      const deductionRecord = {
        user_id: employeeid,
        deducted: parseFloat(addDeductionData.deducted) || 0,
        month: addDeductionData.month,
      };

      // Try to find existing record for this user and month
      const { data: existingData, error: fetchError } = await supabase
        .from("deductions")
        .select("id, advance_pay, property_damage")
        .eq("user_id", employeeid)
        .eq("month", addDeductionData.month)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingData) {
        // Update existing record with new deducted amount
        const { error: updateError } = await supabase
          .from("deductions")
          .update({ deducted: deductionRecord.deducted })
          .eq("user_id", employeeid)
          .eq("month", addDeductionData.month);

        if (updateError) throw updateError;
        console.log("Monthly deduction updated successfully for month:", addDeductionData.month);
      } else {
        // Insert new record with deducted amount (other fields default to 0)
        const { error: insertError } = await supabase
          .from("deductions")
          .insert([{
            ...deductionRecord,
            advance_pay: 0,
            property_damage: 0,
          }]);

        if (insertError) throw insertError;
        console.log("Monthly deduction inserted successfully for month:", addDeductionData.month);
      }

      setIsAddingDeduction(false);

      // Reset the add deduction form
      setAddDeductionData({
        deducted: "0",
        month: getCurrentMonth(),
      });

      // Refresh deductions data if viewing the same month
      if (selectedDeductionMonth === addDeductionData.month) {
        fetchDeductionsData(selectedDeductionMonth);
      }

    } catch (err) {
      console.error("Error saving monthly deduction:", err);
      alert("Failed to save monthly deduction: " + (err as any).message);
    } finally {
      setAddDeductionLoading(false);
    }
  };

  // Function to handle add deduction input change
  const handleAddDeductionChange = (field: string, value: string) => {
    setAddDeductionData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Function to fetch data for the selected month
  const fetchMonthlyData = async (startDate, endDate) => {
    try {
      setLoading(true);
      console.log("Fetching data for period:", startDate, "to", endDate);

      // Fetch attendance data for the selected month
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance_logs")
        .select("id, check_in, check_out")
        .eq("user_id", employeeid)
        .gte("check_in", startDate)
        .lte("check_in", endDate);

      // console.log("start Date" , startdate);
      // console.log("end Date" , enddate);

      if (attendanceError) {
        console.error("Error fetching attendance:", attendanceError);
        throw attendanceError;
      }

      // Fetch breaks for the attendance logs
      const { data: breakData, error: breakError } = await supabase
        .from("breaks")
        .select("start_time, end_time, attendance_id")
        .in(
          "attendance_id",
          attendanceData?.length > 0 ? attendanceData?.map((a) => a.id) : [""]
        );

      if (breakError) {
        console.error("Error fetching breaks:", breakError);
      }

      // Group breaks by attendance_id
      const breaksByAttendance: Record<
        string,
        Array<{ start_time: string; end_time: string | null }>
      > = {};
      if (breakData) {
        breakData.forEach((b) => {
          if (!breaksByAttendance[b.attendance_id])
            breaksByAttendance[b.attendance_id] = [];
          breaksByAttendance[b.attendance_id].push(b);
        });
      }

      // Group attendance by day (taking the earliest record for each day), just like in ListViewOfEmployees.tsx
      const attendanceByDate = {};
      attendanceData?.forEach((log) => {
        const date = new Date(log.check_in).toISOString().split("T")[0]; // Format: YYYY-MM-DD
        if (
          !attendanceByDate[date] ||
          new Date(log.check_in) < new Date(attendanceByDate[date].check_in)
        ) {
          attendanceByDate[date] = log;
        }
      });

      // Convert to array of unique attendance records (one per day)
      const uniqueAttendance = Object.values(attendanceByDate);
      console.log(
        `Grouped ${attendanceData?.length} attendance records into ${uniqueAttendance?.length} unique days`
      );

      // Calculate total working hours and break hours separately
      let totalRawWorkHours = 0;
      let totalBreakHours = 0;
      let totalNetWorkHours = 0;

      // First, calculate total raw hours without breaks
      uniqueAttendance.forEach((log) => {
        const checkIn = new Date(log.check_in);

        // For no checkout, use current time but cap at 8 hours after check-in
        let checkOut;
        if (log.check_out) {
          checkOut = new Date(log.check_out);
        } else {
          const currentTime = new Date();
          const maxEndTime = new Date(checkIn);
          maxEndTime.setHours(maxEndTime.getHours() + 8); // 8 hours after check-in

          // Use the earlier of current time or max end time (8 hours after check-in)
          checkOut = currentTime < maxEndTime ? currentTime : maxEndTime;
        }

        let hoursWorked =
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        // Handle negative values by using Math.max(0, hoursWorked)
        hoursWorked = Math.max(0, hoursWorked);
        // Cap at 12 hours per day
        totalRawWorkHours += Math.min(hoursWorked, 12);
      });

      console.log(
        "Total Raw Working Hours (before breaks):",
        totalRawWorkHours.toFixed(2)
      );

      // Now calculate break hours and net working hours for each attendance record
      uniqueAttendance.forEach((log) => {
        const checkIn = new Date(log.check_in);

        // For no checkout, use current time but cap at 8 hours after check-in
        let checkOut;
        if (log.check_out) {
          checkOut = new Date(log.check_out);
        } else {
          const currentTime = new Date();
          const maxEndTime = new Date(checkIn);
          maxEndTime.setHours(maxEndTime.getHours() + 8); // 8 hours after check-in

          // Use the earlier of current time or max end time (8 hours after check-in)
          checkOut = currentTime < maxEndTime ? currentTime : maxEndTime;
        }

        let hoursWorked =
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        // Handle negative values by using Math.max(0, hoursWorked)
        hoursWorked = Math.max(0, hoursWorked);

        // Calculate breaks for this attendance record
        const breaks = breaksByAttendance[log.id as string] || [];
        let breakHoursForThisLog = 0;

        breaks.forEach((b: { start_time: string; end_time: string | null }) => {
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

        // Calculate net hours for this log
        // Handle negative values and cap at 12 hours per day
        const netHoursForThisLog = Math.max(
          0,
          Math.min(hoursWorked - breakHoursForThisLog, 12)
        );
        totalNetWorkHours += netHoursForThisLog;

        // Log details for each attendance record
        console.log(
          `Attendance ID ${log.id}: Raw Hours = ${hoursWorked.toFixed(
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

      // Use the net hours as the total work hours
      let totalWorkHours = totalNetWorkHours;

      // Fetch overtime data for the selected month
      const { data: extrahoursData, error: extrahoursError } = await supabase
        .from("extrahours")
        .select("id, check_in, check_out")
        .eq("user_id", employeeid)
        .gte("check_in", startDate)
        .lte("check_in", endDate);

      if (extrahoursError) {
        console.error("Error fetching extrahours:", extrahoursError);
        throw extrahoursError;
      }

      // Fetch breaks for extrahours
      const { data: remoteBreakData, error: remoteBreakError } = await supabase
        .from("Remote_Breaks")
        .select("start_time, end_time, Remote_Id")
        .in(
          "Remote_Id",
          extrahoursData?.length > 0 ? extrahoursData?.map((a) => a.id) : [""]
        );

      if (remoteBreakError) {
        console.error("Error fetching remote breaks:", remoteBreakError);
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
      let totalOvertimeHours = 0;
      extrahoursData?.forEach((log) => {
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
                (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60);
            }
          });

          totalOvertimeHours += Math.max(0, hoursWorked - remoteBreakHours);
        }
      });

      // Fetch absences and leaves for the selected month
      const { data: absenteeData, error: absenteeError } = await supabase
        .from("absentees")
        .select("absentee_type, created_at")
        .eq("user_id", employeeid)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (absenteeError) {
        console.error("Error fetching absentees:", absenteeError);
        throw absenteeError;
      }

      const totalAbsents = absenteeData?.filter(
        (a) => a.absentee_type === "Absent"
      ).length;
      const totalLeaves = absenteeData?.filter(
        (a) => a.absentee_type === "leave"
      ).length;

      // Calculate basic per hour rate from salary and expected hours
      const [year, month] = selectedmonth.split('-').map(Number);
      const expectedHours = getWorkingDaysInMonth(year, month - 1) * 7;
      const basicPerHourRate = employeeData?.salary
        ? parseFloat(employeeData.salary) / expectedHours
        : 0;

      // Calculate overtime pay using new rules
      const overtimePay = totalOvertimeHours > 0
        ? calculateOvertimeEarnings(totalOvertimeHours, basicPerHourRate).toFixed(2)
        : "0";

      console.log("Overtime Calculation Details:", {
        totalOvertimeHours,
        basicPerHourRate,
        expectedHours,
        salary: (employeeData as any)?.salary,
        overtimePay
      });

      // Fetch all tasks for the selected month
      const { data: allTasksData, error: tasksError } = await supabase
        .from("tasks_of_projects")
        .select("*")
        .gte("action_date", startDate)
        .lte("action_date", endDate);

      if (tasksError) {
        console.error("Error fetching tasks:", tasksError);
      }

      // Filter tasks where the employee is in the devops array or is the user_id
      const tasksData = allTasksData
        ? allTasksData.filter((task) => {
          // Check if task is directly assigned to the employee
          if (task.user_id === employeeid) return true;

          // Check if employee is in the devops array
          if (task.devops && Array.isArray(task.devops)) {
            return task.devops.some(
              (dev) => dev && typeof dev === "object" && dev.id === employeeid
            );
          }

          return false;
        })
        : [];

      console.log("Monthly tasks found:", tasksData.length);

      // Count active tasks
      const activeTaskCount = tasksData.filter(
        (task) => task.status !== "done"
      ).length;

      // Get completed tasks and calculate total score
      const completedTasks = tasksData.filter((task) => task.status === "done");
      const completedTaskCount = completedTasks.length;
      const completedTasksScore = completedTasks.reduce(
        (sum, task) => sum + (Number(task.score) || 0),
        0
      );

      // Fetch all projects for the selected month
      const { data: allProjectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (projectsError) {
        console.error("Error fetching projects:", projectsError);
      }

      // Filter projects where the employee is in the devops array
      const projectsData = allProjectsData
        ? allProjectsData.filter((project) => {
          if (!project.devops || !Array.isArray(project.devops)) return false;

          // Check if any devops entry has the employee's ID
          return project.devops.some(
            (dev) => dev && typeof dev === "object" && dev.id === employeeid
          );
        })
        : [];

      console.log("Monthly projects found:", projectsData.length);
      const projectsCount = projectsData.length;

      // Update the monthly data state
      setMonthlyData({
        totalAttendance: attendanceData?.length,
        totalAbsents,
        totalLeaves,
        totalWorkingHours: totalWorkHours.toFixed(2),
        totalOvertimeHours: totalOvertimeHours.toFixed(2),
        overtimePay,
        activeTaskCount,
        completedTaskCount,
        completedTasksScore,
        projectsCount,
      });

      console.log("Monthly data updated:", {
        totalAttendance: attendanceData?.length,
        totalAbsents,
        totalLeaves,
        totalWorkingHours: totalWorkHours.toFixed(2),
        totalOvertimeHours: totalOvertimeHours.toFixed(2),
        overtimePay,
        activeTaskCount,
        completedTaskCount,
        completedTasksScore,
        projectsCount,
      });
    } catch (err) {
      console.error("Error fetching monthly data:", err);
      setError(
        "Failed to fetch monthly data: " + (err.message || "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle month selection
  useEffect(() => {
    // This will now run with current month on initial load
    if (selectedmonth) {
      try {
        const [year, month] = selectedmonth.split('-').map(Number);
        const workingDays = getWorkingDaysInMonth(year, month - 1);
        const hours = workingDays * 7;
        setExpectedHours(hours);

        if (formData.salary) {
          setFormData(prev => ({
            ...prev,
            per_hour_pay: (parseFloat(prev.salary) / hours).toFixed(2)
          }));
        }

        const startOfMonthDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        const lastDay = new Date(Date.UTC(year, month, 0)).getDate();
        const endOfMonthDate = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));

        setStartdate(startOfMonthDate.toISOString());
        setEnddate(endOfMonthDate.toISOString());
        fetchMonthlyData(startOfMonthDate.toISOString(), endOfMonthDate.toISOString());

      } catch (err) {
        console.error("Error processing dates:", err);
      }
    }
  }, [selectedmonth, employeeid]);

  const [incrementData, setIncrementData] = useState({
    user_id: employeeid,
    increment_amount: "",
    increment_date: new Date().toISOString().split("T")[0], // Default to today's date
    basic_sallery: "",
    upcomming_increment: "",
    after_increment: "",
  });

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    personal_email: "",
    slack_id: "",
    location: "",
    profession: "",
    salary: "",
    per_hour_pay: "",
    role: "",
    profile_image: null,
    joining_date: null,
    CNIC: "",
    bank_account: "",
  });

  // Define the type for increment history items
  interface IncrementHistoryItem {
    id?: string;
    user_id?: string;
    increment_date: string;
    increment_amount: string;
    basic_sallery: string;
    after_increment: string;
    upcomming_increment?: string;
    created_at?: string;
  }

  const [upcomingIncrementDate, setUpcomingIncrementDate] = useState("");
  const [showIncrementHistory, setShowIncrementHistory] = useState(false);
  const [incrementHistory, setIncrementHistory] = useState<
    IncrementHistoryItem[]
  >([]);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const getEmploymentDuration = (joinDate) => {
    const joined = new Date(joinDate);
    const today = new Date();
    const diffTime = Math.abs(today - joined);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)) + " months";
  };


  useEffect(() => {
    if (selectedmonth) {
      try {
        const [year, month] = selectedmonth.split('-').map(Number);
        const workingDays = getWorkingDaysInMonth(year, month - 1);
        const hours = workingDays * 7;
        setExpectedHours(hours);

        // Calculate per hour rate if salary exists
        if (formData.salary) {
          setFormData(prev => ({
            ...prev,
            per_hour_pay: (parseFloat(prev.salary) / hours).toFixed(2)
          }));
        }

        const startOfMonthDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        const lastDay = new Date(Date.UTC(year, month, 0)).getDate();
        const endOfMonthDate = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));

        setStartdate(startOfMonthDate.toISOString());
        setEnddate(endOfMonthDate.toISOString());
        fetchMonthlyData(startOfMonthDate.toISOString(), endOfMonthDate.toISOString());

      } catch (err) {
        console.error("Error processing dates:", err);
      }
    }
  }, [selectedmonth, employeeid]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, profile_image: file }));
    }
  };

  const fetchIncrementHistory = async () => {
    try {
      const { data: incrementHistoryData, error: historyError } = await supabase
        .from("sallery_increment")
        .select("*")
        .eq("user_id", employeeid)
        .order("created_at", { ascending: false });

      if (historyError) {
        console.error("Error fetching increment history:", historyError);
        return [];
      }

      console.log("Increment history:", incrementHistoryData);

      // Convert any null values to empty strings to avoid rendering issues
      const formattedHistory: IncrementHistoryItem[] = (
        incrementHistoryData || []
      ).map((item) => ({
        id: item.id,
        user_id: item.user_id,
        increment_date: item.increment_date || "",
        increment_amount: item.increment_amount || "0",
        basic_sallery: item.basic_sallery || "0",
        after_increment: item.after_increment || "0",
        upcomming_increment: item.upcomming_increment || "",
        created_at: item.created_at,
      }));

      setIncrementHistory(formattedHistory);
      return formattedHistory;
    } catch (err) {
      console.error("Error in fetchIncrementHistory:", err);
      return [];
    }
  };

  const fetchEmployee = async () => {
    try {
      setLoading(true);

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", employeeid)
        .single();

      if (userError) throw userError;

      // Fetch last increment
      const { data: pastIncrements, error: incrementError } = await supabase
        .from("sallery_increment")
        .select(
          "increment_date, increment_amount, basic_sallery, after_increment, upcomming_increment"
        )
        .eq("user_id", employeeid)
        .order("created_at", { ascending: false })
        .limit(1);

      if (incrementError) {
        console.error("Error fetching past increments:", incrementError);
      } else {
        console.log("Last increment data:", pastIncrements);
        if (pastIncrements?.length) {
          setLastIncrement(pastIncrements[0]);
          if (pastIncrements[0].upcomming_increment) {
            // Format the date as YYYY-MM-DD for the date input field
            const upcomingDate = new Date(
              pastIncrements[0].upcomming_increment
            );
            if (!isNaN(upcomingDate.getTime())) {
              const formattedDate = upcomingDate.toISOString().split("T")[0];
              console.log("Formatted upcoming increment date:", formattedDate);
              setUpcomingIncrementDate(formattedDate);
            } else {
              console.log(
                "Invalid upcoming increment date:",
                pastIncrements[0].upcomming_increment
              );
              setUpcomingIncrementDate("");
            }
          }
        }
      }

      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, title, devops");

      if (projectsError) throw projectsError;

      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks_of_projects")
        .select("*");

      if (tasksError) throw tasksError;

      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance_logs")
        .select("id, check_in, check_out")
        .eq("user_id", employeeid);

      if (attendanceError) throw attendanceError;

      const { data: breakData, error: breakError } = await supabase
        .from("breaks")
        .select("start_time, end_time, attendance_id")
        .in(
          "attendance_id",
          attendanceData?.map((a) => a.id)
        );

      if (breakError) throw breakError;

      // Group breaks by attendance_id
      const breaksByAttendance: Record<
        string,
        { start_time: string; end_time: string | null }[]
      > = {};
      breakData.forEach((b) => {
        if (!breaksByAttendance[b.attendance_id])
          breaksByAttendance[b.attendance_id] = [];
        breaksByAttendance[b.attendance_id].push(b);
      });

      let totalWorkHours = 0;

      attendanceData?.forEach((log) => {
        const checkIn = new Date(log.check_in);
        const checkOut = log.check_out
          ? new Date(log.check_out)
          : new Date(checkIn.getTime());

        let hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60);

        // Subtract breaks
        const breaks = breaksByAttendance[log.id] || [];
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

        totalWorkHours += Math.max(0, hoursWorked - breakHours);
      });

      const totalAttendance = attendanceData?.length;

      // Fetch overtime hours from extrahours table
      const { data: extrahoursData, error: extrahoursError } = await supabase
        .from("extrahours")
        .select("id, check_in, check_out")
        .eq("user_id", employeeid);

      if (extrahoursError) {
        console.error("Error fetching extrahours:", extrahoursError);
        throw extrahoursError;
      }

      // Fetch breaks for extrahours
      const { data: remoteBreakData, error: remoteBreakError } = await supabase
        .from("Remote_Breaks")
        .select("start_time, end_time, Remote_Id")
        .in(
          "Remote_Id",
          extrahoursData?.map((a) => a.id)
        );

      if (remoteBreakError) {
        console.error("Error fetching remote breaks:", remoteBreakError);
      }

      // Group remote breaks by Remote_Id
      const remoteBreaksByAttendance: Record<
        string,
        { start_time: string; end_time: string | null }[]
      > = {};
      if (remoteBreakData) {
        remoteBreakData.forEach((b) => {
          if (!remoteBreaksByAttendance[b.Remote_Id])
            remoteBreaksByAttendance[b.Remote_Id] = [];
          remoteBreaksByAttendance[b.Remote_Id].push(b);
        });
      }

      // Calculate total overtime hours
      let totalOvertimeHours = 0;

      extrahoursData?.forEach((log) => {
        if (log.check_in && log.check_out) {
          const checkIn = new Date(log.check_in);
          const checkOut = new Date(log.check_out);

          let hoursWorked =
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

          // Subtract remote breaks
          const remoteBreaks = remoteBreaksByAttendance[log.id] || [];
          let remoteBreakHours = 0;

          remoteBreaks.forEach((b) => {
            if (b.start_time && b.end_time) {
              const breakStart = new Date(b.start_time);
              const breakEnd = new Date(b.end_time);
              remoteBreakHours +=
                (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60);
            }
          });

          totalOvertimeHours += Math.max(0, hoursWorked - remoteBreakHours);
        }
      });

      console.log("Total overtime hours:", totalOvertimeHours);

      const { data: absenteeData, error: absenteeError } = await supabase
        .from("absentees")
        .select("absentee_type")
        .eq("user_id", employeeid);

      if (absenteeError) throw absenteeError;

      const totalAbsents = absenteeData?.filter(
        (a) => a.absentee_type === "Absent"
      ).length;
      const totalLeaves = absenteeData?.filter(
        (a) => a.absentee_type === "leave"
      ).length;

      // Filter projects where the employee is in the devops array
      const employeeProjects = projectsData.filter((project) => {
        if (!project.devops || !Array.isArray(project.devops)) return false;
        return project.devops.some(
          (dev) => dev && typeof dev === "object" && dev.id === userData.id
        );
      });

      console.log("All-time projects found:", employeeProjects.length);

      // Filter active tasks where the employee is in the devops array or is the user_id
      const employeeTasks = tasksData.filter((task) => {
        // Check if task is directly assigned to the employee
        if (
          task.user_id === userData.id &&
          task.status?.toLowerCase() !== "done"
        )
          return true;

        // Check if employee is in the devops array and task is not done
        if (task.devops && Array.isArray(task.devops)) {
          return (
            task.devops.some(
              (dev) => dev && typeof dev === "object" && dev.id === userData.id
            ) && task.status?.toLowerCase() !== "done"
          );
        }

        return false;
      });

      // Filter completed tasks where the employee is in the devops array or is the user_id
      const completedTasks = tasksData.filter((task) => {
        // Check if task is directly assigned to the employee and is done
        if (
          task.user_id === userData.id &&
          task.status?.toLowerCase() === "done"
        )
          return true;

        // Check if employee is in the devops array and task is done
        if (task.devops && Array.isArray(task.devops)) {
          return (
            task.devops.some(
              (dev) => dev && typeof dev === "object" && dev.id === userData.id
            ) && task.status?.toLowerCase() === "done"
          );
        }

        return false;
      });

      console.log("All-time active tasks found:", employeeTasks.length);
      console.log("All-time completed tasks found:", completedTasks.length);

      const totalKPI = completedTasks.reduce(
        (sum, task) => sum + (Number(task.score) || 0),
        0
      );

      let profileImageUrl = null;
      if (userData.profile_image) {
        profileImageUrl = userData.profile_image.startsWith("http")
          ? userData.profile_image
          : supabase.storage
            .from("profilepics")
            .getPublicUrl(userData.profile_image).data.publicUrl;
      }

      // Calculate basic per hour rate from salary and current month expected hours
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const currentExpectedHours = getWorkingDaysInMonth(currentYear, currentMonth) * 7;
      const basicPerHourRate = userData.salary
        ? parseFloat(userData.salary) / currentExpectedHours
        : 0;

      // Calculate overtime pay using new rules
      const overtimePay = totalOvertimeHours > 0
        ? calculateOvertimeEarnings(totalOvertimeHours, basicPerHourRate).toFixed(2)
        : "0";

      const enrichedEmployee = {
        ...userData,
        profile_image_url: profileImageUrl,
        projects: employeeProjects.map((p) => p.title),
        projectid: employeeProjects.map((p) => p.id),
        TotalKPI: totalKPI,
        activeTaskCount: employeeTasks.length,
        completedTaskCount: completedTasks.length,
        totalWorkingHours: totalWorkHours.toFixed(2),
        totalOvertimeHours: totalOvertimeHours.toFixed(2),
        overtimePay: overtimePay,
        totalAttendance,
        totalAbsents,
        totalLeaves,
      };

      setEmployeeData(enrichedEmployee);

      setFormData({
        full_name: userData.full_name,
        email: userData.email,
        phone_number: userData.phone_number,
        personal_email: userData.personal_email,
        slack_id: userData.slack_id,



        location: userData.location,
        profession: userData.profession,
        salary: userData.salary,
        per_hour_pay: userData.per_hour_pay,
        role: userData.role || "",
        profile_image: null,
        joining_date: userData.joining_date || null,
        CNIC: userData.CNIC || "",
        bank_account: userData.bank_account || "",
      });
    } catch (err) {
      setError(err.message);
      console.error("Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // const fetchEmployee2 = async () => {
  //   try {
  //     setLoading(true);

  //     const { data: userData, error: userError } = await supabase
  //       .from("users")
  //       .select("*")
  //       .eq("id", employeeid)
  //       .single();

  //     if (userError) throw userError;

  //     const { data: increments, error: incrementError } = await supabase
  //       .from("sallery_increment")
  //       .select("increment_date, increment_amount")
  //       .eq("user_id", employeeid)
  //       .order("increment_date", { ascending: false })
  //       .limit(1);

  //     if (incrementError) console.error("Error fetching increments:", incrementError);
  //     if (increments?.length) setLastIncrement(increments[0]);

  //     const { data: projectsData, error: projectsError } = await supabase
  //       .from("projects")
  //       .select("id, title, devops");

  //     if (projectsError) throw projectsError;

  //     const { data: tasksData, error: tasksError } = await supabase
  //       .from("tasks_of_projects")
  //       .select("*");

  //     if (tasksError) throw tasksError;

  //     const { data: attendanceData, error: attendanceError } = await supabase
  //       .from("attendance_logs")
  //       .select("id, check_in, check_out")
  //       .eq("user_id", employeeid);

  //     if (attendanceError) throw attendanceError;

  //     const { data: breakData, error: breakError } = await supabase
  //       .from("breaks")
  //       .select("start_time, end_time, attendance_id")
  //       .in("attendance_id", attendanceData?.map(a => a.id));

  //     if (breakError) throw breakError;

  //     // Group breaks by attendance_id
  //     const breaksByAttendance: Record<string, { start_time: string; end_time: string | null }[]> = {};
  //     breakData.forEach(b => {
  //       if (!breaksByAttendance[b.attendance_id]) breaksByAttendance[b.attendance_id] = [];
  //       breaksByAttendance[b.attendance_id].push(b);
  //     });

  //     let totalWorkHours = 0;

  //     attendanceData?.forEach(log => {
  //       const checkIn = new Date(log.check_in);
  //       const checkOut = log.check_out ? new Date(log.check_out) : new Date(checkIn.getTime()); // fallback to check_in time

  //       let hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60);

  //       // Subtract breaks
  //       const breaks = breaksByAttendance[log.id] || [];
  //       let breakHours = 0;

  //       breaks.forEach(b => {
  //         const breakStart = new Date(b.start_time);
  //         const breakEnd = b.end_time ? new Date(b.end_time) : new Date(breakStart.getTime() + 60 * 60 * 1000);
  //         breakHours += (breakEnd - breakStart) / (1000 * 60 * 60);
  //       });

  //       totalWorkHours += Math.max(0, hoursWorked - breakHours);
  //     });

  //     const totalAttendance = attendanceData?.length;

  //     // Fetch overtime hours from extrahours table
  //     const { data: extrahoursData, error: extrahoursError } = await supabase
  //       .from("extrahours")
  //       .select("id, check_in, check_out")
  //       .eq("user_id", employeeid);

  //     if (extrahoursError) {
  //       console.error("Error fetching extrahours:", extrahoursError);
  //       throw extrahoursError;
  //     }

  //     // Fetch breaks for extrahours
  //     const { data: remoteBreakData, error: remoteBreakError } = await supabase
  //       .from("Remote_Breaks")
  //       .select("start_time, end_time, Remote_Id")
  //       .in("Remote_Id", extrahoursData?.map(a => a.id));

  //     if (remoteBreakError) {
  //       console.error("Error fetching remote breaks:", remoteBreakError);
  //     }

  //     // Group remote breaks by Remote_Id
  //     const remoteBreaksByAttendance: Record<string, { start_time: string; end_time: string | null }[]> = {};
  //     if (remoteBreakData) {
  //       remoteBreakData.forEach(b => {
  //         if (!remoteBreaksByAttendance[b.Remote_Id]) remoteBreaksByAttendance[b.Remote_Id] = [];
  //         remoteBreaksByAttendance[b.Remote_Id].push(b);
  //       });
  //     }

  //     // Calculate total overtime hours
  //     let totalOvertimeHours = 0;

  //     extrahoursData?.forEach(log => {
  //       if (log.check_in && log.check_out) {
  //         const checkIn = new Date(log.check_in);
  //         const checkOut = new Date(log.check_out);

  //         let hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

  //         // Subtract remote breaks
  //         const remoteBreaks = remoteBreaksByAttendance[log.id] || [];
  //         let remoteBreakHours = 0;

  //         remoteBreaks.forEach(b => {
  //           if (b.start_time && b.end_time) {
  //             const breakStart = new Date(b.start_time);
  //             const breakEnd = new Date(b.end_time);
  //             remoteBreakHours += (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60);
  //           }
  //         });

  //         totalOvertimeHours += Math.max(0, hoursWorked - remoteBreakHours);
  //       }
  //     });

  //     console.log("Total overtime hours:", totalOvertimeHours);

  //     const { data: absenteeData, error: absenteeError } = await supabase
  //       .from("absentees")
  //       .select("absentee_type")
  //       .eq("user_id", employeeid);

  //     if (absenteeError) throw absenteeError;

  //     const totalAbsents = absenteeData?.filter(a => a.absentee_type === "Absent").length;
  //     const totalLeaves = absenteeData?.filter(a => a.absentee_type === "leave").length;

  //     const employeeProjects = projectsData.filter(project =>
  //       project.devops?.some((dev: any) => dev.id === userData.id)
  //     );

  //     const employeeTasks = tasksData.filter(task =>
  //       task.devops?.some((dev: any) => dev.id === userData.id) &&
  //       task.status?.toLowerCase() !== "done"
  //     );

  //     const totalKPI = employeeTasks.reduce((sum, task) => sum + (Number(task.score) || 0), 0);

  //     let profileImageUrl = null;
  //     if (userData.profile_image) {
  //       profileImageUrl = userData.profile_image.startsWith("http")
  //         ? userData.profile_image
  //         : supabase.storage.from("profilepics").getPublicUrl(userData.profile_image).data.publicUrl;
  //     }

  //     // Calculate overtime pay
  //     const overtimePay = userData.per_hour_pay ? (parseFloat(userData.per_hour_pay) * totalOvertimeHours).toFixed(2) : "0";

  //     const enrichedEmployee = {
  //       ...userData,
  //       profile_image_url: profileImageUrl,
  //       projects: employeeProjects.map(p => p.title),
  //       projectid: employeeProjects.map(p => p.id),
  //       TotalKPI: totalKPI,
  //       activeTaskCount: employeeTasks.length,
  //       totalWorkingHours: totalWorkHours.toFixed(2),
  //       totalOvertimeHours: totalOvertimeHours.toFixed(2),
  //       overtimePay: overtimePay,
  //       totalAttendance,
  //       totalAbsents,
  //       totalLeaves
  //     };

  //     setEmployeeData(enrichedEmployee);

  //     setFormData({
  //       full_name: userData.full_name,
  //       email: userData.email,
  //       phone_number: userData.phone_number,
  //       personal_email: userData.personal_email,
  //       slack_id: userData.slack_id,
  //       location: userData.location,
  //       profession: userData.profession,
  //       salary: userData.salary,
  //       per_hour_pay: userData.per_hour_pay,
  //       role: userData.role || "",
  //       profile_image: null,
  //     });

  //   } catch (err) {
  //     setError(err.message);
  //     console.error("Error:", err.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  useEffect(() => {
    if (employeeid) {
      fetchEmployee();
      fetchDeductionsData(selectedDeductionMonth);
    }
  }, [employeeid]);

  // Usage in your component
  useEffect(() => {
    if (selectedmonth) {
      const [year, month] = selectedmonth.split('-').map(Number);
      const workingDays = getWorkingDaysInMonth(year, month - 1); // month is 0-indexed
      const expectedHours = workingDays * 7;

      setFormData(prev => ({
        ...prev,
        per_hour_pay: (parseFloat(prev.salary) / expectedHours).toFixed(2)
      }));
    }
  }, [selectedmonth, formData.salary]);

  const handleEditClick = () => {
    // Initialize the incrementData with the lastIncrement data if available
    if (lastIncrement) {
      setIncrementData((prevData) => ({
        ...prevData,
        increment_date:
          lastIncrement.increment_date ||
          new Date().toISOString().split("T")[0],
        increment_amount: lastIncrement.increment_amount || "",
        basic_sallery: lastIncrement.basic_sallery || "",
        after_increment: lastIncrement.after_increment || "",
        upcomming_increment:
          lastIncrement.upcomming_increment || upcomingIncrementDate || "",
      }));
    }

    // Log the current upcomingIncrementDate for debugging
    console.log("Current upcomingIncrementDate:", upcomingIncrementDate);

    setIsEditMode(true);
  };

  const handleIncrementChange = (e) => {
    setIncrementData({
      ...incrementData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmitIncrement = async (e) => {
    e.preventDefault();
    try {
      if (!employeeData) {
        setError("Employee data not available");
        return;
      }

      // Calculate the new salary
      const currentSalary = Number(employeeData.salary);
      const incrementAmount = Number(incrementData.increment_amount);
      const newSalary = currentSalary + incrementAmount;

      // Update the increment data with the current and new salary
      const updatedIncrementData = {
        ...incrementData,
        basic_sallery: currentSalary.toString(),
        after_increment: newSalary.toString(),
        upcomming_increment: incrementData.upcomming_increment,
      };

      // Insert the increment record
      const { error } = await supabase
        .from("sallery_increment")
        .insert([updatedIncrementData]);

      if (error) throw error;

      // Update the employee's salary in the users table
      const { error: updateError } = await supabase
        .from("users")
        .update({ salary: newSalary })
        .eq("id", employeeid);

      if (updateError) throw updateError;

      // Update the lastIncrement state directly
      setLastIncrement({
        increment_amount: incrementData.increment_amount,
        increment_date: incrementData.increment_date,
        basic_sallery: currentSalary.toString(),
        after_increment: newSalary.toString(),
        upcomming_increment: incrementData.upcomming_increment,
      });

      // Refresh the data
      await fetchEmployee();
      setIncrementModel(false);
      setIncrementData({
        user_id: employeeid,
        increment_amount: "",
        increment_date: new Date().toISOString().split("T")[0],
        basic_sallery: "",
        after_increment: "",
        upcomming_increment: "",
      });
    } catch (err) {
      if (err instanceof Error) {
        setError("Failed to save increment: " + err.message);
      } else {
        setError("Failed to save increment: Unknown error");
      }
    }
  };

  const handleSaveChanges = async () => {
    try {
      let profileImagePath = employeeData.profile_image;

      if (formData.profile_image) {
        const fileExt = formData.profile_image.name.split(".").pop();
        const fileName = `${employeeid}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("profilepics")
          .upload(filePath, formData.profile_image, { upsert: true });

        if (uploadError) throw uploadError;
        profileImagePath = filePath;
      }

      // Update user data
      const { data, error } = await supabase
        .from("users")
        .update({
          full_name: formData.full_name,
          email: formData.email,
          phone_number: formData.phone_number,
          personal_email: formData.personal_email,
          slack_id: formData.slack_id?.trim(),
          location: formData.location,
          profession: formData.profession,
          salary: formData.salary,
          per_hour_pay: formData.per_hour_pay,
          role: formData.role,
          profile_image: profileImagePath,
          joining_date: formData.joining_date,
          CNIC: formData.CNIC,
          bank_account: formData.bank_account,
        })
        .eq("id", employeeid)
        .select();

      if (error) throw error;

      // Handle upcoming increment date if it has changed
      if (upcomingIncrementDate) {
        // Check if there's an existing increment record for this user
        const { data: existingIncrements, error: fetchError } = await supabase
          .from("sallery_increment")
          .select("id")
          .eq("user_id", employeeid)
          .order("created_at", { ascending: false })
          .limit(1);

        if (fetchError) {
          console.error("Error checking existing increments:", fetchError);
        } else {
          if (existingIncrements?.length > 0) {
            // Update existing record
            const { error: updateError } = await supabase
              .from("sallery_increment")
              .update({ upcomming_increment: upcomingIncrementDate })
              .eq("id", existingIncrements[0].id);

            if (updateError) {
              console.error("Error updating increment date:", updateError);
            } else {
              console.log(
                "Successfully updated upcoming increment date:",
                upcomingIncrementDate
              );
            }
          } else {
            // Insert new record with default values
            const { error: insertError } = await supabase
              .from("sallery_increment")
              .insert({
                user_id: employeeid,
                upcomming_increment: upcomingIncrementDate,
                increment_amount: "0", // Default value
                basic_sallery: formData.salary || "0",
                after_increment: formData.salary || "0",
                increment_date: new Date().toISOString(), // Set current date as increment_date
              });

            if (insertError) {
              console.error("Error inserting increment record:", insertError);
            } else {
              console.log(
                "Successfully inserted new record with upcoming increment date:",
                upcomingIncrementDate
              );
            }
          }
        }
      }

      setEmployeeData(data[0]);
      setIsEditMode(false);

      fetchEmployee();
    } catch (err) {
      setError("Failed to save changes: " + err.message);
    }
  };

  console.log("Employee : ", employee);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  if (loading) return <div className="text-center p-4">Loading profile...</div>;
  if (!employeeData) return <div className="p-4">No employee found</div>;



  const calculateWorkingDays = (year: number, month: number) => {
    let workingDays = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(year, month, day).getDay();
      // Monday to Friday (1-5), excluding Saturday (6) and Sunday (0)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDays++;
      }
    }
    return workingDays;
  };

  const calculateExpectedHours = (year: number, month: number) => {
    return calculateWorkingDays(year, month) * 7; // 8 hours per working day
  };



  // Add this with your other useEffect hooks


  return (
    <div className="w-full flex flex-col justify-center  items-center min-h-screen  bg-gray-50 p-6">
      <div className="flex justify-between items-center w-full max-w-4xl mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center rounded-lg justify-between gap-4 p-3 bg-white shadow-sm border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setemployeeview("generalview")}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-xl font-semibold text-gray-800">
              Employee Details
            </h2>
          </div>
          <input
            type="month"
            value={selectedmonth}
            onChange={(e) => setselectedmonth(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-700 bg-gray-50"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 items-stretch sm:items-center w-full sm:w-auto">
          <button
            onClick={() => setIsChangePasswordModalOpen(true)}
            className="flex justify-center items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition duration-200 w-full sm:w-auto"
          >

            Change Password
          </button>

          <button
            onClick={() => {
              // Initialize the incrementData with default values
              setIncrementData({
                user_id: employeeid,
                increment_amount: "",
                increment_date: new Date().toISOString().split("T")[0], // Default to today's date
                basic_sallery: employeeData?.salary || "",
                upcomming_increment: upcomingIncrementDate || "",
                after_increment: "",
              });
              setIncrementModel(true);
            }}
            className="flex justify-center items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition duration-200 w-full sm:w-auto"
          >
            Add Increment
          </button>

          <button
            onClick={handleEditClick}
            className="flex justify-center items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition duration-200 w-full sm:w-auto"
          >
            <FaEdit className="mr-2" />
            Edit
          </button>
        </div>
      </div>

      <div className="bg-white flex flex-col md:flex-row justify-between items-center rounded-2xl shadow-md p-4 md:p-6 max-w-4xl mb-5 w-full gap-6">
        {/* Left Section: Profile */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto">
          <img
            src={
              formData.profile_image
                ? URL.createObjectURL(formData.profile_image)
                : employeeData?.profile_image_url ||
                "https://via.placeholder.com/150"
            }
            alt="Profile"
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover"
          />
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <h2 className="text-lg sm:text-xl text-gray-700 font-semibold">
              {(employeeData as any)?.full_name || "Employee"}
            </h2>
            <p className="text-gray-600 capitalize">
              {(employeeData as any)?.role || "employee"}
            </p>
          </div>
        </div>

        {/* Right Section: Earnings */}
        <div className="bg-purple-600 w-full md:w-auto h-fit flex flex-col justify-center items-center text-white px-6 py-4 rounded-lg text-base sm:text-lg font-medium">
          <span className="mr-2">Total Earning is</span>
          <span className="font-bold text-3xl sm:text-4xl ml-2">
            {(employeeData as any)?.salary
              ? selectedmonth
                ? (() => {
                  // Calculate earnings as: (completed hours × basic rate) + overtime earnings
                  const [year, month] = selectedmonth.split('-').map(Number);
                  const expectedHours = getWorkingDaysInMonth(year, month - 1) * 7;
                  const basicPerHourRate = parseFloat((employeeData as any).salary) / expectedHours;
                  const completedHours = parseFloat(monthlyData.totalWorkingHours);
                  const basicEarnings = completedHours * basicPerHourRate;
                  const overtimeEarnings = parseFloat(monthlyData.overtimePay || "0");
                  return (basicEarnings + overtimeEarnings).toFixed(2);
                })()
                : (
                  parseFloat((employeeData as any).salary) +
                  parseFloat((employeeData as any).overtimePay || "0")
                ).toFixed(2)
              : "0"}
          </span>
          {selectedmonth && <span className="text-xs mt-1"></span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-6 max-w-4xl w-full">
        <div className="bg-white rounded-2xl shadow-md pb-4 flex flex-col items-center justify-center text-center">
          <p className="text-[140px] text-gray-500">
            {selectedmonth
              ? monthlyData.projectsCount
              : employeeData && employeeData.projects
                ? employeeData.projects.length
                : " "}
          </p>
          <p className="text-xl font-semibold">
            {selectedmonth ? "Monthly Projects" : "Total Projects"}
          </p>
          {selectedmonth && (
            <p className="text-xs text-gray-400">For selected month</p>
          )}
          <button className="bg-purple-600 rounded-2xl px-3 py-1 mt-2 text-sm text-white">
            View Details
          </button>
        </div>

        <div className="rounded-2xl p-2 gap-3 flex flex-col items-center justify-between text-center">
          <div className="bg-white h-full w-full rounded-2xl shadow-md p-4 flex flex-col items-start justify-center">
            <div className="flex justify-between items-center w-full">
              <h2 className="text-gray-800 text-2xl font-medium">
                {selectedmonth
                  ? monthlyData.completedTasksScore
                  : employeeData?.TotalKPI || 0}
              </h2>
              <CheckCircle className="text-purple-600 h-5 w-5" />
            </div>
            <div className="text-gray-500 text-sm">Completed Story Points</div>
            {selectedmonth && (
              <div className="text-gray-400 text-xs mt-1">
                {monthlyData.completedTaskCount > 0
                  ? `${monthlyData.completedTaskCount} ${monthlyData.completedTaskCount === 1 ? "task" : "tasks"
                  } completed this month`
                  : "0 task completed this month"}
              </div>
            )}
          </div>

          <div className="bg-white h-full w-full rounded-2xl shadow-md p-4 flex flex-col items-start justify-center mt-3">
            <div className="flex justify-between items-center w-full">
              <h2 className="text-gray-800 text-2xl font-medium">
                {selectedmonth
                  ? monthlyData.totalAttendance
                  : employeeData?.totalAttendance || 0}
              </h2>
              <Moon className="text-purple-600 h-5 w-5" />
            </div>
            <div className="text-gray-500 text-sm">Present Days</div>
            {selectedmonth && (
              <div className="text-gray-400 text-xs mt-1">
                For selected month
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl p-2 gap-3 flex flex-col items-center justify-between text-center">
          <div className="bg-white h-full w-full rounded-2xl shadow-md p-4 flex flex-col items-start justify-center">
            <div className="flex justify-between items-center w-full">
              <h2 className="text-gray-800 text-2xl font-medium">
                {selectedmonth
                  ? monthlyData.totalWorkingHours
                  : employeeData?.totalWorkingHours || 0}
              </h2>
              <Clock className="text-purple-600 h-5 w-5" />
            </div>
            <div className="text-gray-500 text-sm">Total Working Hours</div>
            {selectedmonth ? (
              <div className="text-gray-400 text-xs mt-1">
                For selected month
              </div>
            ) : (
              <div className="text-gray-400 text-xs mt-1">All time total</div>
            )}
          </div>

          <div className="bg-white h-full w-full rounded-2xl shadow-md p-4 flex flex-col items-start justify-center">
            <div className="flex justify-between items-center w-full">
              <h2 className="text-gray-800 text-2xl font-medium">
                {selectedmonth
                  ? monthlyData.totalAbsents
                  : employeeData?.totalAbsents || 0}
              </h2>
              <AlarmClockOff className="text-purple-600 h-5 w-5" />
            </div>
            <div className="text-gray-500 text-sm">Absent Days</div>
            {selectedmonth && (
              <div className="text-gray-400 text-xs mt-1">
                For selected month
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl p-2 gap-3 flex flex-col items-center justify-between text-center">
          <div className="bg-white h-full w-full rounded-2xl shadow-md p-4 flex flex-col items-start justify-center">
            <div className="flex justify-between items-center w-full">
              <h2 className="text-gray-800 text-2xl font-medium">
                {selectedmonth
                  ? monthlyData.totalOvertimeHours
                  : employeeData?.totalOvertimeHours || 0}
              </h2>
              <Watch className="text-purple-600 h-5 w-5" />
            </div>
            <div className="text-gray-500 text-sm">Overtime Hours</div>
            {selectedmonth ? (
              <div className="text-gray-400 text-xs mt-1">
                For selected month
              </div>
            ) : (
              <div className="text-gray-400 text-xs mt-1">
                Calculated from extrahours records
              </div>
            )}
          </div>

          <div className="bg-white h-full w-full rounded-2xl shadow-md p-4 flex flex-col items-start justify-center">
            <div className="flex justify-between items-center w-full">
              <h2 className="text-gray-800 text-2xl font-medium">
                {selectedmonth
                  ? monthlyData.totalLeaves
                  : employeeData?.totalLeaves || 0}
              </h2>
              <CalendarClock className="text-purple-600 h-5 w-5" />
            </div>
            <div className="text-gray-500 text-sm">Leave Days</div>
            {selectedmonth && (
              <div className="text-gray-400 text-xs mt-1">
                For selected month
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 p-4 bg-gray-50">
        {/* Personal Information Card */}
        <div className="bg-white rounded-lg shadow-md p-6 w-72">
          <div className="flex items-center mb-4">
            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center mr-2">
              <Info className="text-purple-600 h-4 w-4" />
            </div>
            <h2 className="text-gray-800 font-medium">Personal Information</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Email</span>
              <span className="text-gray-600 text-sm">
                {employeeData?.email || "N/A"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Phone Number</span>
              <span className="text-gray-600 text-sm">
                {employeeData?.phone_number || "N/A"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Slack id</span>
              <span className="text-gray-600 text-sm">
                {employeeData?.slack_id || "N/A"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">CNIC Number</span>
              <span className="text-gray-600 text-sm">
                {employeeData?.CNIC || "N/A"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Bank Account</span>
              <span className="text-gray-600 text-sm">
                {employeeData?.bank_account || "N/A"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">
                Employement Duration
              </span>
              <span className="text-gray-600 text-sm">
                {employeeData?.created_at
                  ? getEmploymentDuration(employeeData.created_at)
                  : "N/A"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Last Increment</span>
              <span className="text-gray-600 text-sm">
                {lastIncrement
                  ? `Rs. ${lastIncrement.increment_amount} on ${new Date(
                    lastIncrement.increment_date
                  ).toLocaleDateString()}`
                  : "N/A"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Upcoming Increment</span>
              <span className="text-gray-600 text-sm">
                {upcomingIncrementDate
                  ? new Date(upcomingIncrementDate).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Earnings Card */}
        {/* Earnings Card */}
        <div className="bg-white rounded-lg shadow-md p-6 w-72">
          <div className="flex items-center mb-4">
            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center mr-2">
              <DollarSign className="text-purple-600 h-4 w-4" />
            </div>
            <h2 className="text-gray-800 font-medium">Earnings</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Basic Pay</span>
              <span className="text-gray-600 text-sm">
                {employeeData?.salary || "0"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Expected Hours</span>
              <span className="font-semibold text-gray-800">
                {selectedmonth
                  ? (() => {
                    const [year, month] = selectedmonth.split('-').map(Number);
                    return getWorkingDaysInMonth(year, month - 1) * 7;
                  })()
                  : "Select a month"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Completed Hours</span>
              <span className="font-semibold text-gray-800">
                {selectedmonth ? monthlyData.totalWorkingHours : "Select a month"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pay Per Hour</span>
              <span className="font-semibold text-gray-800">
                {selectedmonth && employeeData?.salary
                  ? (
                    (
                      parseFloat(employeeData.salary) /
                      (
                        getWorkingDaysInMonth(
                          parseInt(selectedmonth.split('-')[0]),
                          parseInt(selectedmonth.split('-')[1]) - 1
                        ) * 7
                      )
                    ).toFixed(2)
                  )
                  : "Select a month"}
              </span>
            </div>


            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Overtime Hours</span>
              <span className="text-gray-600 text-sm">
                {selectedmonth
                  ? monthlyData.totalOvertimeHours
                  : employeeData?.totalOvertimeHours || "0"}
                {selectedmonth && (
                  <span className="text-xs text-gray-400 ml-1">(monthly)</span>
                )}
              </span>
            </div>

            {/* Overtime Rate Calculation */}
            {selectedmonth && parseFloat(monthlyData.totalOvertimeHours) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Overtime Rate</span>
                <span className="text-gray-600 text-sm">
                  {(() => {
                    const overtimeHours = parseFloat(monthlyData.totalOvertimeHours);
                    const [year, month] = selectedmonth.split('-').map(Number);
                    const expectedHours = getWorkingDaysInMonth(year, month - 1) * 7;
                    const basicPerHourRate = (employeeData as any)?.salary
                      ? parseFloat((employeeData as any).salary) / expectedHours
                      : 0;

                    let percentage = "";
                    if (overtimeHours <= 20) {
                      percentage = "80%";
                    } else if (overtimeHours <= 40) {
                      percentage = "75%";
                    } else {
                      percentage = "70%";
                    }

                    const overtimeRate = overtimeHours <= 20 ? basicPerHourRate * 0.8 :
                      overtimeHours <= 40 ? basicPerHourRate * 0.75 :
                        basicPerHourRate * 0.7;

                    return `${overtimeRate.toFixed(2)} (${percentage})`;
                  })()}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Overtime Earnings</span>
              <span className="text-gray-600 text-sm">
                {selectedmonth
                  ? monthlyData.overtimePay
                  : employeeData?.overtimePay || "0"}
                {selectedmonth && (
                  <span className="text-xs text-gray-400 ml-1">(monthly)</span>
                )}
              </span>
            </div>

            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-700 text-sm font-medium">Total Earning</span>
              <span className="text-gray-800 text-sm font-semibold">
                {(employeeData as any)?.salary
                  ? selectedmonth
                    ? (() => {
                      // Calculate earnings as: (completed hours × basic rate) + overtime earnings
                      const [year, month] = selectedmonth.split('-').map(Number);
                      const expectedHours = getWorkingDaysInMonth(year, month - 1) * 7;
                      const basicPerHourRate = parseFloat((employeeData as any).salary) / expectedHours;
                      const completedHours = parseFloat(monthlyData.totalWorkingHours);
                      const basicEarnings = completedHours * basicPerHourRate;
                      const overtimeEarnings = parseFloat(monthlyData.overtimePay || "0");
                      return (basicEarnings + overtimeEarnings).toFixed(2);
                    })()
                    : (
                      parseFloat((employeeData as any).salary) +
                      parseFloat((employeeData as any).overtimePay || "0")
                    ).toFixed(2)
                  : "0"}
              </span>
            </div>
          </div>
        </div>

        {/* Deductions Card */}
        <div className="bg-white rounded-lg shadow-md p-6 w-72">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                <FileMinusIcon className="text-purple-600 h-4 w-4" />
              </div>
              <h2 className="text-gray-800 font-medium">Deductions</h2>
            </div>
            {!isEditingDeductions ? (
              <button
                onClick={() => {
                  if (!selectedDeductionMonth) {
                    alert("Please select a month first to edit deductions.");
                    return;
                  }
                  setIsEditingDeductions(true);
                }}
                className={`text-sm font-medium ${selectedDeductionMonth
                  ? "text-purple-600 hover:text-purple-800"
                  : "text-gray-400 cursor-not-allowed"
                  }`}
                disabled={deductionsLoading || !selectedDeductionMonth}
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={saveDeductionsData}
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                  disabled={deductionsLoading}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingDeductions(false);
                    fetchDeductionsData(selectedDeductionMonth); // Reset to original values for current month
                  }}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                  disabled={deductionsLoading}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Month Selector */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Month</span>
              <input
                type="month"
                value={selectedDeductionMonth}
                onChange={(e) => handleDeductionMonthChange(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={deductionsLoading}
              />
            </div>

            {!selectedDeductionMonth ? (
              <div className="text-center py-4">
                <span className="text-gray-400 text-sm">
                  Please select a month to view deductions
                </span>
              </div>
            ) : (
              <>
                {/* Property Damage */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Property Damage</span>
                  {isEditingDeductions ? (
                    <input
                      type="number"
                      value={deductionsData.property_damage}
                      onChange={(e) => handleDeductionsChange('property_damage', e.target.value)}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="text-gray-600 text-sm">
                      {parseFloat(deductionsData.property_damage).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Advance Pay */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Advance Pay</span>
                  {isEditingDeductions ? (
                    <input
                      type="number"
                      value={deductionsData.advance_pay}
                      onChange={(e) => handleDeductionsChange('advance_pay', e.target.value)}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="text-gray-600 text-sm">
                      {parseFloat(deductionsData.advance_pay).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Deducted Amount */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Deducted</span>
                  <span className="text-red-600 text-sm">
                    -{parseFloat(deductionsData.deducted).toFixed(2)}
                  </span>
                </div>

                {/* Total Deduction */}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-700 text-sm font-medium">Remaining Deduction</span>
                  <span className="text-gray-800 text-sm font-semibold">
                    {calculateTotalDeductions()}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Net Earnings Card */}
      <div className="flex justify-center mt-6">
        <div className="bg-white rounded-lg shadow-md p-6 w-72">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-2">
                <svg className="text-green-600 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h2 className="text-gray-800 font-medium">Net Earnings</h2>
            </div>
            <button
              onClick={() => setIsAddingDeduction(true)}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
              disabled={addDeductionLoading}
            >
              Add Deduction
            </button>
          </div>

          <div className="space-y-4">
            {/* Total Earnings */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Total Earnings</span>
              <span className="text-gray-600 text-sm">
                {(employeeData as any)?.salary
                  ? selectedmonth
                    ? (() => {
                      // Calculate earnings as: (completed hours × basic rate) + overtime earnings
                      const [year, month] = selectedmonth.split('-').map(Number);
                      const expectedHours = getWorkingDaysInMonth(year, month - 1) * 7;
                      const basicPerHourRate = parseFloat((employeeData as any).salary) / expectedHours;
                      const completedHours = parseFloat(monthlyData.totalWorkingHours);
                      const basicEarnings = completedHours * basicPerHourRate;
                      const overtimeEarnings = parseFloat(monthlyData.overtimePay || "0");
                      return (basicEarnings + overtimeEarnings).toFixed(2);
                    })()
                    : (
                      parseFloat((employeeData as any).salary) +
                      parseFloat((employeeData as any).overtimePay || "0")
                    ).toFixed(2)
                  : "0"}
              </span>
            </div>

            {/* Total Deductions (Original) */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Total Deductions</span>
              <span className="text-red-600 text-sm">
                {(() => {
                  const advancePay = parseFloat(deductionsData.advance_pay) || 0;
                  const propertyDamage = parseFloat(deductionsData.property_damage) || 0;
                  return (advancePay + propertyDamage).toFixed(2);
                })()}
              </span>
            </div>

            {/* Total Deducted (All Months) */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Total Deducted</span>
              <span className="text-green-600 text-sm">
                -{parseFloat(deductionsData.deducted || "0").toFixed(2)}
              </span>
            </div>

            {/* Remaining Deductions */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Remaining Deductions</span>
              <span className="text-red-600 text-sm">
                {calculateTotalDeductions()}
              </span>
            </div>

            {/* Current Month Deduction */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">
                Current Month Deduction {selectedDeductionMonth ? `(${new Date(selectedDeductionMonth + '-01').toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short'
                })})` : ''}
              </span>
              <span className="text-orange-600 text-sm">
                -{parseFloat(deductionsData.deducted || "0").toFixed(2)}
              </span>
            </div>

            {/* Net Payable */}
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-700 text-sm font-medium">Net Payable</span>
              <span className="text-green-700 text-sm font-semibold">
                {(() => {
                  // Calculate net payable: Total Earnings - Current Month Deduction Amount
                  const totalEarnings = (employeeData as any)?.salary
                    ? selectedmonth
                      ? (() => {
                        const [year, month] = selectedmonth.split('-').map(Number);
                        const expectedHours = getWorkingDaysInMonth(year, month - 1) * 7;
                        const basicPerHourRate = parseFloat((employeeData as any).salary) / expectedHours;
                        const completedHours = parseFloat(monthlyData.totalWorkingHours);
                        const basicEarnings = completedHours * basicPerHourRate;
                        const overtimeEarnings = parseFloat(monthlyData.overtimePay || "0");
                        return basicEarnings + overtimeEarnings;
                      })()
                      : parseFloat((employeeData as any).salary) + parseFloat((employeeData as any).overtimePay || "0")
                    : 0;

                  // Get current month deduction amount (from the deductions card's selected month)
                  const currentMonthDeduction = parseFloat(deductionsData.deducted || "0");
                  return Math.max(0, totalEarnings - currentMonthDeduction).toFixed(2);
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Deduction Modal */}
      {isAddingDeduction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-96">
            <div className="flex flex-row justify-between mb-4">
              <h2 className="text-lg font-bold">Add Monthly Deduction</h2>
              <button
                onClick={() => {
                  setIsAddingDeduction(false);
                  setAddDeductionData({
                    deducted: "0",
                    month: getCurrentMonth(),
                  });
                }}
                className="rounded-full hover:bg-gray-300 p-1 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Month Selector */}
              <div>
                <label className="block mb-1 font-medium text-sm">Month</label>
                <input
                  type="month"
                  value={addDeductionData.month}
                  onChange={(e) => handleAddDeductionChange('month', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={addDeductionLoading}
                />
              </div>

              {/* Deducted Amount */}
              <div>
                <label className="block mb-1 font-medium text-sm">Deduction Amount</label>
                <input
                  type="number"
                  value={addDeductionData.deducted}
                  onChange={(e) => handleAddDeductionChange('deducted', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  min="0"
                  step="0.01"
                  placeholder="Enter deduction amount"
                  disabled={addDeductionLoading}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={saveMonthlyDeduction}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
                  disabled={addDeductionLoading || !addDeductionData.month}
                >
                  {addDeductionLoading ? "Saving..." : "Save Deduction"}
                </button>
                <button
                  onClick={() => {
                    setIsAddingDeduction(false);
                    setAddDeductionData({
                      deducted: "0",
                      month: getCurrentMonth(),
                    });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
                  disabled={addDeductionLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {incrementModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-96">
            <div className="flex flex-row justify-between mb-4">
              <h2 className="text-lg font-bold">Add Increment</h2>
              <X
                size={30}
                onClick={() => setIncrementModel(false)}
                className="rounded-full hover:bg-gray-300 p-1 cursor-pointer"
              />
            </div>

            <form onSubmit={handleSubmitIncrement}>
              <div className="mb-4">
                <label
                  htmlFor="increment_date"
                  className="block mb-1 font-medium"
                >
                  Increment Date:
                </label>
                <input
                  className="p-2 rounded-xl bg-gray-100 w-full"
                  type="date"
                  name="increment_date"
                  value={incrementData.increment_date}
                  onChange={handleIncrementChange}
                  required
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="increment_amount"
                  className="block mb-1 font-medium"
                >
                  Increment Amount:
                </label>
                <input
                  className="p-2 rounded-xl bg-gray-100 w-full"
                  type="number"
                  name="increment_amount"
                  value={incrementData.increment_amount}
                  onChange={handleIncrementChange}
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="upcomming_increment"
                  className="block mb-1 font-medium"
                >
                  Upcoming Increment:
                </label>
                <input
                  className="p-2 rounded-xl bg-gray-100 w-full"
                  type="date"
                  name="upcomming_increment"
                  value={incrementData.upcomming_increment || ""}
                  onChange={(e) => {
                    console.log(
                      "New upcoming increment date in modal:",
                      e.target.value
                    );
                    setIncrementData({
                      ...incrementData,
                      upcomming_increment: e.target.value,
                    });
                  }}
                  required
                />
                {/* Debug info */}
                <div className="text-xs text-gray-400 mt-1">
                  Current value:{" "}
                  {incrementData.upcomming_increment || "Not set"}
                </div>
              </div>

              <div className="text-center mt-6">
                <button
                  className="w-[50%] px-4 py-2 text-white rounded-xl bg-[#9A00FF] hover:bg-[#8a00e6]"
                  type="submit"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                Edit Employee Profile
              </h2>
              <button
                onClick={() => setIsEditMode(false)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Profile Image Preview */}
              <div className="flex flex-col items-center mb-6">
                <img
                  src={
                    formData.profile_image
                      ? URL.createObjectURL(formData.profile_image)
                      : (employeeData as any)?.profile_image_url ||
                      "https://via.placeholder.com/150"
                  }
                  alt="Profile"
                  className="w-32 h-32 rounded-xl object-cover mb-4"
                />
                <div className="relative">
                  <label htmlFor="profile_image" className="cursor-pointer px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors">
                    Change Photo
                    <input
                      type="file"
                      id="profile_image"
                      name="profile_image"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                <div className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter full name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter email address"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    Personal Email
                  </label>
                  <input
                    type="email"
                    name="personal_email"
                    value={formData.personal_email}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter personal email"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    Slack ID
                  </label>
                  <input
                    type="text"
                    name="slack_id"
                    value={formData.slack_id}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter Slack ID"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter location"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    Profession
                  </label>
                  <input
                    type="text"
                    name="profession"
                    value={formData.profession}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter profession"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    Salary
                  </label>
                  <input
                    type="text"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter salary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    Per Hour Pay
                  </label>
                  <input
                    type="text"
                    name="per_hour_pay"
                    value={formData.per_hour_pay || ""}
                    readOnly
                    className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl cursor-not-allowed"
                  />
                  {expectedHours !== null && (
                    <p className="text-xs text-gray-500">
                      Calculated: {formData.salary || 0} ÷ {expectedHours} hours = {formData.per_hour_pay || 0}/hr
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select Role</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="client">Client</option>
                    <option value="employee">Employee</option>
                    <option value="project manager">Project Manager</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    name="joining_date"
                    value={formData.joining_date || ""}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    CNIC
                  </label>
                  <input
                    type="text"
                    name="CNIC"
                    value={formData.CNIC}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter CNIC number"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    Bank Account
                  </label>
                  <input
                    type="text"
                    name="bank_account"
                    value={formData.bank_account}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter bank account number"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    Upcoming Increment Date
                  </label>
                  <input
                    type="date"
                    name="upcoming_increment"
                    value={upcomingIncrementDate}
                    onChange={(e) => {
                      console.log(
                        "New upcoming increment date:",
                        e.target.value
                      );
                      setUpcomingIncrementDate(e.target.value);
                    }}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                  {/* Debug info */}
                  <div className="text-xs text-gray-400">
                    Current value: {upcomingIncrementDate || "Not set"}
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await fetchIncrementHistory();
                      setShowIncrementHistory(true);
                    }}
                    className="mt-2 w-full flex justify-center items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition duration-200"
                  >
                    <History className="mr-2 h-4 w-4" />
                    View Increment History
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-4 p-6 border-t">
              <button
                onClick={() => {
                  setIsEditMode(false);
                }}
                className="px-6 py-2.5 bg-gray-200 text-gray-800 font-medium rounded-xl hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Increment History Modal */}
      {showIncrementHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Salary Increment History
              </h2>
              <button
                onClick={() => setShowIncrementHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {incrementHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-4 border-b text-left">Date</th>
                      <th className="py-2 px-4 border-b text-left">
                        Previous Salary
                      </th>
                      <th className="py-2 px-4 border-b text-left">
                        Increment Amount
                      </th>
                      <th className="py-2 px-4 border-b text-left">
                        After Increment
                      </th>
                      <th className="py-2 px-4 border-b text-left">
                        Next Increment Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {incrementHistory.map((increment, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                      >
                        <td className="py-2 px-4 border-b">
                          {new Date(
                            increment.increment_date
                          ).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-4 border-b">
                          {increment.basic_sallery || "N/A"}
                        </td>
                        <td className="py-2 px-4 border-b">
                          <span className="text-green-600 font-medium">
                            +{increment.increment_amount || "0"}
                          </span>
                        </td>
                        <td className="py-2 px-4 border-b">
                          {increment.after_increment || "N/A"}
                        </td>
                        <td className="py-2 px-4 border-b">
                          {increment.upcomming_increment
                            ? new Date(
                              increment.upcomming_increment
                            ).toLocaleDateString()
                            : "Not scheduled"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  No increment history found for this employee.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowIncrementHistory(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordAdminModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        employeeId={employeeid}
      />
    </div>
  );
};

export default Employeeprofile;
