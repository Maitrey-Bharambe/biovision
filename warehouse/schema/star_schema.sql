-- =====================================================================
--  BioVision Multi-Omics Data Warehouse — Star / Snowflake Schema
--  Target: PostgreSQL 14+ (SQLite-compatible fallback in comments)
--  A central fact table joined to conformed dimension tables.
--  DIM_CHROMOSOME snowflakes off DIM_GENOME; DIM_GENE snowflakes off
--  DIM_CHROMOSOME. Everything else is a flat star.
-- =====================================================================

-- ---------- DIMENSIONS -----------------------------------------------

CREATE TABLE IF NOT EXISTS DIM_ORGANISM (
    organism_key      SERIAL      PRIMARY KEY,
    scientific_name   VARCHAR(120) NOT NULL,
    common_name       VARCHAR(120),
    taxonomy_id       INTEGER
);

CREATE TABLE IF NOT EXISTS DIM_GENOME (
    genome_key        SERIAL      PRIMARY KEY,
    genome_id         VARCHAR(32) UNIQUE NOT NULL,   -- e.g. G001
    organism_key      INTEGER     REFERENCES DIM_ORGANISM(organism_key),
    assembly_version  VARCHAR(32),
    build_date        DATE
);

CREATE TABLE IF NOT EXISTS DIM_CHROMOSOME (
    chromosome_key    SERIAL      PRIMARY KEY,
    genome_key        INTEGER     REFERENCES DIM_GENOME(genome_key),
    chromosome_number VARCHAR(8)  NOT NULL,           -- '1'..'22','X','Y','MT'
    length_bp         BIGINT,
    gc_content        NUMERIC(5,2)
);

CREATE TABLE IF NOT EXISTS DIM_GENE (
    gene_key          SERIAL      PRIMARY KEY,
    gene_id           VARCHAR(32) UNIQUE NOT NULL,    -- e.g. ENSG000000001
    gene_name         VARCHAR(64) NOT NULL,           -- e.g. TP53
    chromosome_key    INTEGER     REFERENCES DIM_CHROMOSOME(chromosome_key),
    start_position    BIGINT,
    end_position      BIGINT,
    strand            CHAR(1),
    biotype           VARCHAR(64),
    description       TEXT
);

CREATE TABLE IF NOT EXISTS DIM_SAMPLE (
    sample_key        SERIAL      PRIMARY KEY,
    sample_id         VARCHAR(32) UNIQUE NOT NULL,    -- e.g. S001
    tissue            VARCHAR(64),
    biological_condition VARCHAR(64),                  -- healthy / diseased
    donor_age_bucket  VARCHAR(16),                    -- de-identified
    donor_sex         VARCHAR(8)
);

CREATE TABLE IF NOT EXISTS DIM_RNA (
    rna_key           SERIAL      PRIMARY KEY,
    rna_sample_id     VARCHAR(32) UNIQUE NOT NULL,
    gene_key          INTEGER     REFERENCES DIM_GENE(gene_key),
    tissue            VARCHAR(64),
    condition_label   VARCHAR(64),
    read_count        INTEGER,
    tpm               NUMERIC(12,3),
    fpkm              NUMERIC(12,3),
    expression_value  NUMERIC(12,3),
    expression_category VARCHAR(16)                    -- LOW / MID / HIGH
);

CREATE TABLE IF NOT EXISTS DIM_PROTEIN (
    protein_key       SERIAL      PRIMARY KEY,
    protein_id        VARCHAR(32) UNIQUE NOT NULL,    -- e.g. P04637
    gene_key          INTEGER     REFERENCES DIM_GENE(gene_key),
    protein_name      VARCHAR(120),
    amino_acid_length INTEGER,
    molecular_weight  NUMERIC(12,3),
    abundance         NUMERIC(12,3),
    cellular_location VARCHAR(64),
    ec_number         VARCHAR(32),
    function_summary  TEXT
);

CREATE TABLE IF NOT EXISTS DIM_MUTATION (
    mutation_key      SERIAL      PRIMARY KEY,
    mutation_id       VARCHAR(32) UNIQUE NOT NULL,
    gene_key          INTEGER     REFERENCES DIM_GENE(gene_key),
    chromosome_key    INTEGER     REFERENCES DIM_CHROMOSOME(chromosome_key),
    position          BIGINT,
    ref_allele        VARCHAR(64),
    alt_allele        VARCHAR(64),
    mutation_type     VARCHAR(16),                    -- SNP / INS / DEL / SUB
    consequence       VARCHAR(64),                    -- missense / synonymous / …
    frequency         NUMERIC(6,4)
);

