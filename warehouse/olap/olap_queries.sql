-- =====================================================================
--  BioVision OLAP query templates
--  These are the same queries executed by the /olap API endpoints.
--  Each demonstrates a canonical OLAP operation.
-- =====================================================================

-- ---------- ROLL-UP (Gene → Chromosome → Genome) --------------------
-- Aggregate mutation counts up the location hierarchy.

SELECT gen.genome_id,
       chr.chromosome_number,
       g.gene_name,
       COUNT(m.mutation_key) AS mutation_count
FROM DIM_MUTATION m
JOIN DIM_GENE       g   ON m.gene_key       = g.gene_key
JOIN DIM_CHROMOSOME chr ON g.chromosome_key = chr.chromosome_key
JOIN DIM_GENOME     gen ON chr.genome_key   = gen.genome_key
GROUP BY ROLLUP (gen.genome_id, chr.chromosome_number, g.gene_name)
ORDER BY gen.genome_id NULLS FIRST, chr.chromosome_number NULLS FIRST, g.gene_name NULLS FIRST;

-- ---------- DRILL-DOWN (Disease → Tissue → Gene → Mutation) ---------

SELECT d.disease_name,
       s.tissue,
       g.gene_name,
       m.mutation_type,
       COUNT(*) AS observations,
       AVG(f.expression_value) AS avg_expression
FROM FACT_BIOLOGICAL_OBSERVATION f
JOIN DIM_DISEASE  d ON f.disease_key  = d.disease_key
JOIN DIM_SAMPLE   s ON f.sample_key   = s.sample_key
JOIN DIM_GENE     g ON f.gene_key     = g.gene_key
JOIN DIM_MUTATION m ON f.mutation_key = m.mutation_key
GROUP BY d.disease_name, s.tissue, g.gene_name, m.mutation_type
ORDER BY d.disease_name, s.tissue, g.gene_name, m.mutation_type;

-- ---------- SLICE (disease = 'Breast Cancer') -----------------------

SELECT g.gene_name,
       AVG(f.expression_value)  AS avg_expression,
       AVG(f.protein_abundance) AS avg_protein_abundance,
       COUNT(*)                 AS n
FROM FACT_BIOLOGICAL_OBSERVATION f
JOIN DIM_DISEASE d ON f.disease_key = d.disease_key
JOIN DIM_GENE    g ON f.gene_key    = g.gene_key
WHERE d.disease_name = 'Breast Cancer'
GROUP BY g.gene_name
ORDER BY avg_expression DESC;

-- ---------- DICE (Breast Cancer × chromosome 17 × HIGH expression) --

SELECT g.gene_name,
       m.mutation_type,
       COUNT(*) AS n
FROM FACT_BIOLOGICAL_OBSERVATION f
JOIN DIM_DISEASE     d   ON f.disease_key  = d.disease_key
JOIN DIM_GENE        g   ON f.gene_key     = g.gene_key
JOIN DIM_CHROMOSOME  chr ON g.chromosome_key = chr.chromosome_key
JOIN DIM_RNA         r   ON f.rna_key      = r.rna_key
LEFT JOIN DIM_MUTATION m ON f.mutation_key = m.mutation_key
WHERE d.disease_name          = 'Breast Cancer'
  AND chr.chromosome_number   = '17'
  AND r.expression_category   = 'HIGH'
GROUP BY g.gene_name, m.mutation_type
ORDER BY n DESC;
