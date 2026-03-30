# useLayoutEffect 用法与原理详解

## useLayoutEffect 是什么？

useLayoutEffect 是一个 React Hook，用于**在 DOM 更新后、浏览器绘制前同步执行副作用**。它的 API 与 useEffect 相同，但执行时机不同。

**核心特性**：
- **同步执行**：在浏览器绘制前执行，阻塞绘制
- **DOM 可用**：此时 DOM 已经更新完成
- **避免闪烁**：适合需要读取 DOM 布局或同步更新 DOM 的场景
- **性能影响**：会阻塞浏览器绘制，需要谨慎使用

---

## 基本用法

### 1. 基本语法

```tsx
import { useLayoutEffect } from 'react';

// 语法与 useEffect 相同
useLayoutEffect(() => {
  // 副作用代码
  console.log('Layout effect runs');

  // 返回清理函数
  return () => {
    console.log('Layout effect cleanup');
  };
}, [deps]);  // 依赖数组
```

### 2. 简单示例

```tsx
function Component() {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    // DOM 更新后、浏览器绘制前执行
    const element = document.getElementById('measure');
    if (element) {
      const rect = element.getBoundingClientRect();
      setWidth(rect.width);
    }
  }, []);

  return (
    <div>
      <div id="measure">Measure me</div>
      <p>Width: {width}px</p>
    </div>
  );
}
```

---

## useLayoutEffect vs useEffect

### 执行时机对比

```
组件函数执行
    ↓
生成 VDOM
    ↓
Diff 算法对比
    ↓
提交 DOM 更新
    ↓
┌─────────────────────────────┐
│ useLayoutEffect 执行         │ ← 同步执行，阻塞绘制
│ - DOM 已更新                  │
│ - 浏览器尚未绘制              │
└─────────────────────────────┘
    ↓
浏览器绘制（Paint）
    ↓
┌─────────────────────────────┐
│ useEffect 执行               │ ← 异步执行，不阻塞绘制
│ - 浏览器已经绘制              │
└─────────────────────────────┘
    ↓
用户看到最终结果
```

### 视觉差异示例

```tsx
// ❌ 使用 useEffect：可能看到闪烁

function FlashingComponent() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // 异步执行，用户可能看到元素在原位置，然后突然移动
    setPosition({ x: 100, y: 100 });
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transition: 'all 0.3s ease'
      }}
    >
      I may flash!
    </div>
  );
}

// ✅ 使用 useLayoutEffect：避免闪烁

function SmoothComponent() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    // 同步执行，浏览器绘制前完成位置更新
    setPosition({ x: 100, y: 100 });
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transition: 'all 0.3s ease'
      }}
    >
      No flash!
    </div>
  );
}
```

### 对比表格

| 特性 | useEffect | useLayoutEffect |
|-----|----------|----------------|
| 执行时机 | 浏览器绘制后（异步） | 浏览器绘制前（同步） |
| 是否阻塞绘制 | ❌ 否 | ✅ 是 |
| DOM 状态 | 已更新 | 已更新 |
| 读取 DOM 布局 | ✅ 可以 | ✅ 可以 |
| 更新 DOM | ✅ 可以 | ✅ 可以 |
| 性能影响 | 低（不阻塞） | 高（阻塞） |
| 用途 | 大多数副作用 | 需要 DOM 布局、避免闪烁 |
| 服务端渲染 | ❌ 警告 | ❌ 警告 |

---

## 为什么需要 useLayoutEffect？

### 场景 1：读取 DOM 布局

