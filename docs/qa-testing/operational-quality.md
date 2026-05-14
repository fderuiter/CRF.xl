CRF.xl: Operational Quality & Reliability Specification

1. Performance Benchmarks

Small Study (50 Items): Analysis must complete in < 2 seconds.

Medium Study (500 Items): Analysis must complete in < 5 seconds.

Large Study (2000+ Items): Analysis must complete in < 15 seconds without freezing the Excel host.

Export Latency: Document generation for a 20-page CRF must complete in < 10 seconds.

2. Error Handling & Resilience

Network Resilience: Verify that the Add-in functions correctly in "Airplane Mode" (Offline) once loaded.

File Permissions: Test behavior when the user attempts to generate a document but has no permission to save to the local temp directory.

Data Corruption: Verify the system handles rows with junk data or infinite recursion in derivation dependencies gracefully.

3. Security & Privacy

PHI Protection: Verify that items marked isPHI: true trigger a warning if they are about to be exported to a non-blinded file format.

Sandbox Isolation: Ensure the Add-in does not attempt to access any files outside of the workbook it was launched from.
