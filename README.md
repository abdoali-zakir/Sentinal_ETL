# Sentinal_ETL
# Sentinel ETL

## Enterprise Self-Healing Data Platform

Sentinel ETL is an enterprise-inspired data platform designed to automatically ingest, validate, repair, transform, and monitor datasets through a modern Medallion Architecture.

The platform demonstrates production-style software engineering practices by combining data engineering, platform reliability, observability, DevOps automation, and full-stack development into a single end-to-end solution.

---

## Overview

Organizations frequently receive datasets containing:

* Missing values
* Duplicate records
* Schema inconsistencies
* Incorrect data types
* Malformed records
* Data quality issues

Traditional ETL pipelines often fail when unexpected data arrives, requiring manual intervention and slowing business operations.

Sentinel ETL addresses this challenge by introducing automated validation, remediation, lineage tracking, and analytical transformation workflows that continuously improve data quality while maintaining full auditability.

---

## Key Features

### Automated Data Ingestion

Upload datasets through a web interface or API and automatically route them into the processing pipeline.

### Data Quality Validation

Detect:

* Missing values
* Duplicate records
* Invalid data types
* Schema drift
* Business rule violations

### Self-Healing Engine

Automatically repair common data quality issues through controlled remediation strategies such as:

* Type conversion
* Default value injection
* Schema normalization
* Column mapping
* Duplicate removal

### Medallion Architecture

The platform implements a modern layered data architecture:

**Bronze Layer**

* Raw immutable data storage

**Silver Layer**

* Cleaned and validated datasets

**Gold Layer**

* Business-ready analytical datasets

### Data Lineage

Track every transformation performed on a dataset from ingestion to final analytical output.

### Audit Logging

Maintain complete traceability of:

* Validation events
* Repair actions
* Pipeline executions
* Dataset versions

### Analytics Dashboard

Visualize:

* Data quality scores
* Pipeline health
* Validation results
* Processing metrics
* Dataset history

---

## Architecture

```text
User Upload
     │
     ▼
 Bronze Layer
     │
     ▼
 Validation Engine
     │
     ▼
 Self-Healing Engine
     │
     ▼
 Silver Layer
     │
     ▼
 Aggregation Engine
     │
     ▼
  Gold Layer
     │
     ▼
 Analytics Dashboard
```

Supporting Services:

* Metadata Management
* Audit Logging
* Data Lineage Tracking
* Health Monitoring
* CI/CD Automation

---

## Technology Stack

### Frontend

* Next.js
* TypeScript
* Tailwind CSS

### Backend

* FastAPI
* Python

### Data Processing

* DuckDB
* Pandas
* PyArrow

### Storage

* Parquet

### Database

* PostgreSQL

### Infrastructure

* Docker
* GitHub Actions

### Deployment

* Vercel
* Render

---

## Engineering Goals

This project is designed to demonstrate competencies expected in modern software and data engineering roles:

* System Design
* Data Engineering
* Reliability Engineering
* API Development
* Full-Stack Development
* DevOps Automation
* CI/CD Pipelines
* Containerization
* Observability
* Software Testing

---

## Project Roadmap

### Phase 1

* Repository setup
* Architecture design
* Development environment

### Phase 2

* Dataset upload service
* Bronze storage layer

### Phase 3

* Validation engine
* Quality scoring

### Phase 4

* Self-healing engine
* Audit logging

### Phase 5

* Silver and Gold transformations

### Phase 6

* Dashboard implementation

### Phase 7

* Testing
* CI/CD
* Deployment
* Documentation

---

## Success Criteria

A user can upload a dataset, automatically repair common data quality issues, track every transformation through lineage records, review audit history, and generate business-ready analytical outputs through a production-style web interface.

---

## Status

🚧 Active Development

This project is currently being developed as a professional software engineering and data engineering portfolio project.

---

## License

MIT License
