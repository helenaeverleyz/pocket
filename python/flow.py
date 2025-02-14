import asyncio
import copy
import warnings
from typing import Any, Dict, Optional, Union

class BaseNode:
    def __init__(self):
        self.params = {}
        self.successors = {}

    def set_params(self, params):
        self.params = params

    def add_successor(self, node: 'BaseNode', action: str = "default") -> 'BaseNode':
        if action in self.successors:
            warnings.warn(f"Overwriting successor for action '{action}'")
        self.successors[action] = node
        return node

    def __rshift__(self, other: 'BaseNode') -> 'BaseNode':
        return self.add_successor(other)

    def __sub__(self, action: str) -> 'ConditionalTransition':
        return ConditionalTransition(self, action)

    def prep(self, shared):
        return None

    def exec(self, prep_res):
        return None

    def post(self, shared, prep_res, exec_res):
        return None

    def _exec(self, prep_res):
        return self.exec(prep_res)

    def _run(self, shared):
        p = self.prep(shared)
        e = self._exec(p)
        return self.post(shared, p, e)

    def run(self, shared):
        if self.successors:
            warnings.warn("Node won't run successors. Use Flow.")
        return self._run(shared)


class ConditionalTransition:
    def __init__(self, src: BaseNode, action: str):
        self.src = src
        self.action = action

    def __rshift__(self, tgt: BaseNode) -> BaseNode:
        return self.src.add_successor(tgt, self.action)


class Node(BaseNode):
    def __init__(self, max_retries=1, wait=0):
        super().__init__()
        self.max_retries = max_retries
        self.wait = wait
        self.cur_retry = 0

    def exec_fallback(self, prep_res, exc):
        raise exc

    def _exec(self, prep_res):
        for self.cur_retry in range(self.max_retries):
            try:
                return self.exec(prep_res)
            except Exception as e:
                if self.cur_retry == self.max_retries - 1:
                    return self.exec_fallback(prep_res, e)
                if self.wait:
                    time.sleep(self.wait)


class BatchNode(Node):
    def _exec(self, items):
        return [super()._exec(i) for i in (items or [])]


class Flow(BaseNode):
    def __init__(self, start: BaseNode):
        super().__init__()
        self.start = start

    def get_next_node(self, curr: BaseNode, action: Optional[str] = None) -> Optional[BaseNode]:
        nxt = curr.successors.get(action or "default")
        if not nxt and curr.successors:
            warnings.warn(f"Flow ends: '{action}' not found in {list(curr.successors)}")
        return nxt

    def _orch(self, shared, params=None):
        curr = copy.copy(self.start)
        p = params or dict(self.params)
        
        while curr:
            curr.set_params(p)
            c = curr._run(shared)
            curr = self.get_next_node(curr, c)
            if curr:
                curr = copy.copy(curr)

    def _run(self, shared):
        pr = self.prep(shared)
        self._orch(shared)
        return self.post(shared, pr, None)

    def exec(self, _):
        raise RuntimeError("Flow can't exec.")


class BatchFlow(Flow):
    def _run(self, shared):
        pr = self.prep(shared) or []
        for bp in pr:
            self._orch(shared, {**self.params, **bp})
        return self.post(shared, pr, None)


class AsyncNode(Node):
    def prep(self, _):
        raise RuntimeError("Use prep_async.")

    def exec(self, _):
        raise RuntimeError("Use exec_async.")

    def post(self, _, __, ___):
        raise RuntimeError("Use post_async.")

    def exec_fallback(self, _, __):
        raise RuntimeError("Use exec_fallback_async.")

    def _run(self, _):
        raise RuntimeError("Use run_async.")

    async def prep_async(self, shared):
        return None

    async def exec_async(self, prep_res):
        return None

    async def exec_fallback_async(self, prep_res, exc):
        raise exc

    async def post_async(self, shared, prep_res, exec_res):
        return None

    async def _exec(self, prep_res):
        for self.cur_retry in range(self.max_retries):
            try:
                return await self.exec_async(prep_res)
            except Exception as e:
                if self.cur_retry == self.max_retries - 1:
                    return await self.exec_fallback_async(prep_res, e)
                if self.wait:
                    await asyncio.sleep(self.wait)

    async def run_async(self, shared):
        if self.successors:
            warnings.warn("Node won't run successors. Use AsyncFlow.")
        return await self._run_async(shared)

    async def _run_async(self, shared):
        p = await self.prep_async(shared)
        e = await self._exec(p)
        return await self.post_async(shared, p, e)


class AsyncBatchNode(AsyncNode):
    async def _exec(self, items):
        return [await super()._exec(i) for i in (items or [])]


class AsyncParallelBatchNode(AsyncNode):
    async def _exec(self, items):
        return await asyncio.gather(
            *(super()._exec(i) for i in (items or []))
        )


class AsyncFlow(Flow):
    async def prep_async(self, shared):
        return None

    async def post_async(self, shared, prep_res, exec_res):
        return None

    async def _orch_async(self, shared, params=None):
        curr = copy.copy(self.start)
        p = params or dict(self.params)
        
        while curr:
            curr.set_params(p)
            c = (await curr._run_async(shared) if isinstance(curr, AsyncNode)
                 else curr._run(shared))
            curr = self.get_next_node(curr, c)
            if curr:
                curr = copy.copy(curr)

    async def _run_async(self, shared):
        p = await self.prep_async(shared)
        await self._orch_async(shared)
        return await self.post_async(shared, p, None)


class AsyncBatchFlow(AsyncFlow):
    async def _run_async(self, shared):
        pr = await self.prep_async(shared) or []
        for bp in pr:
            await self._orch_async(shared, {**self.params, **bp})
        return await self.post_async(shared, pr, None)


class AsyncParallelBatchFlow(AsyncFlow):
    async def _run_async(self, shared):
        pr = await self.prep_async(shared) or []
        await asyncio.gather(
            *(self._orch_async(shared, {**self.params, **bp})
              for bp in pr)
        )
        return await self.post_async(shared, pr, None)
