"""Declarative SQLAlchemy models mirroring warehouse/schema/star_schema.sql."""
from __future__ import annotations

from sqlalchemy import (
    Column, Integer, String, Numeric, Date, BigInteger, ForeignKey, Text, CHAR,
)
from sqlalchemy.orm import relationship
from backend.database.db import Base


class DimOrganism(Base):
    __tablename__ = "dim_organism"
    organism_key    = Column(Integer, primary_key=True, autoincrement=True)
    scientific_name = Column(String(120), nullable=False)
    common_name     = Column(String(120))
    taxonomy_id     = Column(Integer)


class DimGenome(Base):
    __tablename__ = "dim_genome"
    genome_key       = Column(Integer, primary_key=True, autoincrement=True)
    genome_id        = Column(String(32), unique=True, nullable=False)
    organism_key     = Column(Integer, ForeignKey("dim_organism.organism_key"))
    assembly_version = Column(String(32))
    build_date       = Column(Date)
    organism = relationship("DimOrganism")


class DimChromosome(Base):
    __tablename__ = "dim_chromosome"
    chromosome_key    = Column(Integer, primary_key=True, autoincrement=True)
    genome_key        = Column(Integer, ForeignKey("dim_genome.genome_key"))
    chromosome_number = Column(String(8), nullable=False)
    length_bp         = Column(BigInteger)
    gc_content        = Column(Numeric(5, 2))
    genome = relationship("DimGenome")


class DimGene(Base):
    __tablename__ = "dim_gene"
    gene_key        = Column(Integer, primary_key=True, autoincrement=True)
    gene_id         = Column(String(32), unique=True, nullable=False)
    gene_name       = Column(String(64), nullable=False)
    chromosome_key  = Column(Integer, ForeignKey("dim_chromosome.chromosome_key"))
    start_position  = Column(BigInteger)
    end_position    = Column(BigInteger)
    strand          = Column(CHAR(1))
    biotype         = Column(String(64))
    description     = Column(Text)
    chromosome = relationship("DimChromosome")


class DimSample(Base):
    __tablename__ = "dim_sample"
    sample_key       = Column(Integer, primary_key=True, autoincrement=True)
    sample_id        = Column(String(32), unique=True, nullable=False)
    tissue           = Column(String(64))
    biological_condition = Column(String(64))
    donor_age_bucket = Column(String(16))
    donor_sex        = Column(String(8))


class DimRna(Base):
    __tablename__ = "dim_rna"
    rna_key             = Column(Integer, primary_key=True, autoincrement=True)
    rna_sample_id       = Column(String(32), unique=True, nullable=False)
    gene_key            = Column(Integer, ForeignKey("dim_gene.gene_key"))
    tissue              = Column(String(64))
    condition_label     = Column(String(64))
    read_count          = Column(Integer)
    tpm                 = Column(Numeric(12, 3))
    fpkm                = Column(Numeric(12, 3))
    expression_value    = Column(Numeric(12, 3))
    expression_category = Column(String(16))
    gene = relationship("DimGene")


class DimProtein(Base):
    __tablename__ = "dim_protein"
    protein_key       = Column(Integer, primary_key=True, autoincrement=True)
    protein_id        = Column(String(32), unique=True, nullable=False)
    gene_key          = Column(Integer, ForeignKey("dim_gene.gene_key"))
    protein_name      = Column(String(120))
    amino_acid_length = Column(Integer)
    molecular_weight  = Column(Numeric(12, 3))
    abundance         = Column(Numeric(12, 3))
    cellular_location = Column(String(64))
    ec_number         = Column(String(32))
    function_summary  = Column(Text)
    gene = relationship("DimGene")


class DimMutation(Base):
    __tablename__ = "dim_mutation"
    mutation_key   = Column(Integer, primary_key=True, autoincrement=True)
    mutation_id    = Column(String(32), unique=True, nullable=False)
    gene_key       = Column(Integer, ForeignKey("dim_gene.gene_key"))
    chromosome_key = Column(Integer, ForeignKey("dim_chromosome.chromosome_key"))
    position       = Column(BigInteger)
    ref_allele     = Column(String(64))
    alt_allele     = Column(String(64))
    mutation_type  = Column(String(16))
    consequence    = Column(String(64))
    frequency      = Column(Numeric(6, 4))
    gene = relationship("DimGene")


class DimDisease(Base):
    __tablename__ = "dim_disease"
    disease_key      = Column(Integer, primary_key=True, autoincrement=True)
    disease_id       = Column(String(32), unique=True, nullable=False)
    disease_name     = Column(String(120))
    disease_category = Column(String(64))


class DimImage(Base):
    __tablename__ = "dim_image"
    image_key   = Column(Integer, primary_key=True, autoincrement=True)
    image_id    = Column(String(32), unique=True, nullable=False)
    sample_key  = Column(Integer, ForeignKey("dim_sample.sample_key"))
    image_type  = Column(String(32))
    tissue      = Column(String(64))
    label       = Column(String(32))
    source      = Column(String(120))
    path        = Column(String(255))


class DimTime(Base):
    __tablename__ = "dim_time"
    time_key    = Column(Integer, primary_key=True, autoincrement=True)
    full_date   = Column(Date, unique=True)
    year        = Column(Integer)
    quarter     = Column(Integer)
    month       = Column(Integer)
    day         = Column(Integer)
    day_of_week = Column(Integer)


class FactBiologicalObservation(Base):
    __tablename__ = "fact_biological_observation"
    observation_id    = Column(Integer, primary_key=True, autoincrement=True)
    sample_key        = Column(Integer, ForeignKey("dim_sample.sample_key"))
    gene_key          = Column(Integer, ForeignKey("dim_gene.gene_key"))
    genome_key        = Column(Integer, ForeignKey("dim_genome.genome_key"))
    rna_key           = Column(Integer, ForeignKey("dim_rna.rna_key"))
    protein_key       = Column(Integer, ForeignKey("dim_protein.protein_key"))
    mutation_key      = Column(Integer, ForeignKey("dim_mutation.mutation_key"))
    disease_key       = Column(Integer, ForeignKey("dim_disease.disease_key"))
    image_key         = Column(Integer, ForeignKey("dim_image.image_key"))
    time_key          = Column(Integer, ForeignKey("dim_time.time_key"))
    expression_value  = Column(Numeric(12, 3))
    protein_abundance = Column(Numeric(12, 3))
    mutation_count    = Column(Integer)
    cv_score          = Column(Numeric(6, 4))
    ml_prediction     = Column(String(64))
    ml_confidence     = Column(Numeric(6, 4))
