import { StudyDesign, CrfItem, RuleDefinition } from "../types/index";
import { parseRuleExpression } from "./rules-parser";
import { collectIdentifiers } from "./rules-validator";

export class DependencyGraph {
  public readonly itemMap = new Map<string, { item: CrfItem, formOid: string, groupOid: string, rowIndex?: number }>();
  public readonly ruleMap = new Map<string, RuleDefinition>();
  
  public readonly eventOrder = new Map<string, number>();
  public readonly formEventMap = new Map<string, { eventOids: Set<string>, minEventOrder: number, maxEventOrder: number, formOrders: Map<string, number> }>();
  
  public readonly ruleToItems = new Map<string, Set<string>>();
  public readonly itemToRules = new Map<string, Set<string>>();
  
  public readonly methodsSet = new Set<string>();

  private isBuilt = false;

  public buildSync(study: StudyDesign) {
    if (this.isBuilt) return;
    this.buildSymbolTable(study);
    this.buildTemporalGraph(study);
    this.buildDependencyMaps(study);
    this.buildMethodsSet(study);
    this.isBuilt = true;
  }

  public async buildAsync(study: StudyDesign) {
    if (this.isBuilt) return;
    await this.buildSymbolTableAsync(study);
    await this.buildTemporalGraphAsync(study);
    await this.buildDependencyMapsAsync(study);
    await this.buildMethodsSetAsync(study);
    this.isBuilt = true;
  }

  // Synchronous builds
  private buildSymbolTable(study: StudyDesign) {
    for (const [formOid, form] of Object.entries(study.forms)) {
      for (const group of form.itemGroups) {
        for (const item of group.items) {
          if ((item as any).itemOid) {
            this.itemMap.set((item as any).itemOid.toLowerCase(), {
              item: item as CrfItem,
              formOid,
              groupOid: group.groupOid,
              rowIndex: (item as any).rowIndex
            });
          }
        }
      }
    }
    if (study.rules) {
      for (const rule of study.rules) {
        if (rule.ruleId) {
          this.ruleMap.set(rule.ruleId.toLowerCase(), rule);
        }
      }
    }
  }

  private buildTemporalGraph(study: StudyDesign) {
    for (const event of study.events) {
      this.eventOrder.set(event.eventOid, event.orderNumber);
    }
    for (const event of study.events) {
      for (const formRef of event.forms) {
        let meta = this.formEventMap.get(formRef.formOid);
        if (!meta) {
          meta = {
            eventOids: new Set(),
            minEventOrder: Infinity,
            maxEventOrder: -Infinity,
            formOrders: new Map()
          };
          this.formEventMap.set(formRef.formOid, meta);
        }
        meta.eventOids.add(event.eventOid);
        if (event.orderNumber < meta.minEventOrder) {
          meta.minEventOrder = event.orderNumber;
        }
        if (event.orderNumber > meta.maxEventOrder) {
          meta.maxEventOrder = event.orderNumber;
        }
        meta.formOrders.set(event.eventOid, formRef.orderNumber);
      }
    }
  }

  private buildDependencyMaps(study: StudyDesign) {
    if (!study.rules) return;
    for (const rule of study.rules) {
      if (!rule.expression || !rule.expression.trim()) continue;
      const ruleId = rule.ruleId.toLowerCase();
      try {
        const ast = parseRuleExpression(rule.expression);
        const identifiers = collectIdentifiers(ast);
        for (const ident of identifiers) {
          const identLower = ident.toLowerCase();
          
          let deps = this.ruleToItems.get(ruleId);
          if (!deps) {
            deps = new Set();
            this.ruleToItems.set(ruleId, deps);
          }
          deps.add(identLower);

          let rules = this.itemToRules.get(identLower);
          if (!rules) {
            rules = new Set();
            this.itemToRules.set(identLower, rules);
          }
          rules.add(ruleId);
        }
      } catch (e) {
        // Ignore parse errors here, validation will catch them
      }
    }
  }

  private buildMethodsSet(study: StudyDesign) {
    if (study.methods) {
      for (const key of Object.keys(study.methods)) {
        this.methodsSet.add(key.toLowerCase());
      }
    }
  }

