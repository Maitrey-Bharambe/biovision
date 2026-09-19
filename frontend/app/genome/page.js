'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { ChromosomeMap } from '../../components/genome/ChromosomeMap';
import { DnaStrand } from '../../components/DnaStrand';

export default function GenomeExplorer() {
  const [genomes, setGenomes]           = useState([]);
  const [chromosomes, setChromosomes]   = useState([]);
  const [genes, setGenes]               = useState([]);
  const [mutations, setMutations]       = useState([]);
  const [genome, setGenome]             = useState(null);
  const [chromosome, setChromosome]     = useState(null);
  const [selectedGene, setSelectedGene] = useState(null);
  const [geneDetail, setGeneDetail]     = useState(null);

  useEffect(() => {
    api.genomes().then((gs) => {
      setGenomes(gs || []);
      if (gs && gs.length) setGenome(gs[0].genome_id);
    });
  }, []);

  useEffect(() => {
    if (!genome) return;
    api.chromosomes(genome).then((cs) => {
      setChromosomes(cs || []);
      if (cs && cs.length) setChromosome(cs.find(c => c.chromosome_number === '17') || cs[0]);
    });
  }, [genome]);

  useEffect(() => {
    if (!chromosome) return;
    Promise.all([
      api.genes(chromosome.chromosome_number),
      api.mutations(`chromosome=${chromosome.chromosome_number}`),
    ]).then(([gs, ms]) => {
      setGenes(gs || []);
      setMutations(ms || []);
      if (gs && gs.length) setSelectedGene(gs[0].gene_name);
    });
  }, [chromosome]);

  useEffect(() => {
    if (!selectedGene) return;
    api.gene(selectedGene).then(setGeneDetail);
  }, [selectedGene]);

  return (
    <div>
      <PageHeader
        eyebrow="Explore"
        title="Genome Explorer"
        description="Organism → genome → chromosome → gene → mutation. Click any gene to see its DNA sequence, RNA expression, proteins and mutations."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card title="Genome">
          <select className="w-full bg-panel2 border border-border rounded px-3 py-2 text-sm"
                  value={genome || ''} onChange={(e) => setGenome(e.target.value)}>
            {genomes.map(g => (
              <option key={g.genome_id} value={g.genome_id}>
                {g.genome_id} · {g.organism} · {g.assembly_version}
              </option>
            ))}
          </select>
        </Card>
        <Card title="Chromosome">
          <select className="w-full bg-panel2 border border-border rounded px-3 py-2 text-sm"
                  value={chromosome?.chromosome_number || ''}
                  onChange={(e) => setChromosome(chromosomes.find(c => c.chromosome_number === e.target.value))}>
            {chromosomes.map(c => (
              <option key={c.chromosome_number} value={c.chromosome_number}>
                Chr {c.chromosome_number} · {(c.length_bp/1e6).toFixed(1)} Mb · {c.gc_content}% GC
              </option>
            ))}
          </select>
        </Card>
        <Card title="Gene">
          <select className="w-full bg-panel2 border border-border rounded px-3 py-2 text-sm"
                  value={selectedGene || ''} onChange={(e) => setSelectedGene(e.target.value)}>
            {genes.map(g => (
              <option key={g.gene_id} value={g.gene_name}>
                {g.gene_name} · {g.biotype}
              </option>
            ))}
          </select>
        </Card>
      </div>

      <Card title="Chromosome map"
            subtitle={chromosome ? `Chromosome ${chromosome.chromosome_number} — genes as ticks, mutations as red dots` : ''}
            className="mb-6">
        <ChromosomeMap
          chromosome={chromosome}
          genes={genes}
          mutations={mutations}
          selectedGene={selectedGene}
          onSelectGene={setSelectedGene}
        />
      </Card>

      {geneDetail && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card title="Gene">
              <div className="text-lg font-medium">{geneDetail.gene_name}</div>
              <div className="text-xs text-muted mt-1">{geneDetail.gene_id}</div>
              <div className="mt-3 text-sm text-text/80 leading-relaxed">{geneDetail.description}</div>
              <div className="mt-3 text-xs text-muted">
                Chr {geneDetail.chromosome} · {geneDetail.start}–{geneDetail.end} · strand {geneDetail.strand}
              </div>
            </Card>

            <Card title="Proteins" className="md:col-span-2">
              {geneDetail.proteins?.length ? (
                <table className="data">
                  <thead>
                    <tr><th>Protein</th><th>Length</th><th>MW (Da)</th><th>Abundance</th><th>Location</th></tr>
                  </thead>
                  <tbody>
                    {geneDetail.proteins.map((p, i) => (
                      <tr key={i}>
                        <td className="font-medium">{p.protein_name}</td>
                        <td>{p.length}</td>
                        <td>{p.molecular_weight?.toFixed(0)}</td>
                        <td className="text-accent">{p.abundance?.toFixed(2)}</td>
                        <td className="text-muted">{p.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="text-muted text-sm">No proteins.</div>}
            </Card>
          </div>

          <Card title="DNA sequence sample" subtitle="A · C · G · T shown with nucleotide-specific colouring" className="mb-6">
            <DnaStrand sequence={geneDetail.dna_sequence_sample} />
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Mutations in this gene">
              <div className="scrollbox">
                <table className="data">
                  <thead>
                    <tr><th>ID</th><th>Type</th><th>Consequence</th><th>Pos</th><th>Ref → Alt</th><th>Freq</th></tr>
                  </thead>
                  <tbody>
                    {geneDetail.mutations.map((m, i) => (
                      <tr key={i}>
                        <td className="font-mono text-xs">{m.mutation_id}</td>
                        <td><span className="badge">{m.type}</span></td>
                        <td className="text-muted">{m.consequence}</td>
                        <td className="tabular-nums">{m.position}</td>
                        <td className="font-mono text-xs">{m.ref} → {m.alt}</td>
                        <td className="tabular-nums">{m.frequency?.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="RNA expression (sampled)">
              <div className="scrollbox">
                <table className="data">
                  <thead>
                    <tr><th>Sample</th><th>Tissue</th><th>Condition</th><th>Expression</th><th>Category</th></tr>
                  </thead>
                  <tbody>
                    {geneDetail.rna_expression.map((r, i) => (
                      <tr key={i}>
                        <td className="font-mono text-xs">{r.rna_sample_id}</td>
                        <td>{r.tissue}</td>
                        <td className={r.condition === 'diseased' ? 'text-warn' : 'text-good'}>{r.condition}</td>
                        <td className="tabular-nums text-accent">{r.expression?.toFixed(2)}</td>
                        <td><span className="badge">{r.category}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
