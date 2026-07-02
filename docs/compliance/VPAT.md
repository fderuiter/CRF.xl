# Voluntary Product Accessibility Template (VPAT)
## CRF.xl Authoring Taskpane

**Product Name:** CRF.xl Authoring Taskpane  
**Description:** An Excel Add-in taskpane used for clinical study design authoring and compliance governance.  
**Report Date:** 2026-07-02  

### 1. Applicable Standards / Guidelines
This report covers the degree of conformance for the following accessibility standard/guidelines:
* Web Content Accessibility Guidelines (WCAG) 2.1 Level A and Level AA
* Revised Section 508 standards

### 2. Terms
The terms used in the Conformance Level information are defined as follows:
* **Supports:** The functionality of the product has at least one method that meets the criterion without known defects.
* **Partially Supports:** Some functionality of the product does not meet the criterion.
* **Does Not Support:** The majority of product functionality does not meet the criterion.
* **Not Applicable:** The criterion is not relevant to the product.

### 3. WCAG 2.1 Report

#### Table 1: Success Criteria, Level A
| Criteria | Conformance Level | Remarks and Explanations |
| -------- | ----------------- | ------------------------ |
| 1.1.1 Non-text Content | Supports | All non-text content, such as icons in the AnnotationPalette and ComplianceGovernanceView, have appropriate alternative text or are decorative. |
| 1.3.1 Info and Relationships | Supports | UI components (Taskpane, tabs, lists) use standard semantic HTML/React wrappers via FluentUI components. |
| 1.4.1 Use of Color | Supports | Color is not used as the sole method of conveying status (e.g., Error text is accompanied by an icon and semantic badge). |
| 2.1.1 Keyboard | Supports | All interactive elements (e.g., buttons, switches, tabs in AuthoringView and AnnotationPalette) support keyboard navigation via Tab, Enter, and Space keys. |
| 2.1.2 No Keyboard Trap | Supports | Focus can be moved into and out of all taskpane components without getting trapped. |
| 2.4.3 Focus Order | Supports | The focus order in the taskpane follows the logical DOM sequence. |
| 3.3.2 Labels or Instructions | Supports | Labels are provided for all user inputs (e.g., Dropdown for Change Type, Textarea for Edit Content). |

#### Table 2: Success Criteria, Level AA
| Criteria | Conformance Level | Remarks and Explanations |
| -------- | ----------------- | ------------------------ |
| 1.4.3 Contrast (Minimum) | Supports | FluentUI design tokens ensure an adequate contrast ratio of at least 4.5:1 for normal text. |
| 1.4.4 Resize text | Supports | Text can be resized up to 200% without loss of content or functionality. |
| 2.4.7 Focus Visible | Supports | Keyboard focus is visible on all interactive elements via FluentUI's default focus styles. |

### 4. Revised Section 508 Report

#### Chapter 5: Software
| Criteria | Conformance Level | Remarks and Explanations |
| -------- | ----------------- | ------------------------ |
| 502.2.1 User Control of Accessibility Features | Supports | The add-in does not disrupt accessibility features built into Excel or the OS. |
| 502.3.1 Object Information | Supports | Standardized semantic wrappers ensure assistive technologies can read object roles and values. |
