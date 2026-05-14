/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { DeloserAPI, DeloserHistoryByRootBase, DeloserItemBase, } from "./Deloser.js";
import { getTabsterOnElement } from "./Instance.js";
import { RootAPI } from "./Root.js";
import { Subscribable } from "./State/Subscribable.js";
import { ObservedElementAccessibilities } from "./Consts.js";
import { getElementUId, getInstanceContext, getUId, getWindowUId, } from "./Utils.js";
import { dom } from "./DOMAPI.js";
const _transactionTimeout = 1500;
const _pingTimeout = 3000;
const _targetIdUp = "up";
const CrossOriginTransactionTypes = {
    Bootstrap: 1,
    FocusElement: 2,
    State: 3,
    GetElement: 4,
    RestoreFocusInDeloser: 5,
    Ping: 6,
};
class CrossOriginDeloserItem extends DeloserItemBase {
    _deloser;
    _transactions;
    constructor(tabster, deloser, trasactions) {
        super();
        this._deloser = deloser;
        this._transactions = trasactions;
    }
    belongsTo(deloser) {
        return deloser.deloserUId === this._deloser.deloserUId;
    }
    async focusAvailable() {
        const data = {
            ...this._deloser,
            reset: false,
        };
        return this._transactions
            .beginTransaction(RestoreFocusInDeloserTransaction, data)
            .then((value) => !!value);
    }
    async resetFocus() {
        const data = {
            ...this._deloser,
            reset: true,
        };
        return this._transactions
            .beginTransaction(RestoreFocusInDeloserTransaction, data)
            .then((value) => !!value);
    }
}
class CrossOriginDeloserHistoryByRoot extends DeloserHistoryByRootBase {
    _transactions;
    constructor(tabster, rootUId, transactions) {
        super(tabster, rootUId);
        this._transactions = transactions;
    }
    unshift(deloser) {
        let item;
        for (let i = 0; i < this._history.length; i++) {
            if (this._history[i].belongsTo(deloser)) {
                item = this._history[i];
                this._history.splice(i, 1);
                break;
            }
        }
        if (!item) {
            item = new CrossOriginDeloserItem(this._tabster, deloser, this._transactions);
        }
        this._history.unshift(item);
        this._history.splice(10, this._history.length - 10);
    }
    async focusAvailable() {
        for (const i of this._history) {
            if (await i.focusAvailable()) {
                return true;
            }
        }
        return false;
    }
    async resetFocus() {
        for (const i of this._history) {
            if (await i.resetFocus()) {
                return true;
            }
        }
        return false;
    }
}
class CrossOriginTransaction {
    id;
    beginData;
    timeout;
    tabster;
    endData;
    owner;
    ownerId;
    sendUp;
    _promise;
    _resolve;
    _reject;
    _knownTargets;
    _sentTo;
    targetId;
    _inProgress = {};
    _isDone = false;
    _isSelfResponding = false;
    _sentCount = 0;
    constructor(tabster, getOwner, knownTargets, value, timeout, sentTo, targetId, sendUp) {
        this.tabster = tabster;
        this.owner = getOwner;
        this.ownerId = getWindowUId(getOwner());
        this.id = getUId(getOwner());
        this.beginData = value;
        this._knownTargets = knownTargets;
        this._sentTo = sentTo || { [this.ownerId]: true };
        this.targetId = targetId;
        this.sendUp = sendUp;
        this.timeout = timeout;
        this._promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }
    getTargets(knownTargets) {
        return this.targetId === _targetIdUp
            ? this.sendUp
                ? { [_targetIdUp]: { send: this.sendUp } }
                : null
            : this.targetId
                ? knownTargets[this.targetId]
                    ? {
                        [this.targetId]: {
                            send: knownTargets[this.targetId].send,
                        },
                    }
                    : null
                : Object.keys(knownTargets).length === 0 && this.sendUp
                    ? { [_targetIdUp]: { send: this.sendUp } }
                    : Object.keys(knownTargets).length > 0
                        ? knownTargets
                        : null;
    }
    begin(selfResponse) {
        const targets = this.getTargets(this._knownTargets);
        const sentTo = { ...this._sentTo };
        if (targets) {
            for (const id of Object.keys(targets)) {
                sentTo[id] = true;
            }
        }
        const data = {
            transaction: this.id,
            type: this.type,
            isResponse: false,
            timestamp: Date.now(),
            owner: this.ownerId,
            sentto: sentTo,
            timeout: this.timeout,
            beginData: this.beginData,
        };
        if (this.targetId) {
            data.target = this.targetId;
        }
        if (selfResponse) {
            this._isSelfResponding = true;
            selfResponse(data).then((value) => {
                this._isSelfResponding = false;
                if (value !== undefined) {
                    if (!this.endData) {
                        this.endData = value;
                    }
                }
                if (this.endData || this._sentCount === 0) {
                    this.end();
                }
            });
        }
        if (targets) {
            for (const id of Object.keys(targets)) {
                if (!(id in this._sentTo)) {
                    this._send(targets[id].send, id, data);
                }
            }
        }
        if (this._sentCount === 0 && !this._isSelfResponding) {
            this.end();
        }
        return this._promise;
    }
    _send(send, targetId, data) {
        if (this._inProgress[targetId] === undefined) {
            this._inProgress[targetId] = true;
            this._sentCount++;
            send(data);
        }
    }
    end(error) {
        if (this._isDone) {
            return;
        }
        this._isDone = true;
        if (this.endData === undefined && error) {
            if (this._reject) {
                this._reject(error);
            }
        }
        else if (this._resolve) {
            this._resolve(this.endData);
        }
    }
    onResponse(data) {
        const endData = data.endData;
        if (endData !== undefined && !this.endData) {
            this.endData = endData;
        }
        const inProgressId = data.target === _targetIdUp ? _targetIdUp : data.owner;
        if (this._inProgress[inProgressId]) {
            this._inProgress[inProgressId] = false;
            this._sentCount--;
            if (this.endData ||
                (this._sentCount === 0 && !this._isSelfResponding)) {
                this.end();
            }
        }
    }
}
class BootstrapTransaction extends CrossOriginTransaction {
    type = CrossOriginTransactionTypes.Bootstrap;
    static shouldForward() {
        return false;
    }
    static async makeResponse(tabster) {
        return {
            isNavigatingWithKeyboard: tabster.keyboardNavigation.isNavigatingWithKeyboard(),
        };
    }
}
class FocusElementTransaction extends CrossOriginTransaction {
    type = CrossOriginTransactionTypes.FocusElement;
    static shouldSelfRespond() {
        return true;
    }
    static shouldForward(tabster, data, getOwner) {
        const el = GetElementTransaction.findElement(tabster, getOwner, data.beginData);
        return !el || !tabster.focusable.isFocusable(el);
    }
    static async makeResponse(tabster, data, getOwner, ownerId, transactions, forwardResult) {
        const el = GetElementTransaction.findElement(tabster, getOwner, data.beginData);
        return ((!!el && tabster.focusedElement.focus(el, true)) ||
            !!(await forwardResult));
    }
}
const CrossOriginStates = {
    Focused: 1,
    Blurred: 2,
    Observed: 3,
    DeadWindow: 4,
    KeyboardNavigation: 5,
    Outline: 6,
};
class StateTransaction extends CrossOriginTransaction {
    type = CrossOriginTransactionTypes.State;
    static shouldSelfRespond(tabster, data) {
        return (data.state !== CrossOriginStates.DeadWindow &&
            data.state !== CrossOriginStates.KeyboardNavigation);
    }
    static async makeResponse(tabster, data, getOwner, ownerId, transactions, forwardResult, isSelfResponse) {
        const timestamp = data.timestamp;
        const beginData = data.beginData;
        if (timestamp && beginData) {
            switch (beginData.state) {
                case CrossOriginStates.Focused:
                    return StateTransaction._makeFocusedResponse(tabster, timestamp, beginData, transactions, isSelfResponse);
                case CrossOriginStates.Blurred:
                    return StateTransaction._makeBlurredResponse(tabster, timestamp, beginData, transactions.ctx);
                case CrossOriginStates.Observed:
                    return StateTransaction._makeObservedResponse(tabster, beginData);
                case CrossOriginStates.DeadWindow:
                    return StateTransaction._makeDeadWindowResponse(tabster, beginData, transactions, forwardResult);
                case CrossOriginStates.KeyboardNavigation:
                    return StateTransaction._makeKeyboardNavigationResponse(tabster, transactions.ctx, beginData.isNavigatingWithKeyboard);
                case CrossOriginStates.Outline:
                    return StateTransaction._makeOutlineResponse(tabster, transactions.ctx, beginData.outline);
            }
        }
        return true;
    }
    static createElement(tabster, beginData) {
        return beginData.uid
            ? new CrossOriginElement(tabster, beginData.uid, beginData.ownerUId, beginData.id, beginData.rootUId, beginData.observedName, beginData.observedDetails)
            : null;
    }
    static async _makeFocusedResponse(tabster, timestamp, beginData, transactions, isSelfResponse) {
        const element = StateTransaction.createElement(tabster, beginData);
        if (beginData && beginData.ownerUId && element) {
            transactions.ctx.focusOwner = beginData.ownerUId;
            transactions.ctx.focusOwnerTimestamp = timestamp;
            if (!isSelfResponse && beginData.rootUId && beginData.deloserUId) {
                const deloserAPI = tabster.deloser;
                if (deloserAPI) {
                    const history = DeloserAPI.getHistory(deloserAPI);
                    const deloser = {
                        ownerUId: beginData.ownerUId,
                        deloserUId: beginData.deloserUId,
                        rootUId: beginData.rootUId,
                    };
                    const historyItem = history.make(beginData.rootUId, () => new CrossOriginDeloserHistoryByRoot(tabster, deloser.rootUId, transactions));
                    historyItem.unshift(deloser);
                }
            }
            CrossOriginFocusedElementState.setVal(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            tabster.crossOrigin.focusedElement, element, {
                isFocusedProgrammatically: beginData.isFocusedProgrammatically,
            });
        }
        return true;
    }
    static async _makeBlurredResponse(tabster, timestamp, beginData, context) {
        if (beginData &&
            (beginData.ownerUId === context.focusOwner || beginData.force) &&
            (!context.focusOwnerTimestamp ||
                context.focusOwnerTimestamp < timestamp)) {
            CrossOriginFocusedElementState.setVal(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            tabster.crossOrigin.focusedElement, undefined, {});
        }
        return true;
    }
    static async _makeObservedResponse(tabster, beginData) {
        const name = beginData.observedName;
        const element = StateTransaction.createElement(tabster, beginData);
        if (name && element) {
            CrossOriginObservedElementState.trigger(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            tabster.crossOrigin.observedElement, element, { names: [name], details: beginData.observedDetails });
        }
        return true;
    }
    static async _makeDeadWindowResponse(tabster, beginData, transactions, forwardResult) {
        const deadUId = beginData && beginData.ownerUId;
        if (deadUId) {
            transactions.removeTarget(deadUId);
        }
        return forwardResult.then(() => {
            if (deadUId === transactions.ctx.focusOwner) {
                const deloserAPI = tabster.deloser;
                if (deloserAPI) {
                    DeloserAPI.forceRestoreFocus(deloserAPI);
                }
            }
            return true;
        });
    }
    static async _makeKeyboardNavigationResponse(tabster, context, isNavigatingWithKeyboard) {
        if (isNavigatingWithKeyboard !== undefined &&
            tabster.keyboardNavigation.isNavigatingWithKeyboard() !==
                isNavigatingWithKeyboard) {
            context.ignoreKeyboardNavigationStateUpdate = true;
            tabster.keyboardNavigation.setNavigatingWithKeyboard(isNavigatingWithKeyboard);
            context.ignoreKeyboardNavigationStateUpdate = false;
        }
        return true;
    }
    static async _makeOutlineResponse(tabster, context, props) {
        if (context.origOutlineSetup) {
            context.origOutlineSetup.call(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            tabster.outline, props);
        }
        return true;
    }
}
class GetElementTransaction extends CrossOriginTransaction {
    type = CrossOriginTransactionTypes.GetElement;
    static shouldSelfRespond() {
        return true;
    }
    static findElement(tabster, getOwner, data) {
        let element;
        if (data &&
            (!data.ownerId || data.ownerId === getWindowUId(getOwner()))) {
            if (data.id) {
                element = dom.getElementById(getOwner().document, data.id);
                if (element && data.rootId) {
                    const ctx = RootAPI.getTabsterContext(tabster, element);
                    if (!ctx || ctx.root.uid !== data.rootId) {
                        return null;
                    }
                }
            }
            else if (data.uid) {
                const ref = getInstanceContext(getOwner).elementByUId[data.uid];
                element = ref && ref.get();
            }
            else if (data.observedName) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                element = tabster.observedElement.getElement(data.observedName, data.accessibility);
            }
        }
        return element || null;
    }
    static getElementData(tabster, element, getOwner, context, ownerUId) {
        const deloser = DeloserAPI.getDeloser(tabster, element);
        const ctx = RootAPI.getTabsterContext(tabster, element);
        const tabsterOnElement = getTabsterOnElement(tabster, element);
        const observed = tabsterOnElement && tabsterOnElement.observed;
        return {
            uid: getElementUId(getOwner, element),
            ownerUId,
            id: element.id || undefined,
            rootUId: ctx ? ctx.root.uid : undefined,
            deloserUId: deloser
                ? getDeloserUID(getOwner, context, deloser)
                : undefined,
            observedName: observed && observed.names && observed.names[0],
            observedDetails: observed && observed.details,
        };
    }
    static async makeResponse(tabster, data, getOwner, ownerUId, transactions, forwardResult) {
        const beginData = data.beginData;
        let element;
        let dataOut;
        if (beginData === undefined) {
            element = tabster.focusedElement.getFocusedElement();
        }
        else if (beginData) {
            element =
                GetElementTransaction.findElement(tabster, getOwner, beginData) || undefined;
        }
        if (!element && beginData) {
            const name = beginData.observedName;
            const timeout = data.timeout;
            const accessibility = beginData.accessibility;
            if (name && timeout) {
                const e = await new Promise((resolve) => {
                    let isWaitElementResolved = false;
                    let isForwardResolved = false;
                    let isResolved = false;
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    tabster
                        .observedElement.waitElement(name, timeout, accessibility)
                        .result.then((value) => {
                        isWaitElementResolved = true;
                        if (!isResolved && (value || isForwardResolved)) {
                            isResolved = true;
                            resolve({ element: value });
                        }
                    });
                    forwardResult.then((value) => {
                        isForwardResolved = true;
                        if (!isResolved && (value || isWaitElementResolved)) {
                            isResolved = true;
                            resolve({ crossOrigin: value });
                        }
                    });
                });
                if (e.element) {
                    element = e.element;
                }
                else if (e.crossOrigin) {
                    dataOut = e.crossOrigin;
                }
            }
        }
        return element
            ? GetElementTransaction.getElementData(tabster, element, getOwner, transactions.ctx, ownerUId)
            : dataOut;
    }
}
class RestoreFocusInDeloserTransaction extends CrossOriginTransaction {
    type = CrossOriginTransactionTypes.RestoreFocusInDeloser;
    static async makeResponse(tabster, data, getOwner, ownerId, transactions, forwardResult) {
        const forwardRet = await forwardResult;
        const begin = !forwardRet && data.beginData;
        const uid = begin && begin.deloserUId;
        const deloser = uid && transactions.ctx.deloserByUId[uid];
        const deloserAPI = tabster.deloser;
        if (begin && deloser && deloserAPI) {
            const history = DeloserAPI.getHistory(deloserAPI);
            const result = begin.reset
                ? await history.resetFocus(deloser)
                : await history.focusAvailable(deloser);
            return result ?? false;
        }
        return !!forwardRet;
    }
}
class PingTransaction extends CrossOriginTransaction {
    type = CrossOriginTransactionTypes.Ping;
    static shouldForward() {
        return false;
    }
    static async makeResponse() {
        return true;
    }
}
class CrossOriginTransactions {
    _owner;
    _ownerUId;
    _knownTargets = {};
    _transactions = {};
    _tabster;
    _pingTimer;
    _isDefaultSendUp = false;
    _deadPromise;
    isSetUp = false;
    sendUp;
    ctx;
    constructor(tabster, getOwner, context) {
        this._tabster = tabster;
        this._owner = getOwner;
        this._ownerUId = getWindowUId(getOwner());
        this.ctx = context;
    }
    setup(sendUp) {
        if (this.isSetUp) {
            if ((process.env.NODE_ENV === 'development')) {
                console.error("CrossOrigin is already set up.");
            }
        }
        else {
            this.isSetUp = true;
            this.setSendUp(sendUp);
            this._owner().addEventListener("pagehide", this._onPageHide);
            this._ping();
        }
        return this._onMessage;
    }
    setSendUp(sendUp) {
        if (!this.isSetUp) {
            throw new Error("CrossOrigin is not set up.");
        }
        this.sendUp = sendUp || undefined;
        const owner = this._owner();
        if (sendUp === undefined) {
            if (!this._isDefaultSendUp) {
                if (owner.document) {
                    this._isDefaultSendUp = true;
                    if (owner.parent &&
                        owner.parent !== owner &&
                        owner.parent.postMessage) {
                        this.sendUp = (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        data) => {
                            owner.parent.postMessage(JSON.stringify(data), "*");
                        };
                    }
                    owner.addEventListener("message", this._onBrowserMessage);
                }
            }
        }
        else if (this._isDefaultSendUp) {
            owner.removeEventListener("message", this._onBrowserMessage);
            this._isDefaultSendUp = false;
        }
        return this._onMessage;
    }
    async dispose() {
        const owner = this._owner();
        if (this._pingTimer) {
            owner.clearTimeout(this._pingTimer);
            this._pingTimer = undefined;
        }
        owner.removeEventListener("message", this._onBrowserMessage);
        owner.removeEventListener("pagehide", this._onPageHide);
        await this._dead();
        delete this._deadPromise;
        for (const id of Object.keys(this._transactions)) {
            const t = this._transactions[id];
            if (t.timer) {
                owner.clearTimeout(t.timer);
                delete t.timer;
            }
            t.transaction.end();
        }
        this._knownTargets = {};
        delete this.sendUp;
    }
    beginTransaction(Transaction, value, timeout, sentTo, targetId, withReject) {
        if (!this._owner) {
            return Promise.reject();
        }
        const transaction = new Transaction(this._tabster, this._owner, this._knownTargets, value, timeout, sentTo, targetId, this.sendUp);
        let selfResponse;
        if (Transaction.shouldSelfRespond &&
            Transaction.shouldSelfRespond(this._tabster, value, this._owner, this._ownerUId)) {
            selfResponse = (data) => {
                return Transaction.makeResponse(this._tabster, data, this._owner, this._ownerUId, this, Promise.resolve(undefined), true);
            };
        }
        return this._beginTransaction(transaction, timeout, selfResponse, withReject);
    }
    removeTarget(uid) {
        delete this._knownTargets[uid];
    }
    _beginTransaction(transaction, timeout, selfResponse, withReject) {
        const owner = this._owner();
        const wrapper = {
            transaction,
            timer: owner.setTimeout(() => {
                delete wrapper.timer;
                transaction.end("Cross origin transaction timed out.");
            }, _transactionTimeout + (timeout || 0)),
        };
        this._transactions[transaction.id] = wrapper;
        const ret = transaction.begin(selfResponse);
        ret.catch(() => {
            /**/
        }).finally(() => {
            if (wrapper.timer) {
                owner.clearTimeout(wrapper.timer);
            }
            delete this._transactions[transaction.id];
        });
        return ret.then((value) => value, withReject ? undefined : () => undefined);
    }
    forwardTransaction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) {
        const owner = this._owner;
        let targetId = data.target;
        if (targetId === this._ownerUId) {
            return Promise.resolve();
        }
        const Transaction = this._getTransactionClass(data.type);
        if (Transaction) {
            if (Transaction.shouldForward === undefined ||
                Transaction.shouldForward(this._tabster, data, owner, this._ownerUId)) {
                const sentTo = data.sentto;
                if (targetId === _targetIdUp) {
                    targetId = undefined;
                    sentTo[this._ownerUId] = true;
                }
                delete sentTo[_targetIdUp];
                return this._beginTransaction(new Transaction(this._tabster, owner, this._knownTargets, data.beginData, data.timeout, sentTo, targetId, this.sendUp), data.timeout);
            }
            else {
                return Promise.resolve();
            }
        }
        return Promise.reject(`Unknown transaction type ${data.type}`);
    }
    _getTransactionClass(type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) {
        switch (type) {
            case CrossOriginTransactionTypes.Bootstrap:
                return BootstrapTransaction;
            case CrossOriginTransactionTypes.FocusElement:
                return FocusElementTransaction;
            case CrossOriginTransactionTypes.State:
                return StateTransaction;
            case CrossOriginTransactionTypes.GetElement:
                return GetElementTransaction;
            case CrossOriginTransactionTypes.RestoreFocusInDeloser:
                return RestoreFocusInDeloserTransaction;
            case CrossOriginTransactionTypes.Ping:
                return PingTransaction;
            default:
                return null;
        }
    }
    _onMessage = (e) => {
        if (e.data.owner === this._ownerUId || !this._tabster) {
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = e.data;
        let transactionId;
        if (!data ||
            !(transactionId = data.transaction) ||
            !data.type ||
            !data.timestamp ||
            !data.owner ||
            !data.sentto) {
            return;
        }
        let knownTarget = this._knownTargets[data.owner];
        if (!knownTarget && e.send && data.owner !== this._ownerUId) {
            knownTarget = this._knownTargets[data.owner] = { send: e.send };
        }
        if (knownTarget) {
            knownTarget.last = Date.now();
        }
        if (data.isResponse) {
            const t = this._transactions[transactionId];
            if (t && t.transaction && t.transaction.type === data.type) {
                t.transaction.onResponse(data);
            }
        }
        else {
            const Transaction = this._getTransactionClass(data.type);
            const forwardResult = this.forwardTransaction(data);
            if (Transaction && e.send) {
                Transaction.makeResponse(this._tabster, data, this._owner, this._ownerUId, this, forwardResult, false).then((r) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const response = {
                        transaction: data.transaction,
                        type: data.type,
                        isResponse: true,
                        timestamp: Date.now(),
                        owner: this._ownerUId,
                        timeout: data.timeout,
                        sentto: {},
                        target: data.target === _targetIdUp
                            ? _targetIdUp
                            : data.owner,
                        endData: r,
                    };
                    e.send(response);
                });
            }
        }
    };
    _onPageHide = () => {
        this._dead();
    };
    async _dead() {
        if (!this._deadPromise && this.ctx.focusOwner === this._ownerUId) {
            this._deadPromise = this.beginTransaction(StateTransaction, {
                ownerUId: this._ownerUId,
                state: CrossOriginStates.DeadWindow,
            });
        }
        if (this._deadPromise) {
            await this._deadPromise;
        }
    }
    async _ping() {
        if (this._pingTimer) {
            return;
        }
        let deadWindows;
        const now = Date.now();
        const targets = Object.keys(this._knownTargets).filter((uid) => now - (this._knownTargets[uid].last || 0) > _pingTimeout);
        if (this.sendUp) {
            targets.push(_targetIdUp);
        }
        if (targets.length) {
            await Promise.all(targets.map((uid) => this.beginTransaction(PingTransaction, undefined, undefined, undefined, uid, true).then(() => true, () => {
                if (uid !== _targetIdUp) {
                    if (!deadWindows) {
                        deadWindows = {};
                    }
                    deadWindows[uid] = true;
                    delete this._knownTargets[uid];
                }
                return false;
            })));
        }
        if (deadWindows) {
            const focused = await this.beginTransaction(GetElementTransaction, undefined);
            if (!focused &&
                this.ctx.focusOwner &&
                this.ctx.focusOwner in deadWindows) {
                await this.beginTransaction(StateTransaction, {
                    ownerUId: this._ownerUId,
                    state: CrossOriginStates.Blurred,
                    force: true,
                });
                const deloserAPI = this._tabster.deloser;
                if (deloserAPI) {
                    DeloserAPI.forceRestoreFocus(deloserAPI);
                }
            }
        }
        this._pingTimer = this._owner().setTimeout(() => {
            this._pingTimer = undefined;
            this._ping();
        }, _pingTimeout);
    }
    _onBrowserMessage = (e) => {
        if (e.source === this._owner()) {
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const send = (data) => {
            if (e.source && e.source.postMessage) {
                e.source.postMessage(JSON.stringify(data), "*");
            }
        };
        try {
            this._onMessage({
                data: JSON.parse(e.data),
                send,
            });
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        }
        catch (e) {
            /* Ignore */
        }
    };
}
export class CrossOriginElement {
    _tabster;
    uid;
    ownerId;
    id;
    rootId;
    observedName;
    observedDetails;
    constructor(tabster, uid, ownerId, id, rootId, observedName, observedDetails) {
        this._tabster = tabster;
        this.uid = uid;
        this.ownerId = ownerId;
        this.id = id;
        this.rootId = rootId;
        this.observedName = observedName;
        this.observedDetails = observedDetails;
    }
    focus(noFocusedProgrammaticallyFlag, noAccessibleCheck) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this._tabster.crossOrigin.focusedElement.focus(this, noFocusedProgrammaticallyFlag, noAccessibleCheck);
    }
}
export class CrossOriginFocusedElementState extends Subscribable {
    _transactions;
    constructor(transactions) {
        super();
        this._transactions = transactions;
    }
    async focus(element, noFocusedProgrammaticallyFlag, noAccessibleCheck) {
        return this._focus({
            uid: element.uid,
            id: element.id,
            rootId: element.rootId,
            ownerId: element.ownerId,
            observedName: element.observedName,
        }, noFocusedProgrammaticallyFlag, noAccessibleCheck);
    }
    async focusById(elementId, rootId, noFocusedProgrammaticallyFlag, noAccessibleCheck) {
        return this._focus({ id: elementId, rootId }, noFocusedProgrammaticallyFlag, noAccessibleCheck);
    }
    async focusByObservedName(observedName, timeout, rootId, noFocusedProgrammaticallyFlag, noAccessibleCheck) {
        return this._focus({ observedName, rootId }, noFocusedProgrammaticallyFlag, noAccessibleCheck, timeout);
    }
    async _focus(elementData, noFocusedProgrammaticallyFlag, noAccessibleCheck, timeout) {
        return this._transactions
            .beginTransaction(FocusElementTransaction, {
            ...elementData,
            noFocusedProgrammaticallyFlag,
            noAccessibleCheck,
        }, timeout)
            .then((value) => !!value);
    }
    static setVal(instance, val, detail) {
        instance.setVal(val, detail);
    }
}
export class CrossOriginObservedElementState extends Subscribable {
    _tabster;
    _transactions;
    _lastRequestFocusId = 0;
    constructor(tabster, transactions) {
        super();
        this._tabster = tabster;
        this._transactions = transactions;
    }
    async getElement(observedName, accessibility) {
        return this.waitElement(observedName, 0, accessibility);
    }
    async waitElement(observedName, timeout, accessibility) {
        return this._transactions
            .beginTransaction(GetElementTransaction, {
            observedName,
            accessibility,
        }, timeout)
            .then((value) => value
            ? StateTransaction.createElement(this._tabster, value)
            : null);
    }
    async requestFocus(observedName, timeout) {
        const requestId = ++this._lastRequestFocusId;
        return this.waitElement(observedName, timeout, ObservedElementAccessibilities.Focusable).then((element) => this._lastRequestFocusId === requestId && element
            ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this._tabster.crossOrigin.focusedElement.focus(element, true)
            : false);
    }
    static trigger(instance, element, details) {
        instance.trigger(element, details);
    }
}
export class CrossOriginAPI {
    _tabster;
    _win;
    _transactions;
    _blurTimer;
    _ctx;
    focusedElement;
    observedElement;
    constructor(tabster) {
        this._tabster = tabster;
        this._win = tabster.getWindow;
        this._ctx = {
            ignoreKeyboardNavigationStateUpdate: false,
            deloserByUId: {},
        };
        this._transactions = new CrossOriginTransactions(tabster, this._win, this._ctx);
        this.focusedElement = new CrossOriginFocusedElementState(this._transactions);
        this.observedElement = new CrossOriginObservedElementState(tabster, this._transactions);
    }
    setup(sendUp) {
        if (this.isSetUp()) {
            return this._transactions.setSendUp(sendUp);
        }
        else {
            this._tabster.queueInit(this._init);
            return this._transactions.setup(sendUp);
        }
    }
    isSetUp() {
        return this._transactions.isSetUp;
    }
    _init = () => {
        const tabster = this._tabster;
        tabster.keyboardNavigation.subscribe(this._onKeyboardNavigationStateChanged);
        tabster.focusedElement.subscribe(this._onFocus);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        tabster.observedElement.subscribe(this._onObserved);
        if (!this._ctx.origOutlineSetup) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this._ctx.origOutlineSetup = tabster.outline.setup;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            tabster.outline.setup = this._outlineSetup;
        }
        this._transactions
            .beginTransaction(BootstrapTransaction, undefined, undefined, undefined, _targetIdUp)
            .then((data) => {
            if (data &&
                this._tabster.keyboardNavigation.isNavigatingWithKeyboard() !==
                    data.isNavigatingWithKeyboard) {
                this._ctx.ignoreKeyboardNavigationStateUpdate = true;
                this._tabster.keyboardNavigation.setNavigatingWithKeyboard(data.isNavigatingWithKeyboard);
                this._ctx.ignoreKeyboardNavigationStateUpdate = false;
            }
        });
    };
    dispose() {
        const tabster = this._tabster;
        tabster.keyboardNavigation.unsubscribe(this._onKeyboardNavigationStateChanged);
        tabster.focusedElement.unsubscribe(this._onFocus);
        tabster.observedElement?.unsubscribe(this._onObserved);
        this._transactions.dispose();
        this.focusedElement.dispose();
        this.observedElement.dispose();
        this._ctx.deloserByUId = {};
    }
    _onKeyboardNavigationStateChanged = (value) => {
        if (!this._ctx.ignoreKeyboardNavigationStateUpdate) {
            this._transactions.beginTransaction(StateTransaction, {
                state: CrossOriginStates.KeyboardNavigation,
                ownerUId: getWindowUId(this._win()),
                isNavigatingWithKeyboard: value,
            });
        }
    };
    _onFocus = (element) => {
        const win = this._win();
        const ownerUId = getWindowUId(win);
        if (this._blurTimer) {
            win.clearTimeout(this._blurTimer);
            this._blurTimer = undefined;
        }
        if (element) {
            this._transactions.beginTransaction(StateTransaction, {
                ...GetElementTransaction.getElementData(this._tabster, element, this._win, this._ctx, ownerUId),
                state: CrossOriginStates.Focused,
            });
        }
        else {
            this._blurTimer = win.setTimeout(() => {
                this._blurTimer = undefined;
                if (this._ctx.focusOwner && this._ctx.focusOwner === ownerUId) {
                    this._transactions
                        .beginTransaction(GetElementTransaction, undefined)
                        .then((value) => {
                        if (!value && this._ctx.focusOwner === ownerUId) {
                            this._transactions.beginTransaction(StateTransaction, {
                                ownerUId,
                                state: CrossOriginStates.Blurred,
                                force: false,
                            });
                        }
                    });
                }
            }, 0);
        }
    };
    _onObserved = (element, details) => {
        const d = GetElementTransaction.getElementData(this._tabster, element, this._win, this._ctx, getWindowUId(this._win()));
        d.state = CrossOriginStates.Observed;
        d.observedName = details.names?.[0];
        d.observedDetails = details.details;
        this._transactions.beginTransaction(StateTransaction, d);
    };
    _outlineSetup = (props) => {
        this._transactions.beginTransaction(StateTransaction, {
            state: CrossOriginStates.Outline,
            ownerUId: getWindowUId(this._win()),
            outline: props,
        });
    };
}
function getDeloserUID(getWindow, context, deloser) {
    const deloserElement = deloser.getElement();
    if (deloserElement) {
        const uid = getElementUId(getWindow, deloserElement);
        if (!context.deloserByUId[uid]) {
            context.deloserByUId[uid] = deloser;
        }
        return uid;
    }
    return undefined;
}
//# sourceMappingURL=CrossOrigin.js.map