"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { useModalStore } from "@/store/modalStore";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

interface LevelData {
  level: number;
  totalPresent: number;
  dates: Array<{ date: string; presentCount: number }>;
}

export default function GraphicalAnalysisPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;
  const { showAlert } = useModalStore();

  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  // Month & Year state
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-indexed
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Data state
  const [monthName, setMonthName] = useState<string>("");
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [levelsData, setLevelsData] = useState<LevelData[]>([]);
  const [chartCategories, setChartCategories] = useState<string[]>([]);
  const [chartSeries, setChartSeries] = useState<any[]>([]);

  const monthsList = [
    { name: "Jan", full: "January", index: 0 },
    { name: "Feb", full: "February", index: 1 },
    { name: "Mar", full: "March", index: 2 },
    { name: "Apr", full: "April", index: 3 },
    { name: "May", full: "May", index: 4 },
    { name: "Jun", full: "June", index: 5 },
    { name: "Jul", full: "July", index: 6 },
    { name: "Aug", full: "August", index: 7 },
    { name: "Sep", full: "September", index: 8 },
    { name: "Oct", full: "October", index: 9 },
    { name: "Nov", full: "November", index: 10 },
    { name: "Dec", full: "December", index: 11 },
  ];

  const yearsList = [2023, 2024, 2025, 2026];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setCurrentUserRole(data.user?.role || "");
        }
      } catch (err) {
        console.error("Auth check failed", err);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAnalysis = async (y: number, m: number) => {
    if (!programId) return;
    setLoading(true);
    try {
      const monthStr = `${y}-${String(m + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/programs/${programId}/analysis?month=${monthStr}`);
      if (res.ok) {
        const data = await res.json();
        setMonthName(data.monthName);
        setYear(data.year);
        setLevelsData(data.levelsData || []);
        setChartCategories(data.chartData?.categories || []);
        setChartSeries(data.chartData?.series || []);
      } else {
        await showAlert({ title: "Fetch Failed", message: "Failed to fetch analysis data.", type: "danger" });
      }
    } catch (error) {
      console.error("Error fetching analysis:", error);
      await showAlert({ title: "Error", message: "An error occurred while fetching analysis.", type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((currentUserRole === "admin" || currentUserRole === "program_manager") && programId) {
      fetchAnalysis(selectedYear, selectedMonth);
    }
  }, [currentUserRole, programId]);

  const handleGenerateGraph = () => {
    setShowPicker(false);
    fetchAnalysis(selectedYear, selectedMonth);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A65353]"></div>
      </div>
    );
  }

  if (currentUserRole !== "admin" && currentUserRole !== "program_manager") {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-16 flex flex-col items-center justify-center max-w-lg text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">This Analysis section is restricted to Program Admins only.</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-[#A65353] text-white rounded-lg font-semibold hover:bg-[#8B4545] transition-colors cursor-pointer"
          >
            ← Go Back
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  const chartOptions: Highcharts.Options = {
    chart: {
      type: "column",
      backgroundColor: "transparent",
      style: {
        fontFamily: "inherit",
      },
    },
    title: {
      text: undefined,
    },
    xAxis: {
      categories: chartCategories.length > 0 ? chartCategories : ["No Sessions"],
      crosshair: true,
      labels: {
        style: {
          color: "#4B5563",
          fontWeight: "600",
        },
      },
    },
    yAxis: {
      min: 0,
      title: {
        text: "No. of Participants",
        style: {
          color: "#4B5563",
          fontWeight: "600",
        },
      },
      gridLineColor: "#F3F4F6",
    },
    tooltip: {
      headerFormat: '<span style="font-size:12px;font-weight:bold;">{point.key}</span><table>',
      pointFormat:
        '<tr><td style="color:{series.color};padding:0;font-weight:600;">{series.name}: </td>' +
        '<td style="padding:0;padding-left:8px;"><b>{point.y}</b></td></tr>',
      footerFormat: "</table>",
      shared: true,
      useHTML: true,
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#E5E7EB",
      borderRadius: 8,
      shadow: true,
    },
    plotOptions: {
      column: {
        pointPadding: 0.15,
        borderWidth: 0,
        borderRadius: 4,
      },
    },
    legend: {
      align: "center",
      verticalAlign: "bottom",
      layout: "horizontal",
      itemStyle: {
        color: "#4B5563",
        fontWeight: "600",
      },
    },
    credits: {
      enabled: false,
    },
    series: chartSeries.length > 0 ? chartSeries as any : [
      { name: "Level 1", data: [0], color: "#66B5FF", type: "column" },
      { name: "Level 2", data: [0], color: "#A5F36D", type: "column" },
      { name: "Level 3", data: [0], color: "#FF80B3", type: "column" },
      { name: "Level 4", data: [0], color: "#B380FF", type: "column" },
    ],
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: "url(/backgrou.png)",
        backgroundSize: "25%",
        backgroundRepeat: "repeat",
      }}
    >
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b-2 border-[#A65353] pb-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#A65353]">Graphical Analysis</h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 font-semibold cursor-pointer"
          >
            ← Back
          </button>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {/* Month Picker Box */}
          <div className="relative" ref={pickerRef}>
            <div
              onClick={() => setShowPicker(!showPicker)}
              className="flex items-center justify-between w-48 sm:w-56 px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm cursor-pointer hover:border-[#A65353] transition-colors"
            >
              <span className="font-semibold text-gray-800">
                {monthsList[selectedMonth].full}, {selectedYear}
              </span>
              <CalendarIcon className="w-5 h-5 text-gray-600" />
            </div>

            {/* Popup Calendar Dropdown */}
            {showPicker && (
              <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 p-4">
                {/* Years selector */}
                <div className="max-h-24 overflow-y-auto border-b border-gray-200 pb-2 mb-3 space-y-1">
                  {yearsList.map((y) => (
                    <div
                      key={y}
                      onClick={() => setSelectedYear(y)}
                      className={`px-3 py-1 rounded text-sm font-semibold cursor-pointer transition-colors ${
                        selectedYear === y
                          ? "bg-gray-200 text-gray-900 font-bold"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {y}
                    </div>
                  ))}
                </div>

                {/* Months grid */}
                <div className="grid grid-cols-4 gap-1.5 mb-4">
                  {monthsList.map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => setSelectedMonth(m.index)}
                      className={`py-1.5 rounded text-sm font-semibold cursor-pointer transition-colors ${
                        selectedMonth === m.index
                          ? "bg-[#007BFF] text-white shadow-md"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-sm font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      setSelectedYear(now.getFullYear());
                      setSelectedMonth(now.getMonth());
                    }}
                    className="text-[#007BFF] hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      setSelectedYear(now.getFullYear());
                      setSelectedMonth(now.getMonth());
                      setShowPicker(false);
                      fetchAnalysis(now.getFullYear(), now.getMonth());
                    }}
                    className="text-[#007BFF] hover:underline cursor-pointer"
                  >
                    This month
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerateGraph}
            disabled={loading}
            className="px-6 py-2.5 bg-[#A65353] text-white font-bold rounded-lg shadow-md hover:bg-[#8e4545] transition-colors cursor-pointer disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate Graph"}
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Textual Stats */}
          <div className="lg:col-span-5 bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-serif text-[#4F46E5] font-bold mb-6">
              Attendance Analysis of The Month {monthName} of {year}
            </h2>

            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#4F46E5]"></div>
              </div>
            ) : levelsData.length === 0 ? (
              <p className="text-gray-500 italic">No attendance records found for this month.</p>
            ) : (
              <div className="space-y-6">
                {levelsData.map((ld) => (
                  <div key={ld.level} className="border-b border-gray-200/60 pb-4 last:border-0 last:pb-0">
                    <p className="text-gray-900 font-bold text-base sm:text-lg mb-2">
                      Total {ld.totalPresent} Participants present in the Level {ld.level}
                    </p>
                    {ld.dates.length === 0 ? (
                      <p className="text-gray-500 text-sm ml-4 italic">No sessions scheduled/marked</p>
                    ) : (
                      <ul className="space-y-1.5 ml-4">
                        {ld.dates.map((d) => (
                          <li key={d.date} className="text-gray-700 text-sm sm:text-base flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block"></span>
                            <span>
                              <b>{d.presentCount}</b> Participants Present on {d.date}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Highcharts Chart */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header Banner */}
            <div className="bg-[#EDE9FE] py-3 px-6 text-center font-bold text-gray-800 text-lg border-b border-purple-100">
              {monthName} {year}
            </div>

            {/* Chart Body */}
            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#A65353]"></div>
                </div>
              ) : (
                <HighchartsReact highcharts={Highcharts} options={chartOptions} />
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
