import React, { useState, useEffect } from "react";
import { supabase } from '../lib/supabase';
import { startOfMonth, endOfMonth } from "date-fns";

const AbsenteeComponent = ({selectedDate}) => {
  const [absenteeData, setAbsenteeData] = useState<any[]>([]);
  const [loading , setloading] = useState(false);

  const today =  selectedDate;
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);



  const FetchAbsenteeData = async () => {
    try {
      // Fetch absentee records for today for all users at once
      setloading(true)
      const { data: absenteeRecords, error: absenteeError } = await supabase
        .from('absentees')
        .select('*')
        .eq('user_id', localStorage.getItem('user_id'))
        .gte('absentee_date', monthStart.toISOString().split('T')[0])
        .lte('absentee_date', monthEnd.toISOString().split('T')[0])

        // .gte('created_at', startOfDay)
        // .lt('created_at', endOfDay);
        console.log("absenteeRecords" , absenteeRecords);
        

      if (absenteeError) throw absenteeError;
      setloading(false)

      // Set the fetched absentee records into state
      setAbsenteeData(absenteeRecords || []);
    } catch (error) {
      console.error("Error fetching absentee data:", error);
    }
    setloading(false)
  };

  useEffect(() => {
    FetchAbsenteeData();
  }, []);
  

  return (
    <div>
      {loading ? (
        <p className="text-center text-gray-500"> Loading ....</p>
      ) : absenteeData.length === 0 ? (
        <p className="text-center text-gray-500">No Absentee Record Found</p>
      ) : 
      <div className="flex flex-col items-center justify-between">
        <div className="grid grid-cols-3 gap-14 bg-gray-50 rounded-lg p-4 w-full">
          <div>
            <h3 className="text-sm font-medium text-gray-500 text-left mb-3">Date</h3>
            <span className="font-sm">
              {absenteeData.map((absentee: any, index: number) => (
                <div key={index}>
                  <p className="text-gray-700">
                    {new Date(absentee.absentee_date).toLocaleString('en-us', {
                      month: 'short',
                      year: 'numeric',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              ))}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 text-left ml-4 mb-3">Type</h3>
            <span className="font-sm">
              {absenteeData.map((absentee: any, index: number) => (
                <div key={index}>
                  <p className="text-gray-700 ml-4">{absentee.absentee_type}</p>
                </div>
              ))}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 text-left ml-4 mb-3">Timing</h3>
            <span className="font-sm">
              {absenteeData.map((absentee: any, index: number) => (
                <div key={index}>
                  <p className="text-gray-700 ml-4">{absentee.absentee_Timing}</p>
                </div>
              ))}
            </span>
          </div>
        </div>
      </div>
}
    </div>
  );
};

export default AbsenteeComponent;
