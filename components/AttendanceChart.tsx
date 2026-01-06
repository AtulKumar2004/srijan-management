'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, Award } from 'lucide-react';

interface AttendanceChartProps {
  monthlyData: { month: string; sessions: number }[];
  programData: { name: string; sessions: number }[];
  recentSessions: { date: string; program: string; status: string }[];
  totalSessions: number;
}

const COLORS = ['#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#cffafe'];

export default function AttendanceChart({ monthlyData, programData, recentSessions, totalSessions }: AttendanceChartProps) {
  // Format month for display
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-8 h-8 text-cyan-600" />
            <h3 className="text-lg font-semibold text-gray-700">Total Sessions</h3>
          </div>
          <p className="text-4xl font-bold text-cyan-700">{totalSessions}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-700">This Month</h3>
          </div>
          <p className="text-4xl font-bold text-green-700">
            {monthlyData[monthlyData.length - 1]?.sessions || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-8 h-8 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-700">Programs</h3>
          </div>
          <p className="text-4xl font-bold text-purple-700">{programData.length}</p>
        </div>
      </div>

      {/* Monthly Attendance Line Chart */}
      {monthlyData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Monthly Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                tickFormatter={formatMonth}
                stroke="#6b7280"
              />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                labelFormatter={formatMonth}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="sessions" 
                stroke="#0891b2" 
                strokeWidth={3}
                dot={{ fill: '#0891b2', r: 5 }}
                activeDot={{ r: 7 }}
                name="Sessions Attended"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Program-wise Attendance Bar Chart */}
      {programData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Sessions by Program</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={programData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar 
                dataKey="sessions" 
                fill="#0891b2"
                name="Sessions Attended"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Sessions List */}
      {recentSessions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Sessions</h3>
          <div className="space-y-3">
            {recentSessions.map((session, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                  <div>
                    <p className="font-semibold text-gray-800">{session.program}</p>
                    <p className="text-sm text-gray-600">{formatDate(session.date)}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  session.status === 'present' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalSessions === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-600 mb-2">No Attendance Records</h3>
          <p className="text-gray-500">Start attending sessions to see your progress here!</p>
        </div>
      )}
    </div>
  );
}
