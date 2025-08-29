import React, { useState, useEffect } from 'react';
import {
  parse,
  isAfter,
  isBefore,
  addMinutes,
  setMinutes,
  setHours,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isToday,
} from 'date-fns';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  setCheckIn,
  setBreakTime,
  setWorkMode,
  setIsCheckedIn,
  setIsOnBreak,
} from '../slices/attendanceSlice';
import { fetchOrganizationLocation } from '../slices/organizationLocationSlice';
import { supabase, withRetry, handleSupabaseError } from '../lib/supabase';
import { attendanceService, attendanceWorkflowService } from '../services/userService';
import timeImage from './../assets/Time.png';
import teaImage from './../assets/Tea.png';
import {
  Clock,
  Coffee,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  FileText,
  MapPin,
  X,
} from 'lucide-react';
import { toZonedTime, format } from 'date-fns-tz';
import { error } from 'console';
import { useUser } from '../contexts/UserContext';
import TaskModal from '../component/TaskModal';
import CheckoutModal from '../component/CheckOutModal';
import { Content } from 'vaul';

const GEOFENCE_RADIUS = 0.15; // km - increased from 0.15km to 1km for better tolerance

interface AttendanceRecord {
  _id: string;
  id: string;
  checkIn: string;
  checkOut: string | null;
  workMode: 'on_site' | 'remote';
  status: string;
  workingHours?: number;
  totalHours?: number;
  breakTime?: number; // in minutes
  coordinates?: {
    checkIn: {
      latitude: number;
      longitude: number;
    };
    checkOut?: {
      latitude: number;
      longitude: number;
    };
  };
  tasks?: DailyTask[];
}

interface BreakRecord {
  id: string;
  start_time: string;
  end_time: string | null;
  status: string | null;
}

interface DailyTask {
  id: string;
  attendance_id: string;
  user_id: string;
  task_date: string;
  task_description: string;
  created_at: string;
}

interface TaskOfProject {
  id: string;
  created_at: string;
  project_id?: string;
  title?: string;
  description?: string;
  developer?: string;
  status: string;
  score?: number;
  priority?: string;
  deadline?: string;
  section_date?: string;
  daily_task?: string;
  daily_log?: string;
  user_id: string;
}

