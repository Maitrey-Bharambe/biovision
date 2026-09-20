const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function req(path, opts = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn(`API ${path} failed:`, err.message);
    return null;
  }
}

export const api = {
  base: API,

  overview:        ()                             => req('/overview'),
  genomes:         ()                             => req('/genomes'),
  chromosomes:     (g)                            => req('/chromosomes' + (g ? `?genome_id=${g}` : '')),
  genes:           (chrom)                        => req('/genes' + (chrom ? `?chromosome=${chrom}` : '')),
  gene:            (id)                           => req(`/genes/${id}`),
  rna:             (params = '')                  => req('/rna-expression' + (params ? `?${params}` : '')),
  rnaTop:          (dir = 'up', limit = 15)       => req(`/rna-expression/top?direction=${dir}&limit=${limit}`),
  rnaHeatmap:      ()                             => req('/rna-expression/heatmap'),
  proteins:        ()                             => req('/proteins'),
  protein:         (id)                           => req(`/proteins/${id}`),
  mutations:       (q = '')                       => req('/mutations' + (q ? `?${q}` : '')),
  mutationTop:     ()                             => req('/mutations/top-genes'),
  mutationByChrom: ()                             => req('/mutations/by-chromosome'),
  samples:         ()                             => req('/samples'),
  sample:          (id)                           => req(`/samples/${id}`),
  images:          ()                             => req('/images'),

  classification:  ()                             => req('/analytics/classification'),
  classifyPredict: (body)                         => req('/analytics/classification/predict', { method: 'POST', body: JSON.stringify(body) }),
  clusters:        ()                             => req('/analytics/clusters'),
  associations:    ()                             => req('/analytics/associations'),
  anomalies:       ()                             => req('/analytics/anomalies'),
  mutationAnalytics:()                            => req('/analytics/mutations'),
  expressionAnalytics:()                          => req('/analytics/expression'),

  cvReport:        ()                             => req('/cv/report'),
  cvGallery:       (n = 12)                       => req(`/cv/gallery?n=${n}`),
  cvPredict:       (exemplar = 'abnormal')        => req(`/cv/predict?exemplar=${exemplar}`, { method: 'POST' }),
  dnaEncodePredict:(body)                         => req('/cv/dna-encode-predict', { method: 'POST', body: JSON.stringify(body) }),

  olapRollup:      (level)                        => req(`/olap/rollup?level=${level}`),
  olapDrill:       (q = '')                       => req('/olap/drilldown' + (q ? `?${q}` : '')),
  olapSlice:       (disease)                      => req(`/olap/slice?disease=${encodeURIComponent(disease)}`),
  olapDice:        (disease, chrom, cat = 'HIGH') => req(`/olap/dice?disease=${encodeURIComponent(disease)}&chromosome=${chrom}&expression_category=${cat}`),

  // OLAP · cross-domain
  olapAlphaRollup: (level)                        => req(`/olap/alpha/rollup?level=${level}`),
  olapAlphaDice:   (q)                            => req('/olap/alpha/dice' + (q ? `?${q}` : '')),
  olapAlphaPivot:  (r, c)                         => req(`/olap/alpha/pivot?row_dim=${r}&col_dim=${c}`),
  olapCvRollup:    ()                             => req('/olap/cv/rollup'),
  olapCvBins:      ()                             => req('/olap/cv/confidence-bins'),
  olapCvErrors:    ()                             => req('/olap/cv/errors'),

  // OLAP · 3-D cube
  cube:            (params = {}) => {
    const qs = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    return req('/olap/cube' + (qs ? `?${qs}` : ''));
  },
  cubeDimensions:  ()                             => req('/olap/cube/dimensions'),

  warehouseSchema: ()                             => req('/warehouse/schema'),
  runEtl:          ()                             => req('/etl/run', { method: 'POST' }),

  // AlphaGenome Lab
  alphaCatalog:    ()                             => req('/alpha/catalog'),
  geneReference:   (gene, length = 240)           => req(`/alpha/gene-reference?gene=${gene}&length=${length}`),
  dnaEdit:         (body)                         => req('/alpha/dna-edit', { method: 'POST', body: JSON.stringify(body) }),
  variantEffect:   (body)                         => req('/alpha/variant-effect', { method: 'POST', body: JSON.stringify(body) }),
  remedy:          (mutations)                    => req('/alpha/remedy', { method: 'POST', body: JSON.stringify({ mutations }) }),
  remedyForSample: (id)                           => req(`/alpha/remedy/for-sample/${id}`),
};
