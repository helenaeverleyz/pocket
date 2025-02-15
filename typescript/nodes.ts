"use strict";

interface NodeParams {
    [key: string]: any;
}

interface NodeSuccessors {
    [key: string]: BaseNode;
}

interface SharedState {
    [key: string]: any;
}

declare function readFileAsync(path: string): Promise<string>;
declare function callLLMAsync(prompt: string): Promise<string>;
declare function gatherUserFeedback(text: string): Promise<string>;

/**************************************************************
 * BASE CLASSES 
 **************************************************************/
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncParallelBatchFlow = exports.AsyncBatchFlow = exports.AsyncFlow = exports.AsyncParallelBatchNode = exports.AsyncBatchNode = exports.AsyncNode = exports._ConditionalTransition = exports.BaseNode = void 0;

class BaseNode {
    protected params: NodeParams;
    public successors: NodeSuccessors;

    constructor() {
        this.params = {};
        this.successors = {};
    }

    setParams(params: NodeParams): void {
        this.params = params;
    }

    addSuccessor(node: BaseNode, action: string = "default"): BaseNode {
        if (this.successors[action]) {
            console.warn(`Overwriting successor for action '${action}'`);
        }
        this.successors[action] = node;
        return node;
    }

    then(other: BaseNode): BaseNode {
        return this.addSuccessor(other);
    }

    action(action: string): _ConditionalTransition {
        return new _ConditionalTransition(this, action);
    }

    async prepAsync(_shared: any): Promise<any> {
        return;
    }

    async execAsync(_prepRes: any): Promise<any> {
        return;
    }

    async postAsync(_shared: any, _prepRes: any, _execRes: any): Promise<any> {
        return;
    }
}

class _ConditionalTransition {
    private src: BaseNode;
    private action: string;

    constructor(src: BaseNode, action: string) {
        this.src = src;
        this.action = action;
    }

    then(target: BaseNode): BaseNode {
        return this.src.addSuccessor(target, this.action);
    }
}

/**************************************************************
 * CORE ASYNC NODE WITH RETRIES
 **************************************************************/
abstract class AsyncNode<T extends SharedState = SharedState> extends BaseNode {
    protected maxRetries: number;
    protected wait: number;
    private curRetry: number;

    constructor(maxRetries: number = 1, wait: number = 0) {
        super();
        this.maxRetries = maxRetries;
        this.wait = wait;
        this.curRetry = 0;
    }

    abstract prepAsync(shared: T): Promise<any>;
    abstract execAsync(prepRes: any): Promise<any>;
    abstract postAsync(shared: T, prepRes: any, execRes: any): Promise<any>;

    protected async execFallbackAsync(prepRes: any, error: Error): Promise<any> {
        throw error;
    }

    protected async _exec(prepRes: any): Promise<any> {
        for (this.curRetry = 0; this.curRetry < this.maxRetries; this.curRetry++) {
            try {
                return await this.execAsync(prepRes);
            } catch (error) {
                if (this.curRetry === this.maxRetries - 1) {
                    return await this.execFallbackAsync(prepRes, error as Error);
                }
                if (this.wait > 0) {
                    await new Promise(resolve => setTimeout(resolve, this.wait * 1000));
                }
            }
        }
    }

    async runAsync(shared: T): Promise<any> {
        if (Object.keys(this.successors).length > 0) {
            console.warn("Node won't run successors. Use AsyncFlow.");
        }
        return this._runAsync(shared);
    }

    protected async _runAsync(shared: T): Promise<any> {
        const prepResult = await this.prepAsync(shared);
        const execResult = await this._exec(prepResult);
        return this.postAsync(shared, prepResult, execResult);
    }
}

/**************************************************************
 * BATCH NODES (ASYNC)
 **************************************************************/
class AsyncBatchNode<T extends SharedState = SharedState> extends AsyncNode<T> {
    async prepAsync(shared: T): Promise<any[]> {
        return [];
    }

    async execAsync(items: any[]): Promise<any[]> {
        const results: any[] = [];
        for (const i of items || []) {
            results.push(await super._exec(i));
        }
        return results;
    }

    async postAsync(shared: T, prepRes: any[], execRes: any[]): Promise<void> {
        return;
    }
}

class AsyncParallelBatchNode<T extends SharedState = SharedState> extends AsyncNode<T> {
    async prepAsync(shared: T): Promise<any[]> {
        return [];
    }

