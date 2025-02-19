import { cloneDeep } from "lodash";

export const DEFAULT_ACTION = "default"; // Default action for 

export abstract class BaseNode {
    public flow_params: any;
    public successors: Map<string, BaseNode>;

    constructor() {
        this.flow_params = {};
        this.successors = new Map();
    }

    public setParams(params: any): void {
        this.flow_params = params;
    }

    public clone(): BaseNode {
        const newNode = this._clone();
        newNode.flow_params = cloneDeep(this.flow_params);
        newNode.successors = new Map(this.successors);
        return newNode;
    }

    abstract _clone(): BaseNode;

    public addSuccessor(newSuccessor: BaseNode, action: string = DEFAULT_ACTION): void {
        if (this.successors.has(action)) {
            throw new Error(`Action ${action} already exists`);
        }

        
        this.successors.set(action, newSuccessor);
    }

    public getSuccessor(name: string): BaseNode | undefined {
        if (!this.successors.has(name)) {
            return undefined;
        }

        // This is important for parallel execution to not have race conditions
        return this.successors.get(name)!.clone();
    }
    
    abstract prep(sharedState: any): Promise<any>;

    /**
     * We allow you to implement custom wrappers over any core execution logic
     * 
     * Exec handler logic - this could be higher level retry and 
     * robustness logic that could be used across many node types
     * @param prepResult 
     * @returns 
     */
    public execWrapper(prepResult: any): Promise<any> {
        return this.execCore(prepResult);
    }

    /**
     * This is the primary execution step of a node and is typically 
     * the core component of a node implementation
     * @param prepResult 
     */
    abstract execCore(prepResult: any): Promise<any>;

    abstract post(prepResult: any, execResult: any, sharedState: any): Promise<string>;

    /**
     *  Core run logic should not change from node to node implementation
     * @param sharedState Contextual state that is shared across nodes
     */
    public async run(sharedState: any): Promise<string> {
        const prepResult = await this.prep(sharedState);
        const execResult = await this.execWrapper(prepResult);
        const action = await this.post(prepResult, execResult, sharedState);

        return action;
    }
}

export abstract class RetryNode extends BaseNode {
    protected maxRetries: number;
    protected intervalMs: number;

    constructor(maxRetries: number, intervalMs: number) {
        super();
        this.maxRetries = maxRetries;
        this.intervalMs = intervalMs;
    }

    public async execWrapper(prepResult: any): Promise<any> {
        for (let i = 0; i < this.maxRetries; i++) {
            try {
                return await this.execCore(prepResult);
            } catch (error) {
                await new Promise(resolve => setTimeout(resolve, this.intervalMs));
            }
        }

        throw new Error("Max retries reached after " + this.maxRetries + " attempts");
    }
}

export class Flow extends BaseNode {
    private start: BaseNode;

    constructor(start: BaseNode) {
        super();
        this.start = start;
    }

    public _clone(): BaseNode {
        // NOTE: I don't think we need to clone the start node here
        // We copy on ready any way during execution
        return new Flow(this.start);
    }

    async getStartNode(): Promise<BaseNode> {
        // This is important for parallel execution to not have race conditions
        return this.start.clone();
    }

    async execCore(prepResult: any): Promise<any> {
        throw new Error("Flow node does not support direct execution");
    }

    async prep(sharedState: any): Promise<any> {
        return {}; // Pass through the shared state to exec_core
    }

    async orchestrate(sharedState: any, flowParams?: any): Promise<any> {
        let currentNode: BaseNode | undefined = await this.getStartNode();
        while (currentNode) {
            console.log("Orchestrate -- currentNode", currentNode);
            currentNode.setParams((flowParams) ? flowParams : this.flow_params);
            const action = await currentNode.run(sharedState);
            currentNode = currentNode.getSuccessor(action); // If undefined, the flow is complete
        }
    }

    async run(sharedState: any): Promise<string> {
        const prepResult = await this.prep(sharedState);

        await this.orchestrate(sharedState);

        // No execution result to return for a flow
        return this.post(prepResult, undefined, sharedState);
    }

    async post(prepResult: any, execResult: any, sharedState: any): Promise<string> {
        return DEFAULT_ACTION;
    }
}

export class BatchFlow extends Flow {
    async prep(sharedState: any): Promise<any[]> {
        console.log("BatchFlow -- prep", sharedState);
        return [];
    }

    async run(sharedState: any): Promise<string> {
        console.log("BatchFlow -- run");
        const prepResultList = await this.prep(sharedState);

        const resultPromises = [];
        for (const prepResult of prepResultList) {
            const result = this.orchestrate(sharedState, prepResult);
            resultPromises.push(result);
        }
        const resultList = await Promise.all(resultPromises);

        return this.post(prepResultList, resultList, sharedState);
    }

    async post(prepResultList: any[], resultList: any[], sharedState: any): Promise<string> {
        console.log(`Processed ${resultList.length} items from ${prepResultList.length} prep results`);
        return DEFAULT_ACTION;
    }
}