```tsx
// ❌ 问题：使用 useEffect 可能导致布局抖动

function Tooltip({ targetId }: { targetId: string }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // 异步执行，用户可能看到 tooltip 在错误位置，然后跳到正确位置
    const target = document.getElementById(targetId);
    if (target) {
      const rect = target.getBoundingClientRect();
      setPosition({
        x: rect.left,
        y: rect.bottom + 10
      });
    }
  }, [targetId]);

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y
      }}
    >
      Tooltip
    </div>
  );
}

// ✅ 解决方案：使用 useLayoutEffect

function Tooltip({ targetId }: { targetId: string }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    // 同步执行，浏览器绘制前完成位置计算
    const target = document.getElementById(targetId);
    if (target) {
      const rect = target.getBoundingClientRect();
      setPosition({
        x: rect.left,
        y: rect.bottom + 10
      });
    }
  }, [targetId]);

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y
      }}
    >
      Tooltip
    </div>
  );
}
```

### 场景 2：避免滚动条闪烁

```tsx
// ❌ 问题：使用 useEffect 可能导致滚动条闪烁

function ScrollableContent() {
  const [content, setContent] = useState('');

  useEffect(() => {
    // 异步执行，可能先显示内容，再添加滚动条
    setContent('Long content that requires scrolling...'.repeat(100));
  }, []);

  return (
    <div style={{ height: '200px', overflowY: 'auto' }}>
      {content}
    </div>
  );
}

// ✅ 解决方案：使用 useLayoutEffect

function ScrollableContent() {
  const [content, setContent] = useState('');

  useLayoutEffect(() => {
    // 同步执行，浏览器绘制前完成内容设置
    setContent('Long content that requires scrolling...'.repeat(100));
  }, []);

  return (
    <div style={{ height: '200px', overflowY: 'auto' }}>
      {content}
    </div>
  );
}
```

### 场景 3：同步 DOM 更新

```tsx
// ❌ 问题：使用 useEffect 可能导致视觉闪烁

function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    // 异步执行，用户可能看到 input 未聚焦，然后突然聚焦
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

// ✅ 解决方案：使用 useLayoutEffect

function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  useLayoutEffect(() => {
    // 同步执行，浏览器绘制前完成聚焦
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
```

---

## 实现原理

### 内部执行流程

```tsx
// useLayoutEffect 内部逻辑（简化版）

function useLayoutEffect(
  create: () => (() => void) | void,
  deps: DependencyList | undefined
): void {
  // ========== 步骤 1：获取当前 hook ==========
  const hook = getHook();
  const fiber = currentlyRenderingFiber!;

  // ========== 步骤 2：创建 effect 对象 ==========
  const effect: Effect = {
    tag: LayoutEffect,  // 标记为 LayoutEffect
    create,
    destroy: undefined,
    deps: deps || null,
    next: null
  };

  // ========== 步骤 3：添加到 effect 链表 ==========
  // useLayoutEffect 的 effect 会被添加到 fiber 的 updateQueue
  fiber.updateQueue = fiber.updateQueue || {
    effects: null
  };

  if (fiber.updateQueue.effects === null) {
    fiber.updateQueue.effects = effect;
  } else {
    let current = fiber.updateQueue.effects;
    while (current.next !== null) {
      current = current.next;
    }
    current.next = effect;
  }

  // ========== 步骤 4：标记需要执行 ==========
  // useLayoutEffect 会在 commit 阶段同步执行
  markHasLayoutEffects(fiber);
}

// ========== Effect 类型 ==========

interface Effect {
  tag: number;
  create: () => (() => void) | void;
  destroy: (() => void) | void;
  deps: DependencyList | null;
  next: Effect | null;
}

// Effect tag 类型
const PassiveEffect = 1;    // useEffect
const LayoutEffect = 2;     // useLayoutEffect
```

### 完整伪源码

