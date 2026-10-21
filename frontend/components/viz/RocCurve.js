'use client';
import {
  XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer,
  CartesianGrid, Area, AreaChart,
} from 'recharts';

export function RocCurve({ fpr = [], tpr = [], auc = 0 }) {
  if (!fpr.length) return <div className="meta">No ROC data.</div>;
  const data = fpr.map((x, i) => ({ fpr: x, tpr: tpr[i] }));
  const AXIS = { fontSize: 10, stroke: '#525252' };
  const TIP = { background:'#FFFFFF', border:'1px solid #111111', borderRadius: 0, fontSize: 11, fontFamily:'JetBrains Mono' };
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <defs>
            <linearGradient id="rocFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#111111" stopOpacity="0.18"/>
              <stop offset="100%" stopColor="#111111" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 2" stroke="#11111118"/>
          <XAxis type="number" dataKey="fpr" domain={[0, 1]}
                 label={{ value: 'FALSE POSITIVE RATE', position:'insideBottom', offset:-8, fill:'#525252', fontSize: 10, fontFamily:'Inter' }}
                 {...AXIS} axisLine={{ stroke:'#111' }} tickLine={false}/>
          <YAxis type="number" dataKey="tpr" domain={[0, 1]}
                 label={{ value: 'TRUE POSITIVE RATE', angle:-90, position:'insideLeft', fill:'#525252', fontSize: 10, fontFamily:'Inter' }}
                 {...AXIS} axisLine={{ stroke:'#111' }} tickLine={false}/>
          <Tooltip contentStyle={TIP} formatter={(v) => Number(v).toFixed(3)}/>
          <ReferenceLine segment={[{x:0,y:0},{x:1,y:1}]} stroke="#CC0000" strokeDasharray="4 4"/>
          <Area type="monotone" dataKey="tpr" stroke="#111111" strokeWidth={2} fill="url(#rocFill)"/>
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-1 meta !text-[10px] text-right">
        AUC = <span className="font-mono font-semibold text-ink">{auc}</span>
      </div>
    </div>
  );
}
