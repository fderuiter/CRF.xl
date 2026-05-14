import { 
    StudyDesign, 
    DataType, 
    TranslatedText,
    QuerySeverity
} from "../../types";

/**
 * Main entry point for generating CDISC ODM v1.3.2 Metadata.
 */
export function generateOdmXml(study: StudyDesign): string {
    const timestamp = new Date().toISOString();
    const metadata = study.metadata;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3" 
     FileType="Snapshot" 
     FileOID="${metadata.protocolId}_${metadata.version}" 
     CreationDateTime="${timestamp}" 
     ODMVersion="1.3.2">`;

    xml += `
  <Study OID="${metadata.protocolId}">
    <GlobalVariables>
      <StudyName>${metadata.studyName}</StudyName>
      <StudyDescription>${metadata.studyName} Protocol ${metadata.protocolId}</StudyDescription>
      <ProtocolName>${metadata.protocolId}</ProtocolName>
    </GlobalVariables>
    <MetaDataVersion OID="MV.${metadata.version}" Name="Version ${metadata.version}">`;

    // 1. Protocol / Event References
    xml += `
      <Protocol>`;
    study.events.forEach(event => {
        xml += `
        <StudyEventRef StudyEventOID="${event.eventOid}" OrderNumber="${event.orderNumber}" Mandatory="Yes"${event.showIf ? ` CollectionExceptionConditionOID="COND.${event.eventOid}"` : ''}/>`;
    });
    xml += `
      </Protocol>`;

    // 2. Study Event Definitions
    study.events.forEach(event => {
        xml += `
      <StudyEventDef OID="${event.eventOid}" Name="${event.eventName}" Type="${event.eventType}" Repeating="No">`;
        event.forms.forEach(fRef => {
            xml += `
        <FormRef FormOID="${fRef.formOid}" OrderNumber="${fRef.orderNumber}" Mandatory="${fRef.mandatory ? 'Yes' : 'No'}"${fRef.showIf ? ` CollectionExceptionConditionOID="COND.${fRef.formOid}"` : ''}/>`;
        });
        xml += `
      </StudyEventDef>`;
    });

    // 3. Form Definitions
    Object.values(study.forms).forEach(form => {
        xml += `
      <FormDef OID="${form.formOid}" Name="${form.formName}" Repeating="${form.repeating ? 'Yes' : 'No'}">`;
        form.itemGroups.forEach(group => {
            xml += `
        <ItemGroupRef ItemGroupOID="${group.groupOid}" OrderNumber="${group.orderNumber}" Mandatory="Yes"${group.showIf ? ` CollectionExceptionConditionOID="COND.${group.groupOid}"` : ''}/>`;
        });
        xml += `
      </FormDef>`;
    });

    // 4. ItemGroup Definitions
    Object.values(study.forms).forEach(form => {
        form.itemGroups.forEach(group => {
            xml += `
      <ItemGroupDef OID="${group.groupOid}" Name="${group.name}" Repeating="${group.repeating ? 'Yes' : 'No'}">`;
            group.items.forEach(item => {
                xml += `
        <ItemRef ItemOID="${item.itemOid}" OrderNumber="${item.orderNumber}" Mandatory="${item.validation.required ? 'Yes' : 'No'}"${item.showIf ? ` CollectionExceptionConditionOID="COND.${item.itemOid}"` : ''}/>`;
            });
            xml += `
      </ItemGroupDef>`;
        });
    });

    // 5. Item Definitions
    const processedItems = new Set<string>();
    Object.values(study.forms).forEach(form => {
        form.itemGroups.forEach(group => {
            group.items.forEach(item => {
                if (processedItems.has(item.itemOid)) return;
                processedItems.add(item.itemOid);

                const odmType = mapDataTypeToOdm(item.dataType);
                xml += `
      <ItemDef OID="${item.itemOid}" Name="${item.name}" DataType="${odmType}"${item.sdtmMapping?.sasFieldName ? ` SASFieldName="${item.sdtmMapping.sasFieldName}"` : ''}>`;
                xml += renderTranslatedText("Question", item.label, metadata.defaultLanguage);
                
                if (item.codelistId) {
                    xml += `
        <CodeListRef CodeListOID="${item.codelistId}"/>`;
                }

                // Sophisticated Edit Check: RangeChecks
                if (item.validation.rangeChecks && item.validation.rangeChecks.length > 0) {
                    item.validation.rangeChecks.forEach((check, idx) => {
                        const softHard = check.severity === QuerySeverity.HARD_ERROR ? 'Hard' : 'Soft';
                        xml += `
        <RangeCheck Comparator="${mapComparator(check.comparator)}" SoftHard="${softHard}">
          <CheckValue>${check.value}</CheckValue>${check.errorMessage ? renderTranslatedText("ErrorMessage", check.errorMessage, metadata.defaultLanguage) : ''}
        </RangeCheck>`;
                    });
                }

                // Derivations: MethodRef
                if (item.derivation) {
                    xml += `
        <MethodRef MethodOID="MT.${item.itemOid}"/>`;
                }
                
                // SDTM Alias mapping
                if (item.sdtmMapping) {
                    xml += `
        <Alias Context="SDTM" Name="${item.sdtmMapping.domain}.${item.sdtmMapping.variable}"/>`;
                }

                xml += `
      </ItemDef>`;
            });
        });
    });

    // 6. CodeLists
    Object.values(study.codelists).forEach(cl => {
        const odmType = mapDataTypeToOdm(cl.dataType);
        xml += `
      <CodeList OID="${cl.codelistId}" Name="${cl.codelistName}" DataType="${odmType}">`;
        cl.items.forEach(item => {
            xml += `
        <CodeListItem CodedValue="${item.codedValue}">`;
            xml += renderTranslatedText("Decode", item.decodedText, metadata.defaultLanguage);
            xml += `
        </CodeListItem>`;
        });
        xml += `
      </CodeList>`;
    });

    // 7. Sophisticated Condition Definitions (Branching Logic)
    xml += renderConditionDefs(study);

    // 8. Sophisticated Method Definitions (Derivations)
    xml += renderMethodDefs(study);

    xml += `
    </MetaDataVersion>
  </Study>
</ODM>`;

    return xml;
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
 * Maps standard comparators to ODM specific ones.
 */
function mapComparator(comp: string): string {
    const map: Record<string, string> = {
        '==': 'EQ', '!=': 'NE', '<': 'LT', '<=': 'LE', '>': 'GT', '>=': 'GE'
    };
    return map[comp] || 'EQ';
}

/**
 * Renders all unique ConditionDef elements for the metadata.
 */
function renderConditionDefs(study: StudyDesign): string {
    let output = "";
    const processed = new Set<string>();

    const checkAndRender = (oid: string, logic: string) => {
        if (processed.has(oid)) return;
        processed.add(oid);
        output += `
      <ConditionDef OID="COND.${oid}" Name="Condition for ${oid}">
        <Description>
          <TranslatedText xml:lang="en">Logic: ${logic}</TranslatedText>
        </Description>
        <FormalExpression Context="ExpressionEngine">${logic}</FormalExpression>
      </ConditionDef>`;
    };

    study.events.forEach(e => e.showIf && checkAndRender(e.eventOid, e.showIf));
    Object.values(study.forms).forEach(f => {
        if (f.formOid && (f as any).showIf) checkAndRender(f.formOid, (f as any).showIf);
        f.itemGroups.forEach(g => {
            if (g.showIf) checkAndRender(g.groupOid, g.showIf);
            g.items.forEach(i => i.showIf && checkAndRender(i.itemOid, i.showIf));
        });
    });

    return output;
}

/**
 * Renders MethodDef elements for computed fields.
 */
function renderMethodDefs(study: StudyDesign): string {
    let output = "";
    Object.values(study.forms).forEach(f => {
        f.itemGroups.forEach(g => {
            g.items.forEach(i => {
                if (i.derivation) {
                    output += `
      <MethodDef OID="MT.${i.itemOid}" Name="Derivation for ${i.itemOid}" Type="Computation">
        <Description>
          <TranslatedText xml:lang="en">Calculation: ${i.derivation.expression}</TranslatedText>
        </Description>
        <FormalExpression Context="ExpressionEngine">${i.derivation.expression}</FormalExpression>
      </MethodDef>`;
                }
            });
        });
    });
    return output;
}

/**
 * Helper to render localized ODM tags (Question, Decode, ErrorMessage).
 */
function renderTranslatedText(tag: string, text: TranslatedText, defaultLang: string): string {
    let output = "";
    Object.entries(text).forEach(([lang, val]) => {
        const cleanVal = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        output += `
        <${tag}>
          <TranslatedText xml:lang="${lang}">${cleanVal}</TranslatedText>
        </>`;
    });
    return output;
}
