CRF.xl: Vision & System Architecture

1. Executive Summary

CRF.xl is a specialized middleware for Clinical Data Management. It transforms standard Microsoft Excel workbooks into validated, standards-compliant clinical study assets. By leveraging the familiarity of Excel, it reduces study build times and ensures metadata consistency from design to production.

2. Technical Stack

Runtime: Microsoft Office Add-in (Web-based).

Frontend Framework: React 18+ with TypeScript.

Office API: Office.js (Excel 1.1+ Requirement).

Styling: Tailwind CSS (Utility-first UI).

State Management: React Context/Local State (In-memory for performance).

File Utilities:

docx.js for Word generation.

Native Browser Blob API for XML/File downloads.

3. Modular System Design

The system is divided into four distinct "Layers":

3.1 Interface Layer (React)

Handles user interaction, the multi-step workflow stepper, and the visualization of the Validation Log.

3.2 Parsing Layer (Office.js + TS)

Interacts directly with the Excel object model. Extracts raw data from named sheets and maps them into an intermediate StudyDesign JSON object.

3.3 Logic Layer (Validator)

Processes the StudyDesign object. It does not touch the Excel API; it performs pure-logic checks for referential integrity and business rules.

3.4 Generation Layer (Export Engines)

Factories that consume the validated StudyDesign object and produce binary or text-based assets (.docx, .xml).

4. Development Principles

Idempotency: Scaffolding actions should never destroy existing user data without confirmation.

Separation of Concerns: The export engines must be "blind" to Excel; they only know the StudyDesign schema.

Performance: Large studies (1000+ items) must be parsed without blocking the UI thread (use of await context.sync() optimization).
