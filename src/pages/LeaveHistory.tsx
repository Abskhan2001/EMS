import React from "react";
import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useAppDispatch, useAppSelector } from '../hooks/redux.CustomHooks';
import { fetchLeaveRequests } from '../slices/leaveSlice';
interface LeaveRequestProps {
  setActiveComponent: React.Dispatch<React.SetStateAction<string>>;
}

const LeaveHistory: React.FC<LeaveRequestProps> = ({ setActiveComponent }) => {
   const dispatch = useAppDispatch();
   const user = useAppSelector((state) => state.auth.user);
   const { leaveRequests, loading, error } = useAppSelector((state) => state.leave);

   useEffect(() => {
    if (user) {
      // Fetch leave requests using Redux action
      dispatch(fetchLeaveRequests());
    }
   }, [user, dispatch]);




   return(
    <div>
       <div className="mb-4">
        <button onClick={() => setActiveComponent("default")} className="text-gray-600 hover:bg-gray-300 rounded-2xl
         translate-x-2 transition-transform ease-in-out duration-300 transform hover:scale-205">
          <ChevronLeft/>
        </button>
      </div>

    <div className="bg-white p-6 mt-5 rounded-lg shadow-sm h-full overflow-y-auto custom-scrollbar">
        <div className="space-y-4 text-gray-700 w-full px-3">
          <h1 className="text-2xl font-bold mb-7">Leaves History</h1>
        </div>
      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading leave requests...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-red-500">Error: {error}</p>
        </div>
      )}

      <div className="width-full break-words grid grid-cols-1 mt-6 md:grid-cols-2 gap-4">
        {leaveRequests.map((request: any) => (
          <div key={request._id} className="bg-gray-100 break-words p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              {request.leaveType}
            </h2>
            <p className="text-gray-600 break-words text-sm">
             <span className="text-gray-800">Request For : </span>
             {request.leaveDates
               ? request.leaveDates.map((date: string) => new Date(date).toDateString().split(' ').slice(1).join(' ')).join(', ')
               : request.startDate && request.endDate
                 ? `${new Date(request.startDate).toDateString().split(' ').slice(1).join(' ')} - ${new Date(request.endDate).toDateString().split(' ').slice(1).join(' ')}`
                 : 'N/A'
             }
            </p>
            <p className="text-gray-900">
             {request.reason}
            </p>
            <p className="text-gray-600 text-sm mt-1 mb-0">
              {new Date(request.createdAt).toDateString().split(' ').slice(1).join(' ')}
            </p>
            <p>
              <span
                 className={`${
                   request.status === "pending" ? "text-yellow-600 mt-0" :
                   request.status === "approved" ? "text-green-600 mt-0" :
                   request.status === "cancelled" ? "text-gray-600 mt-0" :
                   "text-red-600 mt-0"
                }`}
              >
                {request.status || 'pending'}
               </span>
            </p>
            {request.rejectionReason && (
              <p className="text-red-600 text-sm mt-1">
                <strong>Rejection Reason:</strong> {request.rejectionReason}
              </p>
            )}
          </div>
        ))}
      </div>

      {!loading && leaveRequests.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No leave requests found.</p>
        </div>
      )}
    </div>
    </div>
)
};


export default LeaveHistory;
