import { StudyDesign, isCrfItem } from "../../types/hierarchy";
import { DataType } from "../../types/enums";
import * as CryptoJS from "crypto-js";

export async function generatePdfBlob(study: StudyDesign, validationIssues: any[] = []): Promise<Blob> {
  const protocolId = study.metadata.protocolId || "UNKNOWN";
  const timestamp = new Date().toISOString();
  
  const studyHashInput = JSON.stringify(study);
  const studyHash = CryptoJS.SHA256(studyHashInput).toString(CryptoJS.enc.Hex);

  // 1. Create hidden container
  const container = document.createElement("div");
  // Position off-screen but visible for measurement
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0px";
  // A4 size approximately (we'll scale appropriately)
  container.style.width = "800px";
  container.style.backgroundColor = "white";
  container.style.color = "black";
  container.style.fontFamily = "Arial, sans-serif";
  container.style.fontSize = "12px";
  document.body.appendChild(container);

  // 2. Generate initial HTML structure
  let html = `
    <div class="pdf-page" style="padding: 40px; box-sizing: border-box; page-break-after: always;">
      <h1 style="font-size: 24px; margin-bottom: 20px;">Reviewer Export - Annotated CRF</h1>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Protocol ID:</strong> ${protocolId}</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Exported At:</strong> ${timestamp}</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Study Cryptographic Hash:</strong> ${studyHash}</p>
      
      <h2 style="font-size: 18px; margin-top: 30px; margin-bottom: 10px;">Validation Outcomes Summary</h2>
      <ul style="font-size: 14px;">
        ${validationIssues.length > 0 ? validationIssues.map(v => `<li>${v.level}: ${v.message}</li>`).join('') : '<li>No validation issues</li>'}
      </ul>
    </div>
  `;

  let formIndex = 0;
  for (const [formOid, form] of Object.entries(study.forms)) {
    html += `
      <div class="pdf-page form-page" style="padding: 40px; box-sizing: border-box; position: relative; ${formIndex < Object.keys(study.forms).length - 1 ? 'page-break-after: always;' : ''}">
        <div class="clinical-header" style="background-color: #eeeeee; padding: 10px; margin-bottom: 20px; font-weight: bold; font-size: 14px; border: 1px solid #ccc;">
          Protocol ID: ${protocolId} | Form: ${formOid} (${form.formName}) | Subject: ____ | Visit: ____
        </div>
    `;

    form.itemGroups.forEach(group => {
      html += `<div class="item-group" style="margin-bottom: 20px;">`;
      group.items.forEach(item => {
        if (isCrfItem(item)) {
          let affordanceText = '<div style="width: 20px; height: 20px; border: 1px solid #333; display: inline-block;"></div>'; // Default Checkbox
          if (item.dataType === DataType.INTEGER || item.dataType === DataType.FLOAT) {
            affordanceText = '<div style="border-bottom: 1px solid #333; width: 50px; display: inline-block;"></div>';
          } else if (item.dataType === DataType.TEXT) {
            affordanceText = '<div style="border-bottom: 1px solid #333; width: 200px; display: inline-block;"></div>';
          } else if (item.vasConfig) {
            affordanceText = '<div style="border-bottom: 2px solid #333; width: 300px; display: inline-block; position: relative;"><div style="position: absolute; left: 0; top: -5px; height: 10px; width: 2px; background: #333;"></div><div style="position: absolute; right: 0; top: -5px; height: 10px; width: 2px; background: #333;"></div></div>';
          }

          html += `
            <div class="crf-item" data-oid="${item.itemOid}" style="margin-bottom: 20px; display: flex; align-items: center; position: relative;">
              <span class="item-label" style="width: 250px; padding-right: 15px;">${item.name}</span>
              <span class="item-affordance" style="flex-grow: 1;">${affordanceText}</span>
            </div>
          `;
        }
      });
      html += `</div>`;
    });

    html += `</div>`;
    formIndex++;
  }

  container.innerHTML = html;

  // 3. Coordinate-mapping service
  const formPages = container.querySelectorAll(".form-page");
  
  formPages.forEach((page) => {
    const pageRect = page.getBoundingClientRect();
    const occupiedRects: DOMRect[] = [];
    
    // Add all existing elements to occupied rects
    page.querySelectorAll(".item-label, .clinical-header").forEach(el => {
      occupiedRects.push(el.getBoundingClientRect());
    });

    const items = page.querySelectorAll(".crf-item");
    items.forEach((itemNode) => {
      const oid = itemNode.getAttribute("data-oid");
      
      let foundItem: any = null;
      for (const form of Object.values(study.forms)) {
        for (const group of form.itemGroups) {
          const item = group.items.find(i => isCrfItem(i) && i.itemOid === oid);
          if (item) {
            foundItem = item;
            break;
          }
        }
        if (foundItem) break;
      }

      if (foundItem) {
        const sasName = foundItem.sdtmMapping?.sasFieldName || foundItem.itemOid;
        
        let bubbleColor = "#1F77B4";
        if (foundItem.codelistId) {
          bubbleColor = "#2CA02C";
        } else if (foundItem.showIf || foundItem.enableIf) {
          bubbleColor = "#FF7F0E";
        }

        const affordanceNode = itemNode.querySelector(".item-affordance") as HTMLElement;
        const targetRect = affordanceNode.getBoundingClientRect();

        // 4. Absolute positioning of overlays
        let bubbleLeft = targetRect.left - pageRect.left + 250; 
        // Try placing it to the right of the affordance
        if (foundItem.dataType === DataType.TEXT) bubbleLeft = targetRect.left - pageRect.left + 220;
        else if (foundItem.vasConfig) bubbleLeft = targetRect.left - pageRect.left + 320;
        else bubbleLeft = targetRect.left - pageRect.left + 70;

        let bubbleTop = targetRect.top - pageRect.top;

        const bubbleContainer = document.createElement("div");
        bubbleContainer.style.position = "absolute";
        bubbleContainer.style.zIndex = "100";
        bubbleContainer.style.display = "flex";
        bubbleContainer.style.alignItems = "center";
        
        const line = document.createElement("div");
        line.style.height = "1px";
        line.style.backgroundColor = bubbleColor;
        line.style.width = "20px";
        
        const bubble = document.createElement("div");
        bubble.className = "annotation-bubble";
        bubble.style.backgroundColor = bubbleColor;
        bubble.style.color = "white";
        bubble.style.padding = "4px 8px";
        bubble.style.fontSize = "10px";
        bubble.style.borderRadius = "4px";
        bubble.style.whiteSpace = "nowrap";
        bubble.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
        let sdtmDomain = foundItem.sdtmMapping?.domain || "N/A";
        let sdtmVar = foundItem.sdtmMapping?.variable || sasName || "N/A";
        let nciCode = foundItem.sdtmMapping?.nciVariableCode || foundItem.codelistId || "N/A";
        
        let metadataHtml = `<strong>Domain:</strong> ${sdtmDomain}<br/><strong>Var:</strong> ${sdtmVar}<br/><strong>NCI:</strong> ${nciCode}`;
        
        const comment = foundItem.comment ? `<br/><span style="font-style: italic;">${foundItem.comment}</span>` : "";
        bubble.innerHTML = `[${foundItem.itemOid}]<br/>${metadataHtml}${comment}`;

        bubbleContainer.appendChild(line);
        bubbleContainer.appendChild(bubble);
        
        // Temporarily append to measure
        bubbleContainer.style.left = `${bubbleLeft}px`;
        bubbleContainer.style.top = `${bubbleTop}px`;
        page.appendChild(bubbleContainer);

        let bubbleRect = bubbleContainer.getBoundingClientRect();
        
        // Collision logic (shift down if overlapping)
        let overlapping = true;
        let shiftCount = 0;
        while (overlapping && shiftCount < 15) {
          overlapping = false;
          for (const rect of occupiedRects) {
            // Check intersection with small margin
            if (
              bubbleRect.left < rect.right + 2 &&
              bubbleRect.right > rect.left - 2 &&
              bubbleRect.top < rect.bottom + 2 &&
              bubbleRect.bottom > rect.top - 2
            ) {
              overlapping = true;
              break;
            }
          }
          if (overlapping) {
            bubbleTop += 15;
            bubbleContainer.style.top = `${bubbleTop}px`;
            bubbleRect = bubbleContainer.getBoundingClientRect();
            
            // Adjust the lead line to be diagonal if it shifts too much
            if (shiftCount > 0) {
               const dy = shiftCount * 15;
               const dx = 20;
               const length = Math.sqrt(dx*dx + dy*dy);
               const angle = Math.atan2(-dy, dx) * (180 / Math.PI);
               line.style.width = `${length}px`;
               line.style.transformOrigin = "left center";
               line.style.transform = `rotate(${angle}deg)`;
            }
            
            shiftCount++;
          }
        }
        
        occupiedRects.push(bubbleRect);
      }
    });
  });

  // 5. Generate PDF using multi-stage HTML-to-PDF pipeline in background worker
  try {
    let html2pdf: any;
    try {
      const module = await import("html2pdf.js");
      html2pdf = module.default || module;
    } catch (e) {
      console.error("Failed to load html2pdf.js", e);
      throw e;
    }

    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `${protocolId}_Annotated_CRF.pdf`,
      image:        { type: "jpeg", quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak:    { mode: ["css", "legacy"] }
    };

    // The set({worker: true}) uses jsPDF's web worker for generation
    const worker = html2pdf().set(opt).from(container);
    const pdfBlob = await worker.outputPdf("blob");
    return pdfBlob;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
