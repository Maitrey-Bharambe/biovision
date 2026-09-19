'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';

export default function Samples() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.samples().then(v => setRows(v || [])); }, []);
  return (
    <div>
      <PageHeader eyebrow="Samples" title="Sample browser"
        description="Open any sample to see its complete cross-modality profile." />
      <Card>
        <div className="scrollbox">
          <table className="data">
            <thead><tr><th>Sample</th><th>Tissue</th><th>Condition</th><th>Age</th><th>Sex</th><th></th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.sample_id}>
                  <td className="font-medium">{s.sample_id}</td>
                  <td>{s.tissue}</td>
                  <td className={s.condition==='diseased' ? 'text-warn' : 'text-good'}>{s.condition}</td>
                  <td>{s.age_bucket}</td>
                  <td>{s.sex}</td>
                  <td><Link className="text-accent underline" href={`/sample/${s.sample_id}`}>open →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
