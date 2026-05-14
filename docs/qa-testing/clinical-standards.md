# CRF.xl: Clinical Standards Compliance (CDISC & SDTM)

## 1. CDISC ODM v1.3.2 Mapping

Objective: Verify that the intermediate StudyDesign model aligns with CDISC metadata standards.

### 1.1 Metadata Identity (OID)

Verify that all OIDs (Event, Form, Group, Item, Codelist) follow the required regex: [A-Za-z0-9._-]+.

Check that FileOID is unique and follows the pattern: [ProtocolID]_[Version]_[Timestamp].

### 1.2 Data Type Alignment

| Clinical Data Type | CDISC DataType Mapping | Notes |
|---|---|---|
| Integer | integer | |
| Float | float | |
| Date | date | |
| Datetime | datetime | |
| PartialDate | partialDate | Verified via PartialDateConfig |
## 2. SDTM & Regulatory Readiness

Variable Aliasing: Ensure that the sdtmMapping object correctly stores domain, variable, and sasLabel.

NCI Terminology: Verify that nciCode fields are preserved during parsing and exported in the ODM <Alias> or <CodeListItem> tags.

CDASH Compliance: Ensure that required and requireIf flags are correctly mapped to indicate "Mandatory" status in the metadata.
