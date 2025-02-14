/**
 * Simple helper for synchronous "sleep" (busy-wait).
 * Not recommended in real production code because it blocks the event loop!
 */
function sleepSync(seconds: number): void {
  const ms = seconds * 1000;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // Busy-wait...
  }
}

//
// BaseNode
//
export class BaseNode {
  public params: any;
  public successors: { [action: string]: BaseNode };

  constructor() {
    this.params = {};
    this.successors = {};
  }

  public setParams(params: any): void {
    this.params = params;
  }

  public addSuccessor(node: BaseNode, action: string = "default"): BaseNode {
    if (this.successors[action]) {
      console.warn(`Overwriting successor for action '${action}'`);
    }
    this.successors[action] = node;
    return node;
  }

  // Called before exec
  // Override in subclasses if needed
  public prep(shared: any): any {
    // No-op by default
    return;
  }

  // The main logic
  // Override in subclasses if needed
  public exec(prepRes: any): any {
    // No-op by default
    return;
  }

  // Called after exec
  // Override in subclasses if needed
  public post(shared: any, prepRes: any, execRes: any): any {
    // No-op by default
    return;
  }

  protected _exec(prepRes: any): any {
    return this.exec(prepRes);
  }

  protected _run(shared: any): any {
    const p = this.prep(shared);
    const e = this._exec(p);
    return this.post(shared, p, e);
  }

  // By default, run does not proceed to successors
  public run(shared: any): any {
    if (Object.keys(this.successors).length > 0) {
      console.warn("Node won't run successors. Use Flow.");
    }
    return this._run(shared);
  }

  /**
   * Python used `node1 >> node2` to link nodes.
   * We'll provide a helper method `then(node2)` for chaining.
   */
  public then(other: BaseNode): BaseNode {
    return this.addSuccessor(other);
  }

  /**
   * Python used `node - "action" >> node2`.
   * We'll provide a helper method `action("actionString")` returning a
   * _ConditionalTransition object that has `.then(...)`.
   */
  public action(action: string): _ConditionalTransition {
    return new _ConditionalTransition(this, action);
  }
}

//
// _ConditionalTransition
//
export class _ConditionalTransition {
  constructor(public src: BaseNode, public action: string) {}

  public then(target: BaseNode): BaseNode {
    return this.src.addSuccessor(target, this.action);
  }
}

//
// Node (with retry and possible wait)
//
export class Node extends BaseNode {
  public maxRetries: number;
  public wait: number;
  public curRetry: number;

  constructor(max_retries: number = 1, wait: number = 0) {
    super();
    this.maxRetries = max_retries;
    this.wait = wait;
    this.curRetry = 0;
  }

  /**
   * If retries are exhausted, this fallback is used.
   * By default, it re-throws the exception.
   */
  public execFallback(prepRes: any, exc: Error): any {
    throw exc;
  }

  protected _exec(prepRes: any): any {
    for (this.curRetry = 0; this.curRetry < this.maxRetries; this.curRetry++) {
      try {
        return this.exec(prepRes);
      } catch (error) {
        if (this.curRetry === this.maxRetries - 1) {
          return this.execFallback(prepRes, error as Error);
        }
        if (this.wait > 0) {
          // Synchronous "sleep". Blocks the entire thread.
          sleepSync(this.wait);
        }
      }
    }
  }
}

//
// BatchNode (processes array of items via parent's _exec per item)
//
export class BatchNode extends Node {
  protected _exec(items: any[]): any[] {
    return (items || []).map((i) => super._exec(i));
  }
}

//
// Flow (chains multiple nodes based on successors & returned actions)
//
export class Flow extends BaseNode {
  public start: BaseNode;

  constructor(start: BaseNode) {
    super();
    this.start = start;
  }

  protected getNextNode(curr: BaseNode, action?: string): BaseNode | undefined {
    const nextNode = curr.successors[action || "default"];
    if (!nextNode && Object.keys(curr.successors).length > 0) {
      console.warn(
        `Flow ends: '${action}' not found in [${Object.keys(curr.successors)}]`
      );
    }
    return nextNode;
  }

  protected _orch(shared: any, params?: any): void {
    // Shallow copy "start"
    let curr: BaseNode | undefined = Object.assign(
      Object.create(Object.getPrototypeOf(this.start)),
      this.start
    );
    const p = params ?? { ...this.params };

    while (curr) {
      curr.setParams(p);
      const c = curr._run(shared);
      const nextNode = this.getNextNode(curr, c);
      if (nextNode) {
        // Make a fresh copy each time
        curr = Object.assign(
          Object.create(Object.getPrototypeOf(nextNode)),
          nextNode
        );
      } else {
        curr = undefined;
      }
    }
  }

  protected _run(shared: any): any {
    const pr = this.prep(shared);
    this._orch(shared);
    return this.post(shared, pr, null);
  }

  public exec(_prepRes: any): any {
    throw new Error("Flow can't exec directly.");
  }
}

//
// BatchFlow (like Flow but runs the chain for each item in prep() array)
//
export class BatchFlow extends Flow {
  protected _run(shared: any): any {
    const pr = this.prep(shared) || [];
    for (const bp of pr) {
      this._orch(shared, { ...this.params, ...bp });
    }
    return this.post(shared, pr, null);
  }
}

