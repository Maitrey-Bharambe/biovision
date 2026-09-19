'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { Gauge } from '../../components/viz/Gauge';
import { Dna3D } from '../../components/viz/Dna3D';

const TABS = [
  { id: 'editor',  label: 'Live DNA Editor',       icon: '⌬' },
  { id: 'variant', label: 'Variant Effect Predictor', icon: '⚡' },
  { id: 'remedy',  label: 'Precision Remedy',      icon: '℞' },
];

const BASES = ['A','C','G','T'];

/* ================================================================ */
/*  CATALOG PROVIDER — one hook shared across all tabs                */
/* ================================================================ */
function useCatalog() {
  const [cat, setCat] = useState(null);
  useEffect(() => { api.alphaCatalog().then(setCat); }, []);
  return cat;
}

/* ================================================================ */
export default function AlphaGenomeLab() {
  const [tab, setTab] = useState('editor');

  return (
    <div>
      <PageHeader
        eyebrow="AlphaGenome Lab"
        title="From variant to remedy — in one place"
        description="Inspired by Google DeepMind's AlphaGenome (2025), this lab lets you edit a real gene's DNA, predict how the change would affect its protein, score its pathogenicity against real cancer hotspots, and surface FDA-approved targeted therapies. Every input is a picker — no manual typing."
      />

      <div className="flex gap-2 mb-6 border-b border-border/60 flex-wrap">
        {TABS.map(t => (
          <button key={t.id}
                  className={`px-4 py-2 text-sm border-b-2 flex items-center gap-2 ${
                    tab === t.id ? 'border-teal text-ink font-semibold' : 'border-transparent text-muted hover:text-ink'
                  }`}
                  onClick={() => setTab(t.id)}>
            <span className="text-teal">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {tab === 'editor'  && <DnaEditor />}
      {tab === 'variant' && <VariantPredictor />}
      {tab === 'remedy'  && <RemedyRecommender />}
    </div>
  );
}

/* ================================================================ */
/*  1.  LIVE DNA EDITOR + 3D helix                                    */
/* ================================================================ */
function DnaEditor() {
  const catalog = useCatalog();
  const [gene, setGene] = useState('TP53');
  const [ref, setRef]   = useState(null);
  const [pos, setPos]   = useState(30);
  const [alt, setAlt]   = useState('A');
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRef(null); setReport(null);
    api.geneReference(gene, 240).then(setRef);
  }, [gene]);

  const hotspots = catalog?.hotspots?.[gene] || [];
  const displayPositions = catalog?.display_positions?.[gene] || [];

  const runEdit = async () => {
    setBusy(true);
    setReport(await api.dnaEdit({ gene, reference_dna: ref?.reference_dna, position: pos, alt_base: alt }));
    setBusy(false);
  };

  // when user picks a known hotspot from dropdown, jump position + alt
  const jumpToHotspot = (idx) => {
    if (idx < 0) return;
    const hs = hotspots[idx];
    setPos(displayPositions[idx] ?? 30);
    if (hs.alt_base && hs.alt_base.length === 1) setAlt(hs.alt_base);
  };

  return (
    <>
      <div className="grid grid-cols-12 gap-5 mb-5">
        <Card className="col-span-12 lg:col-span-4" title="1 · Gene picker">
          <div className="space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Gene</div>
              <select value={gene} onChange={e => setGene(e.target.value)}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm">
                {(catalog?.genes || []).map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Jump to a known hotspot</div>
              <select onChange={e => jumpToHotspot(Number(e.target.value))}
                      defaultValue={-1}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm">
                <option value={-1}>— pick a real hotspot —</option>
                {hotspots.map((h, i) => (
                  <option key={i} value={i}>
                    {h.protein_change} · {h.mutation_type} · {h.disease}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Position</div>
                <select value={pos} onChange={e => setPos(Number(e.target.value))}
                        className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm">
                  {Array.from({ length: 80 }, (_, i) => i * 3).map(p =>
                    <option key={p} value={p}>{p}</option>
                  )}
                </select>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Alt base</div>
                <select value={alt} onChange={e => setAlt(e.target.value)}
                        className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm font-mono">
                  {BASES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <button className="btn w-full justify-center" onClick={runEdit} disabled={busy}>
              {busy ? 'Applying edit…' : 'Apply edit'}
            </button>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-4" title="Double-helix — live"
              subtitle="rotating 3-D preview · selected position glows">
          <div className="flex justify-center">
            <Dna3D
              sequence={ref?.reference_dna?.slice(pos, pos + 20) || 'ATGCGTAGCTAGCTAGCGTA'}
              highlight={0}
              width={200} height={340} />
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-4" title="2 · Sequence view"
              subtitle="tap a base to select its position">
          <NucleotideStrip dna={ref?.reference_dna || ''}
                            selectedPos={pos}
                            onSelect={setPos}/>
        </Card>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-12 gap-5 mb-5">
            <Card className="col-span-12 md:col-span-4" title="Codon before"
                  subtitle={`AA position ${report.aa_position}`}>
              <div className="flex items-center gap-4">
                <CodonBox codon={report.ref_codon}/>
                <div>
                  <div className="text-3xl font-display font-bold text-ink">{report.ref_aa}</div>
                  <div className="text-sm text-muted">{report.ref_aa_full}</div>
                </div>
              </div>
            </Card>
            <Card className="col-span-12 md:col-span-4" title="Codon after"
                  subtitle={`substitution at codon pos ${report.codon_position}`}>
              <div className="flex items-center gap-4">
                <CodonBox codon={report.alt_codon} highlight={report.codon_position}/>
                <div>
                  <div className="text-3xl font-display font-bold text-ink">{report.alt_aa}</div>
                  <div className="text-sm text-muted">{report.alt_aa_full}</div>
                </div>
              </div>
            </Card>
            <Card className="col-span-12 md:col-span-4" title="Consequence">
              <div className="text-2xl font-display font-bold"
                   style={{ color: consequenceColor(report.consequence) }}>
                {report.consequence.toUpperCase()}
              </div>
              <div className="mt-2 text-sm text-ink font-mono">
                p.<span className="font-semibold">{report.protein_change}</span>
              </div>
              <div className="text-xs text-muted mt-4 leading-relaxed">
                {consequenceExplanation(report.consequence)}
              </div>
            </Card>
          </div>

          <Card title="Protein sequence — before / after"
                subtitle="the substituted amino acid is highlighted">
            <ProteinCompare before={report.protein_before} after={report.protein_after} aaPos={report.aa_position}/>
          </Card>
        </>
      )}
    </>
  );
}

/* ================================================================ */
/*  2.  VARIANT EFFECT PREDICTOR — dropdown-first                    */
/* ================================================================ */
function VariantPredictor() {
  const catalog = useCatalog();
  const [gene, setGene] = useState('TP53');
  const [pos, setPos]   = useState(30);
  const [alt, setAlt]   = useState('A');
  const [ref, setRef]   = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.geneReference(gene, 240).then(setRef); setResult(null); }, [gene]);

  const hotspots = catalog?.hotspots?.[gene] || [];
  const displayPositions = catalog?.display_positions?.[gene] || [];

  const jumpToHotspot = (idx) => {
    if (idx < 0) return;
    const hs = hotspots[idx];
    setPos(displayPositions[idx] ?? 30);
    if (hs.alt_base && hs.alt_base.length === 1) setAlt(hs.alt_base);
  };

  const run = async () => {
    setBusy(true);
    setResult(await api.variantEffect({ gene, position: pos, alt_base: alt, reference_dna: ref?.reference_dna }));
    setBusy(false);
  };

  return (
    <>
      <div className="grid grid-cols-12 gap-5 mb-5">
        <Card className="col-span-12 lg:col-span-4" title="Input variant">
          <div className="space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Gene</div>
              <select value={gene} onChange={e=>setGene(e.target.value)}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm">
                {(catalog?.genes || []).map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Or pick a known hotspot</div>
              <select onChange={e => jumpToHotspot(Number(e.target.value))}
                      defaultValue={-1}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm">
                <option value={-1}>— pick a real hotspot —</option>
                {hotspots.map((h, i) => (
                  <option key={i} value={i}>
                    {h.protein_change} · {h.mutation_type} · {h.disease}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Position</div>
                <select value={pos} onChange={e=>setPos(Number(e.target.value))}
                        className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm">
                  {Array.from({ length: 80 }, (_, i) => i * 3).map(p =>
                    <option key={p} value={p}>{p}</option>
                  )}
                </select>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Alt base</div>
                <select value={alt} onChange={e=>setAlt(e.target.value)}
                        className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm font-mono">
                  {BASES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <button className="btn w-full justify-center" onClick={run} disabled={busy}>
              {busy ? 'Scoring…' : 'Predict effect'}
            </button>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-8" title="Pathogenicity report"
              subtitle="Transparent scoring — every contribution shown">
          {result?.error ? (
            <div className="text-rose">{result.error}</div>
          ) : result ? (
            <div className="grid md:grid-cols-3 gap-6 items-start">
              <div className="text-center">
                <Gauge value={result.pathogenicity_score}
                       tone={result.pathogenicity_score >= 0.6 ? 'rose' : 'teal'}/>
                <div className="mt-3 text-lg font-display font-bold"
                     style={{ color: result.pathogenicity_score >= 0.6 ? '#e56b8f' : '#0ea5b7' }}>
                  {result.pathogenicity_band}
                </div>
                <div className="text-xs text-muted mt-1">p.{result.codon.protein_change}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-muted uppercase tracking-widest mb-2">Signals used</div>
                <ul className="space-y-2 text-sm">
                  {result.rationale.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-teal font-bold">✓</span>
                      <span className="text-ink">{r}</span>
                    </li>
                  ))}
                </ul>
                {result.matched_hotspot && (
                  <div className="mt-4 rounded-2xl bg-[#eaf8fb] p-4 border border-teal/30">
                    <div className="text-xs text-teal font-semibold uppercase tracking-widest">Exact match — real cancer hotspot</div>
                    <div className="mt-1 text-sm text-ink">
                      <b>{result.gene}</b> {result.matched_hotspot.protein_change}
                      {' · '}<span className="text-muted">disease</span> {result.matched_hotspot.disease}
                      {' · '}<span className="text-muted">freq</span> {result.matched_hotspot.frequency}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-muted text-sm">Pick a variant on the left and predict.</div>
          )}
        </Card>
      </div>

      {result?.known_hotspots_in_gene?.length > 0 && (
        <Card title={`Known hotspots in ${result.gene}`}
              subtitle="Real ClinVar/COSMIC entries in our warehouse — for context">
          <table className="data">
            <thead>
              <tr><th>Protein change</th><th>Type</th><th>Consequence</th><th>Disease</th><th>Frequency</th></tr>
            </thead>
            <tbody>
              {result.known_hotspots_in_gene.map((h, i) => (
                <tr key={i}>
                  <td className="font-mono text-teal font-semibold">{h.protein_change}</td>
                  <td><span className="badge">{h.mutation_type}</span></td>
                  <td>{h.consequence}</td>
                  <td>{h.disease}</td>
                  <td className="tabular-nums">{h.frequency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

/* ================================================================ */
/*  3.  REMEDY RECOMMENDER — dropdown pickers                        */
/* ================================================================ */
function RemedyRecommender() {
  const catalog = useCatalog();
  const [muts, setMuts] = useState([{ gene: 'BRAF', protein_change: 'V600E' }]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const addMut = () => setMuts([...muts, { gene: '', protein_change: '' }]);
  const removeMut = (i) => setMuts(muts.filter((_, j) => j !== i));
  const update = (i, k, v) => setMuts(muts.map((m, j) => j === i ? { ...m, [k]: v } : m));

  const run = async () => {
    setBusy(true);
    setResult(await api.remedy(muts.filter(m => m.gene)));
    setBusy(false);
  };

  const preset = (list) => setMuts(list);

  return (
    <>
      <div className="grid grid-cols-12 gap-5 mb-5">
        <Card className="col-span-12 lg:col-span-5" title="Patient mutation profile">
          <div className="space-y-2">
            {muts.map((m, i) => {
              const hotspots = catalog?.hotspots?.[m.gene] || [];
              return (
                <div key={i} className="flex gap-2">
                  <select value={m.gene}
                          onChange={e => update(i, 'gene', e.target.value)}
                          className="flex-1 bg-white border border-border rounded-xl px-3 py-2 text-sm">
                    <option value="">— gene —</option>
                    {(catalog?.genes || []).map(g => <option key={g}>{g}</option>)}
                  </select>
                  <select value={m.protein_change}
                          onChange={e => update(i, 'protein_change', e.target.value)}
                          className="flex-1 bg-white border border-border rounded-xl px-3 py-2 text-sm">
                    <option value="">— variant —</option>
                    {hotspots.map((h, j) => (
                      <option key={j} value={h.protein_change}>{h.protein_change} · {h.disease}</option>
                    ))}
                  </select>
                  <button onClick={() => removeMut(i)}
                          className="w-9 h-9 rounded-full text-muted hover:text-rose">×</button>
                </div>
              );
            })}
            <button onClick={addMut} className="text-teal text-sm font-medium">+ Add mutation</button>
          </div>
          <div className="mt-4 border-t border-border/60 pt-4">
            <div className="text-[10px] uppercase tracking-widest text-muted mb-2">Try a preset profile</div>
            <div className="flex flex-wrap gap-2">
              <PresetChip label="BRAF-mutant melanoma"
                          onClick={() => preset([{gene:'BRAF', protein_change:'V600E'}])}/>
              <PresetChip label="EGFR-mutant NSCLC"
                          onClick={() => preset([{gene:'EGFR', protein_change:'L858R'}, {gene:'EGFR', protein_change:'T790M'}])}/>
              <PresetChip label="BRCA-mutant breast"
                          onClick={() => preset([{gene:'BRCA1', protein_change:'185delAG'}, {gene:'TP53', protein_change:'R175H'}])}/>
              <PresetChip label="KRAS G12C lung"
                          onClick={() => preset([{gene:'KRAS', protein_change:'G12C'}])}/>
            </div>
          </div>
          <button className="btn w-full justify-center mt-5" onClick={run} disabled={busy}>
            {busy ? 'Matching therapies…' : 'Recommend therapies'}
          </button>
        </Card>

        <Card className="col-span-12 lg:col-span-7"
              title={result ? `${result.n_recommendations} therapies matched` : 'Recommendations'}
              subtitle={result?.matched?.length ? `Matched variants: ${result.matched.join(', ')}` : 'Pick a mutation profile on the left.'}>
          {result?.recommendations?.length ? (
            <div className="space-y-3">
              {result.recommendations.map((r, i) => (
                <div key={i} className="rounded-2xl bg-white/80 border border-border/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-lg font-display font-bold text-ink">{r.drug}</div>
                        <span className={`badge ${r.evidence === 'FDA-approved' ? 'bg-teal/15 text-teal' : ''}`}>{r.evidence}</span>
                      </div>
                      <div className="text-xs text-muted mt-1">
                        <span className="font-semibold text-ink2">{r.drug_class}</span>
                        {' · matched on '}<span className="font-mono text-teal">{r.gene} {r.matched_on}</span>
                      </div>
                      <div className="text-sm text-ink2/85 mt-2 leading-snug">{r.mechanism}</div>
                      <div className="text-xs text-muted mt-1">Disease context: {r.disease_context}</div>
                    </div>
                    <div className="text-center shrink-0">
                      <Gauge value={r.response_estimate} tone="teal" size={90} label="Response"/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted text-sm">No matches yet.</div>
          )}
        </Card>
      </div>

      {result && (
        <div className="text-xs text-muted italic leading-relaxed">
          {result.disclaimer}
        </div>
      )}
    </>
  );
}

/* ================================================================ */
/*  Small pieces                                                     */
/* ================================================================ */
function NucleotideStrip({ dna, selectedPos, onSelect }) {
  if (!dna) return <div className="text-muted text-sm">Loading sequence…</div>;
  const chunks = [];
  for (let i = 0; i < dna.length; i += 60) chunks.push({ start: i, seq: dna.slice(i, i + 60) });
  return (
    <div className="text-[13px] font-mono leading-6 max-h-56 overflow-auto rounded-xl bg-white/70 p-3 border border-border/60">
      {chunks.map((chk, ci) => (
        <div key={ci} className="flex gap-2">
          <span className="text-muted w-10 text-right shrink-0 tabular-nums">{chk.start}</span>
          <div>
            {chk.seq.split('').map((b, i) => {
              const p = chk.start + i;
              const sel = p === selectedPos;
              return (
                <span key={p}
                      onClick={() => onSelect(p)}
                      className={`cursor-pointer nuc-${b} ${sel ? 'bg-deep text-white px-0.5 rounded' : 'hover:bg-teal/20'}`}>
                  {b}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function CodonBox({ codon, highlight }) {
  if (!codon) return null;
  return (
    <div className="flex gap-1">
      {codon.split('').map((b, i) => (
        <div key={i}
             className={`w-10 h-12 rounded-xl border-2 flex items-center justify-center font-mono font-bold text-lg
                         ${i + 1 === highlight ? 'bg-deep text-white border-deep' : `bg-white border-border nuc-${b}`}`}>
          {b}
        </div>
      ))}
    </div>
  );
}

function ProteinCompare({ before, after, aaPos }) {
  if (!before || !after) return null;
  const window = 30;
  const lo = Math.max(0, aaPos - 1 - window);
  const hi = Math.min(before.length, aaPos - 1 + window + 1);
  return (
    <div className="font-mono text-sm space-y-2">
      <div>
        <span className="text-muted mr-3 tabular-nums text-xs">before</span>
        {before.slice(lo, hi).split('').map((aa, i) => {
          const p = lo + i;
          return (
            <span key={p}
                  className={p === aaPos - 1 ? 'bg-teal/20 px-0.5 rounded font-bold text-ink' : 'text-ink2'}>
              {aa}
            </span>
          );
        })}
      </div>
      <div>
        <span className="text-muted mr-3 tabular-nums text-xs">after </span>
        {after.slice(lo, hi).split('').map((aa, i) => {
          const p = lo + i;
          const changed = aa !== before[p];
          return (
            <span key={p}
                  className={p === aaPos - 1
                    ? 'bg-rose/25 px-0.5 rounded font-bold text-rose'
                    : (changed ? 'text-rose' : 'text-ink2')}>
              {aa}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function PresetChip({ label, onClick }) {
  return (
    <button onClick={onClick}
            className="text-xs px-3 py-1.5 rounded-full bg-[#eaf8fb] text-ink border border-teal/30 hover:bg-teal/15">
      {label}
    </button>
  );
}

function consequenceColor(c) {
  return {
    'silent': '#0ea5b7',
    'conservative missense': '#f4b942',
    'missense': '#f4a261',
    'nonsense': '#e56b8f',
    'stop-loss': '#e56b8f',
  }[c] || '#0a2540';
}
function consequenceExplanation(c) {
  return {
    'silent': 'Same amino acid — usually no functional impact.',
    'conservative missense': 'Different amino acid but similar chemistry — often tolerated.',
    'missense': 'Amino acid changes to a chemically different one — may disrupt function.',
    'nonsense': 'Introduces a premature stop codon — protein is truncated, usually loss of function.',
    'stop-loss': 'Removes the stop codon — protein is extended, usually harmful.',
  }[c] || '';
}
