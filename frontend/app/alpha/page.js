'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { Gauge } from '../../components/viz/Gauge';
import { useBioContext } from '../../components/BioContext';
// 3D helix uses react-three-fiber → load client-side only.
const Dna3DHelix = dynamic(
  () => import('../../components/viz/Dna3DHelix').then(m => m.Dna3DHelix),
  { ssr: false, loading: () => <div className="meta p-6">Loading 3-D helix…</div> }
);

const TABS = [
  { id: 'editor',  label: 'Live DNA Editor',           num: '01' },
  { id: 'variant', label: 'Variant Effect Predictor',  num: '02' },
  { id: 'remedy',  label: 'Precision Remedy',          num: '03' },
];

const BASES = ['A','C','G','T'];

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
        eyebrow="DNA editing bench"
        title="From variant to remedy"
        description="Edit a real gene's DNA, inspect the computed consequence, score pathogenicity against curated hotspots, and surface matching targeted therapies."
        right={
          <div className="seg-tabs" role="tablist">
            {TABS.map(t => (
              <button key={t.id} role="tab" aria-selected={tab === t.id}
                      onClick={() => setTab(t.id)}
                      className={`seg-tab ${tab === t.id ? 'active' : ''}`}>
                {t.label}
              </button>
            ))}
          </div>
        }
      />

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
  const ctx = useBioContext();
  const [gene, setGene] = useState(ctx.gene || 'TP53');
  const [ref, setRef]   = useState(null);
  const [pos, setPos]   = useState(30);
  const [alt, setAlt]   = useState('A');
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [downstreamMuts, setDownstreamMuts] = useState(null);
  const [downstreamRna, setDownstreamRna] = useState(null);

  useEffect(() => {
    setRef(null); setReport(null); setDownstreamMuts(null); setDownstreamRna(null);
    api.geneReference(gene, 240).then(setRef);
    ctx.setContext({ gene });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gene]);

  const hotspots = catalog?.hotspots?.[gene] || [];
  const displayPositions = catalog?.display_positions?.[gene] || [];

  const runEdit = async () => {
    setBusy(true);
    const r = await api.dnaEdit({ gene, reference_dna: ref?.reference_dna, position: pos, alt_base: alt });
    setReport(r);
    // Fire downstream warehouse lookups in parallel. If a view has no matching
    // record, we keep its null state and tell the user so, rather than fake it.
    Promise.all([
      api.mutations(`gene=${encodeURIComponent(gene)}`),
      api.rna(`gene=${encodeURIComponent(gene)}&limit=24`),
    ]).then(([m, rna]) => {
      setDownstreamMuts(m || []);
      setDownstreamRna(rna || []);
    });
    setBusy(false);
  };

  const jumpToHotspot = (idx) => {
    if (idx < 0) return;
    const hs = hotspots[idx];
    setPos(displayPositions[idx] ?? 30);
    if (hs.alt_base && hs.alt_base.length === 1) setAlt(hs.alt_base);
  };

  const matchedWarehouseMut = useMemo(() => {
    if (!report?.protein_change || !downstreamMuts) return null;
    return downstreamMuts.find(m =>
      (m.protein_change || '').toUpperCase() === report.protein_change.toUpperCase()
    );
  }, [report, downstreamMuts]);

  return (
    <>
      <div className="grid grid-cols-12 gap-5 mb-5">
        {/* ===== Left: compact form ===== */}
        <Card className="col-span-12 lg:col-span-4" title="Edit controls"
              subtitle="Pick a gene, choose a hotspot or free position, then apply.">
          <div className="space-y-3">
            <Field label="Gene">
              <select value={gene} onChange={e => setGene(e.target.value)}>
                {(catalog?.genes || []).map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Known hotspot">
              <select onChange={e => jumpToHotspot(Number(e.target.value))} defaultValue={-1}>
                <option value={-1}>— pick a real hotspot —</option>
                {hotspots.map((h, i) => (
                  <option key={i} value={i}>
                    {h.protein_change} · {h.mutation_type} · {h.disease}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Position">
                <select value={pos} onChange={e => setPos(Number(e.target.value))}>
                  {Array.from({ length: 80 }, (_, i) => i * 3).map(p =>
                    <option key={p} value={p}>{p}</option>
                  )}
                </select>
              </Field>
              <Field label="Alt base">
                <select value={alt} onChange={e => setAlt(e.target.value)} className="font-mono">
                  {BASES.map(b => <option key={b}>{b}</option>)}
                </select>
              </Field>
            </div>
            <button className="btn w-full justify-center !py-2.5" onClick={runEdit} disabled={busy}>
              {busy ? 'Applying edit…' : 'Apply edit'}
            </button>
            {report && (
              <button
                className="btn btn-ghost w-full justify-center !py-2"
                onClick={() => { setReport(null); setDownstreamMuts(null); setDownstreamRna(null); }}>
                Reset edit
              </button>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-border text-[11.5px] text-muted">
            Pipeline:&nbsp;
            <span className="text-ink">variant</span>
            {' → '}annotation
            {' → '}<span className="text-ink">consequence</span>
            {' → '}warehouse
          </div>
        </Card>

        {/* ===== Right: big helix ===== */}
        <Card className="col-span-12 lg:col-span-8" title="Live 3-D double helix"
              subtitle="Drag to orbit, scroll to zoom, click any bead to select that position."
              actions={<span className="pill pill-accent !py-0.5 !px-2 !text-[10px]">THREE.JS · LIVE</span>}>
          <Dna3DHelix
            sequence={ref?.reference_dna || 'ATGCGTAGCTAGCTAGCGTA'}
            highlight={pos}
            altBase={alt}
            onPick={(p) => setPos(p)}
            height={520}
            showProtein
          />
        </Card>
      </div>

      <Card title="2 · Full reference sequence"
            subtitle="Tap any base to jump the 3-D view. The highlighted base is the current edit site."
            className="mb-5">
        <NucleotideStrip dna={ref?.reference_dna || ''}
                         selectedPos={pos}
                         onSelect={setPos}/>
      </Card>

      {report && (
        <>
          <div className="editorial-strip mb-4">
            <span>REFERENCE STATE <span className="font-mono text-meta mx-2">│</span> EDITED STATE</span>
            <span className="font-mono text-meta text-[10px]">
              p.{report.protein_change} · {report.consequence?.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-12 gap-5 mb-5">
            <Card className="col-span-12 md:col-span-4" title="Codon · before"
                  subtitle={`AA position ${report.aa_position}`}>
              <div className="flex items-center gap-4">
                <CodonBox codon={report.ref_codon}/>
                <div>
                  <div className="text-3xl font-display font-bold text-ink">{report.ref_aa}</div>
                  <div className="text-sm text-prose font-prose">{report.ref_aa_full}</div>
                </div>
              </div>
            </Card>
            <Card className="col-span-12 md:col-span-4" title="Codon · after"
                  subtitle={`substitution at codon pos ${report.codon_position}`}>
              <div className="flex items-center gap-4">
                <CodonBox codon={report.alt_codon} highlight={report.codon_position}/>
                <div>
                  <div className="text-3xl font-display font-bold text-ink">{report.alt_aa}</div>
                  <div className="text-sm text-prose font-prose">{report.alt_aa_full}</div>
                </div>
              </div>
            </Card>
            <Card className="col-span-12 md:col-span-4" title="Consequence">
              <div className="text-2xl font-display font-bold"
                   style={{ color: consequenceColor(report.consequence) }}>
                {report.consequence?.toUpperCase()}
              </div>
              <div className="mt-2 text-sm text-ink font-mono">
                p.<span className="font-semibold">{report.protein_change}</span>
              </div>
              <div className="text-xs text-prose font-prose mt-4 leading-relaxed">
                {consequenceExplanation(report.consequence)}
              </div>
              <div className="text-[10px] text-meta mt-3 italic">
                Heuristic sequence computation; not a validated clinical prediction.
              </div>
            </Card>
          </div>

          <Card title="Protein sequence · before / after"
                subtitle="the substituted amino acid is highlighted"
                className="mb-5">
            <ProteinCompare before={report.protein_before} after={report.protein_after} aaPos={report.aa_position}/>
          </Card>

          {/* ───── Connected downstream views ───── */}
          <ConnectedViewsBanner
            edit={report}
            matchedMut={matchedWarehouseMut}
            rnaCount={downstreamRna?.length}
          />

          <div className="grid grid-cols-12 gap-5 mt-5">
            <Card className="col-span-12 lg:col-span-7"
                  title={`Matching warehouse mutations · ${gene}`}
                  subtitle="Rows that correspond to this edited variant are drawn in red.">
              {downstreamMuts === null ? (
                <div className="meta py-3">Fetching warehouse records…</div>
              ) : downstreamMuts.length === 0 ? (
                <div className="meta py-3">No mutation records found in the warehouse for {gene}.</div>
              ) : (
                <table className="data">
                  <thead>
                    <tr><th>Protein change</th><th>Type</th><th>Consequence</th><th>Disease</th><th className="text-right">Freq</th></tr>
                  </thead>
                  <tbody>
                    {downstreamMuts.slice(0, 10).map((m, i) => {
                      const hit = (m.protein_change || '').toUpperCase() === report.protein_change?.toUpperCase();
                      return (
                        <tr key={i} className={hit ? 'bg-[#CC000012]' : ''}>
                          <td className="font-mono">{m.protein_change}</td>
                          <td><span className="badge">{m.mutation_type}</span></td>
                          <td>{m.consequence}</td>
                          <td>{m.disease}</td>
                          <td className="num text-right">{m.frequency ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>

            <Card className="col-span-12 lg:col-span-5"
                  title={`Related RNA observations · ${gene}`}
                  subtitle="Expression samples associated with the edited gene; the edit itself does not alter observed TPM.">
              {downstreamRna === null ? (
                <div className="meta py-3">Fetching expression records…</div>
              ) : downstreamRna.length === 0 ? (
                <div className="meta py-3">No RNA observations found for {gene}.</div>
              ) : (
                <ul className="text-sm font-prose space-y-1 max-h-56 overflow-auto">
                  {downstreamRna.slice(0, 12).map((r, i) => (
                    <li key={i} className="flex justify-between border-b border-ink/20 py-1">
                      <span className="text-ink">{r.tissue} <span className="meta text-[9px]">· {r.condition}</span></span>
                      <span className="font-mono tabular-nums">{(r.tpm ?? 0).toFixed(1)} TPM</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}

/* ================================================================ */
/*  2.  VARIANT EFFECT PREDICTOR                                      */
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
        <Card className="col-span-12 lg:col-span-4" title="Input variant"
              subtitle="Score any single-nucleotide substitution against curated hotspots.">
          <div className="space-y-3">
            <Field label="Gene">
              <select value={gene} onChange={e=>setGene(e.target.value)}>
                {(catalog?.genes || []).map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Known hotspot">
              <select onChange={e => jumpToHotspot(Number(e.target.value))} defaultValue={-1}>
                <option value={-1}>— pick a real hotspot —</option>
                {hotspots.map((h, i) => (
                  <option key={i} value={i}>
                    {h.protein_change} · {h.mutation_type} · {h.disease}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Position">
                <select value={pos} onChange={e=>setPos(Number(e.target.value))}>
                  {Array.from({ length: 80 }, (_, i) => i * 3).map(p =>
                    <option key={p} value={p}>{p}</option>
                  )}
                </select>
              </Field>
              <Field label="Alt base">
                <select value={alt} onChange={e=>setAlt(e.target.value)} className="font-mono">
                  {BASES.map(b => <option key={b}>{b}</option>)}
                </select>
              </Field>
            </div>
            <button className="btn w-full justify-center !py-2.5" onClick={run} disabled={busy}>
              {busy ? 'Scoring…' : 'Predict effect'}
            </button>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-8" title="Pathogenicity report"
              subtitle="Transparent heuristic score; every contribution shown.">
          {result?.error ? (
            <div className="text-accent font-prose">{result.error}</div>
          ) : result ? (
            <div className="grid md:grid-cols-3 gap-6 items-start">
              <div className="text-center">
                <Gauge value={result.pathogenicity_score}
                       tone={result.pathogenicity_score >= 0.6 ? 'rose' : 'teal'}/>
                <div className="mt-3 text-lg font-display font-bold"
                     style={{ color: result.pathogenicity_score >= 0.6 ? '#CC0000' : '#111111' }}>
                  {result.pathogenicity_band}
                </div>
                <div className="meta mt-1">p.{result.codon.protein_change}</div>
              </div>
              <div className="md:col-span-2">
                <div className="eyebrow text-meta mb-2 !text-[10px]">Signals used</div>
                <ul className="space-y-2 text-sm font-prose">
                  {result.rationale.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-ink font-sans font-bold">▸</span>
                      <span className="text-ink">{r}</span>
                    </li>
                  ))}
                </ul>
                {result.matched_hotspot && (
                  <div className="mt-4 bg-subtle p-4 border border-ink">
                    <div className="eyebrow text-accent !text-[10px]">Exact match — real cancer hotspot</div>
                    <div className="mt-1 text-sm text-ink">
                      <b>{result.gene}</b> {result.matched_hotspot.protein_change}
                      {' · '}<span className="meta">disease</span> {result.matched_hotspot.disease}
                      {' · '}<span className="meta">freq</span> {result.matched_hotspot.frequency}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="meta">Pick a variant on the left and predict.</div>
          )}
        </Card>
      </div>

      {result?.known_hotspots_in_gene?.length > 0 && (
        <Card title={`Known hotspots in ${result.gene}`}
              subtitle="ClinVar / COSMIC entries in our warehouse — for context.">
          <table className="data">
            <thead>
              <tr><th>Protein change</th><th>Type</th><th>Consequence</th><th>Disease</th><th className="text-right">Frequency</th></tr>
            </thead>
            <tbody>
              {result.known_hotspots_in_gene.map((h, i) => (
                <tr key={i}>
                  <td className="font-mono text-accent font-semibold">{h.protein_change}</td>
                  <td><span className="badge">{h.mutation_type}</span></td>
                  <td>{h.consequence}</td>
                  <td>{h.disease}</td>
                  <td className="num text-right">{h.frequency}</td>
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
/*  3.  REMEDY RECOMMENDER                                            */
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
                          className="flex-1">
                    <option value="">— gene —</option>
                    {(catalog?.genes || []).map(g => <option key={g}>{g}</option>)}
                  </select>
                  <select value={m.protein_change}
                          onChange={e => update(i, 'protein_change', e.target.value)}
                          className="flex-1">
                    <option value="">— variant —</option>
                    {hotspots.map((h, j) => (
                      <option key={j} value={h.protein_change}>{h.protein_change} · {h.disease}</option>
                    ))}
                  </select>
                  <button onClick={() => removeMut(i)}
                          className="w-9 h-9 border border-ink text-ink hover:bg-accent hover:text-paper hover:border-accent">×</button>
                </div>
              );
            })}
            <button onClick={addMut} className="meta hover:text-ink underline-offset-4 hover:underline">+ Add mutation</button>
          </div>
          <div className="mt-4 border-t border-ink pt-4">
            <div className="eyebrow mb-2 text-meta !text-[10px]">Try a preset profile</div>
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
                <div key={i} className="border border-ink bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-xl font-display font-bold text-ink">{r.drug}</div>
                        <span className={`badge ${r.evidence === 'FDA-approved' ? '!bg-ink !text-paper' : ''}`}>{r.evidence}</span>
                      </div>
                      <div className="meta mt-1">
                        <span className="font-sans font-bold text-ink uppercase tracking-[0.14em]">{r.drug_class}</span>
                        {' · matched on '}<span className="font-mono text-accent">{r.gene} {r.matched_on}</span>
                      </div>
                      <div className="text-sm text-ink font-prose mt-2 leading-snug">{r.mechanism}</div>
                      <div className="meta mt-1">Disease context: {r.disease_context}</div>
                    </div>
                    <div className="text-center shrink-0">
                      <Gauge value={r.response_estimate} tone="teal" size={90} label="Response"/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="meta">No matches yet.</div>
          )}
        </Card>
      </div>

      {result && (
        <div className="text-xs text-prose font-prose italic leading-relaxed border-t border-ink pt-3">
          {result.disclaimer}
        </div>
      )}
    </>
  );
}

/* ================================================================ */
/*  Small pieces                                                     */
/* ================================================================ */
function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11.5px] font-medium text-muted mb-1">{label}</div>
      {children}
    </label>
  );
}

function ConnectedViewsBanner({ edit, matchedMut, rnaCount }) {
  const lines = [];
  if (matchedMut) {
    lines.push(`Matched warehouse record: ${matchedMut.gene} ${matchedMut.protein_change} (${matchedMut.disease})`);
  } else {
    lines.push(`No warehouse mutation record matches p.${edit.protein_change} — this is a novel/un-catalogued variant.`);
  }
  if (rnaCount !== undefined) {
    lines.push(rnaCount
      ? `${rnaCount} RNA observations retained for ${edit.gene} (expression is independent of the edit).`
      : `No RNA observations recorded for ${edit.gene}.`);
  }
  return (
    <div className="border border-ink bg-subtle p-4">
      <div className="editorial-strip !border-t-0 !pb-0 mb-1">
        <span className="text-accent">◆ CONNECTED VIEWS UPDATED</span>
        <span className="font-mono text-[10px] text-meta">p.{edit.protein_change}</span>
      </div>
      <ul className="font-prose text-sm text-ink space-y-1 pl-1">
        {lines.map((l, i) => <li key={i}>· {l}</li>)}
      </ul>
    </div>
  );
}

function NucleotideStrip({ dna, selectedPos, onSelect }) {
  if (!dna) return <div className="meta">Loading sequence…</div>;
  const chunks = [];
  for (let i = 0; i < dna.length; i += 60) chunks.push({ start: i, seq: dna.slice(i, i + 60) });
  return (
    <div className="text-[13px] font-mono leading-6 max-h-56 overflow-auto bg-subtle p-3 border border-ink">
      {chunks.map((chk, ci) => (
        <div key={ci} className="flex gap-2">
          <span className="text-meta w-10 text-right shrink-0 tabular-nums">{chk.start}</span>
          <div>
            {chk.seq.split('').map((b, i) => {
              const p = chk.start + i;
              const sel = p === selectedPos;
              return (
                <span key={p}
                      onClick={() => onSelect(p)}
                      className={`cursor-pointer nuc-${b} ${sel ? 'bg-accent text-paper px-0.5' : 'hover:bg-mutedbg'}`}>
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
             className={`w-10 h-12 border-2 flex items-center justify-center font-mono font-bold text-lg
                         ${i + 1 === highlight ? 'bg-accent text-paper border-accent' : `bg-white border-ink nuc-${b}`}`}>
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
        <span className="meta mr-3 tabular-nums">before</span>
        {before.slice(lo, hi).split('').map((aa, i) => {
          const p = lo + i;
          return (
            <span key={p}
                  className={p === aaPos - 1 ? 'bg-ink text-paper px-0.5 font-bold' : 'text-ink'}>
              {aa}
            </span>
          );
        })}
      </div>
      <div>
        <span className="meta mr-3 tabular-nums">after </span>
        {after.slice(lo, hi).split('').map((aa, i) => {
          const p = lo + i;
          const changed = aa !== before[p];
          return (
            <span key={p}
                  className={p === aaPos - 1
                    ? 'bg-accent text-paper px-0.5 font-bold'
                    : (changed ? 'text-accent font-bold' : 'text-ink')}>
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
            className="text-[10px] font-sans font-bold uppercase tracking-[0.14em] px-3 py-1.5 bg-white text-ink border border-ink hover:bg-ink hover:text-paper transition">
      {label}
    </button>
  );
}

function consequenceColor(c) {
  return {
    'silent': '#2E7D32',
    'conservative missense': '#AD6A1A',
    'missense': '#AD6A1A',
    'nonsense': '#CC0000',
    'stop-loss': '#CC0000',
  }[c] || '#111111';
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
