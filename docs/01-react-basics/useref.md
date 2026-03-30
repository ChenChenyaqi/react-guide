# useRef 用法与原理详解

## useRef 是什么？

useRef 是一个 React Hook，用于**创建可变的 ref 对象**。它返回一个可变的 `ref` 对象，该对象的 `.current` 属性可以被修改和读取。

**核心特性**：
- **跨渲染持久化**：ref 对象在整个组件生命周期中保持不变
- **可变性**：`.current` 属性可以被修改，但不会触发重新渲染
- **获取 DOM 元素**：可以直接访问 DOM 节点
- **存储任意值**：存储不触发渲染的可变数据

---

## 基本用法

### 1. 创建 ref

```tsx
import { useRef } from 'react';

function Component() {
  // 创建一个 ref 对象
  const myRef = useRef(initialValue);

  // 访问和修改
  console.log(myRef.current);  // 读取
  myRef.current = newValue;     // 写入

  return <div>...</div>;
}
```

### 2. 获取 DOM 元素

```tsx
function TextInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    // 访问 DOM 元素
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.value = 'Hello';
    }
  };

  return (
    <div>
      <input ref={inputRef} type="text" placeholder="Type here..." />
      <button onClick={focusInput}>Focus Input</button>
    </div>
  );
}
```

### 3. 存储可变值

```tsx
function Timer() {
  const [count, setCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    // 使用 ref 存储定时器 ID
    timerRef.current = setInterval(() => {
      setCount(c => c + 1);
    }, 1000);
  };

  const stopTimer = () => {
    // 清理定时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={startTimer}>Start</button>
      <button onClick={stopTimer}>Stop</button>
    </div>
  );
}
```

---

## useRef 与 useState 的区别

### 核心区别

```tsx
// useState：状态改变会触发重新渲染
function UseStateExample() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);  // ✅ 触发重新渲染
    console.log('Component re-rendered');
  };

  return <button onClick={handleClick}>{count}</button>;
}

// useRef：值改变不触发重新渲染
function UseRefExample() {
  const countRef = useRef(0);

  const handleClick = () => {
    countRef.current++;  // ❌ 不会触发重新渲染
    console.log('Current value:', countRef.current);
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### 对比表格

| 特性 | useState | useRef |
|-----|---------|--------|
| 触发重新渲染 | ✅ 是 | ❌ 否 |
| 读取方式 | `const [value] = useState(initial)` | `ref.current` |
| 更新方式 | `setValue(newValue)` | `ref.current = newValue` |
| 用途 | 组件状态 | 可变值、DOM 引用 |
| 返回值 | `[value, setValue]` 数组 | `{ current: value }` 对象 |
| 变化通知 | 重新渲染 | 无通知 |

---

## 为什么 ref 不触发重新渲染？

### React 的渲染机制

```tsx
// useState 内部机制（简化版）
function useState(initialValue) {
  const hook = getHook();

  if (hook.memoizedState === undefined) {
    hook.memoizedState = initialValue;
  }

  const value = hook.memoizedState;

  const setValue = (newValue) => {
    // 关键：修改状态后，标记组件需要重新渲染
    hook.memoizedState = newValue;
    markComponentNeedsUpdate();  // 标记需要重新渲染
    scheduleRender();             // 安排重新渲染
  };

  return [value, setValue];
}

// useRef 内部机制（简化版）
function useRef(initialValue) {
  const hook = getHook();

  if (hook.memoizedState === undefined) {
    // 创建 ref 对象
    hook.memoizedState = {
      current: initialValue
    };
  }

  // 直接返回 ref 对象
  return hook.memoizedState;  // 不触发任何渲染相关操作
}
```

### 渲染流程对比

```
useState 更新流程：
setState(newValue)
    ↓
修改 hook.memoizedState
    ↓
markComponentNeedsUpdate()  ← 关键：标记需要重新渲染
    ↓
scheduleRender()
    ↓
重新渲染组件
    ↓
UI 更新

useRef 更新流程：
ref.current = newValue
    ↓
直接修改 .current 属性
    ↓
（没有任何渲染相关操作）← 不会触发重新渲染
    ↓
UI 不更新
```

---

## 实现原理

### 完整伪源码

```tsx
// useRef 完整实现（简化版）

interface RefObject<T> {
  current: T;
}

