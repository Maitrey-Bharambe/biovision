'use client';
import { useState } from 'react';

/**
 * Metric picker + Hierarchy pickers + Slice + Dice + Pivot pickers.
 * Rendered above the cube; all values are pushed to the parent.
 */
export function ControlBar({ dims, state, setState }) {
  return (
    <div className="cube-controls">
      <Picker label="Metric" value={state.metric}
              options={(dims?.metrics || []).map(m => ({ v: m, label: prettyMetric(m) }))}
              onChange={v => setState(s => ({ ...s, metric: v }))}/>
      <Picker label="Gene level" value={state.gene_level}
              options={(dims?.gene_hierarchy || []).map(v => ({ v, label: v }))}
              onChange={v => setState(s => ({ ...s, gene_level: v }))}/>
      <Picker label="Time level" value={state.time_level}
              options={(dims?.time_hierarchy || []).map(v => ({ v, label: v }))}
              onChange={v => setState(s => ({ ...s, time_level: v }))}/>
      <Picker label="Disease level" value={state.disease_level}
              options={(dims?.disease_hierarchy || []).map(v => ({ v, label: v }))}
              onChange={v => setState(s => ({ ...s, disease_level: v }))}/>
    </div>
  );
}

/**
 * Modal-style panel that appears when the user clicks Slice / Dice.
 */
export function SliceDicePanel({ mode, dims, state, setState, onApply, onCancel }) {
  if (!mode) return null;
  const isDice = mode === 'dice';
  const [local, setLocal] = useState(() => ({
    genes: [...(state.filters?.genes || [])],
    diseases: [...(state.filters?.diseases || [])],
    years: (state.filters?.years || []).map(String),
  }));

  const toggle = (key, v) => setLocal(s => ({
    ...s,
    [key]: s[key].includes(v) ? s[key].filter(x => x !== v) : [...s[key], v],
  }));

  const single = (key, v) => setLocal(s => ({ ...s, [key]: [v] }));

  return (
    <div className="cube-modal">
      <div className="cube-modal-head">
        <span className="text-cube-accent font-semibold">
          {isDice ? 'Dice · multi-axis filter' : 'Slice · fix one dimension'}
        </span>
        <button onClick={onCancel} className="cube-btn-ghost text-xs">Cancel</button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <FilterCol title="Gene"    values={dims?.genes || []}
                   picked={local.genes}
                   onPick={v => (isDice ? toggle('genes', v) : single('genes', v))}/>
        <FilterCol title="Disease" values={dims?.diseases || []}
                   picked={local.diseases}
                   onPick={v => (isDice ? toggle('diseases', v) : single('diseases', v))}/>
        <FilterCol title="Year"    values={(dims?.years || []).map(String)}
                   picked={local.years}
                   onPick={v => (isDice ? toggle('years', v) : single('years', v))}/>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-[11px] text-cube-muted">
          {isDice ? 'Pick any combination on any axis — only matching cells remain.' :
                     'Slice fixes one dimension. Pick a single value on any axis.'}
        </div>
        <button onClick={() => onApply(local)} className="cube-btn-primary">
          Apply {isDice ? 'Dice' : 'Slice'}
        </button>
      </div>
    </div>
  );
}

function FilterCol({ title, values, picked, onPick }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-cube-muted mb-1.5">{title}</div>
      <div className="cube-filter-list">
        {values.map(v => (
          <button key={v} onClick={() => onPick(v)}
                  className={`cube-filter-chip ${picked.includes(v) ? 'on' : ''}`}>
            <span className="dot"/> {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function Picker({ label, value, options, onChange }) {
  return (
    <label className="cube-picker">
      <span>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </label>
  );
}

function prettyMetric(m) {
  return {
    observation_count:  'Observations',
    avg_expression:     'Avg expression',
    avg_protein:        'Avg protein abundance',
    mutation_count:     'Mutation count',
    avg_cv_score:       'Avg CV score',
    avg_ml_confidence:  'Avg ML confidence',
  }[m] || m;
}

/* -------------------- Pivot picker ------------------------ */
export function PivotPanel({ state, onApply, onCancel }) {
  const [x, setX] = useState(state.x_dim || 'time');
  const [y, setY] = useState(state.y_dim || 'gene');
  const [z, setZ] = useState(state.z_dim || 'disease');
  const dims = ['time', 'gene', 'disease'];
  const bad = new Set([x, y, z]).size !== 3;
  return (
    <div className="cube-modal">
      <div className="cube-modal-head">
        <span className="text-cube-accent font-semibold">Pivot · re-assign axes</span>
        <button onClick={onCancel} className="cube-btn-ghost text-xs">Cancel</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[['X (horizontal)', x, setX], ['Y (vertical)', y, setY], ['Z (depth)', z, setZ]].map(([lab, val, set]) => (
          <label key={lab} className="cube-picker">
            <span>{lab}</span>
            <select value={val} onChange={e => set(e.target.value)}>
              {dims.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-3 text-xs text-cube-muted">
        Each axis must be a distinct dimension.
      </div>
      <div className="mt-3 flex justify-end">
        <button onClick={() => onApply({ x_dim: x, y_dim: y, z_dim: z })}
                disabled={bad}
                className="cube-btn-primary disabled:opacity-40">
          Apply Pivot
        </button>
      </div>
    </div>
  );
}

/* -------------------- Table fallback ---------------------- */
export function CubeTable({ axes, cells, metric }) {
  return (
    <div className="cube-panel">
      <div className="cube-panel-heading">Table view · same cells, no WebGL</div>
      <div className="overflow-auto">
        <table className="cube-table">
          <thead>
            <tr>
              <th>{axes.y.label}</th>
              <th>{axes.x.label}</th>
              <th>{axes.z.label}</th>
              <th>Observations</th>
              <th>Avg Expr</th>
              <th>Mutations</th>
              <th>Avg CV</th>
              <th>ML Conf.</th>
              <th>{metric.label}</th>
            </tr>
          </thead>
          <tbody>
            {cells.map((c, i) => (
              <tr key={i}>
                <td>{c.y_key}</td>
                <td>{c.x_key}</td>
                <td>{c.z_key}</td>
                <td className="tabular-nums">{c.observation_count}</td>
                <td className="tabular-nums">{c.avg_expression?.toFixed(2)}</td>
                <td className="tabular-nums">{c.mutation_count}</td>
                <td className="tabular-nums">{c.avg_cv_score?.toFixed(3)}</td>
                <td className="tabular-nums">{(c.avg_ml_confidence*100).toFixed(1)}%</td>
                <td className="tabular-nums font-semibold text-cube-accent">{c.metric?.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
