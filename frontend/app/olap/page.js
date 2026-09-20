'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { OperationsPanel, InspectorPanel, QueryStatePanel, HistoryPanel, ExplanationCard }
  from '../../components/cube/Panels';
import { ControlBar, SliceDicePanel, PivotPanel, CubeTable }
  from '../../components/cube/ControlPickers';

// R3F needs to run only in the browser
const CubeScene = dynamic(() =>
  import('../../components/cube/CubeScene').then(m => m.CubeScene), { ssr: false });

/* Existing table-based OLAP subpages (Warehouse / AlphaGenome / CV) */
import { DomainOlap } from './DomainOlap';

const DEFAULT_STATE = {
  operation: 'load',
  gene_level: 'gene',
  time_level: 'year',
  disease_level: 'disease',
  x_dim: 'time', y_dim: 'gene', z_dim: 'disease',
  metric: 'observation_count',
  filters: { genes: [], chromosomes: [], diseases: [], years: [], tissues: [] },
};

export default function OlapPage() {
  const [view, setView] = useState('cube');
  return (
    <div>
      <PageHeader
        eyebrow="Live OLAP Cube"
        title="Interactive Multidimensional Data Warehouse Explorer"
        description="Every fact in FACT_BIOLOGICAL_OBSERVATION mapped into a 3-D cube. Roll-up, drill-down, slice, dice and pivot — each button issues a real SQL aggregation, each transition animates the analytical view."
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        <ViewTab active={view === 'cube'}   onClick={() => setView('cube')}  label="3D Cube"/>
        <ViewTab active={view === 'table'}  onClick={() => setView('table')} label="Table View"/>
        <ViewTab active={view === 'domain'} onClick={() => setView('domain')} label="Domain OLAP · Warehouse / AlphaGenome / CV"/>
      </div>

      {view === 'domain' ? <DomainOlap/> : <LiveCube tableOnly={view === 'table'}/>}
    </div>
  );
}

function ViewTab({ active, onClick, label }) {
  return (
    <button onClick={onClick}
            className={`px-4 py-2 text-sm rounded-full border ${
              active ? 'bg-deep text-white border-deep' : 'bg-white text-ink border-border'
            }`}>{label}</button>
  );
}

