'use client';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer,
  CartesianGrid, Area, AreaChart,
} from 'recharts';

export function RocCurve({ fpr = [], tpr = [], auc = 0 }) {
  if (!fpr.length) return <div className="text-muted text-sm">No ROC data.</div>;
  const data = fpr.map((x, i) => ({ fpr: x, tpr: tpr[i] }));
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <defs>
            <linearGradient id="rocFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#0ea5b7" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="#0ea5b7" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#b8dfe6"/>
          <XAxis type="number" dataKey="fpr" domain={[0, 1]}
                 label={{ value: 'False Positive Rate', position:'insideBottom', offset:-8, fill:'#5b7594', fontSize: 11 }}
                 stroke="#5b7594" fontSize={11}/>
          <YAxis type="number" dataKey="tpr" domain={[0, 1]}
                 label={{ value: 'True Positive Rate', angle:-90, position:'insideLeft', fill:'#5b7594', fontSize: 11 }}
                 stroke="#5b7594" fontSize={11}/>
          <Tooltip contentStyle={{ background:'white', border:'1px solid #b8dfe6', borderRadius: 12, fontSize: 12 }}
                   formatter={(v) => Number(v).toFixed(3)}/>
          <ReferenceLine segment={[{x:0,y:0},{x:1,y:1}]} stroke="#e56b8f" strokeDasharray="4 4"/>
          <Area type="monotone" dataKey="tpr" stroke="#0ea5b7" strokeWidth={2.5} fill="url(#rocFill)"/>
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-1 text-xs text-muted text-right">
        AUC = <span className="font-display font-semibold text-teal">{auc}</span>
      </div>
    </div>
  );
}
