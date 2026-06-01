import React, { useMemo } from 'react';
import { useTelemetry } from '../stores/useTelemetry';
import {
 LineChart,
 Line,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 Legend,
 ResponsiveContainer,
} from 'recharts';

export const TelemetryChart: React.FC = () => {
 const history = useTelemetry((state) => state.history);

 const data = useMemo(() => {
 return history.map((h) => {
 const dp: any = { tick: h.tick };
 if (typeof h.asabiyyah === 'number') {
 dp.asabiyyah = h.asabiyyah;
 } else if (h.asabiyyah) {
 // Average Asabiyyah if per-civ
 const vals = Object.values(h.asabiyyah);
 dp.asabiyyah = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
 }
 if (h.cpr) {
 for (const [k, v] of Object.entries(h.cpr)) {
 dp[k] = Array.isArray(v) ? v.length : typeof v === 'object' ? Object.keys(v).length : v;
 }
 }
 return dp;
 });
 }, [history]);

 if (!data.length) return <div className="text-sm font-bold text-[#E7E1D5] p-4 uppercase">Waiting for telemetry...</div>;

 // Extract all CPR keys dynamically
 const keys = new Set<string>();
 if (history.length > 0 && history[history.length - 1].cpr) {
 Object.keys(history[history.length - 1].cpr!).forEach(k => keys.add(k));
 }

 const colors = ['#6C8BC4', '#B95D3D', '#C49A53', '#E7E1D5', '#8470A5'];

  return (
    <div className="w-full h-full min-h-[220px] pb-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 5, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#5E594F" vertical={false} opacity={0.2} />
          <XAxis dataKey="tick" stroke="#5E594F" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" stroke="#5E594F" fontSize={10} domain={[0, 1.2]} tickLine={false} axisLine={false} />
          <YAxis yAxisId="right" orientation="right" stroke="#5E594F" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#24231F', border: '1px solid #3B3A35', borderRadius: '4px', fontSize: '12px', boxShadow: '2px 2px 0px 0px rgba(44,42,37,1)' }}
            itemStyle={{ color: '#E7E1D5', fontWeight: 'bold' }}
          />
          <Legend 
            wrapperStyle={{ fontSize: 11, paddingTop: '15px', fontWeight: 'bold', color: '#E7E1D5' }} 
            iconType="circle" 
          />
          <Line
            yAxisId="left"
            type="stepAfter"
            dataKey="asabiyyah"
            stroke="#8D6AB0"
            strokeWidth={3}
            dot={false}
            isAnimationActive={false}
          />
          {Array.from(keys).map((key, i) => (
            <Line
              key={key}
              yAxisId="right"
              type="monotone"
              dataKey={key}
              stroke={key === 'resources' ? '#8A9F5A' : key === 'structures' ? '#C4904B' : key === 'wood' ? '#C49A53' : key === 'water' ? '#6C8BC4' : colors[(i + 1) % colors.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