/* ================================================================== */
/*  LIVE CUBE                                                           */
/* ================================================================== */
function LiveCube({ tableOnly = false }) {
  const [state, setState]     = useState(DEFAULT_STATE);
  const [dims, setDims]       = useState(null);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(null);        // 'slice' | 'dice' | 'pivot' | null
  const [hover, setHover]     = useState(null);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [demoRunning, setDemoRunning] = useState(false);
  const [pivotKey, setPivotKey] = useState(0);
  const demoAbort = useRef(false);

  /* -------------------- data load --------------------- */
  useEffect(() => { api.cubeDimensions().then(setDims); }, []);

  const params = useMemo(() => ({
    operation:     state.operation,
    gene_level:    state.gene_level,
    time_level:    state.time_level,
    disease_level: state.disease_level,
    x_dim: state.x_dim, y_dim: state.y_dim, z_dim: state.z_dim,
    metric: state.metric,
    genes:       state.filters.genes.join(','),
    chromosomes: state.filters.chromosomes.join(','),
    diseases:    state.filters.diseases.join(','),
    years:       state.filters.years.join(','),
    tissues:     state.filters.tissues.join(','),
  }), [state]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.cube(params).then(r => { if (alive) { setData(r); setLoading(false); } });
    return () => { alive = false; };
  }, [params]);

  /* -------------------- operations --------------------- */
  const pushHistory = (label, detail) =>
    setHistory(h => [...h, { label, detail, snapshot: state }]);

  const runOp = useCallback((op) => {
    setSelected(null);
    if (op === 'rollup') {
      const UP = { gene: 'chromosome', chromosome: 'genome', genome: 'organism' };
      const next = UP[state.gene_level];
      if (!next) return;
      pushHistory('ROLL-UP', `Gene → ${next}`);
      setState(s => ({ ...s, operation: 'rollup', gene_level: next }));
    }
    else if (op === 'drilldown') {
      const DOWN = { organism: 'genome', genome: 'chromosome', chromosome: 'gene' };
      const next = DOWN[state.gene_level];
      if (!next) return;
      pushHistory('DRILL-DOWN', `${state.gene_level} → ${next}`);
      setState(s => ({ ...s, operation: 'drilldown', gene_level: next }));
    }
    else if (op === 'slice')  setModal('slice');
    else if (op === 'dice')   setModal('dice');
    else if (op === 'pivot')  setModal('pivot');
  }, [state]);

  const applySliceDice = (mode, local) => {
    pushHistory(mode.toUpperCase(), Object.entries(local).filter(([_,v]) => v.length).map(([k,v]) => `${k}=${v.join(',')}`).join(' · '));
    setState(s => ({
      ...s, operation: mode,
      filters: {
        ...s.filters,
        genes:    local.genes,
        diseases: local.diseases,
        years:    local.years.map(y => parseInt(y)).filter(Number.isFinite),
      },
    }));
    setModal(null);
  };

  const applyPivot = ({ x_dim, y_dim, z_dim }) => {
    pushHistory('PIVOT', `${state.x_dim}×${state.y_dim}×${state.z_dim} → ${x_dim}×${y_dim}×${z_dim}`);
    setState(s => ({ ...s, operation: 'pivot', x_dim, y_dim, z_dim }));
    setPivotKey(k => k + 1);
    setModal(null);
  };

  const restore = (i) => {
    setState(history[i].snapshot);
    setHistory(h => h.slice(0, i));
  };

  const reset = () => { setState(DEFAULT_STATE); setHistory([]); setSelected(null); setPivotKey(k=>k+1); };

  /* -------------------- demo mode --------------------- */
  const runDemo = async () => {
    if (demoRunning) { demoAbort.current = true; return; }
    setDemoRunning(true); demoAbort.current = false;
    reset();
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const steps = [
      { title: 'Load warehouse',   action: () => {} },
      { title: 'Roll-up gene → chromosome',
        action: () => setState(s => ({ ...s, operation: 'rollup', gene_level: 'chromosome' })) },
      { title: 'Drill-down chromosome → gene',
        action: () => setState(s => ({ ...s, operation: 'drilldown', gene_level: 'gene' })) },
      { title: 'Slice · Disease = Invasive Breast Carcinoma',
        action: () => setState(s => ({ ...s, operation: 'slice',
                                       filters: { ...s.filters, diseases:['Invasive Breast Carcinoma'] }})) },
      { title: 'Dice · TP53 / BRCA1 / EGFR × 2024–2025',
        action: () => setState(s => ({ ...s, operation: 'dice',
                                       filters: { ...s.filters,
                                                  genes: ['TP53','BRCA1','EGFR'],
                                                  years: [2024, 2025] }})) },
      { title: 'Pivot · gene × disease × time',
        action: () => { setState(s => ({ ...s, operation: 'pivot',
                                              x_dim: 'gene', y_dim: 'disease', z_dim: 'time' }));
                        setPivotKey(k => k + 1); } },
    ];
    for (const s of steps) {
      if (demoAbort.current) break;
      s.action();
      pushHistory('DEMO', s.title);
      await wait(3800);
    }
    setDemoRunning(false);
  };

  if (tableOnly) {
    if (!data) return <LoadingBox/>;
    return <CubeTable axes={data.axes} cells={data.cells} metric={data.metric}/>;
  }

  return (
    <>
      <ControlBar dims={dims} state={state} setState={setState}/>

      <div className="cube-root relative">
        <div className="grid grid-cols-12 gap-4">
          {/* LEFT: operations + history */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <OperationsPanel operation={state.operation} onOp={runOp}
                             onReset={reset} onDemo={runDemo} demoRunning={demoRunning}/>
            <ExplanationCard operation={state.operation}/>
            <HistoryPanel history={history} onRestore={restore}/>
          </div>

          {/* CENTER: 3-D cube */}
          <div className="col-span-12 lg:col-span-6">
            <div className="relative cube-canvas-wrap"
                 style={{ height: 580 }}>
              {loading && <LoadingBadge/>}
              {data && data.cells?.length ? (
                <CubeScene
                  axes={data.axes}
                  cells={data.cells}
                  metric={data.metric}
                  operation={state.operation}
                  slice={inferSlice(state, data)}
                  onHover={setHover}
                  onSelect={setSelected}
                  selected={selected}
                  pivotKey={pivotKey}
                />
              ) : (!loading && (
                <div className="w-full h-full flex flex-col items-center justify-center text-cube-muted">
                  <div className="text-sm">No warehouse observations match the current analytical filters.</div>
                  <button onClick={reset} className="cube-btn-ghost mt-3 text-xs">Reset cube</button>
                </div>
              ))}

              {/* Modals */}
              {modal === 'slice' && <SliceDicePanel mode="slice" dims={dims} state={state}
                                                     onApply={(l) => applySliceDice('slice', l)}
                                                     onCancel={() => setModal(null)}/>}
              {modal === 'dice'  && <SliceDicePanel mode="dice"  dims={dims} state={state}
                                                     onApply={(l) => applySliceDice('dice', l)}
                                                     onCancel={() => setModal(null)}/>}
              {modal === 'pivot' && <PivotPanel state={state} onApply={applyPivot}
                                                onCancel={() => setModal(null)}/>}
            </div>
            {data && <QueryStatePanel axes={data.axes} metric={data.metric}
                                       operation={state.operation}
                                       filters={data.filters}
                                       stats={data.stats}
                                       insight={data.insight}
                                       sql={data.sql}/>}
          </div>

          {/* RIGHT: inspector */}
          <div className="col-span-12 lg:col-span-3">
            {data && <InspectorPanel selected={selected} hover={hover}
                                       axes={data.axes} metric={data.metric}
                                       filters={data.filters} stats={data.stats}/>}
          </div>
        </div>
      </div>
    </>
  );
}

function inferSlice(state, data) {
  // Show a translucent cutting plane when a single value is filtered on one dim
  const activeSlice = state.operation === 'slice';
  if (!activeSlice) return null;
  const { filters } = state;
  const single = (arr) => arr && arr.length === 1;
  if (single(filters.diseases) && data.axes.z.dim === 'disease') {
    const idx = data.axes.z.values.indexOf(filters.diseases[0]);
    if (idx >= 0) return { dim: 'z', index: idx };
  }
  if (single(filters.genes) && data.axes.y.dim === 'gene') {
    const idx = data.axes.y.values.indexOf(filters.genes[0]);
    if (idx >= 0) return { dim: 'y', index: idx };
  }
  if (single(filters.years) && data.axes.x.dim === 'time') {
    const idx = data.axes.x.values.indexOf(String(filters.years[0]));
    if (idx >= 0) return { dim: 'x', index: idx };
  }
  return null;
}

function LoadingBox() {
  return <div className="text-cube-muted text-sm p-6">Loading warehouse cube…</div>;
}
function LoadingBadge() {
  return (
    <div className="absolute top-3 right-3 z-20 text-[10px] px-2 py-1 rounded-full bg-white/10 text-cube-accent border border-white/10">
      loading…
    </div>
  );
}
