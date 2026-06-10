"use client";

const months = ['AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY'];

const monthlyKmData = [728783, 730932, 740486, 733432, 619449, 569940];
const monthlyTripsData = [28612, 30879, 33838, 33008, 26765, 24560];
const overallRiskBarData = [29, 26, 26, 26, 26, 20];

const worstSpeedingDrivers = [
  { name: 'ZABAZENJODA ZWAKUTH', pct: 85.23 },
  { name: 'LEWIS NCEDILE MODLO', pct: 89.14 },
  { name: 'WANDILE ZINDLOVU', pct: 71.27 },
  { name: 'SAKHLE CEDRIC SIKAYI', pct: 79.62 },
  { name: 'Lusiko Lesley Ludiba', pct: 71.96 },
  { name: 'Senzo Wiseman Magagula', pct: 75.58 },
  { name: 'SIBONGISENI KOLWANA', pct: 79.80 },
  { name: 'IKAGENG MALEBANA', pct: 77.01 },
  { name: 'AMOS MOYESHAMA', pct: 79.22 },
  { name: 'XOLELO FONO', pct: 74.83 },
];

const pieColors = ['#c0392b', '#e74c3c', '#d35400', '#e67e22', '#f39c12', '#27ae60', '#2980b9', '#8e44ad', '#c0c0c0', '#7f8c8d'];

function SemiCircleGauge({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(value / max, 1);
  const angle = pct * 180;
  const radius = 90;
  const cx = 100;
  const cy = 100;

  const needleAngle = (180 - angle) * (Math.PI / 180);
  const needleX = cx + (radius - 10) * Math.cos(needleAngle);
  const needleY = cy - (radius - 10) * Math.sin(needleAngle);

  return (
    <svg viewBox="0 0 200 120" className="w-full h-auto">
      {/* Green zone (0-33%) */}
      <path d="M 10 100 A 90 90 0 0 1 55 18" fill="none" stroke="#27ae60" strokeWidth="20" />
      {/* Orange zone (33-66%) */}
      <path d="M 55 18 A 90 90 0 0 1 145 18" fill="none" stroke="#f39c12" strokeWidth="20" />
      {/* Red zone (66-100%) */}
      <path d="M 145 18 A 90 90 0 0 1 190 100" fill="none" stroke="#c0392b" strokeWidth="20" />
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#333" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="4" fill="#333" />
      {/* Value */}
      <text x={cx} y={cy - 10} textAnchor="middle" className="fill-gray-800 text-[18px] font-bold">
        {value}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" className="fill-gray-600 text-[8px] font-semibold">
        Overall Risk Score
      </text>
    </svg>
  );
}

function BarChart3D({ data, color, maxValue }: { data: number[]; color: string; maxValue: number }) {
  return (
    <div className="flex items-end justify-between gap-2 h-[180px] px-2">
      {data.map((val, i) => {
        const h = (val / maxValue) * 160;
        return (
          <div key={i} className="flex flex-col items-center flex-1">
            <span className="text-[9px] font-semibold text-gray-700 mb-0.5">{val.toLocaleString()}</span>
            <div className="relative w-full flex justify-center">
              <div
                className="w-8 rounded-t-sm"
                style={{
                  height: `${h}px`,
                  background: `linear-gradient(135deg, ${color} 0%, ${color}cc 50%, ${color}99 100%)`,
                  boxShadow: `2px 0 4px ${color}44, inset -2px 0 3px ${color}33`,
                }}
              />
            </div>
            <span className="text-[8px] text-gray-600 mt-1 font-medium">{months[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function PieChart3D({ data }: { data: typeof worstSpeedingDrivers }) {
  const total = data.reduce((s, d) => s + d.pct, 0);
  let cumAngle = -90;

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 120 120" className="w-[140px] h-[140px] shrink-0">
        {data.map((d, i) => {
          const angle = (d.pct / total) * 360;
          const startAngle = cumAngle;
          cumAngle += angle;
          const endAngle = cumAngle;

          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;

          const x1 = 60 + 50 * Math.cos(startRad);
          const y1 = 60 + 50 * Math.sin(startRad);
          const x2 = 60 + 50 * Math.cos(endRad);
          const y2 = 60 + 50 * Math.sin(endRad);

          const largeArc = angle > 180 ? 1 : 0;

          return (
            <path
              key={i}
              d={`M 60 60 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={pieColors[i]}
              stroke="#fff"
              strokeWidth="1"
            />
          );
        })}
      </svg>
      <div className="space-y-0.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[9px]">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: pieColors[i] }} />
            <span className="text-gray-700 font-medium uppercase">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExecDashTab() {
  return (
    <div className="min-h-[calc(100vh-200px)] bg-[#b8b8b8] p-4">
      {/* Top Row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Monthly Kilometres */}
        <div className="bg-[#d4d4d4] border border-[#a0a0a0] rounded-lg p-3 shadow-inner">
          <h3 className="text-center text-sm font-bold text-purple-800 mb-2">Monthly Kilometres</h3>
          <BarChart3D data={monthlyKmData} color="#c8a415" maxValue={800000} />
        </div>

        {/* Overall Risk Score Gauge */}
        <div className="bg-[#d4d4d4] border border-[#a0a0a0] rounded-lg p-3 shadow-inner flex flex-col items-center justify-center">
          <SemiCircleGauge value={20} />
        </div>

        {/* Top 10 Worst Speeding Drivers */}
        <div className="bg-[#d4d4d4] border border-[#a0a0a0] rounded-lg p-3 shadow-inner">
          <h3 className="text-center text-sm font-bold text-purple-800 mb-2">Top 10 Worst Speeding Drivers</h3>
          <PieChart3D data={worstSpeedingDrivers} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Number Of Trips */}
        <div className="bg-[#d4d4d4] border border-[#a0a0a0] rounded-lg p-3 shadow-inner">
          <h3 className="text-center text-sm font-bold text-purple-800 mb-2">Number Of Trips</h3>
          <BarChart3D data={monthlyTripsData} color="#7b2d8e" maxValue={35000} />
        </div>

        {/* Units Not Updating */}
        <div className="bg-[#d4d4d4] border border-[#a0a0a0] rounded-lg p-3 shadow-inner flex flex-col items-center justify-center">
          <div className="relative w-[140px] h-[140px]">
            <svg viewBox="0 0 140 140" className="w-full h-full">
              <circle cx="70" cy="70" r="65" fill="#6b2d8e" />
              <circle cx="70" cy="70" r="55" fill="#7b3d9e" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-bold text-white drop-shadow-lg">1</span>
            </div>
          </div>
          <p className="text-sm font-bold text-purple-800 mt-2">Units Not Updating</p>
        </div>

        {/* Overall Risk Score Bar */}
        <div className="bg-[#d4d4d4] border border-[#a0a0a0] rounded-lg p-3 shadow-inner">
          <h3 className="text-center text-sm font-bold text-purple-800 mb-2">Overall Risk Score</h3>
          <BarChart3D data={overallRiskBarData} color="#5fbfbf" maxValue={30} />
        </div>
      </div>
    </div>
  );
}
