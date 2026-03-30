# useDeferredValue 用法与原理详解

## useDeferredValue 是什么？

useDeferredValue 是一个 React 18 引入的 Hook，用于**延迟更新非紧急的值**。它允许 React 在处理高优先级更新（如用户输入）时，延迟低优先级更新（如列表渲染）。

**核心特性**：
- **延迟更新**：将值的更新推迟到 React 空闲时
- **保持响应**：高优先级更新不会被阻塞
- **自动防抖**：类似防抖的效果，但由 React 并发特性驱动
- **回退机制**：在过渡期间可以显示旧值

---

## 基本用法

### 1. 简单示例

```tsx
import { useDeferredValue } from 'react';

function SearchList() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);

  // 延迟更新 query
  const deferredQuery = useDeferredValue(query);

  // 使用延迟的值进行过滤
  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [items, deferredQuery]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <ul>
        {filteredItems.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 2. 基本语法

```tsx
// 语法
const deferredValue = useDeferredValue(value);

// 参数：
// value: T - 任何类型的值

// 返回值：
// deferredValue: T - 延迟更新的值
```

### 3. 配置初始值

```tsx
// useDeferredValue 可以接受第二个参数：初始超时时间
const deferredValue = useDeferredValue(value, {
  timeoutMs: 5000  // 5 秒后强制更新
});
```

---

## useDeferredValue vs useTransition

### 区别对比

```tsx
// ========== useTransition ==========

function Component1() {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<Item[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // 紧急更新：立即更新 filter
    setFilter(value);

    // 非紧急更新：延迟过滤列表
    startTransition(() => {
      const filtered = items.filter(item =>
        item.name.toLowerCase().includes(value.toLowerCase())
      );
      setItems(filtered);
    });
  };

  return (
    <div>
      <input value={filter} onChange={handleChange} />
      {isPending && <p>Loading...</p>}
      <ul>{items.map(item => <li key={item.id}>{item.name}</li>)}</ul>
    </div>
  );
}

// ========== useDeferredValue ==========

function Component2() {
  const [query, setQuery] = useState('');
  const [items] = useState<Item[]>([]);

  // 延迟更新 query
  const deferredQuery = useDeferredValue(query);

  // 使用延迟的值进行过滤
  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [items, deferredQuery]);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>{filteredItems.map(item => <li key={item.id}>{item.name}</li>)}</ul>
    </div>
  );
}

// ========== 对比 ==========

// useTransition：
// - 手动控制哪些更新是紧急的，哪些是非紧急的
// - 可以执行任意代码（异步操作等）
// - 提供 isPending 状态
// - 适合复杂的状态更新逻辑

// useDeferredValue：
// - 自动延迟单个值的更新
// - 只能延迟值，不能延迟操作
// - 不提供 isPending 状态（可以通过比较值判断）
// - 适合简单值的延迟更新
```

### 对比表格

| 特性 | useTransition | useDeferredValue |
|-----|--------------|------------------|
| 用途 | 标记状态更新 | 延迟值更新 |
| 灵活性 | 高（可以执行任意代码） | 低（只能延迟值） |
| 控制粒度 | 粗粒度（多个状态） | 细粒度（单个值） |
| 过渡状态 | isPending | 需要手动比较 |
| 代码复杂度 | 较高 | 较低 |
| 适用场景 | 复杂状态更新 | 简单值延迟 |

---

## 为什么需要 useDeferredValue？

### 场景 1：搜索框优化

```tsx
// ❌ 问题：快速输入时，过滤操作阻塞输入框

interface Item {
  id: number;
  name: string;
  description: string;
}

