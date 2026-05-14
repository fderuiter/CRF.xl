import { StudyDesign } from "../../types";

export function generateOdmXml(study: StudyDesign): string {
    const meta = study.metadata;
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3" FileType="Snapshot" FileOID="${meta.protocolId}_${meta.version}" CreationDateTime="${new Date().toISOString()}" ODMVersion="1.3.2">
  <Study OID="${meta.protocolId}">
    <GlobalVariables><StudyName>${meta.studyName}</StudyName><ProtocolName>${meta.protocolId}</ProtocolName></GlobalVariables>
    <MetaDataVersion OID="V1" Name="Version 1">
      <Protocol>`;

    study.events.forEach(e => {
        xml += `        <StudyEventRef StudyEventOID="${e.eventOid}" OrderNumber="${e.orderNumber}" Mandatory="Yes"/>\n`;
    });
    xml += `      </Protocol>\n`;

    study.events.forEach(e => {
        xml += `      <StudyEventDef OID="${e.eventOid}" Name="${e.eventName}" Repeating="No" Type="Scheduled">\n`;
        e.forms.forEach(f => xml += `        <FormRef FormOID="${f.formOid}" Mandatory="Yes" OrderNumber="${f.orderNumber}"/>\n`);
        xml += `      </StudyEventDef>\n`;
    });

    Object.values(study.forms).forEach(f => {
        xml += `      <FormDef OID="${f.formOid}" Name="${f.formName}" Repeating="No">\n`;
        f.itemGroups.forEach(g => {
            xml += `        <ItemGroupRef ItemGroupOID="${g.groupOid}" Mandatory="Yes" OrderNumber="${g.orderNumber}"/>\n`;
        });
        xml += `      </FormDef>\n`;
    });

    xml += `    </MetaDataVersion>
  </Study>
</ODM>`;
    return xml;
}
