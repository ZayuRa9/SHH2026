import React from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from "recharts";
import { AttendanceRecord, WeekActivity } from "../types";
import { BarChart3, PieChart as PieIcon, LineChart as LineIcon } from "lucide-react";

interface AdminChartProps {
  weeks: WeekActivity[];
  attendance: AttendanceRecord[];
}

export const AdminChart: React.FC<AdminChartProps> = ({ weeks, attendance }) => {
  // 1. Process data for Weekly attendance
  const weekData = weeks.map(w => {
    const studentCount = attendance.filter(a => 
      Array.isArray(a.weeksAttended) && a.weeksAttended.includes(w.weekNumber)
    ).length;
    
    return {
      name: `Tuần ${w.weekNumber}`,
      "Sĩ số": studentCount,
      theme: w.theme
    };
  }).sort((a, b) => {
    const numA = parseInt(a.name.replace("Tuần ", "")) || 0;
    const numB = parseInt(b.name.replace("Tuần ", "")) || 0;
    return numA - numB;
  });

  // 2. Process data for Quarter / Khu phố attendance
  const quarterMap: Record<string, number> = {};
  attendance.forEach(a => {
    const q = (a.quarter || "Khác").trim();
    quarterMap[q] = (quarterMap[q] || 0) + 1;
  });

  const quarterData = Object.entries(quarterMap).map(([name, count]) => ({
    name,
    "Học sinh": count
  })).sort((a, b) => b["Học sinh"] - a["Học sinh"]);

  // Colorful palette for charts
  const COLORS = [
    "#38bdf8", // sky-400
    "#34d399", // emerald-400
    "#fbbf24", // amber-400
    "#f87171", // red-400
    "#c084fc", // purple-400
    "#fb923c", // orange-400
    "#60a5fa", // blue-400
    "#22d3ee", // cyan-400
    "#a7f3d0"  // emerald-200
  ];

  const totalRegisteredCount = attendance.length;

  return (
    <div id="admin-analytics-section" className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8 relative z-10">
      
      {/* CARD 1: WEEKLY ATTENDANCE CHART */}
      <div className="bg-slate-900/60 p-5 md:p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-400" />
              <span>Thống Kê Đăng Ký Theo Tuần Sinh Hoạt</span>
            </h4>
            <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Thời gian thực
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-6 font-sans">
            Số lượng các bé thiếu nhi đã đăng ký tham gia chuyên cần phân tách theo từng tuần cụ thể.
          </p>
        </div>

        <div className="h-64 sm:h-72 w-full">
          {weekData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 font-sans">
              Chưa có dữ liệu học viên đăng ký tuần
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weekData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: "#0f172a", 
                    borderColor: "#334155", 
                    borderRadius: "12px",
                    color: "#f8fafc",
                    fontSize: "12px"
                  }}
                  itemStyle={{ color: "#38bdf8" }}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Bar 
                  dataKey="Sĩ số" 
                  fill="url(#colorWeeklySiso)" 
                  radius={[6, 6, 0, 0]}
                >
                  {weekData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="colorWeeklySiso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* CARD 2: QUARTER / KHU PHỐ PIE CHART */}
      <div className="bg-slate-900/60 p-5 md:p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-emerald-400" />
              <span>Cơ Cấu Thiếu Nhi Theo Khu Phố</span>
            </h4>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Đoàn kết
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-6 font-sans">
            Tỷ lệ các bé tham dự từ các Khu phố thành viên trong toàn địa bàn phường Tân Hưng.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 h-64 sm:h-72 items-center">
          {quarterData.length === 0 ? (
            <div className="col-span-12 h-full flex items-center justify-center text-xs text-slate-500 font-sans">
              Chưa có thông tin điểm danh của các khu phố
            </div>
          ) : (
            <>
              <div className="sm:col-span-7 h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={quarterData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="Học sinh"
                    >
                      {quarterData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: "#0f172a", 
                        borderColor: "#334155", 
                        borderRadius: "12px",
                        color: "#f8fafc",
                        fontSize: "12px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Custom Legend to make it fit beautifully */}
              <div className="sm:col-span-5 flex flex-col gap-2 max-h-56 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {quarterData.slice(0, 6).map((item, index) => {
                  const percentage = totalRegisteredCount > 0 
                    ? Math.round((item["Học sinh"] / totalRegisteredCount) * 100) 
                    : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-slate-300 truncate font-sans font-medium">{item.name}</span>
                      </div>
                      <span className="text-slate-400 font-mono font-bold">
                        {item["Học sinh"]} em ({percentage}%)
                      </span>
                    </div>
                  );
                })}
                {quarterData.length > 6 && (
                  <div className="text-[10px] text-slate-500 italic pl-4">
                    + {quarterData.length - 6} khu phố khác...
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
};
