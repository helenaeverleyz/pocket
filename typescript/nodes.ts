"use strict";
/**************************************************************
 * BASE CLASSES
 **************************************************************/
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncParallelBatchFlow = exports.AsyncBatchFlow = exports.AsyncFlow = exports.AsyncParallelBatchNode = exports.AsyncBatchNode = exports.AsyncNode = exports._ConditionalTransition = exports.BaseNode = void 0;
class BaseNode {
    constructor() {
        this.params = {};
        this.successors = {};
    }
    setParams(params) {
        this.params = params;
    }
    addSuccessor(node, action = "default") {
        if (this.successors[action]) {
            console.warn(`Overwriting successor for action '${action}'`);
        }
        this.successors[action] = node;
        return node;
    }
    then(other) {
        return this.addSuccessor(other);
    }
    action(action) {
        return new _ConditionalTransition(this, action);
    }
    async prepAsync(_shared) {
        return;
    }
    async execAsync(_prepRes) {
        return;
    }
    async postAsync(_shared, _prepRes, _execRes) {
        return;
    }
}
exports.BaseNode = BaseNode;
class _ConditionalTransition {
    constructor(src, action) {
        this.src = src;
        this.action = action;
    }
    then(target) {
        return this.src.addSuccessor(target, this.action);
    }
}
exports._ConditionalTransition = _ConditionalTransition;
/**************************************************************
 * CORE ASYNC NODE WITH RETRIES
 **************************************************************/
class AsyncNode extends BaseNode {
    constructor(maxRetries = 1, wait = 0) {
        super();
        this.maxRetries = maxRetries;
        this.wait = wait;
        this.curRetry = 0;
    }
    async execFallbackAsync(prepRes, exc) {
        throw exc;
    }
    async _exec(prepRes) {
        for (this.curRetry = 0; this.curRetry < this.maxRetries; this.curRetry++) {
            try {
                return await this.execAsync(prepRes);
            }
            catch (error) {
                if (this.curRetry === this.maxRetries - 1) {
                    return await this.execFallbackAsync(prepRes, error);
                }
                if (this.wait > 0) {
                    await new Promise((resolve) => setTimeout(resolve, this.wait * 1000));
                }
            }
        }
    }
    async runAsync(shared) {
        if (Object.keys(this.successors).length > 0) {
            console.warn("Node won't run successors. Use AsyncFlow.");
        }
        return this._runAsync(shared);
    }
    async _runAsync(shared) {
        const prepResult = await this.prepAsync(shared);
        const execResult = await this._exec(prepResult);
        return this.postAsync(shared, prepResult, execResult);
    }
}
exports.AsyncNode = AsyncNode;
/**************************************************************
 * BATCH NODES (ASYNC)
 **************************************************************/
class AsyncBatchNode extends AsyncNode {
    async _exec(items) {
        const results = [];
        for (const i of items || []) {
            results.push(await super._exec(i));
        }
        return results;
    }
}
exports.AsyncBatchNode = AsyncBatchNode;
class AsyncParallelBatchNode extends AsyncNode {
    async _exec(items) {
        return Promise.all((items || []).map((i) => super._exec(i)));
    }
}
exports.AsyncParallelBatchNode = AsyncParallelBatchNode;
/**************************************************************
 * FLOW (CHAINING MULTIPLE ASYNC NODES)
 **************************************************************/
class AsyncFlow extends BaseNode {
    constructor(start) {
        super();
        this.start = start;
    }
    getNextNode(curr, action) {
        const nextNode = curr.successors[action || "default"];
        if (!nextNode && Object.keys(curr.successors).length > 0) {
            console.warn(`Flow ends: '${action}' not found among [${Object.keys(curr.successors)}]`);
        }
        return nextNode;
    }
    async _orchAsync(shared, params) {
        let curr = this.shallowCopyNode(this.start);
        const mergedParams = params ? Object.assign(Object.assign({}, this.params), params) : Object.assign({}, this.params);
        while (curr) {
            curr.setParams(mergedParams);
            let result;
            if (curr instanceof AsyncNode) {
                result = await curr.runAsync(shared);
            }
            else {
                throw new Error("Flow encountered a non-Async node. Please use AsyncNode-based classes.");
            }
            const next = this.getNextNode(curr, result);
            curr = next ? this.shallowCopyNode(next) : undefined;
        }
    }
    async _runAsync(shared) {
        const prepResult = await this.prepAsync(shared);
        await this._orchAsync(shared);
        return this.postAsync(shared, prepResult, null);
    }
    async runAsync(shared) {
        return this._runAsync(shared);
    }
    shallowCopyNode(node) {
        return Object.assign(Object.create(Object.getPrototypeOf(node)), node);
    }
}
exports.AsyncFlow = AsyncFlow;
/**************************************************************
 * BATCH FLOW (ASYNC)
 **************************************************************/
class AsyncBatchFlow extends AsyncFlow {
    async _runAsync(shared) {
        const batchData = (await this.prepAsync(shared)) || [];
        for (const bp of batchData) {
            await this._orchAsync(shared, bp);
        }
        return this.postAsync(shared, batchData, null);
    }
}
exports.AsyncBatchFlow = AsyncBatchFlow;
class AsyncParallelBatchFlow extends AsyncFlow {
    async _runAsync(shared) {
        const batchData = (await this.prepAsync(shared)) || [];
        await Promise.all(batchData.map((bp) => this._orchAsync(shared, bp)));
        return this.postAsync(shared, batchData, null);
    }
}
exports.AsyncParallelBatchFlow = AsyncParallelBatchFlow;