    async execAsync(items: any[]): Promise<any[]> {
        return Promise.all((items || []).map((i) => super._exec(i)));
    }

    async postAsync(shared: T, prepRes: any[], execRes: any[]): Promise<void> {
        return;
    }
}

/**************************************************************
 * FLOW (CHAINING MULTIPLE ASYNC NODES)
 **************************************************************/
class AsyncFlow<T extends SharedState = SharedState> extends BaseNode {
    protected start: AsyncNode<T>;

    constructor(start: AsyncNode<T>) {
        super();
        this.start = start;
    }

    protected getNextNode(curr: BaseNode, action?: string): AsyncNode<T> | undefined {
        const nextNode = curr.successors[action || "default"];
        if (!nextNode && Object.keys(curr.successors).length > 0) {
            console.warn(`Flow ends: '${action}' not found among [${Object.keys(curr.successors)}]`);
        }
        return nextNode as AsyncNode<T>;
    }

    protected async _orchAsync(shared: T, params?: NodeParams): Promise<void> {
        let curr: AsyncNode<T> | undefined = this.shallowCopyNode(this.start);
        const mergedParams = params ? { ...this.params, ...params } : { ...this.params };
        
        while (curr) {
            curr.setParams(mergedParams);
            let result;
            
            if (curr instanceof AsyncNode) {
                result = await curr.runAsync(shared);
            } else {
                throw new Error("Flow encountered a non-Async node. Please use AsyncNode-based classes.");
            }
            
            const next = this.getNextNode(curr, result);
            curr = next ? this.shallowCopyNode(next) : undefined;
        }
    }

    protected async _runAsync(shared: T): Promise<any> {
        const prepResult = await this.prepAsync(shared);
        await this._orchAsync(shared);
        return this.postAsync(shared, prepResult, null);
    }

    async runAsync(shared: T): Promise<any> {
        return this._runAsync(shared);
    }

    protected shallowCopyNode<N extends AsyncNode<T>>(node: N): N {
        return Object.assign(Object.create(Object.getPrototypeOf(node)), node);
    }
}

/**************************************************************
 * BATCH FLOW (ASYNC)
 **************************************************************/
class AsyncBatchFlow<T extends SharedState = SharedState> extends AsyncFlow<T> {
    protected async _runAsync(shared: T): Promise<any> {
        const batchData = await this.prepAsync(shared) || [];
        for (const bp of batchData) {
            await this._orchAsync(shared, bp);
        }
        return this.postAsync(shared, batchData, null);
    }
}

class AsyncParallelBatchFlow<T extends SharedState = SharedState> extends AsyncFlow<T> {
    protected async _runAsync(shared: T): Promise<any> {
        const batchData = await this.prepAsync(shared) || [];
        await Promise.all(batchData.map((bp: any) => this._orchAsync(shared, bp)));
        return this.postAsync(shared, batchData, null);
    }
}

// Example implementation from async.md
interface DocState extends SharedState {
    doc_path: string;
    summary?: string;
}

class SummarizeThenVerify extends AsyncNode<DocState> {
    async prepAsync(shared: DocState): Promise<string> {
        const docText = await readFileAsync(shared.doc_path);
        return docText;
    }

    async execAsync(prepRes: string): Promise<string> {
        const summary = await callLLMAsync(`Summarize: ${prepRes}`);
        return summary;
    }

    async postAsync(shared: DocState, _: string, execRes: string): Promise<string> {
        const decision = await gatherUserFeedback(execRes);
        if (decision === "approve") {
            shared.summary = execRes;
            return "approve";
        }
        return "deny";
    }
}

class Finalize extends AsyncNode<DocState> {
    async prepAsync(_: DocState): Promise<void> {
        return;
    }

    async execAsync(): Promise<void> {
        // Final processing
    }

    async postAsync(_shared: DocState, _prep: void, _exec: void): Promise<void> {
        return;
    }
}// Export all classes
exports.BaseNode = BaseNode;
exports._ConditionalTransition = _ConditionalTransition;
exports.AsyncNode = AsyncNode;
exports.AsyncBatchNode = AsyncBatchNode;
exports.AsyncParallelBatchNode = AsyncParallelBatchNode;
exports.AsyncFlow = AsyncFlow;
exports.AsyncBatchFlow = AsyncBatchFlow;
exports.AsyncParallelBatchFlow = AsyncParallelBatchFlow;
export {
    DocState, Finalize, SummarizeThenVerify
};