```tsx
// ========== 1. useLayoutEffect 实现 ==========

function useLayoutEffect(
  create: () => (() => void) | void,
  deps: DependencyList | undefined
): void {
  // ========== 步骤 1：获取当前 Fiber 和 Hook ==========
  const fiber = currentlyRenderingFiber!;
  const hook = getCurrentHook();

  // ========== 步骤 2：首次渲染（mount）==========
  if (fiber.alternate === null) {
    // 创建 effect 对象
    const effect: Effect = {
      tag: LayoutEffect,
      create,
      destroy: undefined,
      deps: deps || null,
      next: null
    };

    // 保存到 hook
    hook.memoizedState = effect;

    // 添加到 fiber 的 updateQueue
    fiber.updateQueue = fiber.updateQueue || {
      effects: null
    };

    if (fiber.updateQueue.effects === null) {
      fiber.updateQueue.effects = effect;
    } else {
      let current = fiber.updateQueue.effects;
      while (current.next !== null) {
        current = current.next;
      }
      current.next = effect;
    }

    console.log('[useLayoutEffect] Mount: effect created');
    return;
  }

  // ========== 步骤 3：重新渲染（update）==========
  const oldEffect = hook.memoizedState as Effect;

  // 比较依赖数组
  const oldDeps = oldEffect.deps;
  const newDeps = deps || null;

  const shouldRun = !areDepsEqual(oldDeps, newDeps);

  if (!shouldRun) {
    console.log('[useLayoutEffect] Update: deps unchanged, skipping');
    return;
  }

  // 依赖变了，更新 effect
  const newEffect: Effect = {
    tag: LayoutEffect,
    create,
    destroy: oldEffect.destroy,  // 保留旧的清理函数
    deps: newDeps,
    next: null
  };

  // 更新 hook
  hook.memoizedState = newEffect;

  console.log('[useLayoutEffect] Update: deps changed, will run');
}

// ========== 2. 执行 useLayoutEffect（commit 阶段）==========

function commitLayoutEffects(fiber: Fiber): void {
  // ========== 步骤 1：获取所有 layout effects ==========
  const layoutEffects = collectLayoutEffects(fiber);

  // ========== 步骤 2：执行所有 layout effects ==========
  layoutEffects.forEach(effect => {
    // 执行清理函数
    if (effect.destroy !== undefined) {
      try {
        effect.destroy();
      } catch (error) {
        console.error('useLayoutEffect cleanup error:', error);
      }
    }

    // 执行 effect 回调
    try {
      const destroy = effect.create();
      effect.destroy = destroy;
    } catch (error) {
      console.error('useLayoutEffect error:', error);
    }
  });
}

// ========== 3. 收集 layout effects ==========

function collectLayoutEffects(fiber: Fiber): Effect[] {
  const effects: Effect[] = [];

  const traverse = (currentFiber: Fiber) => {
    // 检查是否有 hook
    if (currentFiber.memoizedState !== null) {
      let hook = currentFiber.memoizedState as Hook;

      while (hook !== null) {
        // 只收集 useLayoutEffect
        if (hook.tag === LayoutEffect) {
          const effect = hook.memoizedState as Effect;
          effects.push(effect);
        }
        hook = hook.next;
      }
    }

    // 递归遍历子节点
    if (currentFiber.child) {
      traverse(currentFiber.child);
    }

    if (currentFiber.sibling) {
      traverse(currentFiber.sibling);
    }
  };

  traverse(fiber);
  return effects;
}

// ========== 4. React 渲染流程中的 useLayoutEffect ==========

function renderComponent(fiber: Fiber): void {
  // ========== 阶段 1：Render 阶段 ==========
  // 执行组件函数，生成 VDOM
  const element = fiber.type(fiber.props);

  // Diff 算法，对比新旧 VDOM
  reconcileChildren(fiber, element);

  // ========== 阶段 2：Commit 阶段 ==========

  // 提交 DOM 更新
  commitDOMUpdates(fiber);

  // ========== 关键：执行 useLayoutEffect ==========
  commitLayoutEffects(fiber);

  // ========== 阶段 3：浏览器绘制 ==========
  // 此时浏览器才会绘制
}

// ========== 5. useEffect 执行时机（对比）==========

function commitPassiveEffects(fiber: Fiber): void {
  // useEffect 在浏览器绘制后执行
  // 使用 setTimeout 或 requestIdleCallback

  setTimeout(() => {
    const passiveEffects = collectPassiveEffects(fiber);
    passiveEffects.forEach(effect => {
      if (effect.destroy !== undefined) {
        effect.destroy();
      }

      const destroy = effect.create();
      effect.destroy = destroy;
    });
  }, 0);
}

// ========== 6. 依赖数组比较（与 useEffect 相同）==========

function areDepsEqual(
  prevDeps: DependencyList | null,
  nextDeps: DependencyList | null
): boolean {
  if (prevDeps === null || nextDeps === null) {
    return false;
  }

  if (prevDeps.length !== nextDeps.length) {
    return false;
  }

  for (let i = 0; i < prevDeps.length; i++) {
    if (!Object.is(prevDeps[i], nextDeps[i])) {
      return false;
    }
  }

  return true;
}
```

