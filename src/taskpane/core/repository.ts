import { StudyDesign, StudyEvent, CrfForm, ItemGroup, CrfItem, CrfFormElement, isCrfItem } from "./types/hierarchy";
import { migrateStudyDesign } from "./parser/migration";

export class StudyRepository {
  private _data: StudyDesign;

  constructor(data: StudyDesign) {
    if (!data) {
      this._data = data;
      return;
    }
    this._data = migrateStudyDesign(data);
  }

  getEvent(eventOid: string): StudyEvent | undefined {
    return this._data.events?.[eventOid];
  }
  
  getEvents(): StudyEvent[] {
    return Object.values(this._data.events || {}).sort((a: any, b: any) => a.orderNumber - b.orderNumber);
  }

  getForm(formOid: string): CrfForm | undefined {
    return this._data.forms?.[formOid];
  }
  
  getForms(): CrfForm[] {
    return Object.values(this._data.forms || {}).sort((a: any, b: any) => a.orderNumber - b.orderNumber);
  }

  getGroup(groupOid: string): ItemGroup | undefined {
    return this._data.groups?.[groupOid];
  }
  
  getGroupsForForm(formOid: string): ItemGroup[] {
    return Object.values(this._data.groups || {})
      .filter(g => g.formOid === formOid)
      .sort((a: any, b: any) => a.orderNumber - b.orderNumber);
  }

  getItem(itemOid: string): CrfFormElement | undefined {
    return this._data.items?.[itemOid];
  }
  
  getItemsForGroup(groupOid: string): CrfFormElement[] {
    return Object.values(this._data.items || {})
      .filter(i => (i as any).groupOid === groupOid)
      .sort((a: any, b: any) => (a.rowIndex || a.orderNumber || 0) - (b.rowIndex || b.orderNumber || 0));
  }
  
  getItemsForForm(formOid: string): CrfFormElement[] {
    return Object.values(this._data.items || {})
      .filter(i => (i as any).formOid === formOid)
      .sort((a: any, b: any) => (a.rowIndex || a.orderNumber || 0) - (b.rowIndex || b.orderNumber || 0));
  }
  
  getAllItems(): CrfFormElement[] {
    return Object.values(this._data.items || {});
  }

  getDesign(): StudyDesign {
    return this._data;
  }
}