function useRef<T>(initialValue: T): RefObject<T> {
  // ========== 步骤 1：获取当前 hook ==========
  const hook = getHook();
  const fiber = currentlyRenderingFiber!;

  // ========== 步骤 2：首次渲染（mount）==========
  if (fiber.alternate === null) {
    // 首次渲染：创建 ref 对象
    const refObject: RefObject<T> = {
      current: initialValue
    };

    // 保存到 hook 的 memoizedState
    hook.memoizedState = refObject;

    console.log('[useRef] Mount: created ref object');
    return refObject;
  }

  // ========== 步骤 3：重新渲染（update）==========
  // 重新渲染：直接返回已存在的 ref 对象
  const refObject = hook.memoizedState as RefObject<T>;

  console.log('[useRef] Update: returning existing ref object');
  return refObject;
}

// ========== Hook 链表管理 ==========

// 全局变量
let currentlyRenderingFiber: FiberNode | null = null;
let currentHook: Hook | null = null;
let hookIndex = 0;

// Hook 类型
type Hook = {
  tag: number;
  memoizedState: any;
  next: Hook | null;
};

// Hook tag 类型
const HookState = 1;    // useState
const HookRef = 2;       // useRef
const HookEffect = 3;   // useEffect
const HookMemo = 4;      // useMemo
const HookCallback = 5;  // useCallback

// 获取当前 hook
function getHook(): Hook {
  const fiber = currentlyRenderingFiber!;

  // 首次渲染
  if (fiber.alternate === null) {
    // 创建新 hook
    const hook: Hook = {
      tag: HookRef,  // useRef 的 tag
      memoizedState: null,
      next: null
    };

    // 添加到链表
    if (fiber.memoizedState === null) {
      fiber.memoizedState = hook;
    } else {
      let current = fiber.memoizedState;
      while (current.next !== null) {
        current = current.next;
      }
      current.next = hook;
    }

    currentHook = hook;
    hookIndex++;

    return hook;
  }

  // 重新渲染：获取已有的 hook
  const hook = currentHook!;
  currentHook = hook.next;
  hookIndex++;

  return hook;
}
```

### ref 对象的持久化

```tsx
// 组件生命周期中的 ref 对象

function Component() {
  const myRef = useRef(0);

  console.log('Ref object:', myRef);  // 永远是同一个对象

  // 首次渲染
  // myRef = { current: 0 }  内存地址：0x1234

  // 重新渲染
  // myRef = { current: 0 }  仍是同一个对象，内存地址：0x1234

  // 修改 ref.current
  myRef.current = 5;  // 只修改属性，对象本身不变

  // 再次渲染
  // myRef = { current: 5 }  仍是同一个对象，内存地址：0x1234

  return <div>...</div>;
}

// 图示：

内存中的 ref 对象（地址：0x1234）
┌─────────────────────┐
│  current: 0 → 5    │  ← 可以修改 current，但对象地址不变
└─────────────────────┘
         ↑
         │
每次渲染都返回同一个对象引用
```

---

## 实际应用示例

### 1. 获取 DOM 元素

```tsx
function ScrollableList({ items }: { items: string[] }) {
  const listRef = useRef<HTMLUListElement>(null);

  const scrollToTop = () => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  };

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  return (
    <div>
      <button onClick={scrollToTop}>Top</button>
      <button onClick={scrollToBottom}>Bottom</button>
      <ul
        ref={listRef}
        style={{
          height: '200px',
          overflowY: 'auto',
          border: '1px solid #ccc'
        }}
      >
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 2. 存储定时器 ID

```tsx
function AutoSave({ data }: { data: any }) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 清除旧的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 状态变更时，延迟保存
    setStatus('saving');
    timerRef.current = setTimeout(() => {
      saveData(data);
      setStatus('saved');
      timerRef.current = null;
    }, 1000);

    // 清理函数
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data]);

  return <div>Status: {status}</div>;
}
```

### 3. 在 useEffect 中访问最新状态

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);

  // 同步 ref 和 state
  useEffect(() => {
    countRef.current = count;
  }, [count]);

  useEffect(() => {
    const interval = setInterval(() => {
      // 使用 ref 获取最新的 count 值
      console.log('Current count:', countRef.current);
    }, 1000);

    return () => clearInterval(interval);
  }, []);  // 空依赖数组

  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### 4. 存储上一次的值

```tsx
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;  // 返回上一次的值
}

function Component() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <div>
      <p>Current: {count}</p>
      <p>Previous: {prevCount}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}
```

