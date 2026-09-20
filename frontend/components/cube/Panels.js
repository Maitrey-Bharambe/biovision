'use client';
import { useState } from 'react';

/* -------------------------- Operations panel ------------------------ */
export function OperationsPanel({ operation, onOp, onReset, onDemo, demoRunning }) {
  const OPS = [
    { id:'rollup',    label:'Roll-up',    hint:'Aggregate one level up the hierarchy' },
    { id:'drilldown', label:'Drill-down', hint:'Move to a finer hierarchy level' },
    { id:'slice',     label:'Slice',      hint:'Fix one dimension to a single value' },
    { id:'dice',      label:'Dice',       hint:'Filter a sub-cube on multiple axes' },
    { id:'pivot',     label:'Pivot',      hint:'Rotate the analytical perspective' },
  ];
  return (
    <div className="cube-panel">
      <div className="cube-panel-heading">OLAP Operations</div>
      <div className="space-y-2">
        {OPS.map(op => (
          <button key={op.id}
                  onClick={() => onOp(op.id)}
                  className={`cube-op-button ${operation === op.id ? 'active' : ''}`}>
            <span className="cube-op-label">{op.label}</span>
            <span className="cube-op-hint">{op.hint}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={onReset}
                className="flex-1 cube-btn-ghost">Reset cube</button>
        <button onClick={onDemo}
                className="flex-1 cube-btn-primary">
          {demoRunning ? '■ Stop' : '▶ Demo'}
        </button>
      </div>
    </div>
  );
}

/* -------------------------- Inspector panel ------------------------- */
export function InspectorPanel({ selected, hover, axes, metric, filters, stats }) {
  const showing = selected || hover;
  return (
    <div className="cube-panel">
      <div className="cube-panel-heading">Analytical Inspector</div>
      {showing ? (
        <div className="space-y-2 text-sm">
          <Row k={axes.y.label} v={showing.y_key}/>
          <Row k={axes.x.label} v={showing.x_key}/>
          <Row k={axes.z.label} v={showing.z_key}/>
          <div className="cube-divider"/>
          <Row k="Observations"     v={showing.observation_count}/>
          <Row k="Avg Expression"   v={showing.avg_expression?.toFixed?.(2)}/>
          <Row k="Mutation Count"   v={showing.mutation_count}/>
          <Row k="Avg CV Score"     v={showing.avg_cv_score?.toFixed?.(3)}/>
          <Row k="Avg ML Confidence" v={(showing.avg_ml_confidence * 100).toFixed?.(1) + '%'}/>
          <div className="cube-divider"/>
          <Row k={metric.label}     v={showing.metric?.toFixed?.(3)} accent/>
        </div>
      ) : (
        <div className="text-cube-muted text-xs">Hover or click a cell to inspect it.</div>
      )}

      <div className="cube-divider mt-4"/>
      <div className="cube-panel-heading mt-4">Applied filters</div>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(filters || {}).flatMap(([k, arr]) =>
          (arr || []).map((v, i) =>
            <span key={`${k}${i}`} className="cube-badge">{k.replace(/s$/,'')}: {v}</span>
          )
        )}
        {Object.values(filters || {}).every(arr => !arr?.length) &&
          <span className="text-cube-muted text-xs">— none —</span>}
      </div>

      <div className="cube-divider mt-4"/>
      <div className="cube-panel-heading mt-4">Cube stats</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat k="Cells" v={stats?.groups}/>
        <Stat k="Observations" v={stats?.observations}/>
        <Stat k="X × Y × Z" v={`${stats?.n_x}·${stats?.n_y}·${stats?.n_z}`}/>
        <Stat k="Rows" v={stats?.rows_returned}/>
      </div>
    </div>
  );
}

function Row({ k, v, accent }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-cube-muted">{k}</span>
      <span className={`tabular-nums ${accent ? 'text-cube-accent font-semibold' : 'text-cube-fg'}`}>
        {v ?? '—'}
      </span>
    </div>
  );
}
function Stat({ k, v }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-2">
      <div className="text-[10px] uppercase tracking-widest text-cube-muted">{k}</div>
      <div className="tabular-nums text-cube-fg font-semibold">{v ?? '—'}</div>
    </div>
  );
}

/* -------------------------- Query State ----------------------------- */
export function QueryStatePanel({ axes, metric, operation, filters, stats, insight, sql }) {
  const [showSql, setShowSql] = useState(false);
  const dimSummary = `${axes.y.label} → ${axes.x.label} × ${axes.z.label}`;
  const filterList = Object.entries(filters || {})
    .filter(([_, arr]) => arr?.length)
    .map(([k, arr]) => `${k}=${arr.join(',')}`).join('  ·  ');

  return (
    <div className="cube-query-state">
      <div className="flex flex-wrap items-start gap-4 text-xs">
        <Chip label="Operation" v={operation?.toUpperCase() || 'LOAD'}/>
        <Chip label="Dimensions" v={dimSummary}/>
        <Chip label="Aggregation" v={metric.sql}/>
        <Chip label="Filters" v={filterList || '(none)'}/>
        <Chip label="Records" v={`${stats?.observations ?? 0} observations · ${stats?.groups ?? 0} cells`}/>
        <button onClick={() => setShowSql(v => !v)} className="cube-btn-ghost text-[11px]">
          {showSql ? 'Hide SQL' : 'View SQL'}
        </button>
      </div>
      {insight && (
        <div className="mt-3 text-sm text-cube-fg/90 leading-snug">
          <span className="text-cube-accent mr-2">◆</span>{insight}
        </div>
      )}
      {showSql && (
        <pre className="mt-3 cube-sql">{sql}</pre>
      )}
    </div>
  );
}
function Chip({ label, v }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-cube-muted">{label}</div>
      <div className="text-cube-fg font-semibold whitespace-pre-wrap">{v}</div>
    </div>
  );
}

/* -------------------------- History --------------------------------- */
export function HistoryPanel({ history, onRestore }) {
  if (!history?.length) return null;
  return (
    <div className="cube-panel">
      <div className="cube-panel-heading">Query History</div>
      <ol className="space-y-1 text-xs">
        {history.map((h, i) => (
          <li key={i}>
            <button onClick={() => onRestore(i)}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 flex justify-between items-center">
              <span className="text-cube-fg">
                <span className="text-cube-muted mr-1">{String(i + 1).padStart(2,'0')}</span>
                {h.label}
              </span>
              <span className="text-cube-muted text-[10px]">{h.detail}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* -------------------------- Explanation ----------------------------- */
export function ExplanationCard({ operation }) {
  const map = {
    load:      { title: "Load", desc: "Initial cube: every fact aggregated at (Gene × Time × Disease)." },
    rollup:    { title: "Roll-up",    desc: "Aggregates data from a lower level of a hierarchy to a higher level." },
    drilldown: { title: "Drill-down", desc: "Moves from summarised data toward more detailed data." },
    slice:     { title: "Slice",      desc: "Selects one fixed value from a dimension — a cutting plane." },
    dice:      { title: "Dice",       desc: "Selects a sub-cube using multiple dimension filters." },
    pivot:     { title: "Pivot",      desc: "Rotates the dimensional perspective to analyse the data differently." },
  };
  const item = map[operation] || map.load;
  return (
    <div className="cube-panel !py-3">
      <div className="text-[10px] uppercase tracking-widest text-cube-muted">What is happening?</div>
      <div className="text-cube-accent font-semibold text-sm mt-1">{item.title}</div>
      <div className="text-cube-fg/85 text-xs leading-snug mt-1">{item.desc}</div>
    </div>
  );
}
