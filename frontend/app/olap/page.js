'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

const AXIS = { fontSize: 11, stroke: '#5b7594' };
const TIP  = { background:'white', border:'1px solid #b8dfe6', borderRadius:12, fontSize:12, color:'#0a2540' };

const DOMAINS = ['Warehouse', 'AlphaGenome', 'Computer Vision'];

export default function OlapPage() {
  const [domain, setDomain] = useState('Warehouse');
  return (
    <div>
      <PageHeader
        eyebrow="Analytics"
        title="OLAP — slice every domain"
        description="Roll-up · drill-down · slice · dice — now over the star-schema warehouse, the AlphaGenome variant catalog, AND the Computer-Vision test set. Pick a domain, then pick an operation."
      />

      <div className="flex gap-2 mb-6 border-b border-border/60 flex-wrap">
        {DOMAINS.map(d => (
          <button key={d}
                  className={`px-4 py-2 text-sm border-b-2 ${
                    domain === d ? 'border-teal text-ink font-semibold' : 'border-transparent text-muted hover:text-ink'
                  }`}
                  onClick={() => setDomain(d)}>{d}</button>
        ))}
      </div>

      {domain === 'Warehouse'       && <WarehouseDomain />}
      {domain === 'AlphaGenome'     && <AlphaDomain />}
      {domain === 'Computer Vision' && <CvDomain />}
    </div>
  );
}