### 完整渲染流程对比

```tsx
// useEffect 渲染流程

function renderWithUseEffect(fiber: Fiber) {
  // 1. Render 阶段
  const element = renderComponent(fiber);

  // 2. Commit 阶段
  commitDOMUpdates(fiber);

  // 3. 浏览器绘制（Paint）
  // 此时用户看到第一次渲染

  // 4. useEffect 执行
  setTimeout(() => {
    commitPassiveEffects(fiber);  // 异步执行
  });

  // 5. 浏览器重新绘制（如果有 DOM 更新）
  // 此时用户看到最终状态
}

// useLayoutEffect 渲染流程

function renderWithUseLayoutEffect(fiber: Fiber) {
  // 1. Render 阶段
  const element = renderComponent(fiber);

  // 2. Commit 阶段
  commitDOMUpdates(fiber);

  // 3. useLayoutEffect 执行（同步）
  commitLayoutEffects(fiber);  // 同步执行，阻塞绘制

  // 4. 浏览器绘制（Paint）
  // 此时用户直接看到最终状态
}
```

---

## 实际应用示例

### 1. 测量 DOM 元素

```tsx
function MeasureComponent() {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0
  });
  const divRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (divRef.current) {
      const rect = divRef.current.getBoundingClientRect();
      setDimensions({
        width: rect.width,
        height: rect.height
      });
    }
  }, []);

  return (
    <div>
      <div
        ref={divRef}
        style={{
          width: '200px',
          height: '100px',
          backgroundColor: 'lightblue'
        }}
      >
        Measure me
      </div>
      <p>Width: {dimensions.width}px</p>
      <p>Height: {dimensions.height}px</p>
    </div>
  );
}
```

### 2. 自动调整高度（Textarea）

```tsx
function AutoResizeTextarea() {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      // 重置高度，然后设置为 scrollHeight
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={{
        width: '100%',
        minHeight: '60px',
        resize: 'none',
        overflow: 'hidden'
      }}
      placeholder="Type something..."
    />
  );
}
```

### 3. 同步滚动位置

```tsx
function SyncScrollContainer() {
  const [content, setContent] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  // 保存滚动位置
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      scrollPositionRef.current = container.scrollTop;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 内容更新时恢复滚动位置
  useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [content]);

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type something..."
      />
      <div
        ref={containerRef}
        style={{
          height: '200px',
          overflowY: 'auto',
          border: '1px solid #ccc',
          marginTop: '10px'
        }}
      >
        {content.split('\n').map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
    </div>
  );
}
```

### 4. 焦点管理

```tsx
function FocusManagement() {
  const [activeTab, setActiveTab] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useLayoutEffect(() => {
    // 切换 tab 时自动聚焦第一个 input
    if (inputRefs.current[activeTab]) {
      inputRefs.current[activeTab]?.focus();
    }
  }, [activeTab]);

  return (
    <div>
      <div>
        <button onClick={() => setActiveTab(0)}>Tab 1</button>
        <button onClick={() => setActiveTab(1)}>Tab 2</button>
      </div>

      {activeTab === 0 && (
        <div>
          <input
            ref={el => inputRefs.current[0] = el}
            placeholder="Input 1"
          />
        </div>
      )}

      {activeTab === 1 && (
        <div>
          <input
            ref={el => inputRefs.current[1] = el}
            placeholder="Input 2"
          />
        </div>
      )}
    </div>
  );
}
```