type ViewType = 'daily' | 'weekly' | 'monthly';

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const Attendance: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const { userProfile } = useUser();
  // Mirror Redux user id into localStorage for legacy code paths
  useEffect(() => {
    const reduxUserId = user?.id;
    if (reduxUserId && !localStorage.getItem('user_id')) {
      localStorage.setItem('user_id', reduxUserId);
    }
  }, [user?.id]);

  const [officeLocation, setOfficeLocation] = useState({
    latitude: 0,
    longitude: 0,
  });
  const [isLocationLoading, setIsLocationLoading] = useState(false); // Start as false, will be set by Redux

  // Add modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);



  // Redux state
  const {
    isCheckedIn,
    checkInTime,
    isOnBreak,
    breakStartTime,
    workMode,
  } = useSelector((state: RootState) => state.attendance);

  // Organization location from Redux (with safe access)
  const organizationLocationState = useSelector((state: RootState) => {
    try {
      return state?.organizationLocation || { location: null, isLoading: false, error: null };
    } catch (error) {
      console.error('Error accessing organizationLocation state:', error);
      return { location: null, isLoading: false, error: null };
    }
  });
  const organizationLocation = organizationLocationState.location || null;
  const orgLocationLoading = organizationLocationState.isLoading || false;

  // Fetch organization location using Redux
  useEffect(() => {
    console.log('🔄 Fetching organization location...');
    dispatch(fetchOrganizationLocation());
  }, [dispatch]);

  // Update local office location when Redux location changes
  useEffect(() => {
    console.log('📍 Organization location changed:', organizationLocation);
    console.log('⏳ Organization loading state:', orgLocationLoading);

    if (organizationLocation && organizationLocation.coordinates) {
      console.log('✅ Setting office location from Redux');
      setOfficeLocation({
        latitude: organizationLocation.coordinates.latitude,
        longitude: organizationLocation.coordinates.longitude,
      });
      setIsLocationLoading(false);
    } else if (!orgLocationLoading) {
      // If not loading and no location, set loading to false to prevent infinite loading
      console.log('❌ No organization location found');
      setIsLocationLoading(false);
    } else {
      console.log('⏳ Still loading organization location...');
      setIsLocationLoading(orgLocationLoading);
    }
  }, [organizationLocation, orgLocationLoading]);



  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [breakRecords, setBreakRecords] = useState<
    Record<string, BreakRecord[]>
  >({});
  const [isDisabled, setIsDisabled] = useState(false);
  const [isButtonLoading, setisButtonLoading] = useState(false);
  const [alreadycheckedin, setalreadycheckedin] = useState(false);

  const [isbreak, setisbreak] = useState<boolean>(true);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // Function to handle initial check-in button click
  const handleCheckInClick = () => {
    setIsTaskModalOpen(true);
  };

  const handleApplyTasks = async (tasks: string, selectedTaskIds: string[], projectId: string) => {
    // Close modal and proceed with backend-driven check-in workflow
    setIsTaskModalOpen(false);

    try {
      setLoading(true);
      setError(null);

      // 1. Get user location
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;
      setCurrentLocation({ lat: latitude, lng: longitude });

      // 2. Calculate distance and work mode
      const distance = calculateDistance(
        latitude,
        longitude,
        officeLocation.latitude,
        officeLocation.longitude
      );
      const workMode = distance <= GEOFENCE_RADIUS ? 'on_site' : 'remote';

      // 3. Calculate status based on time
      const nowInPakistan = toZonedTime(new Date(), 'Asia/Karachi');
      const nineThirty = new Date(nowInPakistan);
      nineThirty.setHours(9, 30, 0, 0);
      const status = nowInPakistan > nineThirty ? 'late' : 'present';

      // 4. Check for remote work confirmation if needed
      if (workMode === 'remote') {
        const confirmRemote = window.confirm(
          "Your check-in will be counted as Remote because you are currently outside the office zone. If you don't have approval for remote work, you will be marked Absent. Do you want to proceed with remote check-in?"
        );

        if (!confirmRemote) {
          console.log('Remote check-in aborted by user.');
          setLoading(false);
          return;
        }
      }

      // 5. Create attendance record first
      const { data: attendanceData, error: attendanceError } = await withRetry(
        () =>
          supabase
            .from('attendance_logs')
            .insert([
              {
                user_id: localStorage.getItem('user_id'),
                work_mode: workMode,
                latitude,
                longitude,
                status,
              },
            ])
            .select()
            .single()
      );

      if (attendanceError) throw attendanceError;

      // 6. Update selected tasks status to inProgress if they were todo or review
      if (selectedTaskIds.length > 0) {
        const { error: updateTasksError } = await supabase
          .from('tasks_of_projects')
          .update({ status: 'inProgress' })
          .in('id', selectedTaskIds)
          .in('status', ['todo', 'review']);

        if (updateTasksError) {
          console.error('Error updating task status:', updateTasksError);
        } else {
          console.log(`Successfully moved ${selectedTaskIds.length} task(s) to In Progress status`);
        }
      }

      // 7. Save to daily_tasks table
      if (tasks.trim()) {
        const { error: tasksError } = await supabase
          .from('daily_tasks')
          .insert([
            {
              user_id: localStorage.getItem('user_id'),
              attendance_id: attendanceData.id,
              task_date: new Date().toISOString().split('T')[0],
              task_description: tasks,
            },
          ]);

        if (tasksError) {
          console.error('Error saving tasks:', tasksError);
        }
      }

      // 8. Save to tasks_of_projects table
      const today = new Date().toISOString().split('T')[0];

      // First check if a record exists for today
      const { data: existingTask, error: fetchError } = await supabase
        .from('tasks_of_projects')
        .select('id')
        .eq('developer', localStorage.getItem('user_id'))
        .eq('section_date', today)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking for existing task:', fetchError);
      }

      if (existingTask) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('tasks_of_projects')
          .update({
            daily_task: tasks.trim(),
            project_id: projectId, // Add project reference
          })
          .eq('id', existingTask.id);

        if (updateError) {
          console.error('Error updating tasks_of_projects record:', updateError);
        }
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('tasks_of_projects')
          .insert([
            {
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
              title: `Daily Task - ${today}`,
              description: tasks.trim(),
              developer: localStorage.getItem('user_id'),
              status: 'inProgress',
              priority: 'Medium',
              section_date: today,
              daily_task: tasks.trim(),
              user_id: localStorage.getItem('user_id'),
              project_id: projectId, // Add project reference
            },
          ]);

        if (insertError) {
          console.error('Error inserting tasks_of_projects record:', insertError);
        }
      }

      // 9. Update state with attendance data
      dispatch(setIsCheckedIn(true));
      dispatch(setCheckIn(attendanceData.check_in));
      dispatch(setWorkMode(workMode));
      setAttendanceId(attendanceData.id);

      // 10. Reload attendance records
      await loadAttendanceRecords();

      // 11. Refresh current attendance status
      await refreshCurrentAttendanceStatus();
    } catch (err) {
      console.error('Error in handleApplyTasks:', err);
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // Function to skip task input and proceed with check-in
  const handleSkipTasks = () => {
    setIsTaskModalOpen(false);
    handleCheckIn();
  };

  // IMPROVED: Function to handle checkout task submission
  const handleCheckoutTaskSubmit = async (taskUpdate: string, selectedTaskId?: string) => {
    if (!taskUpdate.trim() || !user?.id) return;

    try {
      // Save to dailylog table
      const { error } = await supabase.from('dailylog').insert([
        {
          userid: localStorage.getItem('user_id'),
          dailylog: taskUpdate.trim(),
          sender_type: 'employee',
          source: 'web',
          is_read: false,
          rating: null,
          reply_to_id: null,
          admin_id: null,
          task_id: selectedTaskId || null, // Save selected task ID if provided
        },
      ]);

      // If a task was selected, move it from "in_progress" to "review" status
      if (selectedTaskId) {
        console.log(`Moving task ${selectedTaskId} from inProgress to review status`);

        try {
          const { error: taskUpdateError } = await supabase
            .from('tasks_of_projects')
            .update({
              status: 'review',
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedTaskId)
            .eq('status', 'inProgress'); // Only update if it's currently inProgress

          if (taskUpdateError) {
            console.error('Error updating task status:', taskUpdateError);
            // Don't throw error here - we still want to complete checkout
          } else {
            console.log(`Successfully moved task ${selectedTaskId} to review status`);
          }
        } catch (taskError) {
          console.error('Error in task status update:', taskError);
          // Continue with checkout even if task update fails
        }
      }

      if (error) {
        console.error('Error saving to dailylog:', error);
      } else {
        console.log('Successfully saved to dailylog table');
      }

      // IMPROVED: Save user input to tasks_of_projects table's daily_log field
      const today = new Date().toISOString().split('T')[0];

      // First check if a record exists for today
      const { data: existingTask, error: fetchError } = await supabase
        .from('tasks_of_projects')
        .select('id')
        .eq('developer', localStorage.getItem('user_id'))
        .eq('section_date', today)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking for existing task:', fetchError);
      }

      if (existingTask) {
        // Update existing record with the user's daily log input
        console.log(
          'Updating existing task record with daily_log:',
          taskUpdate
        );
        const { error: updateError } = await supabase
          .from('tasks_of_projects')
          .update({
            daily_log: taskUpdate.trim(), // Save user input to daily_log column
            status: 'done',
          })
          .eq('id', existingTask.id);

        if (updateError) {
          console.error(
            'Error updating tasks_of_projects record with daily_log:',
            updateError
          );
        } else {
          console.log('Successfully updated daily_log in existing record');
        }
      } else {
        // Create new record with the user's daily log input
        console.log('Creating new task record with daily_log:', taskUpdate);
        const { error: insertError } = await supabase
          .from('tasks_of_projects')
          .insert([
            {
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
              title: `Daily Summary - ${today}`,
              description: 'Daily log entry from attendance check-out',
              developer: localStorage.getItem('user_id'),
              status: 'done',
              priority: 'Medium',
              section_date: today,
              daily_log: taskUpdate.trim(), // Save user input to daily_log column
              daily_task: '', // Initialize with empty string
              user_id: localStorage.getItem('user_id'),
            },
          ]);

        if (insertError) {
          console.error(
            'Error inserting tasks_of_projects record with daily_log:',
            insertError
          );
        } else {
          console.log('Successfully created new record with daily_log');
        }
      }

      // Close modal and proceed with checkout
      setIsCheckoutModalOpen(false);
      await processCheckout();
    } catch (err) {
      console.error('Error saving daily update:', err);
      alert('Failed to save your daily update. Checkout will still proceed.');
      // Still proceed with checkout even if saving update fails
      setIsCheckoutModalOpen(false);
      await processCheckout();
    }
  };

  // Checking Today Leave For the User , If the User is Leave For Today , then Disable Its Checkin Button
  useEffect(() => {
    const loadCurrentAttendance = async () => {
      if (!user) return;
      try {
        setisButtonLoading(true);
        setalreadycheckedin(false);
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

        // First, check how many check-ins the user has done today (limit: 2)
        const { data: allTodayRecords, error: countError } = await supabase
          .from('attendance_logs')
          .select('id, check_in, check_out')
          .eq('user_id', localStorage.getItem('user_id'))
          .gte('check_in', startOfDay.toISOString())
          .lte('check_in', endOfDay.toISOString())
          .order('check_in', { ascending: false });

        if (countError) {
          setisButtonLoading(false);
          console.error('Error loading attendance records:', countError);
          return;
        }

        const totalCheckInsToday = allTodayRecords?.length || 0;
        console.log(`🔍 DEBUG: User has ${totalCheckInsToday} check-ins today`, allTodayRecords);

        // STRICT ENFORCEMENT: Check if user has reached the daily limit of 1 check-in
        if (totalCheckInsToday >= 1) {
          // Check if there's an active session (unchecked-out)
          const activeSession = allTodayRecords?.find(record => record.check_out === null);

          if (activeSession) {
            // User has an active session - allow check-out only
            console.log('✅ Found active session - allowing check-out:', activeSession);
            dispatch(setIsCheckedIn(true));
            setAttendanceId(activeSession.id);
            dispatch(setCheckIn(activeSession.check_in));
            setalreadycheckedin(false); // Allow check-out
          } else {
            // User has completed 1 check-in for the day - BLOCK ALL FURTHER CHECK-INS
            console.log('🚫 DAILY LIMIT REACHED: User has completed 1 check-in');
            dispatch(setIsCheckedIn(false));
            setAttendanceId(null);
            dispatch(setCheckIn(null));
            setalreadycheckedin(true); // BLOCK further check-ins
          }
        } else {
          // User hasn't reached the limit, check for active session
          const activeSession = allTodayRecords?.find(record => record.check_out === null);

          if (activeSession) {
            // User has an active session
            console.log('✅ Found active session:', activeSession);
            dispatch(setIsCheckedIn(true));
            setAttendanceId(activeSession.id);
            dispatch(setCheckIn(activeSession.check_in));
            setalreadycheckedin(false);
          } else {
            // No active session and under limit - allow check-in
            console.log(`✅ User can check in (${totalCheckInsToday}/1 check-ins used)`);
            dispatch(setIsCheckedIn(false));
            setAttendanceId(null);
            dispatch(setCheckIn(null));
            setalreadycheckedin(false); // Allow check-in
          }
        }

        setisButtonLoading(false);
      } catch (err) {
        console.error('Error in loadCurrentAttendance:', err);
        setError(handleSupabaseError(err));
      } finally {
        setisButtonLoading(false);
      }
    };

    loadCurrentAttendance();
  }, []);

  // Function to refresh current attendance status
  const refreshCurrentAttendanceStatus = async () => {
    if (!user) return;

    try {
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

      // Get all attendance records for today
      const { data: allTodayRecords, error } = await supabase
        .from('attendance_logs')
        .select('id, check_in, check_out')
        .eq('user_id', localStorage.getItem('user_id'))
        .gte('check_in', startOfDay.toISOString())
        .lte('check_in', endOfDay.toISOString())
        .order('check_in', { ascending: false });

      if (error) {
        console.error('Error refreshing attendance status:', error);
        return;
      }

      const totalCheckInsToday = allTodayRecords?.length || 0;

      // Check if user has reached the daily limit of 1 check-in
      if (totalCheckInsToday >= 1) {
        // Check if there's an active session
        const activeSession = allTodayRecords?.find(record => record.check_out === null);

        if (activeSession) {
          // User has an active session
          dispatch(setIsCheckedIn(true));
          setAttendanceId(activeSession.id);
          dispatch(setCheckIn(activeSession.check_in));
          setalreadycheckedin(false); // Allow check-out
        } else {
          // User has completed 1 check-in for the day
          dispatch(setIsCheckedIn(false));
          setAttendanceId(null);
          dispatch(setCheckIn(null));
          setalreadycheckedin(true); // Prevent further check-ins
        }
      } else {
        // User hasn't reached the limit, check for active session
        const activeSession = allTodayRecords?.find(record => record.check_out === null);

        if (activeSession) {
          // User has an active session
          dispatch(setIsCheckedIn(true));
          setAttendanceId(activeSession.id);
          dispatch(setCheckIn(activeSession.check_in));
        } else {
          // No active session and under limit - allow check-in
          dispatch(setIsCheckedIn(false));
          setAttendanceId(null);
          dispatch(setCheckIn(null));
          setalreadycheckedin(false); // Allow check-in
        }
      }
    } catch (err) {
      console.error('Error in refreshCurrentAttendanceStatus:', err);
    }
  };

  // Checking Today Leave For the User , If the User is Leave For Today , then Disable Its Checkin Button
  const checkAbsenteeStatus = async () => {
    try {
      // Use your backend absentees endpoint instead of Supabase
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/absentees?userId=${localStorage.getItem('user_id')}&startDate=${today}T00:00:00.000Z&endDate=${today}T23:59:59.000Z`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.ok) return;
      const result = await response.json();
      if (Array.isArray(result?.data) && result.data.length > 0) {
        setIsDisabled(true);
      }
    } catch (e) {
      console.error('Error fetching absentee data:', e);
    }
  };

  const fetchAttendanceStatus = async () => {
    if (!user) return;

    try {
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        0,
        0,
        0
      );
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59
      );

      // Checking whether the user has already checked in today
      const { data, error } = await supabase
        .from('extrahours')
        .select('id, check_in, check_out')
        .eq('user_id', localStorage.getItem('user_id'))
        .gte('check_in', startOfDay.toISOString())
        .lte('check_in', endOfDay.toISOString())
        .is('check_out', null)
        .order('check_in', { ascending: false });

      if (error) {
        if (error.code !== 'PGRST116') {
          // Ignore "no record found" errors
          console.error('Error loading current attendance:', error);
        }
        return;
      }

      // If there are any active sessions (check_out is null), disable the check-in button
      if (data && data.length > 0) {
        console.log(
          'Active extrahours session found. Disabling check-in button.'
        );
        setIsDisabled(true);
      } else {
        setIsDisabled(false);
      }
    } catch (error) {
      console.log('Error checking extrahours status:', error);
    }
  };

  useEffect(() => {
    const runSequentialChecks = async () => {
      await fetchAttendanceStatus(); // Check for active extrahours sessions
      await checkAbsenteeStatus(); // Check for leave status
    };

    runSequentialChecks();
  }, [user]);

  const loadAttendanceRecords = async () => {
    if (!user) return;

    try {
      let startDate, endDate;

      switch (view) {
        case 'daily':
          startDate = format(selectedDate, 'yyyy-MM-dd');
          endDate = format(
            addMinutes(new Date(startDate), 24 * 60 - 1),
            'yyyy-MM-dd'
          );
          break;
        case 'weekly':
          startDate = format(startOfWeek(selectedDate), 'yyyy-MM-dd');
          endDate = format(endOfWeek(selectedDate), 'yyyy-MM-dd');
          break;
        case 'monthly':
          startDate = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
          endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd');
          break;
      }

      // Fetch attendance records using backend API
      const attendanceData = await attendanceService.getAttendanceHistory({
        startDate: `${startDate}T00:00:00Z`,
        endDate: `${endDate}T23:59:59Z`,
        page: 1,
        limit: 50
      });

      const records = attendanceData?.attendance || [];

      if (records && records.length > 0) {
        // Set attendance records directly (no tasks for now)
        setAttendanceRecords(records);

        // Use the most recent attendance record to determine break status
        const latestRecord = records[0];

        // Skip break loading for now (focus on attendance only)
      } else {
        // No attendance records found for the period
        setAttendanceRecords([]);
        setBreakRecords({});
        setIsOnBreak(false);
        setBreakTime(null);
      }
    } catch (err) {
      console.error('Error loading attendance records:', err);
      setError(handleSupabaseError(err));
    }
  };

  useEffect(() => {
    loadAttendanceRecords();
  }, [user, view, selectedDate]);

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  };

  //Handle Check in
  const handleCheckIn = async () => {
    const fallbackUser = (() => {
      try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
    })();
    const effectiveUser = user || fallbackUser;
    if (!effectiveUser) {
      setError('User not authenticated');
      return;
    }

    // DOUBLE CHECK: Verify daily limit before proceeding
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const current = await attendanceService.getCurrentAttendance();
      const totalCheckInsToday = current.attendance ? 1 : 0;
      console.log(`🔍 DOUBLE CHECK: User has ${totalCheckInsToday} check-ins today`);

      if (totalCheckInsToday >= 1) {
        console.log('🚫 BLOCKED: Daily limit of 1 check-in reached');
        setError('Daily limit reached: You can only check-in once per day');
        setalreadycheckedin(true);
        return;
      }
    } catch (err) {
      console.error('Error in daily limit check:', err);
      setError('Failed to verify daily limit');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;

      setCurrentLocation({ lat: latitude, lng: longitude });

      // Use server time for check_in
      console.log('User location:', { latitude, longitude });
      console.log('Office location:', officeLocation);

      const distance = calculateDistance(
        latitude,
        longitude,
        officeLocation.latitude,
        officeLocation.longitude
      );
      console.log('Distance from office:', distance, 'km');
      console.log('Geofence radius:', GEOFENCE_RADIUS, 'km');

      // Determine work mode based on distance from office
      const workMode = distance <= GEOFENCE_RADIUS ? 'on_site' : 'remote';

      // Calculate status based on current time in Pakistan (Asia/Karachi)
      const nowInPakistan = toZonedTime(new Date(), 'Asia/Karachi');
      const nineThirty = new Date(nowInPakistan);
      nineThirty.setHours(9, 30, 0, 0);
      const status = nowInPakistan > nineThirty ? 'late' : 'present';

      // If outside office location, prompt for remote check-in confirmation
      if (workMode === 'remote') {
        const confirmRemote = window.confirm(
          "Your check-in will be counted as Remote because you are currently outside the office zone. If you don't have approval for remote work, you will be marked Absent. Do you want to proceed with remote check-in?"
        );

        if (!confirmRemote) {
          console.log('Remote check-in aborted by user.');
          setLoading(false);
          return;
        }
      }

      // Perform check-in via backend service (no Supabase)
      const result = await attendanceWorkflowService.performCheckIn();
      const data = {
        id: result.attendance._id,
        check_in: result.attendance.checkIn,
      };

      // IMPROVED: Create empty entry in tasks_of_projects for today
      const today = new Date().toISOString().split('T')[0];

      // Check if a record exists for today first
      const { data: existingTask, error: fetchError } = await supabase
        .from('tasks_of_projects')
        .select('id')
        .eq('developer', localStorage.getItem('user_id'))
        .eq('section_date', today)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking for existing task:', fetchError);
      }

      if (!existingTask) {
        // Create new empty task entry for today
        console.log('Creating new empty task record for today');
        const { error: insertError } = await supabase
          .from('tasks_of_projects')
          .insert([
            {
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
              title: `Daily Task - ${today}`,
              description: 'Created via attendance system',
              developer: localStorage.getItem('user_id'),
              status: 'inProgress',
              priority: 'Medium',
              section_date: today,
              daily_task: '', // Empty daily_task initially
              user_id: localStorage.getItem('user_id'),
            },
          ]);

        if (insertError) {
          console.error('Error inserting empty task record:', insertError);
        } else {
          console.log('Successfully created empty task record');
        }
      } else {
        console.log('Task record already exists for today');
      }

      dispatch(setIsCheckedIn(true));
      dispatch(setCheckIn(data.check_in));
      setWorkMode(workMode);
      setAttendanceId(data.id); // backend _id

      // Refresh attendance table immediately after check-in
      await loadAttendanceRecords();
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // Handle checkout button click - confirm then proceed
  const handleCheckOutClick = () => {
    const confirmOut = window.confirm('Are you sure you want to check out?');
    if (!confirmOut) return;
    setIsCheckoutModalOpen(false);
    processCheckout();
  };

  // Handle skip checkout - proceed without saving daily update
  const handleSkipCheckout = () => {
    setIsCheckoutModalOpen(false);
    processCheckout();
  };

  // Process the actual checkout after modal interaction
  const processCheckout = async () => {
    if (!user || !attendanceId) {
      setError('No active attendance record found');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const now = new Date();

      // Backend checkout endpoint automatically ends active breaks
      if (isOnBreak) {
        setIsOnBreak(false);
        setBreakTime(null);
      }

      // Checking the Total Time in Office; If it is less than 6 hrs then put half-day in absentees database
      const today = new Date();
      const todayDate = today.toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

      // Use backend current attendance to determine if there is an active session
      const current = await attendanceService.getCurrentAttendance();
      const activeSession = current.attendance && !current.attendance.checkOut;

      if (!activeSession) {
        console.log('No active session found - user is not checked in');

        // Reset UI state properly
        dispatch(setIsCheckedIn(false));
        dispatch(setCheckIn(null));
        setWorkMode(null);
        setAttendanceId(null);

        // Reload attendance records to reflect current state
        await loadAttendanceRecords();

        setLoading(false);
        return;
      }

      console.log('Found active session for checkout:', activeSession);

      // Call backend checkout API
      const checkoutResult = await attendanceService.checkOut({ attendanceId, notes: undefined });
      if (!checkoutResult?.success) {
        throw new Error(checkoutResult?.message || 'Check-out failed');
      }

      console.log('Successfully checked out. Resetting UI state.');

      // Reset all states
      dispatch(setIsCheckedIn(false));
      dispatch(setCheckIn(null));
      setWorkMode(null);
      setAttendanceId(null);
      setalreadycheckedin(true); // Daily limit reached after one complete session (check-in + check-out)

      console.log("Today's Date:", todayDate);

      // 2️⃣ Calculate total attendance duration (in hours) using backend response
      const checkInTime = new Date(current.attendance.checkIn);
      const checkOutTime = new Date(now.toISOString());

      // Calculate total attendance duration (in hours)
      const attendanceDuration =
        (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60); // Convert ms to hours
      console.log(
        `Attendance duration: ${attendanceDuration.toFixed(2)} hours`
      );

      // If attendance duration is sufficient, skip further actions
      if (attendanceDuration >= 4) {
        console.log('Attendance is sufficient. No further action needed.');
        return;
      }

      // Reload attendance records and refresh status using backend
      await loadAttendanceRecords();
      await refreshCurrentAttendanceStatus();
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleBreak = async () => {
    if (!attendanceId) {
      setError('No active attendance record found');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const breakEndLimit = parse('14:10', 'HH:mm', now);

      if (!isOnBreak) {
        // Starting break
        const { error: dbError } = await supabase.from('breaks').insert([
          {
            attendance_id: attendanceId,
            start_time: now.toISOString(),
            status: 'on_time',
          },
        ]);

        if (dbError) throw dbError;

        setIsOnBreak(true);
        setBreakTime(now.toISOString());
      } else {
        // Ending break
        let breakStatus = 'on_time';
        if (isAfter(now, breakEndLimit)) {
          breakStatus = 'late';
        }

        const { error: dbError } = await supabase
          .from('breaks')
          .update({
            end_time: now.toISOString(),
            status: breakStatus,
          })
          .eq('attendance_id', attendanceId)
          .is('end_time', null);

        if (dbError) throw dbError;

        setIsOnBreak(false);
        setBreakTime(null);
      }
      await loadAttendanceRecords();
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // Handle viewing a task in a modal
  const handleViewTask = (taskDescription: string) => {
    setSelectedTask(taskDescription);
  };

  const renderAttendanceRecords = () => {
    return (
      <div className="mt-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-semibold">
                Monthly Overview - &nbsp;
                {format(selectedDate, 'MMMM yyyy')}
              </h2>
            </div>
            <select
              className="text-sm rounded-lg px-3 py-1 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={view}
              onChange={(e) => setView(e.target.value as ViewType)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() =>
                setSelectedDate((prev) => {
                  switch (view) {
                    case 'daily':
                      return addMinutes(prev, -24 * 60);
                    case 'weekly':
                      return addMinutes(prev, -7 * 24 * 60);
                    case 'monthly':
                      return addMinutes(prev, -30 * 24 * 60);
                    default:
                      return prev;
                  }
                })
              }
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="font-semibold text-xl leading-5 text-[#344054]">
              {format(
                selectedDate,
                view === 'daily' ? 'MMMM d, yyyy' : 'MMMM yyyy'
              )}
            </span>
            <button
              onClick={() =>
                setSelectedDate((prev) => {
                  switch (view) {
                    case 'daily':
                      return addMinutes(prev, 24 * 60);
                    case 'weekly':
                      return addMinutes(prev, 7 * 24 * 60);
                    case 'monthly':
                      return addMinutes(prev, 30 * 24 * 60);
                    default:
                      return prev;
                  }
                })
              }
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border-2 border-[#F5F5F9]">
              <thead>
                <tr className="text-gray-700 text-sm">
                  <th className="border p-6 border-gray-200 font-medium text-sm leading-5 text-[#344054] uppercase">
                    Date
                  </th>
                  <th className="border p-6 border-gray-200 font-medium text-sm leading-5 text-[#344054] uppercase">
                    Check In
                  </th>
                  <th className="border p-6 border-gray-200 font-medium text-sm leading-5 text-[#344054] uppercase">
                    Check Out
                  </th>
                  <th className="border p-6 border-gray-200 font-medium text-sm leading-5 text-[#344054] uppercase">
                    Status
                  </th>
                  <th className="border p-6 border-gray-200 font-medium text-sm leading-5 text-[#344054] uppercase">
                    Work Mode & Location
                  </th>
                  <th className="border p-6 border-gray-200 font-medium text-sm leading-5 text-[#344054] uppercase">
                    Total Hours
                  </th>
                  <th className="border p-6 border-gray-200 font-medium text-sm leading-5 text-[#344054] uppercase">
                    Breaks
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 ">
                {attendanceRecords.length > 0 ? (
                  attendanceRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 border whitespace-nowrap tex-[#666666] text-xs leading-5 font-normal">
                        {format(new Date(record.checkIn), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 border whitespace-nowrap tex-[#666666] text-xs leading-5 font-normal">
                        {format(new Date(record.checkIn), 'hh:mm a')}
                      </td>
                      <td className="px-6 py-4 border whitespace-nowrap text-xs leading-5 font-normal tex-[#666666]">
                        {record.checkOut
                          ? format(new Date(record.checkOut), 'hh:mm a')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 border whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.status === 'present'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                            }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 border whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.workMode === 'on_site'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                              }`}
                          >
                            {record.workMode}
                          </span>
                          {record.coordinates?.checkIn && (
                            <div className="flex items-center text-gray-500 text-xs mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              <span className="truncate">
                                {record.coordinates.checkIn.latitude.toFixed(4)},{' '}
                                {record.coordinates.checkIn.longitude.toFixed(4)}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 border whitespace-nowrap text-xs leading-5 font-normal tex-[#666666]">
                        {record.workingHours ? `${record.workingHours.toFixed(2)} hrs` : '-'}
                      </td>
                      <td className="px-6 py-4 border whitespace-nowrap text-xs leading-5 font-normal tex-[#666666]">
                        {record.breakTime ? `${(record.breakTime / 60).toFixed(1)} hrs` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      No attendance records found for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Task detail modal
  const renderTaskDetailModal = () => {
    if (!selectedTask) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedTask(null)}
        />
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 z-10 relative p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Task Details</h3>
            <button
              onClick={() => setSelectedTask(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-y-auto max-h-96">
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {selectedTask}
            </p>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setSelectedTask(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Attendance</h1>

      {/* Check-in Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onApply={handleApplyTasks}
        onSkip={handleSkipTasks}
        userId={localStorage.getItem('user_id') || ''} // Pass the current user's ID from localStorage
      />

      {/* Checkout Daily Update Modal */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => {
          setIsCheckoutModalOpen(false);
          // X button closes modal but does NOT check out - user remains checked in
        }}
        onSubmit={handleCheckoutTaskSubmit}
        onSkip={handleSkipCheckout}
        userId={localStorage.getItem('user_id') || ''}
      />

      {/* Task Detail Modal */}
      {renderTaskDetailModal()}

      <div className="grid grid-cols-1 md:grid-cols-2 mb-5 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <img src={timeImage} alt="clock" className="w-8 h-8" />
              &nbsp;&nbsp;
              <h2 className="text-[22px] leading-7 text-[#000000] font-semibold">
                Check-in Status
              </h2>
            </div>
            {workMode && (
              <span
                className={`px-3 py-1 rounded-full text-sm ${workMode === 'on_site'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
                  }`}
              >
                {workMode === 'on_site' ? 'On-site' : 'Remote'}
              </span>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {alreadycheckedin && !isCheckedIn && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    <strong>🚫 Daily Limit Reached:</strong> You have completed your check-in for today. The check-in button is now disabled. Please try again tomorrow.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isDisabled && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    You have an active extra hours session. Please check out
                    from there before checking in.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isCheckedIn ? (
            <div className="space-y-4">
              <button
                onClick={handleCheckOutClick} // Changed to open checkout modal first
                disabled={loading}
                className="w-full flex items-center justify-center bg-[#FF2828] text-white py-2 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <LogOut className="w-5 h-5 mr-2" />
                {loading ? 'Checking out...' : 'Check Out'}
              </button>
              <p className="text-[#7B7E85] font-medium text-[13px] leading-7">
                Checked in at:{' '}
                {checkInTime && format(new Date(checkInTime), 'hh:mm a')}
              </p>
            </div>
          ) : (
            <button
              onClick={handleCheckInClick} // Opens check-in modal first
              disabled={
                loading ||
                isDisabled ||
                alreadycheckedin ||
                isButtonLoading ||
                isLocationLoading
              } // Also disable if location is still loading
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading
                ? 'Checking in...'
                : (isLocationLoading || orgLocationLoading)
                  ? 'Loading location...'
                  : 'Check In'}
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <img src={teaImage} alt="teaImage" className="w-8 h-8" />{' '}
            &nbsp;&nbsp;
            <h2 className="text-[22px] leading-7 text-[#000000] font-semibold">
              Break Time
            </h2>
          </div>

          {isCheckedIn && (
            <>
              {breakStartTime && (
                <p className="text-gray-600 mb-4">
                  Break started at:{' '}
                  {format(new Date(breakStartTime), 'hh:mm a')}
                </p>
              )}

              <button
                onClick={handleBreak}
                disabled={loading || isbreak}
                className={`w-full py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${isOnBreak
                  ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                  : 'bg-[#9A00FF] text-white hover:bg-[#9A00FF] focus:ring-[#9A00FF]'
                  } disabled:opacity-50`}
              >
                {loading
                  ? 'Updating...'
                  : isOnBreak
                    ? 'End Break'
                    : 'Start Break'}
              </button>
            </>
          )}
        </div>
      </div>

      {renderAttendanceRecords()}
    </div>
  );
};

export default Attendance;
