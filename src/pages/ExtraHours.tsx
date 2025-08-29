import React from "react";
import { format, parse, isAfter, isBefore, addMinutes, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useAuthStore } from '../lib/store';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  setCheckIn,
  setBreakTime,
  setWorkMode,
  setIsCheckedIn,
  setIsOnBreak,
} from '../slices/attendanceSlice';
import { supabase, withRetry, handleSupabaseError } from '../lib/supabase';
import { Clock, Coffee, Calendar, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useEffect, useState } from "react";



const OFFICE_LATITUDE = 34.1299;
const OFFICE_LONGITUDE = 72.4656;
const GEOFENCE_RADIUS = 0.5; // km

interface AttendanceRecord {
  id: string;
  check_in: string;
  check_out: string | null;
  work_mode: 'on_site' | 'remote';
  status: string;
}

interface BreakRecord {
  id: string;
  start_time: string;
  end_time: string | null;
  status: string | null;
}

type ViewType = 'daily' | 'weekly' | 'monthly';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const ExtraHours: React.FC = () => {
     const dispatch = useDispatch<AppDispatch>();
     const user = useAuthStore((state) => state.user);
    //   const initializeUser = useAuthStore((state) => state.initializeUser); 
      // console.log("User  id 1:" , user.user.id);
      // console.log("User id 2 :" , user.id);
    
    //   useEffect(() => {
    //     initializeUser();
    //   }, [initializeUser]);
    
      // Redux state
      const {
        isCheckedIn,
        checkInTime,
        isOnBreak,
        breakStartTime,
        workMode,
      } = useSelector((state: RootState) => state.attendance);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
    const [RemoteCheckIn, setRemoteCheckIn] = useState('');
    const [isRemote, setisRemote] = useState(false);
    const [isonRemoteBreak, setisonRemoteBreak] = useState(false);
    const [RemoteID, setRemoteID] = useState ('');
    const [RemoteRecords, setRemoteRecords] = useState('');
    const [RemoteBreak, setRemoteBreak] = useState(false);
    const [RemoteBreakTime, setRemoteBreakTime] = useState ('');
    const [RemoteBreakRecords , setRemoteBreakRecords] = useState();
    const [view, setView] = useState<ViewType>('daily');
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    



    const getCurrentLocation = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'));
            return;
          }
    
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
      };
    
      getCurrentLocation()
      .then((position)=>{
        // console.log(position.coords.latitude);
        // console.log(position.coords.longitude);
        
      }).catch(()=>{
        console.log("User Location Undefined");
        
      })
  
    useEffect(() => {
      
      const loadCurrentRemote = async () => {
        if (!user ) return;
        // || !isCheckedIn
        try {
          const today = new Date();
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
          // Updated query to get the most recent unchecked-out attendance
          const { data, error } = await withRetry(() => 
            supabase
              .from('extrahours')
              .select('id, check_in, check_out')
              .eq('user_id', localStorage.getItem('user_id'))
              .gte('check_in', startOfDay.toISOString())
              .lte('check_in', endOfDay.toISOString())
              .is('check_out', null)
              .order('check_in', { ascending: false })
              .limit(1)
              .single()
          );
  
          if (error) {
            if (error.code !== 'PGRST116') { // If no record exists, it's okay
              console.error('Error loading current Remote:', error);
            }
            return;
          }
    
          if (data) {
    
            if (data.check_out === null) {
              // User has an active session (not checked out)
              setisRemote(true);
              setRemoteID(data.id);
              setRemoteCheckIn(data.check_in)
            } else {
              // User has checked out
              setisRemote(false);
            }
          } else {
            // No record found means user is not checked in
            setisRemote(false);
            console.log('No attendance record found');
          }
        } catch (err) {
          console.error('Error in loadCurrentAttendance:', err);
          setError(handleSupabaseError(err));
        }
      };
    
      loadCurrentRemote();
    }, [user]);
  
  
  
    const loadRemoteRecords = async () => {
      if (!user) return;
    
      try {
        let startDate, endDate;
    
        switch (view) {
          case 'daily':
            startDate = format(selectedDate, 'yyyy-MM-dd');
            endDate = format(addMinutes(new Date(startDate), 24 * 60 - 1), 'yyyy-MM-dd');
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
    
        const { data: records, error: recordsError } = await withRetry(() => 
          supabase
            .from('extrahours')
            .select('*')
            .eq('user_id', localStorage.getItem('user_id'))
            .gte('check_in', `${startDate}T00:00:00Z`) // Corrected here
            .lt('check_in', `${endDate}T23:59:59Z`)  // Corrected here
            .order('check_in', { ascending: false })
        );
      
    
        if (recordsError) throw recordsError;
    
        if (records && records.length > 0) {
          setRemoteRecords(records);
    
          // Use the most recent attendance record to determine break status
          const latestRecord = records[0];
    
          // Load break records only for the latest attendance record
          const { data: Remotebreaks, error: breaksError }: { data: BreakRecord[], error: any } = await withRetry(() =>
            supabase
              .from('Remote_Breaks')
              .select('*')
              .eq('attendance_id', latestRecord.id)
              .order('start_time', { ascending: true })
          );
          
          if (breaksError) throw breaksError;
          
          const breakData: Record<string, BreakRecord[]> = {};
          if (breaks) {
            breakData[latestRecord.id] = Remotebreaks;
            
            // Check the last break for this attendance record
            const previousBreak = Remotebreaks[Remotebreaks.length - 1];
            if (previousBreak) {
              if (!previousBreak.end_time) {
                // If the last break has no end_time, user is still on break.
                setRemoteBreak(true);
                setRemoteBreakTime(previousBreak.start_time); // Record when the break started
              } else {
                // Otherwise, user is not on break.
                setRemoteBreak(false);
                setRemoteBreakTime('');
              }
            } else {
              // If no breaks exist for this attendance record, user is not on break.
              setRemoteBreak(false);
              setRemoteBreakTime('');
            }
          } else {
            // No break data for the latest attendance record
            setRemoteBreak(false);
            setRemoteBreakTime('');
          }
          
          setRemoteBreakRecords(breakData);
        } else {
          // No attendance records found for the period
          setRemoteRecords([]);
          setRemoteBreakRecords({});
          setRemoteBreak(false);
          setRemoteBreakTime('');
        }
      } catch (err) {
        console.error('Error loading attendance records:', err);
        setError(handleSupabaseError(err));
      }
    };
    
    useEffect(() => {
      loadRemoteRecords();
    }, [user, view, selectedDate]);
  
  
    const handleRemoteCheckIn = async () => {
      
      if (!user) {
        setError('User not authenticated');
        return;
      }
  
      try {
        setLoading(true);
        setError(null);
        
  
        const position = await getCurrentLocation();
        const { latitude, longitude } = position.coords;
      
        setCurrentLocation({ lat: latitude, lng: longitude });
        
        // const now = new Date();
        // const checkInTimeLimit = parse('09:30', 'HH:mm', now);
   
        // let attendanceStatus = 'present';
        // if (isAfter(now, checkInTimeLimit)) {
        //   attendanceStatus = 'late';
        // }
  
        const distance = calculateDistance(latitude, longitude, OFFICE_LATITUDE, OFFICE_LONGITUDE);
        // const mode = distance <= GEOFENCE_RADIUS ? 'on_site' : 'remote';
  
        const { data, error: dbError } = await withRetry(() =>
          supabase
            .from('extrahours')
            .insert([
              {
                user_id: localStorage.getItem('user_id'),
                check_in: now.toISOString(),
                // work_mode: mode,
                latitude,
                longitude,
                // status: attendanceStatus
              }
            ])
            .select()
            .single()
        );
        
        
  
        if (dbError) throw dbError;
  
        setisRemote(true);
        setRemoteCheckIn(now.toISOString());
        // setWorkMode(mode);
        setRemoteID(data.id);
        await loadRemoteRecords();
      } catch (err) {      
        setError(handleSupabaseError(err));
      } finally {
        setLoading(false);
      }
    };
  
    const handleRemoteCheckOut = async () => {
      if (!user || !attendanceId) {
        setError('No active attendance record found');
        return;
      }
  
      try {
        setLoading(true);
        setError(null);
  
        const now = new Date();
  
        // First, end any ongoing breaks
        if (isOnBreak) {
          const { error: breakError }: { error: any } = await withRetry(() =>
            supabase
              .from('Remote_Breaks')
              .update({ 
                end_time: now.toISOString(),
                status: 'on_time'
              })
              .eq('Remote_Id', RemoteID)
              .is('end_time', null)
          );
  
          if (breakError) throw breakError;
  
          setRemoteBreak(false);
          setRemoteBreakTime(null);
        }
  
        // Then update the attendance record with check-out time
        const { error: dbError }: { error: any } = await withRetry(() =>
          supabase
            .from('extrahours')
            .update({ 
              check_out: now.toISOString()
            })
            .eq('id', RemoteID)
            .is('check_out', null)
        );
  
        if (dbError) throw dbError;
  
        // Reset all states
        setisRemote(false);
        setRemoteCheckIn('');
        // setWorkMode(null);
        setRemoteID('');
  
        // Reload attendance records to show the updated data
        await loadRemoteRecords();
      } catch (err) {
        setError(handleSupabaseError(err));
      } finally {
        setLoading(false);
      }
    };
  
    const handleRemoteBreak = async () => {
      if (!RemoteID) {
        setError('No active Remote record found');
        return;
      }
  
      try {
        setLoading(true);
        setError(null);
  
        const now = new Date();
        const breakEndLimit = parse('14:10', 'HH:mm', now);
        
        if (!RemoteBreak) {
          // Starting break
          const { error: dbError } = await withRetry(() =>
            supabase
              .from('Remote_Breaks')
              .insert([
                {
                 Remote_Id: RemoteID,
                  start_time: now.toISOString(),
                  status: 'on_time'
                }
              ])
          );
  
          if (dbError) throw dbError;
  
          setRemoteBreak(true);
          setRemoteBreakTime(now.toISOString());
        } else {
          // Ending break
          let breakStatus = 'on_time';
          if (isAfter(now, breakEndLimit)) {
            breakStatus = 'late';
          }
  
          const { error: dbError } = await withRetry(() =>
            supabase
              .from('Remote_Breaks')
              .update({ 
                end_time: now.toISOString(),
                status: breakStatus
              })
              .eq('Remote_Id', RemoteID)
              .is('end_time', null)
          );
  
          if (dbError) throw dbError;
  
          setRemoteBreak(false);
          setRemoteBreakTime(null);
        }
        await loadRemoteRecords();
      } catch (err) {
        setError(handleSupabaseError(err));
      } finally {
        setLoading(false);
      }
    };
  

    const renderRemoteAttendance = () => {
        return (
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold">OverTime Records</h2>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setView('daily')}
                    className={`px-3 py-1 rounded-lg ${
                      view === 'daily' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setView('weekly')}
                    className={`px-3 py-1 rounded-lg ${
                      view === 'weekly' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setView('monthly')}
                    className={`px-3 py-1 rounded-lg ${
                      view === 'monthly' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>
    
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedDate(prev => {
                    switch (view) {
                      case 'daily':
                        return addMinutes(prev, -24 * 60);
                      case 'weekly':
                        return addMinutes(prev, -7 * 24 * 60);
                      case 'monthly':
                        return addMinutes(prev, -30 * 24 * 60);
                    }
                  })}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-medium">
                  {format(selectedDate, view === 'daily' ? 'MMMM d, yyyy' : 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => setSelectedDate(prev => {
                    switch (view) {
                      case 'daily':
                        return addMinutes(prev, 24 * 60);
                      case 'weekly':
                        return addMinutes(prev, 7 * 24 * 60);
                      case 'monthly':
                        return addMinutes(prev, 30 * 24 * 60);
                    }
                  })}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
    
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Mode</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breaks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {RemoteRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(record.check_in), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(record.check_in), 'hh:mm a')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.check_out ? format(new Date(record.check_out), 'hh:mm a') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            record.status === 'present'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            record.work_mode === 'on_site'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {record.work_mode}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {RemoteBreakRecords[record.id]?.map((RemoteBreakRecord, index) => (
                            <div key={RemoteBreakRecord.id} className="mb-1">
                              <span className="text-gray-600">Break {index + 1}: </span>
                              {format(new Date(RemoteBreakRecord.start_time), 'hh:mm a')}
                              {RemoteBreakRecord.end_time && (
                                <> - {format(new Date(RemoteBreakRecord.end_time), 'hh:mm a')}</>
                              )}
                              {RemoteBreakRecord.status && (
                                <span className={`ml-2 px-2 text-xs rounded-full ${
                                    RemoteBreakRecord.status === 'on_time'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {RemoteBreakRecord.status}
                                </span>
                              )}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      };




return(
    <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Clock className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold">Remote Hours </h2>
            </div>
            {workMode && (
              <span className={`px-3 py-1 rounded-full text-sm ${
                workMode === 'on_site' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {workMode === 'on_site' ? 'On-site' : 'Remote'}
              </span>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}


          {/* {isDisabled && <span className="text-red-600 p-2 ">You are on Leave Today</span>} */}


          {isCheckedIn ? (
            <div className="space-y-4">
              <p className="text-gray-600">
                Checked in at: {checkInTime && format(new Date(checkInTime), 'hh:mm a')}
              </p>
              <button
                onClick={handleRemoteCheckOut}
                disabled={loading}
                className="w-full flex items-center justify-center bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <LogOut className="w-5 h-5 mr-2" />
                {loading ? 'Checking out...' : 'Check Out'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleRemoteCheckIn}
              disabled={loading || isDisabled} // Button is disabled if loading or if the condition is met
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Checking in...' : 'Check In'}
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <Coffee className="w-6 h-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold">Break Time</h2>
          </div>

          {isCheckedIn && (
            <>
              {breakStartTime && (
                <p className="text-gray-600 mb-4">
                  Break started at: {format(new Date(breakStartTime), 'hh:mm a')}
                </p>
              )}
              
              <button
                onClick={handleRemoteBreak}
                disabled={loading}
                className={`w-full py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isOnBreak
                    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                } disabled:opacity-50`}
              >
                {loading ? 'Updating...' : isOnBreak ? 'End Break' : 'Start Break'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
)
}
export default ExtraHours;