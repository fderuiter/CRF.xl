import { 
    StudyDesign, 
    DataType, 
    TranslatedText 
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
        <StudyEventRef StudyEventOID="${event.eventOid}" OrderNumber="${event.orderNumber}" Mandatory="Yes"/>`;
    });
    xml += `
      </Protocol>`;

    // 2. Study Event Definitions
    study.events.forEach(event => {
        xml += `
      <StudyEventDef OID="${event.eventOid}" Name="${event.eventName}" Type="${event.eventType}" Repeating="No">`;
        event.forms.forEach(fRef => {
            xml += `
        <FormRef FormOID="${fRef.formOid}" OrderNumber="${fRef.orderNumber}" Mandatory="${fRef.mandatory ? 'Yes' : 'No'}"/>`;
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
        <ItemGroupRef ItemGroupOID="${group.groupOid}" OrderNumber="${group.orderNumber}" Mandatory="Yes"/>`;
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
        <ItemRef ItemOID="${item.itemOid}" OrderNumber="${item.orderNumber}" Mandatory="${item.validation.required ? 'Yes' : 'No'}"/>`;
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
 * Helper to render localized ODM tags (Question, Decode).
 */
function renderTranslatedText(tag: string, text: TranslatedText, defaultLang: string): string {
    let output = "";
    Object.entries(text).forEach(([lang, val]) => {
        // Sanitize XML entities
        const cleanVal = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        output += `
        <${tag}>
          <TranslatedText xml:lang="${lang}">${cleanVal}</TranslatedText>
        </>`;
    });
    return output;
}
