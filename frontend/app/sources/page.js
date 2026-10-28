'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { api } from '../../lib/api';

const TINT = {
  'Ensembl':             'genomics',
  'UniProt':             'proteomics',
  'ClinVar':             'accent',
  'COSMIC':              'accent',
  'GTEx':                'transcript',
  'TCGA-BRCA':           'transcript',
  'UCI WDBC':            'imaging',
  'MedMNIST / BreastMNIST': 'imaging',
};

export default function SourcesPage() {
  const [overview, setOverview] = useState(null);
  const [sources, setSources]   = useState(null);
  const [status, setStatus]     = useState('loading');

  useEffect(() => {
    (async () => {
      // We ask the Nexus tool for the source list — a single consistent
      // provenance surface shared with the investigation workspace.
      const res = await api.nexusInvestigate({
        question: 'List the data sources behind the warehouse.',
        explain: false,
      });
      const t = await api.overview();
      setSources(res?.results?.[0]?.output?.sources || null);
      setOverview(t || null);
      setStatus(res && t ? 'ok' : 'error');
    })();
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="DATA SOURCES"
        title="Where every row comes from."
        description="BioVision's warehouse is a local ingestion from the open datasets below. The counts shown here are the current records, not live external connections."
      />

      {status === 'error' && (
        <Card>
          <div className="text-bad text-[13px]">Backend unavailable — cannot read source provenance.</div>
        </Card>
      )}

      {sources && (
        <div className="grid grid-cols-12 gap-4">
          {sources.map((s, i) => {
            const t = TINT[s.name] || 'accent';
            const stripe = {
              accent: 'bg-accent', genomics: 'bg-genomics',
              transcript: 'bg-transcript', proteomics: 'bg-proteomics',
              imaging: 'bg-imaging',
            }[t];
            return (
              <article key={i}
                       className="col-span-12 md:col-span-6 lg:col-span-4 relative overflow-hidden rounded-[18px] border border-border bg-surface p-5">
                <div className={`absolute top-0 left-0 h-1 w-20 ${stripe}`} aria-hidden/>
                <div className="font-display font-semibold text-xl text-ink">{s.name}</div>
                <div className="text-[12.5px] text-muted mt-1">{s.modality}</div>
                <div className="mt-3 pt-3 border-t border-border font-mono text-[11px] text-accent2">
                  {s.role}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {overview?.totals && (
        <div className="mt-7">
          <Card title="Ingested record counts"
                subtitle="Reads the live /overview endpoint; these numbers are not stubbed.">
            <table className="data">
              <thead><tr><th>Entity</th><th className="text-right">Rows</th></tr></thead>
              <tbody>
                {Object.entries(overview.totals).map(([k, v]) => (
                  <tr key={k}>
                    <td className="font-mono text-[12.5px]">{k}</td>
                    <td className="num text-right">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      <div className="mt-5 text-[12.5px] text-muted italic">
        BioVision is not currently connected to a live external data pipeline;
        the records above reflect the last local ingestion.
      </div>
    </div>
  );
}
