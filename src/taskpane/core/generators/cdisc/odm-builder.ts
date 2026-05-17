import {
    StudyDesign,
    DataType,
    TranslatedText,
    CrfItem,
    EventType
} from "../../types/index";

/**
 * Main entry point for CDISC ODM v1.3.2 Metadata generation.
 * Produces a "Snapshot" metadata file for EDC system ingestion.
 */
export function generateOdmXml(study: StudyDesign): string {
    const timestamp = new Date().toISOString();
    const metadata = study.metadata;

    // Header & Root Entity
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3" 
     FileType="Snapshot" 
     FileOID="${metadata.protocolId}_${metadata.version}_${timestamp.replace(/[:.-]/g, '')}"
     CreationDateTime="${timestamp}" 
     ODMVersion="1.3.2">`;

    xml += `
  <Study OID="${metadata.protocolId}">
    <GlobalVariables>
      <StudyName>${escapeXml(metadata.studyName)}</StudyName>
      <StudyDescription>Metadata export for Protocol ${metadata.protocolId}</StudyDescription>
      <ProtocolName>${escapeXml(metadata.protocolId)}</ProtocolName>
    </GlobalVariables>
    <MetaDataVersion OID="MV.${metadata.version}" Name="Version ${metadata.version}">`;

    // 1. Protocol / Event References
    xml += `
      <Protocol>`;
    study.events.forEach(event => {
        xml += `
        <StudyEventRef StudyEventOID="${event.eventOid}" OrderNumber="${event.orderNumber}" Mandatory="Yes"/>`;
    });
    xml += `
      </Protocol>`;

    // 2. Study Event Definitions (Visits)
    study.events.forEach(event => {
        xml += `
      <StudyEventDef OID="${event.eventOid}" Name="${escapeXml(event.eventName)}" Type="${event.eventType || 'Scheduled'}" Repeating="No">`;
        event.forms.forEach(fRef => {
            xml += `
        <FormRef FormOID="${fRef.formOid}" OrderNumber="${fRef.orderNumber}" Mandatory="${fRef.mandatory ? 'Yes' : 'No'}"/>`;
        });
        xml += `
      </StudyEventDef>`;
    });

    // 3. Form Definitions (Pages)
    Object.values(study.forms).forEach(form => {
        xml += `
      <FormDef OID="${form.formOid}" Name="${escapeXml(form.formName)}" Repeating="${form.repeating ? 'Yes' : 'No'}">`;
        form.itemGroups.forEach(group => {
            xml += `
        <ItemGroupRef ItemGroupOID="${group.groupOid}" OrderNumber="${group.orderNumber}" Mandatory="Yes"/>`;
        });
        xml += `
      </FormDef>`;
    });

    // 4. ItemGroup Definitions (Sections/Grids)
    Object.values(study.forms).forEach(form => {
        form.itemGroups.forEach(group => {
            xml += `
      <ItemGroupDef OID="${group.groupOid}" Name="${escapeXml(group.name)}" Repeating="${group.repeating ? 'Yes' : 'No'}">`;
            group.items.forEach(item => {
                const conditionAttr = item.showIf
                    ? ` CollectionExceptionConditionOID="COND.${item.itemOid}"`
                    : "";
                xml += `
        <ItemRef ItemOID="${item.itemOid}" OrderNumber="${item.orderNumber}" Mandatory="${item.validation.required ? 'Yes' : 'No'}"${conditionAttr}/>`;
            });
            xml += `
      </ItemGroupDef>`;
        });
    });

    // 5. Item Definitions (Questions)
    // Use a Set to ensure ItemDefs are unique (Shared across forms/groups)
    const processedItems = new Set<string>();
    Object.values(study.forms).forEach(form => {
        form.itemGroups.forEach(group => {
            group.items.forEach(item => {
                if (processedItems.has(item.itemOid)) return;
                processedItems.add(item.itemOid);
                xml += renderItemDef(item);
            });
        });
    });

    // 5b. Condition Definitions
    const processedConditions = new Set<string>();
    Object.values(study.forms).forEach(form => {
        form.itemGroups.forEach(group => {
            group.items.forEach(item => {
                if (!item.showIf) return;

                const conditionOid = `COND.${item.itemOid}`;
                if (processedConditions.has(conditionOid)) return;
                processedConditions.add(conditionOid);

                xml += `
      <ConditionDef OID="${conditionOid}" Name="Show condition for ${escapeXml(item.name)}">
        <FormalExpression Context="CRF.xl">${item.showIf}</FormalExpression>
      </ConditionDef>`;
            });
        });
    });

    // 6. CodeLists (Dictionaries)
    Object.values(study.codelists).forEach(cl => {
        const odmType = mapDataTypeToOdm(cl.dataType);
        xml += `
      <CodeList OID="${cl.codelistId}" Name="${escapeXml(cl.codelistName)}" DataType="${odmType}">`;
        cl.items.forEach(clItem => {
            xml += `
        <CodeListItem CodedValue="${escapeXml(clItem.codedValue)}">
          <Decode>${renderTranslatedText(clItem.decodedText)}</Decode>
        </CodeListItem>`;
        });
        xml += `
      </CodeList>`;
    });

    xml += `
    </MetaDataVersion>
  </Study>
</ODM>`;

    return xml;
}

/**
 * Renders an <ItemDef> block with clinical attributes and SDTM Aliases.
 */
function renderItemDef(item: CrfItem): string {
    const odmType = mapDataTypeToOdm(item.dataType);
    let output = `
      <ItemDef OID="${item.itemOid}" Name="${escapeXml(item.name)}" DataType="${odmType}"`;

    if (Number.isInteger(item.length) && Number(item.length) > 0) {
        output += ` Length="${item.length}"`;
    }

    if (Number.isInteger(item.significantDigits) && Number(item.significantDigits) >= 0) {
        output += ` SignificantDigits="${item.significantDigits}"`;
    }

    if (item.sdtmMapping?.sasFieldName) {
        output += ` SASFieldName="${escapeXml(item.sdtmMapping.sasFieldName)}"`;
    }

    output += `>
        <Question>${renderTranslatedText(item.label)}</Question>`;

    if (item.codelistId) {
        output += `
        <CodeListRef CodeListOID="${item.codelistId}"/>`;
    }

    // SDTM Metadata Alias
    if (item.sdtmMapping?.domain && item.sdtmMapping?.variable) {
        output += `
        <Alias Context="SDTM" Name="${item.sdtmMapping.domain}.${item.sdtmMapping.variable}"/>`;
    }

    output += `
      </ItemDef>`;
    return output;
}

/**
 * Maps internal DataType enum to CDISC ODM standard data types.
 */
function mapDataTypeToOdm(type: DataType): string {
    switch (type) {
        case DataType.INTEGER: return "integer";
        case DataType.FLOAT: return "float";
        case DataType.DATE: return "date";
        case DataType.DATETIME: return "datetime";
        case DataType.BOOLEAN: return "boolean";
        default: return "text";
    }
}

/**
 * Helper to render localized ODM TranslatedText tags.
 */
function renderTranslatedText(text: TranslatedText): string {
    let output = "";
    Object.entries(text).forEach(([lang, val]) => {
        output += `<TranslatedText xml:lang="${lang}">${escapeXml(val as string)}</TranslatedText>`;
    });
    return output;
}

/**
 * Robust XML escaping for clinical labels.
 */
function escapeXml(unsafe: string): string {
    if (!unsafe) return "";
    return unsafe.replace(/[<>&"']/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: return c;
        }
    });
}
