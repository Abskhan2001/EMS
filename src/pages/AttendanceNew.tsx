import React from 'react';
import AttendanceTracker from '../components/AttendanceTracker';

const AttendanceNew: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Employee Attendance
          </h1>
          <p className="text-gray-600">
            Track your daily attendance with location-based check-in/check-out
          </p>
        </div>
        
        <div className="flex justify-center">
          <AttendanceTracker />
        </div>
      </div>
    </div>
  );
};

export default AttendanceNew;