  // Asynchronous builds
  private async buildSymbolTableAsync(study: StudyDesign) {
    let batchCount = 0;
    for (const [formOid, form] of Object.entries(study.forms)) {
      for (const group of form.itemGroups) {
        for (const item of group.items) {
          if ((item as any).itemOid) {
            this.itemMap.set((item as any).itemOid.toLowerCase(), {
              item: item as CrfItem,
              formOid,
              groupOid: group.groupOid,
              rowIndex: (item as any).rowIndex
            });
          }
          if (++batchCount > 500) {
            await new Promise(r => setTimeout(r, 0));
            batchCount = 0;
          }
        }
      }
    }
    if (study.rules) {
      for (const rule of study.rules) {
        if (rule.ruleId) {
          this.ruleMap.set(rule.ruleId.toLowerCase(), rule);
        }
      }
    }
  }

  private async buildTemporalGraphAsync(study: StudyDesign) {
    for (const event of study.events) {
      this.eventOrder.set(event.eventOid, event.orderNumber);
    }
    let batchCount = 0;
    for (const event of study.events) {
      for (const formRef of event.forms) {
        let meta = this.formEventMap.get(formRef.formOid);
        if (!meta) {
          meta = {
            eventOids: new Set(),
            minEventOrder: Infinity,
            maxEventOrder: -Infinity,
            formOrders: new Map()
          };
          this.formEventMap.set(formRef.formOid, meta);
        }
        meta.eventOids.add(event.eventOid);
        if (event.orderNumber < meta.minEventOrder) {
          meta.minEventOrder = event.orderNumber;
        }
        if (event.orderNumber > meta.maxEventOrder) {
          meta.maxEventOrder = event.orderNumber;
        }
        meta.formOrders.set(event.eventOid, formRef.orderNumber);
        
        if (++batchCount > 100) {
          await new Promise(r => setTimeout(r, 0));
          batchCount = 0;
        }
      }
    }
  }

  private async buildDependencyMapsAsync(study: StudyDesign) {
    if (!study.rules) return;
    let batchCount = 0;
    for (const rule of study.rules) {
      if (!rule.expression || !rule.expression.trim()) continue;
      const ruleId = rule.ruleId.toLowerCase();
      try {
        const ast = parseRuleExpression(rule.expression);
        const identifiers = collectIdentifiers(ast);
        for (const ident of identifiers) {
          const identLower = ident.toLowerCase();
          
          let deps = this.ruleToItems.get(ruleId);
          if (!deps) {
            deps = new Set();
            this.ruleToItems.set(ruleId, deps);
          }
          deps.add(identLower);

          let rules = this.itemToRules.get(identLower);
          if (!rules) {
            rules = new Set();
            this.itemToRules.set(identLower, rules);
          }
          rules.add(ruleId);
        }
      } catch (e) {
        // Ignore parse errors
      }
      if (++batchCount > 50) {
        await new Promise(r => setTimeout(r, 0));
        batchCount = 0;
      }
    }
  }

  private async buildMethodsSetAsync(study: StudyDesign) {
    if (study.methods) {
      let batchCount = 0;
      for (const key of Object.keys(study.methods)) {
        this.methodsSet.add(key.toLowerCase());
        if (++batchCount > 500) {
          await new Promise(r => setTimeout(r, 0));
          batchCount = 0;
        }
      }
    }
  }

  // API
  public hasMethod(methodOid: string): boolean {
    return this.methodsSet.has(methodOid.toLowerCase());
  }

  public getItem(itemOid: string) {
    return this.itemMap.get(itemOid.toLowerCase());
  }

  public getRule(ruleId: string) {
    return this.ruleMap.get(ruleId.toLowerCase());
  }

  public isScheduledBeforeOrWith(sourceFormOid: string, targetFormOid: string): boolean {
    if (sourceFormOid === targetFormOid) return true;

    const sourceMeta = this.formEventMap.get(sourceFormOid);
    const targetMeta = this.formEventMap.get(targetFormOid);

    if (!targetMeta) return false;
    if (!sourceMeta) return true;

    if (targetMeta.maxEventOrder < sourceMeta.minEventOrder) return true;
    if (targetMeta.minEventOrder > sourceMeta.maxEventOrder) return false;

    for (const sEventOid of Array.from(sourceMeta.eventOids)) {
      const sEventOrder = this.eventOrder.get(sEventOid)!;
      const sFormOrder = sourceMeta.formOrders.get(sEventOid)!;

      for (const tEventOid of Array.from(targetMeta.eventOids)) {
        const tEventOrder = this.eventOrder.get(tEventOid)!;
        const tFormOrder = targetMeta.formOrders.get(tEventOid)!;

        if (tEventOrder < sEventOrder) return true;
        if (tEventOrder === sEventOrder && tFormOrder <= sFormOrder) return true;
      }
    }
    return false;
  }
}