//
// AsyncNode (all steps are async, includes retry logic with async sleep)
//
export class AsyncNode extends Node {
  // Force an error if the user calls the sync versions.
  public prep(_shared: any): any {
    throw new Error("Use prepAsync.");
  }
  public exec(_prepRes: any): any {
    throw new Error("Use execAsync.");
  }
  public post(_s: any, _p: any, _e: any): any {
    throw new Error("Use postAsync.");
  }
  public execFallback(_p: any, _exc: Error): any {
    throw new Error("Use execFallbackAsync.");
  }
  protected _run(_shared: any): any {
    throw new Error("Use runAsync.");
  }

  // Async versions
  public async prepAsync(_shared: any): Promise<any> {
    // No-op by default
    return;
  }
  public async execAsync(_prepRes: any): Promise<any> {
    // No-op by default
    return;
  }
  public async execFallbackAsync(_prepRes: any, exc: Error): Promise<any> {
    throw exc; // default re-raise
  }
  public async postAsync(
    _shared: any,
    _prepRes: any,
    _execRes: any
  ): Promise<any> {
    // No-op by default
    return;
  }

  protected async _exec(prepRes: any): Promise<any> {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await this.execAsync(prepRes);
      } catch (error) {
        if (i === this.maxRetries - 1) {
          return await this.execFallbackAsync(prepRes, error as Error);
        }
        if (this.wait > 0) {
          // Async sleep
          await new Promise((resolve) =>
            setTimeout(resolve, this.wait * 1000)
          );
        }
      }
    }
  }

  // Async entry point
  public async runAsync(shared: any): Promise<any> {
    if (Object.keys(this.successors).length > 0) {
      console.warn("Node won't run successors. Use AsyncFlow.");
    }
    return this._runAsync(shared);
  }

  protected async _runAsync(shared: any): Promise<any> {
    const p = await this.prepAsync(shared);
    const e = await this._exec(p);
    return await this.postAsync(shared, p, e);
  }
}

//
// AsyncBatchNode (async version of BatchNode)
//
export class AsyncBatchNode extends AsyncNode {
  protected async _exec(items: any[]): Promise<any[]> {
    const results: any[] = [];
    for (const i of items) {
      results.push(await super._exec(i));
    }
    return results;
  }
}

//
// AsyncParallelBatchNode (parallel version of AsyncBatchNode using Promise.all)
//
export class AsyncParallelBatchNode extends AsyncNode {
  protected async _exec(items: any[]): Promise<any[]> {
    return Promise.all(items.map((i) => super._exec(i)));
  }
}

//
// AsyncFlow (async orchestration of nodes)
//
export class AsyncFlow extends Flow {
  // Override the sync methods to force usage of the async versions
  public prep(_shared: any): any {
    throw new Error("Use prepAsync for AsyncFlow.");
  }
  public exec(_prepRes: any): any {
    throw new Error("Flow can't exec (use execAsync for AsyncFlow).");
  }
  public post(_s: any, _p: any, _e: any): any {
    throw new Error("Use postAsync for AsyncFlow.");
  }

  // Provide async versions, similar to AsyncNode
  public async prepAsync(_shared: any): Promise<any> {
    return;
  }
  public async postAsync(_shared: any, _prepRes: any, _execRes: any): Promise<any> {
    return;
  }

  protected async _orchAsync(shared: any, params?: any): Promise<void> {
    let curr: BaseNode | undefined = Object.assign(
      Object.create(Object.getPrototypeOf(this.start)),
      this.start
    );
    const p = params ?? { ...this.params };

    while (curr) {
      curr.setParams(p);
      let c: any;
      // If it's an AsyncNode, use runAsync; otherwise, use the sync version
      if (curr instanceof AsyncNode) {
        c = await curr._runAsync(shared);
      } else {
        c = curr._run(shared);
      }

      const nextNode = this.getNextNode(curr, c);
      if (nextNode) {
        curr = Object.assign(
          Object.create(Object.getPrototypeOf(nextNode)),
          nextNode
        );
      } else {
        curr = undefined;
      }
    }
  }

  // The main async run
  protected async _runAsync(shared: any): Promise<any> {
    const p = await this.prepAsync(shared);
    await this._orchAsync(shared);
    return this.postAsync(shared, p, null);
  }

  public async runAsync(shared: any): Promise<any> {
    return this._runAsync(shared);
  }
}

//
// AsyncBatchFlow (like BatchFlow but fully async)
//
export class AsyncBatchFlow extends AsyncFlow {
  protected async _runAsync(shared: any): Promise<any> {
    const pr = (await this.prepAsync(shared)) || [];
    for (const bp of pr) {
      await this._orchAsync(shared, { ...this.params, ...bp });
    }
    return this.postAsync(shared, pr, null);
  }
}

//
// AsyncParallelBatchFlow (process all items in parallel)
//
export class AsyncParallelBatchFlow extends AsyncFlow {
  protected async _runAsync(shared: any): Promise<any> {
    const pr = (await this.prepAsync(shared)) || [];
    // Orchestrate each item in parallel
    await Promise.all(
      pr.map((bp: any) => this._orchAsync(shared, { ...this.params, ...bp }))
    );
    return this.postAsync(shared, pr, null);
  }
}