### 5. 存储 DOM 元素的尺寸

```tsx
function ResizeObserverComponent() {
  const divRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!divRef.current) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    observer.observe(divRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <p>Size: {size.width}x{size.height}</p>
      <div
        ref={divRef}
        style={{
          width: '100%',
          height: '100px',
          backgroundColor: 'lightblue'
        }}
      >
        Resize me!
      </div>
    </div>
  );
}
```

### 6. 在回调中访问最新状态（解决闭包陷阱）

```tsx
function EventListenerComponent() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);

  // 同步 ref
  useEffect(() => {
    countRef.current = count;
  }, [count]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 使用 ref 获取最新的 count 值
      if (e.key === 'ArrowUp') {
        console.log('Current count:', countRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);  // 空依赖数组

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      <p>Press Arrow Up to see current count in console</p>
    </div>
  );
}
```

---

## useRef 与 React.memo 的配合

### 避免不必要的重新渲染

```tsx
// ❌ 问题：每次渲染都创建新对象

const Child = React.memo(function Child({ config }: { config: { value: number } }) {
  console.log('Child render');
  return <div>{config.value}</div>;
});

function Parent() {
  const [count, setCount] = useState(0);

  // 每次渲染都创建新对象
  const config = { value: count };

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <Child config={config} />
    </div>
  );

  // 点击按钮时：
  // - Parent 重新渲染
  // - config 是新对象
  // - Child 重新渲染（即使使用了 React.memo）
}

// ✅ 解决方案 1：使用 useMemo

function Parent() {
  const [count, setCount] = useState(0);

  const config = useMemo(() => ({ value: count }), [count]);

  return <Child config={config} />;
}

// ✅ 解决方案 2：使用 useRef（当不需要触发子组件渲染时）

function Parent() {
  const [count, setCount] = useState(0);
  const configRef = useRef({ value: count });

  // 更新 ref.current（不触发重新渲染）
  useEffect(() => {
    configRef.current = { value: count };
  }, [count]);

  const handleClick = () => {
    // 直接访问 ref.current，不需要触发子组件渲染
    console.log('Current config:', configRef.current);
  };

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <button onClick={handleClick}>
        Log Config (doesn't trigger Child render)
      </button>
      <Child config={configRef.current} />
    </div>
  );

  // 点击 Log Config 按钮时：
  // - Parent 重新渲染
  // - configRef.current 是同一个对象
  // - Child 不重新渲染
}
```

---

## 常见陷阱和最佳实践

### 1. ❌ 在渲染期间读取/修改 ref

```tsx
// ❌ 错误：在渲染期间修改 ref

function Component() {
  const countRef = useRef(0);

  // 在渲染期间修改 ref
  countRef.current++;

  return <div>{countRef.current}</div>;

  // 问题：
  // 1. React 不保证渲染期间的执行顺序
  // 2. 可能导致不可预测的行为
}

// ✅ 正确：在事件处理器或副作用中修改 ref

function Component() {
  const countRef = useRef(0);

  const handleClick = () => {
    countRef.current++;  // ✅ 在事件处理器中修改
  };

  useEffect(() => {
    countRef.current++;  // ✅ 在副作用中修改
  }, []);

  return <button onClick={handleClick}>Click me</button>;
}
```

### 2. ❌ 使用 ref 存储渲染需要的数据

```tsx
// ❌ 错误：使用 ref 存储渲染需要的数据

function Component() {
  const countRef = useRef(0);
  const [count, setCount] = useState(0);

  const handleClick = () => {
    countRef.current++;
    setCount(countRef.current);
  };

  return <div>{count}</div>;

  // 问题：ref 变化不会触发重新渲染，UI 不会更新
}

// ✅ 正确：使用 state 存储渲染需要的数据

function Component() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(c => c + 1);
  };

  return <div>{count}</div>;
}
```

### 3. ❌ 忘记处理 ref 为 null 的情况

```tsx
// ❌ 错误：未检查 ref.current

function Component() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    // 直接使用，可能报错
    inputRef.current.focus();  // 可能是 null
  };

  return (
    <div>
      <input ref={inputRef} />
      <button onClick={handleClick}>Focus</button>
    </div>
  );
}

// ✅ 正确：检查 ref.current

function Component() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    // 检查 ref.current 是否存在
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div>
      <input ref={inputRef} />
      <button onClick={handleClick}>Focus</button>
    </div>
  );
}
```