---

## 常见陷阱和最佳实践

### 1. ❌ 过度使用 useLayoutEffect

```tsx
// ❌ 错误：不需要读取 DOM 布局也用 useLayoutEffect

function Counter() {
  const [count, setCount] = useState(0);

  // 问题：不需要 DOM 布局，应该用 useEffect
  useLayoutEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);

  return <div>Count: {count}</div>;
}

// ✅ 正确：使用 useEffect

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);

  return <div>Count: {count}</div>;
}

// 只在以下情况使用 useLayoutEffect：
// 1. 需要读取 DOM 布局（getBoundingClientRect）
// 2. 需要同步更新 DOM（避免闪烁）
// 3. 需要在浏览器绘制前完成操作
```

### 2. ❌ 在 useLayoutEffect 中执行耗时操作

```tsx
// ❌ 错误：在 useLayoutEffect 中执行耗时操作

function Component() {
  useLayoutEffect(() => {
    // ❌ 不要在 useLayoutEffect 中执行耗时操作
    const largeArray = Array(1000000).fill(0);
    const sum = largeArray.reduce((a, b) => a + b, 0);
    console.log(sum);

    // 问题：阻塞浏览器绘制，导致页面卡顿
  }, []);

  return <div>Component</div>;
}

// ✅ 正确：在 useEffect 中执行耗时操作

function Component() {
  useEffect(() => {
    // ✅ 使用 useEffect，不阻塞绘制
    const largeArray = Array(1000000).fill(0);
    const sum = largeArray.reduce((a, b) => a + b, 0);
    console.log(sum);
  }, []);

  return <div>Component</div>;
}
```

### 3. ❌ 在 useLayoutEffect 中更新大量状态

```tsx
// ❌ 错误：在 useLayoutEffect 中更新大量状态

function Component() {
  const [items, setItems] = useState<number[]>([]);

  useLayoutEffect(() => {
    // ❌ 不要在 useLayoutEffect 中更新大量状态
    const newItems = Array(1000).fill(0).map((_, i) => i);
    setItems(newItems);

    // 问题：触发大量重新渲染，阻塞浏览器绘制
  }, []);

  return (
    <ul>
      {items.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

// ✅ 正确：在 useEffect 中更新大量状态

function Component() {
  const [items, setItems] = useState<number[]>([]);

  useEffect(() => {
    // ✅ 使用 useEffect，不阻塞绘制
    const newItems = Array(1000).fill(0).map((_, i) => i);
    setItems(newItems);
  }, []);

  return (
    <ul>
      {items.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
```

### 4. ❌ 忘记服务端渲染兼容

```tsx
// ❌ 错误：在服务端使用 useLayoutEffect

function Component() {
  useLayoutEffect(() => {
    // 服务端渲染时会警告
    console.log('This runs on the server?');
  }, []);

  return <div>Component</div>;
}

// ✅ 正确：检查是否在浏览器环境

function Component() {
  useLayoutEffect(() => {
    // 检查是否在浏览器环境
    if (typeof window !== 'undefined') {
      console.log('Running in browser');
    }
  }, []);

  return <div>Component</div>;
}

// ✅ 更好的做法：使用自定义 Hook

function useIsomorphicLayoutEffect(
  effect: () => () => void,
  deps?: DependencyList
) {
  // 服务端使用 useEffect，客户端使用 useLayoutEffect
  const isomorphicEffect = typeof window !== 'undefined'
    ? useLayoutEffect
    : useEffect;

  isomorphicEffect(effect, deps);
}

function Component() {
  useIsomorphicLayoutEffect(() => {
    console.log('Safe to use on server and client');
  }, []);

  return <div>Component</div>;
}
```

