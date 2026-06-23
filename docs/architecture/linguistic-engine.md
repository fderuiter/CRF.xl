# Linguistic Engine Architecture

## Overview
The Linguistic Engine provides a centralized mechanism for managing multi-language content within the CRF.xl platform. It handles locale normalization, discovery of language-specific data in Excel, and deterministic fallback logic for UI and exports.

## Core Components

### 1. Linguistic Service (`src/taskpane/core/services/linguistics-service.ts`)
The `LinguisticService` is the central logic hub. It provides:
- **Normalization**: Standardizes locale tags to BCP 47 (e.g., `en-us` -> `en-US`).
- **Discovery**: Regex-based detection of locale patterns in Excel headers (e.g., `Decode (es-ES)`, `Label (fr-FR)`).
- **Resolution**: A deterministic fallback algorithm:
  1. Direct match for the target locale.
  2. Fallback to the study's `defaultLanguage`.
  3. Last resort fallback to any available translation.
- **Completeness**: Calculates metrics to track translation progress across the study.

### 2. Data Model
Linguistic metadata is integrated into the `StudyDesign` model:
- `study.metadata.defaultLanguage`: The primary language of the study.
- `study.metadata.supportedLanguages`: All languages discovered during workbook ingestion.
- `TranslatedText`: A record mapping locales to strings, used in `CrfItem`, `CodelistItem`, etc.

## Integration Layers

### Parser Integration
During the parsing of `_Codelists` and CRF sheets, the `parser-engine` uses `LinguisticService.discoverLocaleFromHeader` to identify translation columns. These are then mapped into the `TranslatedText` fields of the internal model.

### UI Integration
- **Global Toggle**: The `App` component maintains a `selectedLanguage` state, surfaced via a dropdown in the Taskpane Header.
- **Dictionary Sidecar**: Consumes the `selectedLanguage` and uses the `LinguisticService` to resolve and display decodes. Visual indicators (warning icons) are shown when a fallback translation is in use.

### Export Integration
The `odm-builder` utilizes the engine during serialization to ensure that all `<TranslatedText>` elements in the generated CDISC ODM XML use normalized BCP 47 `xml:lang` tags, ensuring compatibility with clinical data systems.

## Visual Feedback
- **Excel Grid**: Translation columns in the `_Codelists` sheet are automatically highlighted with a light green background upon opening the Dictionary Sidecar to assist authors.
- **Taskpane**: Missing translations are handled gracefully via fallbacks and marked with tooltips in the UI.
