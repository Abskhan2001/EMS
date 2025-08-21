import React, { useState, useEffect } from "react";
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { BarChart } from 'lucide-react';
import { startOfMonth, endOfMonth } from "date-fns";


interface AbsenteeComponentAdminProps {
  userID: string;
}

const AbsenteeComponentAdmin: React.FC<AbsenteeComponentAdminProps> = ({ userID }) => {
  const [absenteeData, setAbsenteeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();

  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const FetchAbsenteeData = async () => {
    try {
      const { data: absenteeRecords, error } = await supabase
        .from('absentees')
        .select('*')
        .eq('user_id', userID)
        .gte('absentee_date', monthStart.toISOString().split('T')[0])
        .lte('absentee_date', monthEnd.toISOString().split('T')[0]);



      if (error) throw error;

      setAbsenteeData(absenteeRecords || []);
      console.log("Fetched absentee data:", absenteeRecords);

    } catch (error) {
      console.error("Error fetching absentee data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    FetchAbsenteeData();
  }, []);

  return (
    <div className="lg:col-span-3 bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <BarChart className="w-6 h-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold">Absentees Details - {format(new Date(), 'MMMM yyyy')}</h2>
      </div>

      {loading ? (
        <p className="text-center text-gray-600">Loading...</p>
      ) : absenteeData.length === 0 ? (
        <p className="text-center text-gray-600">No Absentee Records Found</p>
      ) : (
        <div className="flex flex-col items-center justify-between">
        <div className="grid grid-cols-3 gap-14 bg-gray-50 rounded-lg p-4 w-full">
          {/* Column 1: Date */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 text-left mb-3">Date</h3>
            {absenteeData.map((absentee, index) => {
              const [year, month, day] = absentee.absentee_date.split('-');
              const formattedDate = `${day}-${month}-${year}`;
      
              return (
                <p key={index} className="text-gray-700">{formattedDate}</p>
              );
            })}
          </div>
      
          {/* Column 2: Type */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 text-left mb-3">Type</h3>
            {absenteeData.map((absentee, index) => (
              <p key={index} className="text-gray-700">{absentee.absentee_type}</p>
            ))}
          </div>
      
          {/* Column 3: Timing */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 text-left mb-3">Timing</h3>
            {absenteeData.map((absentee, index) => (
              <p key={index} className="text-gray-700">{absentee.absentee_Timing}</p>
            ))}
          </div>
        </div>
      </div>
      
      )}
    </div>
  );
};

export default AbsenteeComponentAdmin;