### 5. ❌ 忘记清理函数

```tsx
// ❌ 错误：忘记清理函数

function ResizeComponent() {
  const [width, setWidth] = useState(window.innerWidth);

  useLayoutEffect(() => {
    // ❌ 忘记清理函数
    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    // 问题：每次渲染都添加监听器，但不清理
  }, []);

  return <div>Width: {width}px</div>;
}

// ✅ 正确：返回清理函数

function ResizeComponent() {
  const [width, setWidth] = useState(window.innerWidth);

  useLayoutEffect(() => {
    // ✅ 返回清理函数
    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <div>Width: {width}px</div>;
}
```

---

## 核心要点总结

### useLayoutEffect 的作用

1. **同步执行副作用**：在浏览器绘制前执行，阻塞绘制
2. **避免视觉闪烁**：适合需要同步更新 DOM 的场景
3. **读取 DOM 布局**：DOM 已更新，可以安全读取布局信息
4. **性能影响**：会阻塞浏览器绘制，需要谨慎使用

### 工作原理

```tsx
// 执行时机
组件渲染
  ↓
DOM 更新
  ↓
useLayoutEffect 执行（同步）
  ↓
浏览器绘制
  ↓
useEffect 执行（异步）
```

### useLayoutEffect vs useEffect

| 特性 | useEffect | useLayoutEffect |
|-----|----------|----------------|
| 执行时机 | 浏览器绘制后 | 浏览器绘制前 |
| 是否阻塞绘制 | ❌ 否 | ✅ 是 |
| 性能影响 | 低 | 高 |
| 读取 DOM | ✅ 可以 | ✅ 可以 |
| 更新 DOM | ✅ 可以 | ✅ 可以 |
| 避免闪烁 | ❌ 可能闪烁 | ✅ 不闪烁 |
| 推荐使用 | ✅ 大多数情况 | ⚠️ 特定场景 |

### 何时使用 useLayoutEffect

**应该使用**：
- ✅ 需要读取 DOM 布局（getBoundingClientRect、getComputedStyle）
- ✅ 需要同步更新 DOM（避免闪烁）
- ✅ 需要在浏览器绘制前完成操作（自动聚焦、滚动定位）
- ✅ 实现动画库（需要精确控制渲染时机）

**不应该使用**：
- ❌ 不需要读取 DOM 布局的情况
- ❌ 执行耗时操作
- ❌ 更新大量状态
- ❌ 数据获取、API 调用
- ❌ 大多数常见的副作用

### 最佳实践

1. ✅ **默认使用 useEffect**：只在需要时使用 useLayoutEffect
2. ✅ **避免耗时操作**：不要在 useLayoutEffect 中执行耗时操作
3. ✅ **返回清理函数**：记得返回清理函数
4. ✅ **服务端渲染兼容**：检查浏览器环境或使用 isomorphic effect
5. ✅ **用于 DOM 操作**：只在需要 DOM 操作时使用
6. ❌ **不要过度使用**：只在特定场景使用
7. ❌ **不要用于数据获取**：数据获取用 useEffect
8. ❌ **不要阻塞绘制**：避免阻塞浏览器绘制

### 服务端渲染兼容

```tsx
// 自定义 isomorphic effect
function useIsomorphicLayoutEffect(
  effect: () => () => void,
  deps?: DependencyList
) {
  const isomorphicEffect = typeof window !== 'undefined'
    ? useLayoutEffect
    : useEffect;

  isomorphicEffect(effect, deps);
}

// 使用
function Component() {
  useIsomorphicLayoutEffect(() => {
    // 服务端和客户端都安全
    console.log('Isomorphic effect');
  }, []);

  return <div>Component</div>;
}
```

记住这些原则，你就能正确使用 useLayoutEffect 处理需要同步 DOM 操作的场景！
