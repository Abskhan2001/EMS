import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  getCurrentAttendance,
  performCheckIn,
  performCheckOut,
  checkUserLocation,
  getCurrentLocation,
} from '../slices/attendanceSlice';
import { fetchOrganizationLocation } from '../slices/organizationLocationSlice';
import { Clock, MapPin, Wifi, WifiOff, CheckCircle, XCircle } from 'lucide-react';
import Swal from 'sweetalert2';

const AttendanceTracker: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notes, setNotes] = useState('');

  // Redux state
  const {
    currentAttendance,
    attendanceStatus,
    locationStatus,
    isLoading,
    isCheckingLocation,
    isCheckingIn,
    isCheckingOut,
    error,
  } = useSelector((state: RootState) => state.attendance);

  const { location: organizationLocation } = useSelector(
    (state: RootState) => state.organizationLocation
  );

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load initial data
  useEffect(() => {
    dispatch(getCurrentAttendance());
    dispatch(fetchOrganizationLocation());
  }, [dispatch]);

  // Format time display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Handle check-in
  const handleCheckIn = async () => {
    try {
      const result = await dispatch(performCheckIn(notes)).unwrap();
      
      if (result.workMode === 'remote') {
        const confirmRemote = await Swal.fire({
          title: 'Remote Check-in',
          text: "You are outside the office location. Your check-in will be marked as Remote. Do you want to proceed?",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Yes, check in remotely',
          cancelButtonText: 'Cancel'
        });

        if (!confirmRemote.isConfirmed) {
          return;
        }
      }

      Swal.fire({
        title: 'Success!',
        text: `Checked in successfully as ${result.workMode === 'on_site' ? 'On-site' : 'Remote'}`,
        icon: 'success',
        confirmButtonColor: '#10B981',
      });

      setNotes('');
    } catch (error: any) {
      Swal.fire({
        title: 'Error!',
        text: error || 'Failed to check in',
        icon: 'error',
        confirmButtonColor: '#EF4444',
      });
    }
  };

  // Handle check-out
  const handleCheckOut = async () => {
    if (!currentAttendance?._id) {
      Swal.fire({
        title: 'Error!',
        text: 'No active attendance record found',
        icon: 'error',
        confirmButtonColor: '#EF4444',
      });
      return;
    }

    const confirmCheckOut = await Swal.fire({
      title: 'Confirm Check-out',
      text: 'Are you sure you want to check out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, check out',
      cancelButtonText: 'Cancel'
    });

    if (!confirmCheckOut.isConfirmed) {
      return;
    }

    try {
      await dispatch(performCheckOut({ 
        attendanceId: currentAttendance._id, 
        notes 
      })).unwrap();

      Swal.fire({
        title: 'Success!',
        text: 'Checked out successfully',
        icon: 'success',
        confirmButtonColor: '#10B981',
      });

      setNotes('');
    } catch (error: any) {
      Swal.fire({
        title: 'Error!',
        text: error || 'Failed to check out',
        icon: 'error',
        confirmButtonColor: '#EF4444',
      });
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (attendanceStatus) {
      case 'checked_in':
        return 'text-green-600';
      case 'checked_out':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  // Get work mode display
  const getWorkModeDisplay = () => {
    if (!currentAttendance) return null;
    
    return (
      <div className="flex items-center space-x-2">
        {currentAttendance.workMode === 'on_site' ? (
          <>
            <Wifi className="h-4 w-4 text-green-600" />
            <span className="text-green-600">On-site</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-orange-600" />
            <span className="text-orange-600">Remote</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Attendance Tracker</h2>
        <div className="text-3xl font-mono text-blue-600 mb-1">
          {formatTime(currentTime)}
        </div>
        <div className="text-sm text-gray-600">
          {formatDate(currentTime)}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Current Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <span className={`text-sm font-semibold ${getStatusColor()}`}>
            {attendanceStatus === 'not_checked_in' && 'Not Checked In'}
            {attendanceStatus === 'checked_in' && 'Checked In'}
            {attendanceStatus === 'checked_out' && 'Checked Out'}
          </span>
        </div>

        {currentAttendance && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Work Mode:</span>
              {getWorkModeDisplay()}
            </div>
            
            {currentAttendance.checkIn && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Check-in Time:</span>
                <span className="text-sm text-gray-600">
                  {new Date(currentAttendance.checkIn).toLocaleTimeString()}
                </span>
              </div>
            )}

            {currentAttendance.checkOut && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Check-out Time:</span>
                <span className="text-sm text-gray-600">
                  {new Date(currentAttendance.checkOut).toLocaleTimeString()}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Notes Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about your work day..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {attendanceStatus === 'not_checked_in' && (
          <button
            onClick={handleCheckIn}
            disabled={isCheckingIn || isLoading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
          >
            {isCheckingIn ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Checking In...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                <span>Check In</span>
              </>
            )}
          </button>
        )}

        {attendanceStatus === 'checked_in' && (
          <button
            onClick={handleCheckOut}
            disabled={isCheckingOut || isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
          >
            {isCheckingOut ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Checking Out...</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5" />
                <span>Check Out</span>
              </>
            )}
          </button>
        )}

        {attendanceStatus === 'checked_out' && (
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <CheckCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-blue-800 font-medium">
              You have completed your work day!
            </p>
            <p className="text-blue-600 text-sm mt-1">
              See you tomorrow!
            </p>
          </div>
        )}
      </div>

      {/* Location Status */}
      {isCheckingLocation && (
        <div className="mt-4 text-center text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-2"></div>
          Checking your location...
        </div>
      )}
    </div>
  );
};

export default AttendanceTracker;
