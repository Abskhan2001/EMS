// supabaseApi.ts
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '../lib/supabase';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isBefore,
} from 'date-fns';

export interface AbsenceResult {
  userId: string;
  month: string;
  absents: string[];
  total: number;
}

export interface AbsenceQueryArgs {
  userId: string;
  monthForAttendance: Date;
}

export const AttendenceAPI = createApi({
  reducerPath: 'supabaseApi',
  baseQuery: fakeBaseQuery(),
  endpoints: (builder) => ({
    fetchUserAbsentees: builder.query<AbsenceResult, AbsenceQueryArgs>({
      async queryFn({ userId, monthForAttendance }) {
        try {
          const monthStart = startOfMonth(monthForAttendance);
          const monthEnd = endOfMonth(monthForAttendance);
          const today = new Date();

          const allDays = eachDayOfInterval({
            start: monthStart,
            end: monthEnd,
          });

          // 🟢 Fetch holidays
          const { data: holidaysRaw, error: holidaysError } = await supabase
            .from('holidays')
            .select('dates');

          if (holidaysError) throw holidaysError;

          const holidayDates: string[] =
            holidaysRaw
              ?.flatMap((h) => h.dates || [])
              .map((d) => format(new Date(d), 'yyyy-MM-dd')) || [];

          // 🟢 Fetch attendance
          const { data: attendanceRecordsRaw, error: attendanceError } =
            await supabase
              .from('attendance_logs')
              .select('check_in')
              .eq('user_id', userId)
              .gte('check_in', monthStart.toISOString())
              .lte('check_in', monthEnd.toISOString());

          if (attendanceError) throw attendanceError;

          const attendanceRecords = attendanceRecordsRaw || [];

          // 🟢 Fetch absentees
          const { data: absenteesRaw, error: absenteesError } = await supabase
            .from('absentees')
            .select('created_at')
            .eq('user_id', userId)
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString());

          if (absenteesError) throw absenteesError;

          const absentees = absenteesRaw || [];

          const absents: string[] = [];

          // 🔁 Loop through each day
          for (const date of allDays) {
            const dayStr = format(date, 'yyyy-MM-dd');
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isPast = isBefore(date, today);
            const isHoliday = holidayDates.includes(dayStr);

            if (isWeekend || !isPast || isHoliday) continue;

            const hasAttendance = attendanceRecords.some(
              (a) => format(new Date(a.check_in), 'yyyy-MM-dd') === dayStr
            );

            const hasAbsentee = absentees.some(
              (a) => a.absentee_date === dayStr
            );

            if (!hasAttendance && !hasAbsentee) {
              absents.push(dayStr);
            }
          }

          return {
            data: {
              userId,
              month: format(monthForAttendance, 'yyyy-MM'),
              absents,
              total: absents.length,
            },
          };
        } catch (error: any) {
          return { error: { status: 500, message: error.message } };
        }
      },
    }),
  }),
});

export const { useFetchUserAbsenteesQuery } = AttendenceAPI;
export const fetchUserAbsentees = AttendenceAPI.endpoints.fetchUserAbsentees;