### 4. ❌ 在 useMemo 或 useCallback 中使用 ref.current 作为依赖

```tsx
// ❌ 错误：ref.current 作为依赖

function Component() {
  const countRef = useRef(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    countRef.current = count;
  }, [count]);

  const logCount = useCallback(() => {
    console.log(countRef.current);
  }, [countRef.current]);  // ❌ 不要这样用

  // 问题：
  // 1. ref.current 的变化不会被检测到（没有触发机制）
  // 2. 即使 ref.current 变了，useCallback 也不会重新创建

  return <button onClick={logCount}>Log</button>;
}

// ✅ 正确：不在依赖数组中使用 ref.current

function Component() {
  const countRef = useRef(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    countRef.current = count;
  }, [count]);

  // 不在依赖数组中使用 ref.current
  const logCount = useCallback(() => {
    console.log(countRef.current);  // 直接使用，不作为依赖
  }, []);  // 空依赖数组

  return <button onClick={logCount}>Log</button>;
}
```

### 5. ❌ 使用 ref 存储复杂状态

```tsx
// ❌ 错误：用 ref 存储复杂状态

function ComplexForm() {
  const formDataRef = useRef({
    name: '',
    email: '',
    address: {
      city: '',
      country: ''
    }
  });

  const handleSubmit = () => {
    // 提交 formDataRef.current
  };

  // 问题：
  // 1. ref 变化不会触发重新渲染
  // 2. UI 不会更新
  // 3. 难以追踪状态变化

  return <form>...</form>;
}

// ✅ 正确：使用 state

function ComplexForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: {
      city: '',
      country: ''
    }
  });

  const handleSubmit = () => {
    // 提交 formData
  };

  // 状态变化会触发重新渲染
  return <form>...</form>;
}
```

---

## 核心要点总结

### useRef 的作用

1. **获取 DOM 元素**：直接访问和操作 DOM 节点
2. **存储可变值**：存储不触发渲染的可变数据
3. **跨渲染持久化**：在整个组件生命周期中保持不变
4. **解决闭包陷阱**：在回调中访问最新的状态值

### 工作原理

```tsx
// 核心逻辑
function useRef(initialValue) {
  const hook = getHook();

  // 首次渲染：创建 ref 对象
  if (hook.memoizedState === undefined) {
    hook.memoizedState = { current: initialValue };
  }

  // 返回 ref 对象
  return hook.memoizedState;

  // 修改 ref.current 不会触发任何渲染相关操作
}

// 对比 useState
function useState(initialValue) {
  const hook = getHook();

  if (hook.memoizedState === undefined) {
    hook.memoizedState = initialValue;
  }

  const value = hook.memoizedState;

  const setValue = (newValue) => {
    hook.memoizedState = newValue;
    markComponentNeedsUpdate();  // ← 关键：标记需要重新渲染
    scheduleRender();
  };

  return [value, setValue];
}
```

### useRef vs useState

| 特性 | useState | useRef |
|-----|---------|--------|
| 触发重新渲染 | ✅ 是 | ❌ 否 |
| 读取方式 | `const [value] = useState(initial)` | `ref.current` |
| 更新方式 | `setValue(newValue)` | `ref.current = newValue` |
| 用途 | 组件状态 | 可变值、DOM 引用 |
| 变化通知 | 重新渲染 | 无通知 |

### 何时使用 useRef

**应该使用**：
- ✅ 获取 DOM 元素引用
- ✅ 存储定时器 ID、订阅 ID 等
- ✅ 在回调中访问最新的状态值
- ✅ 存储上一次的值
- ✅ 存储不需要触发渲染的可变数据

**不应该使用**：
- ❌ 存储渲染需要的状态（用 useState）
- ❌ 在渲染期间读取/修改 ref
- ❌ 作为 useMemo 或 useCallback 的依赖

### 最佳实践

1. ✅ **在事件处理器或副作用中修改 ref**
2. ✅ **检查 ref.current 是否为 null**
3. ✅ **配合 useEffect 同步 state 和 ref**
4. ✅ **使用 ref 解决闭包陷阱**
5. ❌ **不要在渲染期间修改 ref**
6. ❌ **不要用 ref 存储渲染需要的状态**
7. ❌ **不要在依赖数组中使用 ref.current**

记住这些原则，你就能正确使用 useRef 处理 DOM 操作和可变数据！