function SearchBox() {
  const [query, setQuery] = useState('');
  const [allItems] = useState<Item[]>([
    // 模拟 10,000 条数据
    ...Array(10000).fill(0).map((_, i) => ({
      id: i,
      name: `Item ${i}`,
      description: `Description ${i}`
    }))
  ]);

  // ❌ 问题：每次输入都同步过滤，阻塞输入
  const filteredItems = useMemo(() => {
    console.log('Filtering...');  // 每次输入都打印
    return allItems.filter(item =>
      item.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [allItems, query]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <ul>
        {filteredItems.slice(0, 10).map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );

  // 问题：
  // 1. 每次输入都过滤 10,000 条数据
  // 2. 过滤操作阻塞主线程
  // 3. 用户输入感觉卡顿
}

// ✅ 解决方案：使用 useDeferredValue

function OptimizedSearchBox() {
  const [query, setQuery] = useState('');
  const [allItems] = useState<Item[]>([
    ...Array(10000).fill(0).map((_, i) => ({
      id: i,
      name: `Item ${i}`,
      description: `Description ${i}`
    }))
  ]);

  // ✅ 延迟更新 query
  const deferredQuery = useDeferredValue(query);

  // 使用延迟的值进行过滤
  const filteredItems = useMemo(() => {
    console.log('Filtering with deferred query:', deferredQuery);
    return allItems.filter(item =>
      item.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [allItems, deferredQuery]);

  // 检查是否正在过渡
  const isStale = query !== deferredQuery;

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        style={{
          opacity: isStale ? 0.7 : 1  // 过渡时降低不透明度
        }}
      />
      {isStale && <p>Updating results...</p>}
      <ul>
        {filteredItems.slice(0, 10).map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );

  // 优点：
  // 1. 输入框立即响应
  // 2. 过滤操作延迟到 React 空闲时
  // 3. 用户输入流畅
}
```

### 场景 2：Tab 内容渲染

```tsx
// ❌ 问题：切换 Tab 时，渲染很慢

function TabbedContent() {
  const [activeTab, setActiveTab] = useState(0);
  const [content, setContent] = useState('');

  const tabs = [
    { id: 0, content: 'Tab 0 Content'.repeat(1000) },
    { id: 1, content: 'Tab 1 Content'.repeat(1000) },
    { id: 2, content: 'Tab 2 Content'.repeat(1000) }
  ];

  const handleTabChange = (tabId: number) => {
    // ❌ 问题：同步切换，渲染很慢
    setActiveTab(tabId);
  };

  return (
    <div>
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={activeTab === tab.id ? 'active' : ''}
          >
            Tab {tab.id}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tabs[activeTab].content}
      </div>
    </div>
  );

  // 问题：
  // 1. 切换 Tab 时，渲染很慢
  // 2. 用户看到白屏
  // 3. 交互不流畅
}

// ✅ 解决方案：使用 useDeferredValue

function OptimizedTabbedContent() {
  const [activeTab, setActiveTab] = useState(0);
  const [content, setContent] = useState('');

  const tabs = [
    { id: 0, content: 'Tab 0 Content'.repeat(1000) },
    { id: 1, content: 'Tab 1 Content'.repeat(1000) },
    { id: 2, content: 'Tab 2 Content'.repeat(1000) }
  ];

  // ✅ 延迟更新 activeTab
  const deferredActiveTab = useDeferredValue(activeTab);

  const handleTabChange = (tabId: number) => {
    setActiveTab(tabId);
  };

  // 检查是否正在过渡
  const isStale = activeTab !== deferredActiveTab;

  return (
    <div>
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={
              (isStale && activeTab === tab.id) || deferredActiveTab === tab.id
                ? 'active'
                : ''
            }
          >
            Tab {tab.id}
            {isStale && activeTab === tab.id && ' Loading...'}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tabs[deferredActiveTab].content}
      </div>
    </div>
  );

  // 优点：
  // 1. Tab 切换立即响应
  // 2. 内容渲染延迟到 React 空闲时
  // 3. 交互流畅
}
```

### 场景 3：列表滚动

```tsx
// ❌ 问题：滚动时，列表渲染很慢

function ScrollableList() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [items] = useState<number[]>(
    Array(1000).fill(0).map((_, i) => i)
  );

  const visibleItems = useMemo(() => {
    // ❌ 问题：每次滚动都重新计算可见项
    const start = Math.floor(scrollPosition / ITEM_HEIGHT);
    const end = Math.min(start + VISIBLE_COUNT, items.length);

    console.log('Calculating visible items:', start, end);

    return items.slice(start, end);
  }, [items, scrollPosition]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollPosition(scrollTop);
  };

  return (
    <div
      style={{ height: '400px', overflowY: 'auto' }}
      onScroll={handleScroll}
    >
      {visibleItems.map(item => (
        <div key={item} style={{ height: ITEM_HEIGHT }}>
          Item {item}
        </div>
      ))}
    </div>
  );

  // 问题：
  // 1. 每次滚动都重新计算可见项
  // 2. 滚动时卡顿
}

// ✅ 解决方案：使用 useDeferredValue

function OptimizedScrollableList() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [items] = useState<number[]>(
    Array(1000).fill(0).map((_, i) => i)
  );

  // ✅ 延迟更新 scrollPosition
  const deferredScrollPosition = useDeferredValue(scrollPosition);

  const visibleItems = useMemo(() => {
    const start = Math.floor(deferredScrollPosition / ITEM_HEIGHT);
    const end = Math.min(start + VISIBLE_COUNT, items.length);

    console.log('Calculating visible items (deferred):', start, end);

    return items.slice(start, end);
  }, [items, deferredScrollPosition]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollPosition(scrollTop);
  };

  return (
    <div
      style={{ height: '400px', overflowY: 'auto' }}
      onScroll={handleScroll}
    >
      {visibleItems.map(item => (
        <div key={item} style={{ height: ITEM_HEIGHT }}>
          Item {item}
        </div>
      ))}
    </div>
  );

  // 优点：
  // 1. 滚动立即响应
  // 2. 可见项计算延迟到 React 空闲时
  // 3. 滚动流畅
}
```

---

## 实现原理

### 并发渲染机制

```tsx
// useDeferredValue 基于 React 的并发特性

// ========== 并发模式 ==========

// 传统模式（Legacy Mode）：
// - 渲染是同步的
// - 一旦开始渲染，必须完成
// - 无法中断

// 并发模式（Concurrent Mode）：
// - 渲染是可中断的
// - 可以暂停渲染，处理更高优先级的更新
// - 可以恢复渲染

// ========== useDeferredValue 的核心思想 ==========

// useDeferredValue 的工作原理：
// 1. 接收一个值
// 2. 返回一个延迟更新的值
// 3. 当原值更新时，延迟值的更新会被标记为低优先级
// 4. React 在处理高优先级更新时，会中断低优先级更新
// 5. 当 React 空闲时，会继续处理低优先级更新
```

### 伪源码实现

```tsx
// ========== 1. useDeferredValue 实现 ==========

function useDeferredValue<T>(
  value: T,
  config?: { timeoutMs?: number }
): T {
  // ========== 步骤 1：获取当前 Fiber ==========
  const fiber = currentlyRenderingFiber!;

  // ========== 步骤 2：获取或创建 deferred value state ==========
  const deferredValueState = getDeferredValueState(fiber);

  // ========== 步骤 3：首次渲染（mount）==========
  if (deferredValueState === null) {
    // 创建新的 deferred value state
    const state: DeferredValueState<T> = {
      value,
      deferredValue: value,
      baseState: value,
      timeoutMs: config?.timeoutMs || 5000,
      isPending: false,
      timeoutId: null
    };

    // 保存到 Fiber 的副作用中
    setDeferredValueState(fiber, state);

    console.log('[useDeferredValue] Mount: initial value =', value);
    return value;
  }

  // ========== 步骤 4：重新渲染（update）==========
  const { deferredValue, isPending } = deferredValueState;

  // 检查值是否变化
  const hasValueChange = !Object.is(value, deferredValue);

  if (!hasValueChange) {
    // 值没有变化，返回延迟的值
    console.log('[useDeferredValue] Update: value unchanged');
    return deferredValue;
  }

  // ========== 步骤 5：值变化了，需要延迟更新 ==========
  console.log('[useDeferredValue] Update: value changed, deferring update');

  // 标记为待处理
  deferredValueState.isPending = true;

  // 设置超时
  if (deferredValueState.timeoutId !== null) {
    clearTimeout(deferredValueState.timeoutId);
  }

  deferredValueState.timeoutId = setTimeout(() => {
    console.log('[useDeferredValue] Timeout, forcing update');
    // 超时后强制更新
    forceDeferredValueUpdate(fiber, value);
  }, deferredValueState.timeoutMs);

  // 返回旧的延迟值（直到新值准备好）
  return deferredValue;
}

// ========== 2. DeferredValueState 结构 ==========

interface DeferredValueState<T> {
  value: T;                  // 最新的值
  deferredValue: T;          // 延迟的值
  baseState: T;             // 基础状态
  timeoutMs: number;         // 超时时间
  isPending: boolean;        // 是否正在更新
  timeoutId: NodeJS.Timeout | null;  // 超时 ID
}

// ========== 3. 获取 deferred value state ==========

function getDeferredValueState<T>(
  fiber: Fiber
): DeferredValueState<T> | null {
  // 从 Fiber 的副作用中获取 deferred value state
  const updateQueue = fiber.updateQueue;

  if (!updateQueue) {
    return null;
  }

  return (updateQueue as any).deferredValueState;
}

// ========== 4. 设置 deferred value state ==========

function setDeferredValueState<T>(
  fiber: Fiber,
  state: DeferredValueState<T>
): void {
  // 保存到 Fiber 的副作用中
  const updateQueue = fiber.updateQueue || {
    effects: null,
    deferredValueState: null
  };

  (updateQueue as any).deferredValueState = state;
  fiber.updateQueue = updateQueue;
}

// ========== 5. 强制更新延迟值 ==========

function forceDeferredValueUpdate<T>(
  fiber: Fiber,
  value: T
): void {
  const state = getDeferredValueState(fiber);

  if (!state) {
    return;
  }

  // 清除超时
  if (state.timeoutId !== null) {
    clearTimeout(state.timeoutId);
    state.timeoutId = null;
  }

  // 更新延迟值
  state.deferredValue = value;
  state.value = value;
  state.isPending = false;

  // 标记组件需要重新渲染
  markComponentNeedsUpdate(fiber);
  scheduleRender();
}

// ========== 6. 在空闲时更新延迟值 ==========

function scheduleDeferredValueUpdate<T>(
  fiber: Fiber,
  state: DeferredValueState<T>
): void {
  // 在空闲时执行
  requestIdleCallback((deadline) => {
    if (!state.isPending) {
      return;
    }

    console.log('[scheduleDeferredValueUpdate] Executing in idle time');

    // 检查是否有足够的时间
    if (deadline.timeRemaining() < 1) {
      // 没有足够的时间，继续等待
      console.log('[scheduleDeferredValueUpdate] Not enough time, scheduling again');
      scheduleDeferredValueUpdate(fiber, state);
      return;
    }

    // 更新延迟值
    state.deferredValue = state.value;
    state.isPending = false;

    // 标记组件需要重新渲染
    markComponentNeedsUpdate(fiber);
    scheduleRender();
  });
}

// ========== 7. 完整的 useDeferredValue 流程 ==========

function useDeferredValue<T>(
  value: T,
  config?: { timeoutMs?: number }
): T {
  const fiber = currentlyRenderingFiber!;
  const state = getDeferredValueState(fiber);

  // ========== Mount ==========
  if (state === null) {
    const newState: DeferredValueState<T> = {
      value,
      deferredValue: value,
      baseState: value,
      timeoutMs: config?.timeoutMs || 5000,
      isPending: false,
      timeoutId: null
    };

    setDeferredValueState(fiber, newState);
    return value;
  }

  // ========== Update ==========
  const { deferredValue, isPending } = state;

  // 检查值是否变化
  const hasValueChange = !Object.is(value, deferredValue);

  if (!hasValueChange) {
    return deferredValue;
  }

  // 值变化了，开始延迟更新
  console.log('[useDeferredValue] Starting deferred update');

  // 保存新值
  state.value = value;
  state.isPending = true;

  // 设置超时
  if (state.timeoutId !== null) {
    clearTimeout(state.timeoutId);
  }

  state.timeoutId = setTimeout(() => {
    console.log('[useDeferredValue] Timeout, forcing update');
    state.deferredValue = state.value;
    state.isPending = false;
    markComponentNeedsUpdate(fiber);
    scheduleRender();
  }, state.timeoutMs);

  // 在空闲时更新
  scheduleDeferredValueUpdate(fiber, state);

  // 返回旧的延迟值
  return deferredValue;
}
```

### 优先级系统

```tsx
// ========== 优先级系统 ==========

// useDeferredValue 使用优先级系统来延迟更新

interface Update {
  priority: number;    // 优先级
  value: any;          // 更新的值
  next: Update | null;
}

// ========== 优先级级别 ==========

const ImmediatePriority = 1;      // 立即执行（如用户输入）
const UserBlockingPriority = 2;   // 用户阻塞（如点击）
const NormalPriority = 3;          // 正常优先级（延迟值）
const LowPriority = 4;            // 低优先级（如数据获取）
const IdlePriority = 5;            // 空闲时执行

// ========== useDeferredValue 的优先级 ==========

function useDeferredValue<T>(value: T): T {
  // ...

  // 当值更新时，创建一个低优先级的更新
  const lowPriorityUpdate: Update = {
    priority: NormalPriority,  // 使用正常优先级（低于用户输入）
    value,
    next: null
  };

  // 添加到更新队列
  addUpdateToUpdateQueue(fiber, lowPriorityUpdate);

  // ...
}

// ========== 更新队列 ==========

interface UpdateQueue {
  first: Update | null;  // 最高优先级的更新
  last: Update | null;   // 最低优先级的更新
}

function addUpdateToUpdateQueue(
  fiber: Fiber,
  update: Update
): void {
  const updateQueue = fiber.updateQueue || {
    first: null,
    last: null
  };

  // 按优先级插入（高优先级在前）
  if (updateQueue.first === null) {
    updateQueue.first = update;
    updateQueue.last = update;
  } else {
    let current = updateQueue.first;
    let previous = null;

    // 找到插入位置（保持优先级顺序）
    while (current !== null && current.priority < update.priority) {
      previous = current;
      current = current.next;
    }

    // 插入更新
    if (previous === null) {
      // 插入到开头
      update.next = updateQueue.first;
      updateQueue.first = update;
    } else {
      // 插入到中间
      update.next = previous.next;
      previous.next = update;
    }

    if (current === null) {
      // 插入到末尾
      updateQueue.last = update;
    }
  }

  fiber.updateQueue = updateQueue;
}
```

### 执行流程图

```
原值更新（高优先级）
    │
    ▼
┌─────────────────┐
│ 立即更新 UI    │
│ （高优先级）     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 延迟值更新排队  │
│ （低优先级）     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 请求空闲帧      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
  有空闲    无空闲
    │         │
    ▼         ▼
┌────────┐ ┌─────────────┐
│ 更新延迟 ││ 继续等待     │
│ 值      ││             │
└────┬────┘ └──────┬──────┘
     │             │
     │   用户再次输入
     │       │
     │       ▼
     │  ┌─────────────┐
     │  │ 暂停延迟     │
     │  │ 处理新输入   │
     │  └──────┬──────┘
     │         │
     └─────────┤
               ▼
          ┌─────────────┐
          │ 恢复延迟     │
          │ 更新         │
          └──────┬──────┘
                 │
                 ▼
          ┌─────────────┐
          │ 延迟值更新   │
          │ 完成         │
          └─────────────┘
```

---

## 实际应用示例

### 1. 搜索框防抖

```tsx
function DebouncedSearch() {
  const [query, setQuery] = useState('');
  const [items] = useState<Item[]>([]);

  // 延迟更新 query
  const deferredQuery = useDeferredValue(query);

  // 检查是否正在过渡
  const isStale = query !== deferredQuery;

  // 使用延迟的值进行搜索
  const searchResults = useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [items, deferredQuery]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        style={{
          borderColor: isStale ? 'orange' : '#ccc'
        }}
      />
      {isStale && <p style={{ color: 'orange' }}>Searching...</p>}
      <ul>
        {searchResults.slice(0, 10).map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 2. 表单验证

```tsx
function FormValidation() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({} as Record<string, string>);

  // 延迟更新 formData 用于验证
  const deferredFormData = useDeferredValue(formData);

  // 延迟验证
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (!isValidEmail(deferredFormData.email)) {
      newErrors.email = 'Invalid email';
    }

    if (deferredFormData.password.length < 6) {
      newErrors.password = 'Password too short';
    }

    setErrors(newErrors);
  }, [deferredFormData]);

  // 检查是否正在验证
  const isStale =
    formData.email !== deferredFormData.email ||
    formData.password !== deferredFormData.password;

  return (
    <form>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
        />
        {errors.email && <p style={{ color: 'red' }}>{errors.email}</p>}
      </div>

      <div>
        <label>Password:</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
        />
        {errors.password && <p style={{ color: 'red' }}>{errors.password}</p>}
      </div>

      {isStale && <p style={{ color: 'orange' }}>Validating...</p>}
    </form>
  );
}
```

### 3. 图表数据更新

```tsx
function ChartWithLiveUpdates() {
  const [data, setData] = useState<ChartData>(initialData);
  const [liveData, setLiveData] = useState<LiveData[]>([]);

  // 延迟更新 liveData
  const deferredLiveData = useDeferredValue(liveData);

  // 合并数据
  const mergedData = useMemo(() => {
    return {
      ...data,
      datasets: [
        ...data.datasets,
        {
          label: 'Live Data',
          data: deferredLiveData
        }
      ]
    };
  }, [data, deferredLiveData]);

  // 检查是否正在更新
  const isStale = liveData !== deferredLiveData;

  return (
    <div>
      <button onClick={() => setLiveData([...liveData, Math.random()])}>
        Add Data Point
      </button>

      <div style={{ opacity: isStale ? 0.7 : 1 }}>
        <LineChart data={mergedData} />
      </div>

      {isStale && <p>Updating chart...</p>}
    </div>
  );
}
```

### 4. 大列表渲染

```tsx
function LargeList() {
  const [filter, setFilter] = useState('');
  const [items] = useState<Item[]>([]);

  // 延迟更新 filter
  const deferredFilter = useDeferredValue(filter);

  // 使用延迟的值进行过滤
  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(deferredFilter.toLowerCase())
    );
  }, [items, deferredFilter]);

  // 检查是否正在过滤
  const isStale = filter !== deferredFilter;

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter items..."
        style={{
          borderColor: isStale ? 'orange' : '#ccc'
        }}
      />
      {isStale && <p style={{ color: 'orange' }}>Filtering...</p>}

      <VirtualizedList
        items={filteredItems}
        renderItem={(item) => (
          <div key={item.id} style={{ height: ITEM_HEIGHT }}>
            {item.name}
          </div>
        )}
      />
    </div>
  );
}
```

---

## 常见陷阱和最佳实践

### 1. ❌ 在 useDeferredValue 中使用对象

```tsx
// ❌ 错误：在 useDeferredValue 中使用对象

function Component() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  // ❌ 问题：每次渲染都创建新对象
  const deferredFormData = useDeferredValue(formData);

  // 问题：
  // 1. 每次渲染都创建新对象
  // 2. 延迟值会频繁更新
  // 3. 失去延迟的效果
}

// ✅ 正确：使用 useMemo 缓存对象

function Component() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ✅ 使用 useMemo 缓存对象
  const formData = useMemo(() => ({
    name,
    email,
    password
  }), [name, email, password]);

  const deferredFormData = useDeferredValue(formData);

  // ✅ 或者分别延迟每个值
  const deferredName = useDeferredValue(name);
  const deferredEmail = useDeferredValue(email);
  const deferredPassword = useDeferredValue(password);
}
```

### 2. ❌ 过度使用 useDeferredValue

```tsx
// ❌ 错误：不需要延迟的值也用 useDeferredValue

function Counter() {
  const [count, setCount] = useState(0);

  // ❌ 问题：计数器更新很快，不需要延迟
  const deferredCount = useDeferredValue(count);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {deferredCount}
      </button>
    </div>
  );

  // 问题：
  // 1. 计数器更新很快，不需要延迟
  // 2. 增加了不必要的复杂性
  // 3. 可能导致 UI 不同步
}

// ✅ 正确：直接使用值

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
    </div>
  );
}
```

### 3. ❌ 在 useDeferredValue 中执行副作用

```tsx
// ❌ 错误：在 useDeferredValue 中执行副作用

function Component() {
  const [value, setValue] = useState('');

  const deferredValue = useDeferredValue(value);

  // ❌ 不要在组件渲染期间执行副作用
  if (deferredValue !== value) {
    console.log('Value is stale');
    // ❌ 不要直接执行副作用
    fetch('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: deferredValue })
    });
  }

  return <div>{deferredValue}</div>;
}

// ✅ 正确：副作用用 useEffect

function Component() {
  const [value, setValue] = useState('');
  const deferredValue = useDeferredValue(value);

  // ✅ 使用 useEffect 执行副作用
  useEffect(() => {
    if (deferredValue !== value) {
      console.log('Value is stale');
    }
  }, [deferredValue, value]);

  // 数据获取也用 useEffect
  useEffect(() => {
    fetch('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: deferredValue })
    });
  }, [deferredValue]);

  return <div>{deferredValue}</div>;
}
```

### 4. ❌ 忘记比较值判断过渡状态

```tsx
// ❌ 错误：不判断过渡状态

function Component() {
  const [value, setValue] = useState('');

  const deferredValue = useDeferredValue(value);

  // ❌ 不判断是否正在过渡
  return (
    <div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type something..."
      />
      <div>
        {/* ❌ 用户不知道是否正在更新 */}
        {deferredValue}
      </div>
    </div>
  );
}

// ✅ 正确：判断过渡状态

function Component() {
  const [value, setValue] = useState('');

  const deferredValue = useDeferredValue(value);

  // ✅ 判断是否正在过渡
  const isStale = value !== deferredValue;

  return (
    <div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type something..."
        style={{
          borderColor: isStale ? 'orange' : '#ccc',
          opacity: isStale ? 0.7 : 1
        }}
      />
      <div>
        {isStale && <p style={{ color: 'orange' }}>Updating...</p>}
        {deferredValue}
      </div>
    </div>
  );
}
```

### 5. ❌ 在 useDeferredValue 中使用函数

```tsx
// ❌ 错误：在 useDeferredValue 中使用函数

function Component() {
  const [items, setItems] = useState<Item[]>([]);

  // ❌ 不要在 useDeferredValue 中使用函数
  const filteredItems = useDeferredValue(
    items.filter(item => item.active)
  );

  return <ul>
    {filteredItems.map(item => (
      <li key={item.id}>{item.name}</li>
    ))}
  </ul>;
}

// ✅ 正确：先计算值，再延迟

function Component() {
  const [items, setItems] = useState<Item[]>([]);

  // ✅ 先计算值
  const activeItems = useMemo(() => {
    return items.filter(item => item.active);
  }, [items]);

  // ✅ 再延迟
  const deferredActiveItems = useDeferredValue(activeItems);

  return <ul>
    {deferredActiveItems.map(item => (
      <li key={item.id}>{item.name}</li>
    ))}
  </ul>;
}
```

---

## 核心要点总结

### useDeferredValue 的作用

1. **延迟更新**：将值的更新推迟到 React 空闲时
2. **保持响应**：高优先级更新不会被阻塞
3. **自动防抖**：类似防抖的效果，但由 React 并发特性驱动
4. **回退机制**：在过渡期间可以显示旧值

### 工作原理

```tsx
// 核心逻辑
const deferredValue = useDeferredValue(value);

// 流程：
// 1. 接收一个值
// 2. 返回一个延迟更新的值
// 3. 当原值更新时，延迟值的更新被标记为低优先级
// 4. React 在处理高优先级更新时，会中断低优先级更新
// 5. 当 React 空闲时，会继续处理低优先级更新
```

### useDeferredValue vs useTransition

| 特性 | useDeferredValue | useTransition |
|-----|------------------|--------------|
| 用途 | 延迟值更新 | 标记状态更新 |
| 灵活性 | 低（只能延迟值） | 高（可以执行任意代码） |
| 控制粒度 | 细粒度（单个值） | 粗粒度（多个状态） |
| 过渡状态 | 需要手动比较 | isPending |
| 代码复杂度 | 较低 | 较高 |
| 适用场景 | 简单值延迟 | 复杂状态更新 |

### 何时使用 useDeferredValue

**应该使用**：
- ✅ 搜索/过滤大量数据
- ✅ 输入框防抖
- ✅ Tab 内容渲染
- ✅ 图表数据更新
- ✅ 需要保持用户交互响应

**不应该使用**：
- ❌ 简单的状态更新（计数器、切换布尔值）
- ❌ 紧急的用户交互（点击、提交）
- ❌ 数据获取（用 useEffect）
- ❌ 副作用操作（用 useEffect）
- ❌ 不需要延迟的场景

### 最佳实践

1. ✅ **延迟计算密集型操作**：过滤、排序等
2. ✅ **判断过渡状态**：比较原值和延迟值
3. ✅ **显示加载状态**：提示用户正在更新
4. ✅ **配合 useMemo 使用**：优化计算
5. ✅ **缓存对象值**：使用 useMemo 避免频繁创建新对象
6. ❌ **不要过度使用**：只在需要时使用
7. ❌ **不要在 useDeferredValue 中执行副作用**：副作用用 useEffect
8. ❌ **不要在 useDeferredValue 中使用函数**：先计算值，再延迟

### useDeferredValue + useTransition 模式

```tsx
// 组合使用模式

function Component() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);

  // 使用 useDeferredValue 延迟 query
  const deferredQuery = useDeferredValue(query);

  // 使用 useTransition 延迟过滤操作
  const [isPending, startTransition] = useTransition();

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // 立即更新输入框
    setQuery(value);

    // 延迟过滤操作
    startTransition(() => {
      const filtered = items.filter(item =>
        item.name.toLowerCase().includes(value.toLowerCase())
      );
      setItems(filtered);
    });
  };

  return (
    <div>
      <input value={query} onChange={handleQueryChange} />
      {isPending && <p>Loading...</p>}
      <ul>{items.map(item => <li key={item.id}>{item.name}</li>)}</ul>
    </div>
  );
}
```

记住这些原则，你就能正确使用 useDeferredValue 优化需要延迟更新的场景！
