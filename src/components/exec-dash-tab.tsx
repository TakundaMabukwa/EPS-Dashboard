"use client";

const ALL_MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const pieColors = ['#c0392b', '#e74c3c', '#d35400', '#e67e22', '#f39c12', '#27ae60', '#2980b9', '#8e44ad', '#c0c0c0', '#7f8c8d'];

function SemiCircleGauge({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(value / max, 1);
  const angle = pct * 180;
  const cx = 100;
  const cy = 100;
  const needleAngle = (180 - angle) * (Math.PI / 180);
  const needleX = cx + 70 * Math.cos(needleAngle);
  const needleY = cy - 70 * Math.sin(needleAngle);

  return (
    <svg viewBox="0 0 200 115" className="w-full h-auto max-h-[180px]">
      <path d="M 15 100 A 85 85 0 0 1 58 22" fill="none" stroke="#27ae60" strokeWidth="18" />
      <path d="M 58 22 A 85 85 0 0 1 142 22" fill="none" stroke="#f39c12" strokeWidth="18" />
      <path d="M 142 22 A 85 85 0 0 1 185 100" fill="none" stroke="#c0392b" strokeWidth="18" />
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#333" strokeWidth="2.5" />
      <circle cx={cx} cy={cy} r="5" fill="#333" />
      <text x={cx} y={cy - 8} textAnchor="middle" className="fill-gray-800 text-[20px] font-bold">{value}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="fill-gray-500 text-[8px] font-semibold">Overall Risk Score</text>
    </svg>
  );
}

function MonthlyBarChart({ data, labels, color, maxValue }: { data: number[]; labels: string[]; color: string; maxValue: number }) {
  return (
    <div className="flex items-end justify-between gap-1 h-[160px] px-1 border-b border-gray-200">
      {data.map((val, i) => {
        const h = maxValue > 0 ? (val / maxValue) * 140 : 0;
        return (
          <div key={i} className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-[8px] font-semibold text-gray-600 mb-0.5">{val > 0 ? val.toLocaleString() : '0'}</span>
            <div className="relative w-full flex justify-center">
              <div
                className="w-7 rounded-t-sm"
                style={{
                  height: `${Math.max(h, val > 0 ? 4 : 0)}px`,
                  background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                  boxShadow: `1px 0 2px ${color}33`,
                }}
              />
            </div>
            <span className="text-[7px] text-gray-500 mt-1 font-medium text-center">{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function PieChart({ data, labels }: { data: number[]; labels: string[] }) {
  const total = data.reduce((s, d) => s + d, 0);
  if (total === 0) return <div className="text-xs text-gray-400 text-center py-4">No data</div>;
  let cumAngle = -90;

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 100 100" className="w-[130px] h-[130px] shrink-0">
        {data.map((val, i) => {
          const angle = (val / total) * 360;
          const startAngle = cumAngle;
          cumAngle += angle;
          const endAngle = cumAngle;
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;
          const x1 = 50 + 42 * Math.cos(startRad);
          const y1 = 50 + 42 * Math.sin(startRad);
          const x2 = 50 + 42 * Math.cos(endRad);
          const y2 = 50 + 42 * Math.sin(endRad);
          const largeArc = angle > 180 ? 1 : 0;
          return (
            <path
              key={i}
              d={`M 50 50 L ${x1} ${y1} A 42 42 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={pieColors[i % pieColors.length]}
              stroke="#fff"
              strokeWidth="0.8"
            />
          );
        })}
      </svg>
      <div className="space-y-1">
        {labels.map((label, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[9px]">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
            <span className="text-gray-700 font-medium uppercase truncate max-w-[120px]">{label}</span>
            <span className="text-gray-400 ml-auto">{((data[i] / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExecDashTab() {
  // Hardcoded July data
  const kmData = [0, 0, 0, 0, 0, 0, 80, 0, 0, 0, 0, 0];
  const avgRisk = 12;
  const speedLabels = ['L. Lehanya', 'S. Williams', 'L. Mdingi', 'S. Dumiso', 'V. Wogqoyi', 'T. Sigwili', 'L. Petersen', 'B. Ndabeni', 'M. Khaya', 'A. Leonard'];
  const speedValues = [8, 6, 5, 4, 3, 3, 2, 2, 1, 1];
  const tripLabels = ['COMPLETED', 'ON-TRIP', 'PENDING'];
  const tripValues = [2, 0, 0];
  const riskScoreData = [0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0];
  const unitsNotUpdating = 1;

  const maxKm = Math.max(...kmData, 1);
  const maxTrips = Math.max(...tripValues, 1);
  const maxRisk = Math.max(...riskScoreData, 1);

  return (
    <div className="space-y-4">
      {/* Top Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Monthly Kilometres */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-center text-sm font-bold text-purple-800 mb-3">Monthly Kilometres</h3>
          <MonthlyBarChart data={kmData} labels={ALL_MONTHS.map(m => m.substring(0, 3))} color="#c8a415" maxValue={maxKm} />
        </div>

        {/* Overall Risk Score Gauge */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center">
          <SemiCircleGauge value={avgRisk} />
        </div>

        {/* Top 10 Worst Speeding Drivers */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-center text-sm font-bold text-purple-800 mb-3">Top 10 Worst Speeding Drivers</h3>
          <PieChart data={speedValues} labels={speedLabels} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Number Of Trips */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-center text-sm font-bold text-purple-800 mb-3">Number Of Trips</h3>
          <MonthlyBarChart data={tripValues} labels={tripLabels.map(l => l.substring(0, 3))} color="#7b2d8e" maxValue={maxTrips} />
        </div>

        {/* Units Not Updating */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center">
          <div className="relative w-[120px] h-[120px]">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="46" fill="#6b2d8e" />
              <circle cx="50" cy="50" r="38" fill="#7b3d9e" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-white drop-shadow-lg">-</span>
            </div>
          </div>
          <p className="text-sm font-bold text-purple-800 mt-3">Units Not Updating</p>
        </div>

        {/* Overall Risk Score Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-center text-sm font-bold text-purple-800 mb-3">Overall Risk Score</h3>
          <MonthlyBarChart data={riskScoreData} labels={ALL_MONTHS.map(m => m.substring(0, 3))} color="#5fbfbf" maxValue={maxRisk} />
        </div>
      </div>
    </div>
  );
}