CREATE TABLE IF NOT EXISTS DIM_DISEASE (
    disease_key       SERIAL      PRIMARY KEY,
    disease_id        VARCHAR(32) UNIQUE NOT NULL,
    disease_name      VARCHAR(120),
    disease_category  VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS DIM_IMAGE (
    image_key         SERIAL      PRIMARY KEY,
    image_id          VARCHAR(32) UNIQUE NOT NULL,
    sample_key        INTEGER     REFERENCES DIM_SAMPLE(sample_key),
    image_type        VARCHAR(32),                    -- karyotype / microscopy / …
    tissue            VARCHAR(64),
    label             VARCHAR(32),                    -- healthy / abnormal / …
    source            VARCHAR(120),
    path              VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS DIM_TIME (
    time_key          SERIAL      PRIMARY KEY,
    full_date         DATE UNIQUE,
    year              INTEGER,
    quarter           INTEGER,
    month             INTEGER,
    day               INTEGER,
    day_of_week       INTEGER
);

-- ---------- FACT ------------------------------------------------------

CREATE TABLE IF NOT EXISTS FACT_BIOLOGICAL_OBSERVATION (
    observation_id    BIGSERIAL   PRIMARY KEY,
    sample_key        INTEGER     REFERENCES DIM_SAMPLE(sample_key),
    gene_key          INTEGER     REFERENCES DIM_GENE(gene_key),
    genome_key        INTEGER     REFERENCES DIM_GENOME(genome_key),
    rna_key           INTEGER     REFERENCES DIM_RNA(rna_key),
    protein_key       INTEGER     REFERENCES DIM_PROTEIN(protein_key),
    mutation_key      INTEGER     REFERENCES DIM_MUTATION(mutation_key),
    disease_key       INTEGER     REFERENCES DIM_DISEASE(disease_key),
    image_key         INTEGER     REFERENCES DIM_IMAGE(image_key),
    time_key          INTEGER     REFERENCES DIM_TIME(time_key),

    -- measures
    expression_value  NUMERIC(12,3),
    protein_abundance NUMERIC(12,3),
    mutation_count    INTEGER,
    cv_score          NUMERIC(6,4),
    ml_prediction     VARCHAR(64),
    ml_confidence     NUMERIC(6,4)
);

-- ---------- INDEXES ---------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_fact_sample  ON FACT_BIOLOGICAL_OBSERVATION(sample_key);
CREATE INDEX IF NOT EXISTS idx_fact_gene    ON FACT_BIOLOGICAL_OBSERVATION(gene_key);
CREATE INDEX IF NOT EXISTS idx_fact_disease ON FACT_BIOLOGICAL_OBSERVATION(disease_key);
CREATE INDEX IF NOT EXISTS idx_fact_time    ON FACT_BIOLOGICAL_OBSERVATION(time_key);
CREATE INDEX IF NOT EXISTS idx_gene_chrom   ON DIM_GENE(chromosome_key);
CREATE INDEX IF NOT EXISTS idx_mut_gene     ON DIM_MUTATION(gene_key);

-- ---------- MATERIALIZED VIEWS (aggregates for OLAP roll-up) ---------
-- SQLite fallback: create as regular VIEW.

CREATE OR REPLACE VIEW V_MUT_PER_GENE AS
SELECT g.gene_name,
       c.chromosome_number,
       COUNT(m.mutation_key) AS mutation_count
FROM DIM_MUTATION m
JOIN DIM_GENE       g ON m.gene_key       = g.gene_key
JOIN DIM_CHROMOSOME c ON g.chromosome_key = c.chromosome_key
GROUP BY g.gene_name, c.chromosome_number;

CREATE OR REPLACE VIEW V_AVG_EXPRESSION_PER_DISEASE_GENE AS
SELECT d.disease_name,
       g.gene_name,
       AVG(f.expression_value) AS avg_expression,
       COUNT(*)                AS n
FROM FACT_BIOLOGICAL_OBSERVATION f
JOIN DIM_GENE    g ON f.gene_key    = g.gene_key
JOIN DIM_DISEASE d ON f.disease_key = d.disease_key
GROUP BY d.disease_name, g.gene_name;
