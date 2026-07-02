import {
  StudyDesign,
  StudyEvent,
  CrfForm,
  ItemGroup,
  CrfFormElement,
  EventFormRef,
  isCrfItem,
} from "../types/index";

export enum SortStrategy {
  NATURAL = "natural",
  OID = "oid",
}

export interface IteratorConfig {
  sortStrategy?: SortStrategy;
}

export class ClinicalIterator {
  private config: IteratorConfig;

  constructor(config: IteratorConfig = {}) {
    this.config = {
      sortStrategy: SortStrategy.NATURAL,
      ...config,
    };
  }

  public *events(study: StudyDesign): Generator<StudyEvent> {
    const events = [...study.events];
    if (this.config.sortStrategy === SortStrategy.OID) {
      events.sort((a, b) => a.eventOid.localeCompare(b.eventOid));
    } else {
      events.sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0));
    }
    for (const event of events) {
      yield event;
    }
  }

  public *eventForms(
    study: StudyDesign,
    event: StudyEvent
  ): Generator<{ formRef: EventFormRef; form: CrfForm }> {
    const formRefs = [...event.forms];
    if (this.config.sortStrategy === SortStrategy.OID) {
      formRefs.sort((a, b) => a.formOid.localeCompare(b.formOid));
    } else {
      formRefs.sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0));
    }

    for (const formRef of formRefs) {
      const form = study.forms[formRef.formOid];
      if (form) {
        yield { formRef, form };
      }
    }
  }

  public *forms(study: StudyDesign): Generator<CrfForm> {
    const forms = Object.values(study.forms);
    if (this.config.sortStrategy === SortStrategy.OID) {
      forms.sort((a, b) => a.formOid.localeCompare(b.formOid));
    } else {
      forms.sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0));
    }
    for (const form of forms) {
      yield form;
    }
  }

  public *itemGroups(form: CrfForm): Generator<ItemGroup> {
    const groups = [...form.itemGroups];
    if (this.config.sortStrategy === SortStrategy.OID) {
      groups.sort((a, b) => a.groupOid.localeCompare(b.groupOid));
    } else {
      groups.sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0));
    }
    for (const group of groups) {
      yield group;
    }
  }

  public *items(group: ItemGroup): Generator<CrfFormElement> {
    const items = [...group.items];
    if (this.config.sortStrategy === SortStrategy.OID) {
      items.sort((a, b) => {
        const aOid = isCrfItem(a) ? a.itemOid : "";
        const bOid = isCrfItem(b) ? b.itemOid : "";
        return aOid.localeCompare(bOid);
      });
    } else {
      items.sort((a, b) => {
        const aOrder = isCrfItem(a) ? (a.orderNumber ?? 0) : ((a as any)._sourceRowIndex ?? 0);
        const bOrder = isCrfItem(b) ? (b.orderNumber ?? 0) : ((b as any)._sourceRowIndex ?? 0);
        return aOrder - bOrder;
      });
    }
    for (const item of items) {
      yield item;
    }
  }

  public *walkStudy(
    study: StudyDesign
  ): Generator<{
    event: StudyEvent;
    formRef: EventFormRef;
    form: CrfForm;
    group: ItemGroup;
    item: CrfFormElement;
  }> {
    for (const event of this.events(study)) {
      for (const { formRef, form } of this.eventForms(study, event)) {
        for (const group of this.itemGroups(form)) {
          for (const item of this.items(group)) {
            yield { event, formRef, form, group, item };
          }
        }
      }
    }
  }

  public *walkForms(
    study: StudyDesign
  ): Generator<{ form: CrfForm; group: ItemGroup; item: CrfFormElement }> {
    for (const form of this.forms(study)) {
      for (const group of this.itemGroups(form)) {
        for (const item of this.items(group)) {
          yield { form, group, item };
        }
      }
    }
  }
}
