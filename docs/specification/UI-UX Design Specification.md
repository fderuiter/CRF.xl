CRF.xl: UI/UX Design Specification

1. User Journey

Initialize: User opens task pane on a blank workbook and clicks "Initialize".

Author: User fills in clinical sheets (Items, Forms, etc.) using Excel's native features.

Analyze: User clicks "Run Analysis". The log populates with issues.

Fix: User clicks navigation icons in the log to jump to and fix errors in Excel.

Export: User generates Word or XML assets once errors are cleared.

2. Component Breakdown

2.1 Stepper Navigation

State 1 (Setup): Initial state. Only "Initialize" button is active.

State 2 (Authoring): Active after initialization.

State 3 (Analysis): Active once "Run Analysis" has been clicked.

State 4 (Export): Active only if zero "Critical Errors" exist.

2.2 Control Panel

Initialize Button: High contrast (Slate 900).

Analysis Button: Secondary style (Blue).

Export Buttons: Disabled until validation passes. Icons for Word and XML.

2.3 Validation Log

Severity Grouping: Errors (Red) at the top, Warnings (Amber) below.

Empty State: Large "Checkmark" icon with "Clean Specification" text.

Navigation Action: Each issue has a "Link" icon that triggers MapsToSource(sheet, rowIndex).

3. Visual Language

Font: System Sans-Serif (Inter/Segoe UI).

Colors:

Primary: Blue-900 (Clinical Enterprise).

Success: Green-500.

Warning: Amber-500.

Error: Red-600.

Animations: Subtle slide-in for log items; pulsing spinner during Office.js syncs.