/* ================================================================ */
/*  Warehouse domain (existing OLAP)                                 */
/* ================================================================ */
function WarehouseDomain() {
  const [op, setOp] = useState('Roll-up');
  const [rows, setRows] = useState(null);
  const [level, setLevel] = useState('chromosome');
  const [drill, setDrill] = useState({});
  const [disease, setDisease] = useState('Invasive Breast Carcinoma');
  const [chrom, setChrom] = useState('17');
  const [cat, setCat] = useState('HIGH');

  const OPS = ['Roll-up', 'Drill-down', 'Slice', 'Dice'];

  useEffect(() => { setRows(null); }, [op]);

  const run = async () => {
    let data;
    if (op === 'Roll-up')    data = await api.olapRollup(level);
    if (op === 'Drill-down') {
      const q = Object.entries(drill).filter(([_,v])=>v).map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&');
      data = await api.olapDrill(q);
    }
    if (op === 'Slice')      data = await api.olapSlice(disease);
    if (op === 'Dice')       data = await api.olapDice(disease, chrom, cat);
    setRows(data);
  };

  return (
    <>
      <div className="flex gap-2 mb-4 flex-wrap">
        {OPS.map(o => (
          <button key={o}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    op === o ? 'bg-deep text-white border-deep' : 'bg-white text-ink border-border'
                  }`}
                  onClick={() => setOp(o)}>{o}</button>
        ))}
      </div>

      <Card title={`Configure — ${op}`} className="mb-6">
        {op === 'Roll-up' && (
          <div className="flex flex-wrap items-center gap-3">
            <PickerLabel label="Level">
              <select value={level} onChange={e=>setLevel(e.target.value)}
                      className="bg-white border border-border rounded-xl px-3 py-2 text-sm">
                <option value="gene">gene</option>
                <option value="chromosome">chromosome</option>
                <option value="genome">genome</option>
              </select>
            </PickerLabel>
            <button className="btn" onClick={run}>Run</button>
          </div>
        )}
        {op === 'Drill-down' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <PickerLabel label="Disease">
              <select onChange={e=>setDrill(f=>({...f, disease:e.target.value}))}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm">
                <option value="">any</option>
                <option>Invasive Breast Carcinoma</option>
                <option>Lung Adenocarcinoma</option>
                <option>Colon Adenocarcinoma</option>
                <option>Cutaneous Melanoma</option>
                <option>Glioblastoma Multiforme</option>
                <option>Ovarian Serous Cystadenocarcinoma</option>
                <option>Healthy Control</option>
              </select>
            </PickerLabel>
            <PickerLabel label="Tissue">
              <select onChange={e=>setDrill(f=>({...f, tissue:e.target.value}))}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm">
                <option value="">any</option>
                {['Breast','Lung','Colon','Skin','Brain','Ovary','Blood'].map(t => <option key={t}>{t}</option>)}
              </select>
            </PickerLabel>
            <PickerLabel label="Gene">
              <select onChange={e=>setDrill(f=>({...f, gene:e.target.value}))}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm">
                <option value="">any</option>
                {['TP53','BRCA1','BRCA2','EGFR','KRAS','MYC','PTEN','APC','RB1','MLH1','BRAF','VHL','NF1','PIK3CA','CDKN2A','ATM','CDH1','SMAD4','IDH1','NRAS'].map(g => <option key={g}>{g}</option>)}
              </select>
            </PickerLabel>
            <button className="btn justify-center" onClick={run}>Drill down</button>
          </div>
        )}
        {op === 'Slice' && (
          <div className="flex items-center gap-3 flex-wrap">
            <PickerLabel label="Disease">
              <select value={disease} onChange={e=>setDisease(e.target.value)}
                      className="bg-white border border-border rounded-xl px-3 py-2 text-sm">
                <option>Invasive Breast Carcinoma</option>
                <option>Lung Adenocarcinoma</option>
                <option>Colon Adenocarcinoma</option>
                <option>Cutaneous Melanoma</option>
                <option>Glioblastoma Multiforme</option>
                <option>Ovarian Serous Cystadenocarcinoma</option>
              </select>
            </PickerLabel>
            <button className="btn" onClick={run}>Slice</button>
          </div>
        )}
        {op === 'Dice' && (
          <div className="flex flex-wrap items-center gap-3">
            <PickerLabel label="Disease">
              <select value={disease} onChange={e=>setDisease(e.target.value)}
                      className="bg-white border border-border rounded-xl px-3 py-2 text-sm">
                <option>Invasive Breast Carcinoma</option>
                <option>Lung Adenocarcinoma</option>
                <option>Colon Adenocarcinoma</option>
                <option>Cutaneous Melanoma</option>
              </select>
            </PickerLabel>
            <PickerLabel label="Chromosome">
              <select value={chrom} onChange={e=>setChrom(e.target.value)}
                      className="bg-white border border-border rounded-xl px-3 py-2 text-sm">
                {['1','2','3','5','7','8','9','10','11','12','13','16','17','18','X','Y'].map(c => <option key={c}>{c}</option>)}
              </select>
            </PickerLabel>
            <PickerLabel label="Expression">
              <select value={cat} onChange={e=>setCat(e.target.value)}
                      className="bg-white border border-border rounded-xl px-3 py-2 text-sm">
                <option>HIGH</option><option>MID</option><option>LOW</option>
              </select>
            </PickerLabel>
            <button className="btn" onClick={run}>Dice</button>
          </div>
        )}
      </Card>

      {rows && (op === 'Roll-up' ? (
        <Card title={`Roll-up · level=${rows.level}`}>
          <div className="h-72 mb-4">
            <ResponsiveContainer>
              <BarChart data={(rows.rows || []).slice(0, 25)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0eff2"/>
                <XAxis dataKey="key" {...AXIS}/>
                <YAxis {...AXIS}/>
                <Tooltip contentStyle={TIP}/>
                <Bar dataKey="mutation_count" fill="#0ea5b7" radius={[10,10,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ResultTable rows={rows.rows}/>
        </Card>
      ) : (
        <Card title={`${op} · results`}><ResultTable rows={rows.rows}/></Card>
      ))}
    </>
  );
}

/* ================================================================ */
/*  AlphaGenome domain                                               */
/* ================================================================ */
function AlphaDomain() {
  const [op, setOp] = useState('Roll-up');
  const OPS = ['Roll-up', 'Dice', 'Pivot'];

  const [level, setLevel] = useState('gene');
  const [dice, setDice] = useState({});
  const [pivot, setPivot] = useState({ row_dim: 'gene', col_dim: 'consequence' });

  const [result, setResult] = useState(null);
  useEffect(() => { setResult(null); }, [op]);

  const run = async () => {
    if (op === 'Roll-up') setResult(await api.olapAlphaRollup(level));
    if (op === 'Dice')    setResult(await api.olapAlphaDice(
      Object.entries(dice).filter(([_,v])=>v).map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&')));
    if (op === 'Pivot')   setResult(await api.olapAlphaPivot(pivot.row_dim, pivot.col_dim));
  };

  return (
    <>
      <div className="flex gap-2 mb-4 flex-wrap">
        {OPS.map(o => (
          <button key={o}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    op === o ? 'bg-deep text-white border-deep' : 'bg-white text-ink border-border'
                  }`}
                  onClick={() => setOp(o)}>{o}</button>
        ))}
      </div>

      <Card title={`Configure — ${op}`} subtitle="Aggregating over the real ClinVar/COSMIC hotspot catalog" className="mb-6">
        {op === 'Roll-up' && (
          <div className="flex items-center gap-3">
            <PickerLabel label="Level">
              <select value={level} onChange={e=>setLevel(e.target.value)}
                      className="bg-white border border-border rounded-xl px-3 py-2 text-sm">
                <option value="gene">gene</option>
                <option value="chromosome">chromosome</option>
                <option value="consequence">consequence</option>
                <option value="disease">disease</option>
                <option value="mutation_type">mutation type</option>
              </select>
            </PickerLabel>
            <button className="btn" onClick={run}>Run</button>
          </div>
        )}
        {op === 'Dice' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <PickerLabel label="Disease">
              <select onChange={e=>setDice(f=>({...f, disease:e.target.value}))}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm">
                <option value="">any</option>
                {['Pan-cancer','Melanoma','Colorectal Cancer','Lung Adenocarcinoma','Breast Carcinoma','Hereditary BRCA','Endometrial Cancer','Glioma','VHL syndrome','Retinoblastoma','Lynch syndrome','Neurofibromatosis','Pancreatic Cancer','Li-Fraumeni','Ataxia-telangiectasia','NSCLC (resistance)','Hereditary Diffuse Gastric'].map(d => <option key={d}>{d}</option>)}
              </select>
            </PickerLabel>
            <PickerLabel label="Mutation type">
              <select onChange={e=>setDice(f=>({...f, mutation_type:e.target.value}))}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm">
                <option value="">any</option>
                <option>SNP</option><option>INS</option><option>DEL</option><option>SUB</option>
              </select>
            </PickerLabel>
            <PickerLabel label="Consequence">
              <select onChange={e=>setDice(f=>({...f, consequence:e.target.value}))}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm">
                <option value="">any</option>
                <option>missense</option><option>nonsense</option><option>frameshift</option>
                <option>in-frame_del</option><option>amplification</option><option>fusion</option>
              </select>
            </PickerLabel>
            <button className="btn justify-center" onClick={run}>Dice</button>
          </div>
        )}
        {op === 'Pivot' && (
          <div className="flex items-center gap-3 flex-wrap">
            <PickerLabel label="Rows">
              <select value={pivot.row_dim} onChange={e=>setPivot(p=>({...p, row_dim:e.target.value}))}
                      className="bg-white border border-border rounded-xl px-3 py-2 text-sm">
                <option>gene</option><option>chromosome</option><option>disease</option>
              </select>
            </PickerLabel>
            <PickerLabel label="Columns">
              <select value={pivot.col_dim} onChange={e=>setPivot(p=>({...p, col_dim:e.target.value}))}
                      className="bg-white border border-border rounded-xl px-3 py-2 text-sm">
                <option>consequence</option><option>mutation_type</option><option>disease</option>
              </select>
            </PickerLabel>
            <button className="btn" onClick={run}>Pivot</button>
          </div>
        )}
      </Card>

      {result && op === 'Roll-up' && (
        <Card title={`Roll-up · ${result.level}`} subtitle="Variant count and cumulative allele frequency per key">
          <div className="h-72 mb-4">
            <ResponsiveContainer>
              <BarChart data={result.rows.slice(0, 15)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0eff2"/>
                <XAxis dataKey="key" {...AXIS}/>
                <YAxis {...AXIS}/>
                <Tooltip contentStyle={TIP}/>
                <Bar dataKey="variant_count" fill="#0ea5b7" radius={[10,10,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ResultTable rows={result.rows}/>
        </Card>
      )}
      {result && op === 'Dice' && (
        <Card title="Dice · matched variants" subtitle={JSON.stringify(result.filters)}>
          <ResultTable rows={result.rows}/>
        </Card>
      )}
      {result && op === 'Pivot' && <PivotGrid data={result}/>}
    </>
  );
}

/* ================================================================ */
/*  Computer Vision domain                                            */
/* ================================================================ */
function CvDomain() {
  const [op, setOp] = useState('Class summary');
  const OPS = ['Class summary', 'Confidence bins', 'Error drill-down'];
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    if (op === 'Class summary')     api.olapCvRollup().then(setData);
    if (op === 'Confidence bins')   api.olapCvBins().then(setData);
    if (op === 'Error drill-down')  api.olapCvErrors().then(setData);
  }, [op]);

  return (
    <>
      <div className="flex gap-2 mb-6 flex-wrap">
        {OPS.map(o => (
          <button key={o}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    op === o ? 'bg-deep text-white border-deep' : 'bg-white text-ink border-border'
                  }`}
                  onClick={() => setOp(o)}>{o}</button>
        ))}
      </div>

      {op === 'Class summary' && data && (
        <div className="grid grid-cols-12 gap-5">
          <Card className="col-span-12 md:col-span-4" title="Test-set headline">
            <div className="mt-2 space-y-2">
              <Stat label="Test accuracy" v={`${(data.test_accuracy*100).toFixed(1)}%`} tone="teal"/>
              <Stat label="Test samples"  v={data.n_test}/>
              <Stat label="Epochs"        v={data.epochs}/>
            </div>
          </Card>
          <Card className="col-span-12 md:col-span-8" title="Per-class accuracy">
            <table className="data">
              <thead><tr><th>Class</th><th>Support</th><th>True positive</th><th>Recall</th><th>Precision</th></tr></thead>
              <tbody>
                {data.per_class.map((r, i) => (
                  <tr key={i}>
                    <td className="font-semibold">{r.class_}</td>
                    <td>{r.support}</td>
                    <td>{r.true_positive}</td>
                    <td className="tabular-nums text-teal">{r.accuracy}</td>
                    <td className="tabular-nums">{r.precision}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {op === 'Confidence bins' && data && (
        <Card title="Confidence bins — how well-calibrated is the model?"
              subtitle="Higher-confidence predictions should also be more accurate.">
          <div className="h-72 mb-4">
            <ResponsiveContainer>
              <BarChart data={data.bins}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0eff2"/>
                <XAxis dataKey="range" {...AXIS}/>
                <YAxis {...AXIS}/>
                <Tooltip contentStyle={TIP}/>
                <Bar dataKey="correct" stackId="a" fill="#0ea5b7" radius={[0,0,0,0]}/>
                <Bar dataKey="wrong"   stackId="a" fill="#e56b8f" radius={[10,10,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="data">
            <thead><tr><th>Confidence range</th><th>N</th><th>Correct</th><th>Wrong</th><th>Accuracy</th></tr></thead>
            <tbody>
              {data.bins.map((b, i) => (
                <tr key={i}>
                  <td>{b.range}</td>
                  <td>{b.n}</td>
                  <td className="text-teal font-semibold">{b.correct}</td>
                  <td className="text-rose font-semibold">{b.wrong}</td>
                  <td className="tabular-nums">{(b.accuracy*100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {op === 'Error drill-down' && data && (
        <div className="grid grid-cols-12 gap-5">
          <Card className="col-span-12 lg:col-span-6" title={`Mistakes — ${data.errors.length}`}
                subtitle="Scans the CNN got wrong">
            <ImgGrid items={data.errors} borderClass="border-rose"/>
          </Card>
          <Card className="col-span-12 lg:col-span-6" title={`Corrects — ${data.corrects.length}`}
                subtitle="Scans the CNN got right">
            <ImgGrid items={data.corrects} borderClass="border-teal/60"/>
          </Card>
        </div>
      )}
    </>
  );
}

/* ================================================================ */
/*  UI atoms                                                          */
/* ================================================================ */
function PickerLabel({ label, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted mb-1">{label}</div>
      {children}
    </div>
  );
}

function Stat({ label, v, tone='default' }) {
  const c = { default:'text-ink', teal:'text-teal', rose:'text-rose' }[tone];
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className={`text-2xl font-display font-bold ${c}`}>{v ?? '—'}</div>
    </div>
  );
}

function ResultTable({ rows }) {
  if (!rows?.length) return <div className="text-muted text-sm">No rows.</div>;
  const cols = Object.keys(rows[0]);
  return (
    <div className="scrollbox">
      <table className="data">
        <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.slice(0, 200).map((r, i) => (
            <tr key={i}>
              {cols.map(c => (
                <td key={c} className={typeof r[c] === 'number' ? 'tabular-nums' : ''}>
                  {typeof r[c] === 'number' ? Number(r[c].toFixed?.(3) ?? r[c]) : String(r[c] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PivotGrid({ data }) {
  if (!data?.row_keys) return null;
  const cellMap = new Map(data.cells.map(c => [`${c.row}|${c.col}`, c.count]));
  const max = Math.max(1, ...data.cells.map(c => c.count));
  const color = (v) => {
    const t = v / max;
    return `rgb(${Math.round(234 - t*224)},${Math.round(248 - t*211)},${Math.round(251 - t*187)})`;
  };
  return (
    <Card title={`Pivot · ${data.row_dim} × ${data.col_dim}`}>
      <div className="overflow-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-muted"></th>
              {data.col_keys.map(c => <th key={c} className="p-2 text-muted whitespace-nowrap">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.row_keys.map(r => (
              <tr key={r}>
                <td className="p-2 font-semibold text-ink whitespace-nowrap">{r}</td>
                {data.col_keys.map(c => {
                  const v = cellMap.get(`${r}|${c}`) || 0;
                  return (
                    <td key={c} className="p-0.5">
                      <div className="w-14 h-9 rounded flex items-center justify-center"
                           style={{ background: color(v), color: v/max > 0.5 ? 'white' : '#0a2540' }}>
                        {v || ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ImgGrid({ items, borderClass }) {
  if (!items?.length) return <div className="text-muted text-sm">None.</div>;
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((it, i) => (
        <div key={i} className={`rounded-2xl overflow-hidden border-2 ${borderClass} bg-white`}>
          <img src={it.image} alt="" className="w-full aspect-square"/>
          <div className="p-2 text-[10px]">
            <div className="text-muted">true · <span className="text-ink font-semibold">{it.true_label}</span></div>
            <div className="text-muted">pred · <span className="text-ink font-semibold">{it.predicted_label}</span></div>
            <div className="text-muted">conf · <span className="tabular-nums text-ink font-semibold">{(it.confidence*100).toFixed(0)}%</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}
