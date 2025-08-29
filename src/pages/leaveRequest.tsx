// ...existing code...
// ...existing code...
// ...existing code...
// ...existing code...
// ...existing code...

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from '../hooks/redux.CustomHooks';
import { createLeaveRequest, fetchHolidays } from '../slices/leaveSlice';

interface LeaveRequestProps {
  setActiveComponent: React.Dispatch<React.SetStateAction<string>>;
}

// Holiday interface is imported from leaveService

const LeaveRequest: React.FC<LeaveRequestProps> = ({ setActiveComponent }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { holidays, loading } = useAppSelector((state) => state.leave);

  const [leaveType, setLeaveType] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [fullname, setFullname] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  // Fetch holidays using Redux
  useEffect(() => {
    if (user?.organizationId) {
      // Fetch holidays using Redux action
      dispatch(fetchHolidays(new Date().getFullYear()));
    }
  }, [user?.organizationId, dispatch]);

  // Close calendar on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    }
    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCalendar]);

  // Helper functions
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Helper function to format date consistently without timezone issues
  const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isHoliday = (date: Date) => {
    const dateStr = formatDateString(date);

    if (!holidays || holidays.length === 0) {
      return false;
    }

    const result = holidays.some(holiday => {
      // Handle different date formats that might be stored in the database
      let hDate;
      if (holiday.date.includes('T')) {
        // ISO format with time
        hDate = new Date(holiday.date).toISOString().split('T')[0];
      } else {
        // Assume it's already in YYYY-MM-DD format
        hDate = holiday.date;
      }
      return hDate === dateStr;
    });

    return result;
  };

  const getHolidayName = (date: Date) => {
    const dateStr = formatDateString(date);
    const holiday = holidays.find(h => {
      // Handle different date formats that might be stored in the database
      let hDate;
      if (h.date.includes('T')) {
        // ISO format with time
        hDate = new Date(h.date).toISOString().split('T')[0];
      } else {
        // Assume it's already in YYYY-MM-DD format
        hDate = h.date;
      }
      return hDate === dateStr;
    });
    return holiday?.name || '';
  };

  // FIX: No mutation of date object!
  const isDateSelectable = (date: Date) => {
    const dateStr = formatDateString(date);
    const today = new Date();
    const todayStr = formatDateString(today);
    return dateStr >= todayStr && !isWeekend(date) && !isHoliday(date);
  };

  // Calendar Component
  const Calendar = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days: Date[] = [];
    let date = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }

    const handleDateClick = (date: Date) => {
      if (isDateSelectable(date)) {
        const dateStr = formatDateString(date);
        if (selectedDates.includes(dateStr)) {
          setSelectedDates(selectedDates.filter(d => d !== dateStr));
        } else {
          setSelectedDates([...selectedDates, dateStr].sort());
        }
      }
    };

    const getDateClass = (date: Date) => {
      const dateStr = formatDateString(date);
      const baseClass = "w-full h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ";

      if (date.getMonth() !== currentMonth.getMonth()) {
        return baseClass + "text-gray-400";
      }
      if (selectedDates.includes(dateStr)) {
        return baseClass + "bg-green-500 text-white hover:bg-green-600";
      }
      if (isWeekend(date)) {
        return baseClass + "bg-red-100 text-red-600 cursor-not-allowed";
      }
      if (isHoliday(date)) {
        return baseClass + "bg-yellow-100 text-yellow-700 cursor-not-allowed";
      }
      if (!isDateSelectable(date)) {
        return baseClass + "bg-gray-100 text-gray-400 cursor-not-allowed";
      }
      return baseClass + "bg-white hover:bg-gray-100 cursor-pointer";
    };

    return (
      <div ref={calendarRef} className="absolute z-10 mt-2 p-4 bg-white rounded-lg shadow-lg border border-gray-200 w-96">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => (
            <div key={index} className="relative group">
              <button
                type="button"
                onClick={() => handleDateClick(date)}
                disabled={!isDateSelectable(date)}
                className={getDateClass(date)}
              >
                {date.getDate()}
              </button>
              {isHoliday(date) && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                  <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                    {getHolidayName(date)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Color Legend */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Selected dates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 rounded"></div>
              <span>Weekends (not selectable)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 rounded"></div>
              <span>Public holidays (not selectable)</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullname || !leaveType || !description || selectedDates.length === 0) {
      alert("Please fill out all fields and select at least one date.");
      return;
    }

    if (!user) {
      alert("User not authenticated. Please log in again.");
      return;
    }

    try {
      // Create leave request data
      // Sort selected dates to get proper start and end dates
      const sortedDates = [...selectedDates].sort();
      const startDate = sortedDates[0];
      const endDate = sortedDates.length > 1 ? sortedDates[sortedDates.length - 1] : undefined;

      const leaveRequestData = {
        leaveType: leaveType,
        startDate: startDate,
        endDate: endDate, // Only set if multiple dates selected
        leaveDates: selectedDates, // All selected dates
        reason: description,
        notifyManager: true,
        notifyHR: true
      };

      // Dispatch Redux action to create leave request
      const result = await dispatch(createLeaveRequest(leaveRequestData));

      if (createLeaveRequest.fulfilled.match(result)) {
        alert(`Leave request submitted successfully for ${selectedDates.length} date(s)!`);

        // Reset form
        setLeaveType("");
        setDescription("");
        setSelectedDates([]);
        setFullname("");
        setEmail("");
      } else {
        const errorMessage = result.payload as string || "Failed to submit leave request";
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error submitting leave request:", error);
      alert("Error submitting leave request. Please try again.");
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <button onClick={() => setActiveComponent("default")} className="text-gray-600 hover:bg-gray-300 rounded-2xl translate-x-2 transition-transform ease-in-out duration-300 transform hover:scale-105">
          <ChevronLeft />
        </button>
      </div>
      <h2 className="text-[28px] font-bold mb-6 leading-9 text-[#000000]">Leaves Request</h2>
      <div className="max-w-50 mx-auto mt-8 p-6 bg-[#FFFFFF] rounded-lg shadow-lg">
        <h2 className="text-[22px] font-semibold mb-6 leading-7 text-[#000000]">Request a Leave</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4 grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="w-full">
              <label
                htmlFor="FullName"
                className="block text-sm font-normal text-[#565656]"
              >
                Full Name
              </label>
              <input
                id="FullName"
                type="text"
                placeholder="Enter your name"
                onChange={(e) => setFullname(e.target.value)}
                value={fullname}
                className="mt-1 block text-[#565656] w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="w-full">
              <label
                htmlFor="email"
                className="block text-sm font-normal text-[#565656]"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your personal email"
                className="mt-1 block text-[#565656] w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="w-full grid gap-3 grid-cols-1 md:grid-cols-2 mb-6">
            <div className="relative">
              <label htmlFor="leaveDate" className="block text-sm font-normal text-[#565656]">
                Select Leave Dates
              </label>
              <div
                onClick={() => setShowCalendar(!showCalendar)}
                className="mt-1 block text-[#565656] w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 cursor-pointer bg-white"
              >
                {selectedDates.length > 0
                  ? `${selectedDates.length} date(s) selected`
                  : 'Click to select dates'
                }
              </div>
              {showCalendar && <Calendar />}
              {selectedDates.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-2">Selected dates:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDates.map((date) => (
                      <span
                        key={date}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                      >
                        {new Date(date + 'T00:00:00').toLocaleDateString()}
                        <button
                          type="button"
                          onClick={() => setSelectedDates(selectedDates.filter(d => d !== date))}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="w-full">
                <label
                  htmlFor="leaveType"
                  className="block text-sm font-normal text-[#565656]"
                >
                  Leave Type
                </label>
                <select
                  id="leaveType"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="mt-1 block text-[#565656] w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a leave type</option>
                  <option value="Full Day">Full Day</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label
              htmlFor="description"
              className="block text-sm font-normal text-[#565656]"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 block text-[#565656] w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Please provide a brief description"
            ></textarea>
          </div>
          <div className="flex justify-end gap-6 mt-6 mr-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#9A00FF] text-white px-6 py-2 rounded-lg shadow hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveRequest;