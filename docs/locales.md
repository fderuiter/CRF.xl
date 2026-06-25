# Supported Locales and Formatting

CRF.xl supports locale-aware parsing and formatting for dates, numbers, and currency. This ensures that clinical data is interpreted correctly based on the user's regional settings.

## Supported Locales

The system uses the `Intl` API, which supports a wide range of BCP 47 locale tags. Common supported locales include:

- `en-US`: English (United States)
- `de-DE`: German (Germany)
- `fr-FR`: French (France)
- `es-ES`: Spanish (Spain)
- `ja-JP`: Japanese (Japan)

## Numeric Formatting and Parsing

Numeric values are parsed and formatted based on the `decimalSeparator` detected from the environment.

| Locale | Decimal Separator | Group Separator | Example |
|--------|-------------------|-----------------|---------|
| en-US  | `.`               | `,`             | 1,234.56|
| de-DE  | `,`               | `.`             | 1.234,56|
| fr-FR  | `,`               | (space)         | 1 234,56|

## Date Formatting and Parsing

CRF.xl implements a heuristic parsing strategy for dates to handle common regional formats while flagging potential ambiguities.

### Parsing Heuristics

1. **ISO 8601**: `YYYY-MM-DD` is always preferred and is unambiguous.
2. **Regional Formats**:
   - For `en-US`, the expected format is `MM/DD/YYYY`.
   - For most European locales (e.g., `de-DE`, `fr-FR`), the expected format is `DD.MM.YYYY` or `DD/MM/YYYY`.

### Ambiguity Warning Policy

If a date string is provided where the day and month could be swapped and still result in a valid date (e.g., `01/02/2023`), the system will:
- Parse the date according to the current locale's precedence.
- Produce a warning indicating that the interpretation might be ambiguous.

Users are encouraged to use ISO format (`YYYY-MM-DD`) for maximum reliability.

## Currency

Currency formatting uses `Intl.NumberFormat` with `style: 'currency'`. The default currency is `USD`, but it can be specified in the formatting utility.
