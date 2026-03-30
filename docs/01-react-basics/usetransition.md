# useTransition 用法与原理详解

## useTransition 是什么？

useTransition 是一个 React 18 引入的 Hook，用于**标记非紧急的状态更新**。它允许 React 优先处理紧急更新（如用户输入），而将非紧急更新（如列表渲染）推迟到空闲时执行。

**核心特性**：
- **并发渲染**：允许 React 中断正在进行的渲染，处理更高优先级的更新
- **区分紧急/非紧急**：将状态更新分为紧急更新和过渡更新
- **避免阻塞**：繁重的渲染不会阻塞用户交互
- **过渡状态**：提供 `isPending` 状态，显示加载指示器

---

## 基本用法

### 1. 简单示例

```tsx
import { useTransition } from 'react';

function ListFilter() {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<Item[]>([]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 紧急更新：立即更新输入框
    setFilter(e.target.value);

    // 非紧急更新：延迟过滤列表
    startTransition(() => {
      const filtered = filterItems(e.target.value);
      setItems(filtered);
    });
  };

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={handleFilterChange}
        placeholder="Filter items..."
      />
      {isPending && <p>Loading...</p>}
      <ul>
        {items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 2. 基本语法

```tsx
// 返回一个数组：[isPending, startTransition]
const [isPending, startTransition] = useTransition();

// isPending: boolean - 是否有过渡正在进行
// startTransition: (callback: () => void) => void - 开始一个过渡

// 使用方式
function Component() {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState([]);

  const handleClick = () => {
    // 紧急更新
    setSelectedId(1);

    // 非紧急更新（过渡）
    startTransition(() => {
      setData(largeData);
    });
  };

  return (
    <div>
      <button onClick={handleClick}>Load Data</button>
      {isPending && <Spinner />}
      <ul>{data.map(...)}</ul>
    </div>
  );
}
```

### 3. 配置超时

```tsx
// React 18.3+ 支持配置超时时间
function Component() {
  // 超时时间：5000ms，超过后强制完成过渡
  const [isPending, startTransition] = useTransition({
    timeoutMs: 5000
  });

  // ...
}
```

---

## 为什么需要 useTransition？

### 问题 1：繁重渲染阻塞用户输入

```tsx
// ❌ 问题：过滤大量数据时，输入框卡顿

interface Item {
  id: number;
  name: string;
  description: string;
  // ... 很多字段
}

function ListFilter() {
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<Item[]>([]);

  // 模拟 10,000 条数据
  const allItems = useMemo(() => {
    return Array(10000).fill(0).map((_, i) => ({
      id: i,
      name: `Item ${i}`,
      description: `Description for item ${i}`
    }));
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // ❌ 问题：同步更新，阻塞输入
    setFilter(value);  // 立即更新

    // 过滤操作很慢，阻塞用户输入
    const filtered = allItems.filter(item =>
      item.name.toLowerCase().includes(value.toLowerCase())
    );
    setItems(filtered);
  };

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={handleFilterChange}
      />
      <ul>
        {items.map(item => (
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

// ✅ 解决方案：使用 useTransition

function OptimizedListFilter() {
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [isPending, startTransition] = useTransition();

  const allItems = useMemo(() => {
    return Array(10000).fill(0).map((_, i) => ({
      id: i,
      name: `Item ${i}`,
      description: `Description for item ${i}`
    }));
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // ✅ 紧急更新：立即更新输入框
    setFilter(value);

    // ✅ 非紧急更新：延迟过滤
    startTransition(() => {
      const filtered = allItems.filter(item =>
        item.name.toLowerCase().includes(value.toLowerCase())
      );
      setItems(filtered);
    });
  };

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={handleFilterChange}
        style={{
          opacity: isPending ? 0.5 : 1  // 过渡时显示加载状态
        }}
      />
      {isPending && <p>Filtering...</p>}
      <ul>
        {items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );

  // 优点：
  // 1. 输入框立即响应
  // 2. 过滤操作在后台进行
  // 3. 用户输入流畅
}
```

### 问题 2：页面切换时的白屏

```tsx
// ❌ 问题：切换页面时渲染很慢，用户看到白屏

function App() {
  const [page, setPage] = useState<'home' | 'about' | 'contact'>('home');

  const handlePageChange = (newPage: typeof page) => {
    // ❌ 问题：同步切换，渲染很慢
    setPage(newPage);  // 阻塞，用户看到白屏
  };

  return (
    <div>
      <nav>
        <button onClick={() => handlePageChange('home')}>Home</button>
        <button onClick={() => handlePageChange('about')}>About</button>
        <button onClick={() => handlePageChange('contact')}>Contact</button>
      </nav>

      {page === 'home' && <HomePage />}
      {page === 'about' && <AboutPage />}
      {page === 'contact' && <ContactPage />}
    </div>
  );
}

// ✅ 解决方案：使用 useTransition

function OptimizedApp() {
  const [page, setPage] = useState<'home' | 'about' | 'contact'>('home');
  const [isPending, startTransition] = useTransition();
  const [pendingPage, setPendingPage] = useState<typeof page>(page);

  const handlePageChange = (newPage: typeof page) => {
    // 立即更新 pendingPage，显示新页面的骨架屏
    setPendingPage(newPage);

    // 使用过渡切换页面
    startTransition(() => {
      setPage(newPage);
    });
  };

  return (
    <div>
      <nav>
        <button onClick={() => handlePageChange('home')}>Home</button>
        <button onClick={() => handlePageChange('about')}>About</button>
        <button onClick={() => handlePageChange('contact')}>Contact</button>
      </nav>

      {isPending ? (
        // 显示骨架屏
        <PageSkeleton page={pendingPage} />
      ) : (
        // 显示实际页面
        <>
          {page === 'home' && <HomePage />}
          {page === 'about' && <AboutPage />}
          {page === 'contact' && <ContactPage />}
        </>
      )}
    </div>
  );

  // 优点：
  // 1. 立即响应导航
  // 2. 显示骨架屏，用户有反馈
  // 3. 页面渲染在后台进行
}
```

### 问题 3：Tab 切换卡顿

```tsx
// ❌ 问题：切换 Tab 时渲染很慢

function TabbedContent() {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = [
    { id: 0, content: <LargeComponent /> },
    { id: 1, content: <LargeComponent /> },
    { id: 2, content: <LargeComponent /> }
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
            Tab {tab.id + 1}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tabs[activeTab].content}
      </div>
    </div>
  );
}

// ✅ 解决方案：使用 useTransition

function OptimizedTabbedContent() {
  const [activeTab, setActiveTab] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [pendingTab, setPendingTab] = useState(0);

  const tabs = [
    { id: 0, content: <LargeComponent /> },
    { id: 1, content: <LargeComponent /> },
    { id: 2, content: <LargeComponent /> }
  ];

  const handleTabChange = (tabId: number) => {
    // 立即更新 pendingTab，高亮新的 Tab
    setPendingTab(tabId);

    // 使用过渡切换内容
    startTransition(() => {
      setActiveTab(tabId);
    });
  };

  return (
    <div>
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={
              (isPending && pendingTab === tab.id) || activeTab === tab.id
                ? 'active'
                : ''
            }
          >
            Tab {tab.id + 1}
            {isPending && pendingTab === tab.id && ' Loading...'}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tabs[activeTab].content}
      </div>
    </div>
  );

  // 优点：
  // 1. Tab 切换立即响应
  // 2. 显示加载状态
  // 3. 内容渲染在后台进行
}
```

---

## 实现原理

### 并发渲染机制

```tsx
// React 18 引入了并发模式（Concurrent Mode）

// 传统模式（Legacy Mode）：
// - 渲染是同步的
// - 一旦开始渲染，必须完成
// - 无法中断

// 并发模式（Concurrent Mode）：
// - 渲染是可中断的
// - 可以暂停渲染，处理更高优先级的更新
// - 可以恢复渲染
```

### 优先级系统

```tsx
// React 使用优先级系统来决定更新的执行顺序

// ========== 优先级级别 ==========

const ImmediatePriority = 1;      // 立即执行（如错误处理）
const UserBlockingPriority = 2;   // 用户阻塞（如用户输入）
const NormalPriority = 3;          // 正常优先级（过渡更新）
const LowPriority = 4;            // 低优先级（如数据获取）
const IdlePriority = 5;            // 空闲时执行

// ========== 优先级队列 ==========

interface Update {
  priority: number;    // 优先级
  callback: () => void;  // 更新函数
  next: Update | null;
}

interface PriorityQueue {
  first: Update | null;  // 最高优先级的更新
  last: Update | null;   // 最低优先级的更新
}

// ========== useTransition 的伪源码 ==========

function useTransition(config?: { timeoutMs?: number }): [boolean, TransitionFunction] {
  // ========== 步骤 1：获取当前 Fiber ==========
  const fiber = currentlyRenderingFiber!;

  // ========== 步骤 2：创建过渡状态 ==========
  const [isPending, setIsPending] = useState(false);

  // ========== 步骤 3：创建 startTransition 函数 ==========
  const startTransition = useCallback((callback: () => void) => {
    console.log('[startTransition] Starting transition');

    // ========== 步骤 3.1：标记过渡开始 ==========
    setIsPending(true);

    // ========== 步骤 3.2：降低优先级 ==========
    // 将此更新标记为低优先级（过渡优先级）
    const transitionPriority = NormalPriority;

    // ========== 步骤 3.3：执行回调 ==========
    // 在过渡上下文中执行
    runWithPriority(transitionPriority, callback);

    // ========== 步骤 3.4：监听过渡完成 ==========
    // 当过渡完成时，设置 isPending = false
    requestAnimationFrame(() => {
      // 检查是否所有过渡更新都已完成
      if (hasPendingTransitions(fiber)) {
        // 还有过渡未完成，继续等待
        return;
      }

      // 所有过渡完成
      setIsPending(false);
      console.log('[startTransition] Transition completed');
    });

  }, [fiber]);

  // ========== 步骤 4：返回 ==========
  return [isPending, startTransition];
}

// ========== 在过渡上下文中执行 ==========

function runWithPriority<T>(
  priority: number,
  callback: () => T
): T {
  // ========== 步骤 1：保存当前优先级 ==========
  const previousPriority = getCurrentPriority();

  // ========== 步骤 2：设置新的优先级 ==========
  setCurrentPriority(priority);

  try {
    // ========== 步骤 3：执行回调 ==========
    return callback();
  } finally {
    // ========== 步骤 4：恢复之前的优先级 ==========
    setCurrentPriority(previousPriority);
  }
}

// ========== 检查是否有待处理的过渡 ==========
function hasPendingTransitions(fiber: Fiber): boolean {
  // 检查 fiber 的更新队列中是否有低优先级的更新
  const updateQueue = fiber.updateQueue;

  if (!updateQueue) {
    return false;
  }

  // 检查是否有优先级 >= NormalPriority 的待处理更新
  let update = updateQueue.first;
  while (update !== null) {
    if (update.priority >= NormalPriority) {
      return true;
    }
    update = update.next;
  }

  return false;
}
```

### 调度机制

```tsx
// ========== 调度器实现（简化版）==========

interface Scheduler {
  workQueue: Work[];  // 工作队列
  currentWork: Work | null;  // 当前正在执行的工作
  isRendering: boolean;  // 是否正在渲染
}

interface Work {
  fiber: Fiber;
  priority: number;
  callback: () => void;
  next: Work | null;
}

// ========== 调度工作 ==========

function scheduleWork(fiber: Fiber, priority: number, callback: () => void) {
  // ========== 步骤 1：创建工作项 ==========
  const work: Work = {
    fiber,
    priority,
    callback,
    next: null
  };

  // ========== 步骤 2：添加到工作队列 ==========
  addWorkToQueue(work);

  // ========== 步骤 3：调度渲染 ==========
  scheduleRender();
}

// ========== 添加工作到队列 ==========

function addWorkToQueue(work: Work) {
  // 按优先级排序（最高优先级在前）
  const queue = scheduler.workQueue;
  let inserted = false;

  if (queue.length === 0) {
    queue.push(work);
    return;
  }

  for (let i = 0; i < queue.length; i++) {
    if (queue[i].priority < work.priority) {
      queue.splice(i, 0, work);
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    queue.push(work);
  }
}

// ========== 执行工作（可中断）==========

function performWork(deadline: { timeRemaining: () => number }) {
  // ========== 步骤 1：检查是否超时 ==========
  if (deadline.timeRemaining() < 1) {
    // 超时了，让出控制权
    console.log('[performWork] Time budget exhausted, yielding');
    requestIdleCallback(performWork);
    return;
  }

  // ========== 步骤 2：获取下一个工作 ==========
  const work = getNextWork();

  if (!work) {
    console.log('[performWork] No more work');
    return;
  }

  // ========== 步骤 3：执行工作 ==========
  console.log(`[performWork] Executing work with priority ${work.priority}`);

  try {
    work.callback();
  } catch (error) {
    console.error('[performWork] Error:', error);
  }

  // ========== 步骤 4：继续执行下一个工作 ==========
  performWork(deadline);
}

// ========== 获取下一个工作 ==========

function getNextWork(): Work | null {
  const queue = scheduler.workQueue;

  if (queue.length === 0) {
    return null;
  }

  // 返回优先级最高的工作
  return queue.shift();
}

// ========== 渲染循环（可中断）==========

function renderLoop() {
  // ========== 步骤 1：开始工作循环 ==========
  requestIdleCallback((deadline) => {
    performWork(deadline);
  });
}

// ========== 处理高优先级更新 ==========

function handleHighPriorityUpdate(callback: () => void) {
  // 高优先级更新，立即执行
  runWithPriority(ImmediatePriority, callback);
}

// ========== 处理过渡更新 ==========

function startTransitionUpdate(callback: () => void) {
  // 过渡更新，低优先级
  runWithPriority(NormalPriority, callback);
}
```

### 完整的 useTransition 流程

```tsx
// ========== 完整的 useTransition 流程 ==========

function useTransition(config?: { timeoutMs?: number }): [boolean, TransitionFunction] {
  const fiber = currentlyRenderingFiber!;
  const [isPending, setIsPending] = useState(false);

  const startTransition = useCallback((callback: () => void) => {
    console.log('[useTransition] ====== Starting ======');

    // ========== 阶段 1：标记过渡开始 ==========
    setIsPending(true);

    // ========== 阶段 2：在过渡上下文中执行 ==========
    runWithPriority(NormalPriority, () => {
      console.log('[useTransition] Executing in low priority context');

      // 执行回调，期间调用的 setState 会被标记为低优先级
      callback();
    });

    // ========== 阶段 3：监听过渡完成 ==========
    // 使用 requestAnimationFrame 在下一帧检查
    requestAnimationFrame(() => {
      console.log('[useTransition] Checking if transition completed');

      if (hasPendingTransitions(fiber)) {
        // 还有待处理的过渡，继续等待
        console.log('[useTransition] Still has pending transitions');
        requestAnimationFrame(() => {
          setIsPending(false);
        });
      } else {
        // 所有过渡完成
        console.log('[useTransition] ====== Completed ======');
        setIsPending(false);
      }
    });

    // ========== 阶段 4：超时处理（可选）==========
    if (config?.timeoutMs) {
      setTimeout(() => {
        if (hasPendingTransitions(fiber)) {
          console.log('[useTransition] Timeout exceeded, forcing completion');
          // 强制完成所有待处理的过渡
          forceTransitions(fiber);
          setIsPending(false);
        }
      }, config.timeoutMs);
    }

  }, [fiber, config]);

  return [isPending, startTransition];
}

// ========== 强制完成过渡 ==========

function forceTransitions(fiber: Fiber) {
  const updateQueue = fiber.updateQueue;

  if (!updateQueue) {
    return;
  }

  // 将所有待处理的过渡更新提升为高优先级
  let update = updateQueue.first;
  while (update !== null) {
    if (update.priority === NormalPriority) {
      update.priority = ImmediatePriority;
    }
    update = update.next;
  }

  // 重新调度
  scheduleRender();
}
```

### 并发渲染流程图

```
用户输入（高优先级）
    │
    ▼
┌─────────────────┐
│ 立即更新 UI    │
│ （高优先级）     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 过渡更新排队   │
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
│ 执行过渡 ││ 继续等待     │
│ 更新     ││             │
└────┬────┘ └──────┬──────┘
     │             │
     │   用户再次输入
     │       │
     │       ▼
     │  ┌─────────────┐
     │  │ 暂停过渡     │
     │  │ 处理新输入   │
     │  └──────┬──────┘
     │         │
     └─────────┤
               ▼
          ┌─────────────┐
          │ 恢复过渡     │
          │ 继续执行     │
          └──────┬──────┘
                 │
                 ▼
          ┌─────────────┐
          │ 过渡完成     │
          │ isPending   │
          │ = false     │
          └─────────────┘
```

---

## 实际应用示例

### 1. 搜索框优化

```tsx
function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // 紧急更新：立即更新搜索框
    setQuery(value);

    // 非紧急更新：延迟搜索
    startTransition(() => {
      const searchResults = performSearch(value);
      setResults(searchResults);
    });
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search..."
        style={{
          opacity: isPending ? 0.5 : 1
        }}
      />
      {isPending && <p>Searching...</p>}
      <ul>
        {results.map(result => (
          <li key={result.id}>{result.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 2. 大列表虚拟滚动

```tsx
function VirtualizedList({ items }: { items: Item[] }) {
  const [visibleItems, setVisibleItems] = useState<Item[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const startIndex = Math.floor(scrollTop / ITEM_HEIGHT);

    // 紧急更新：立即更新滚动位置
    // 非紧急更新：延迟更新可见项
    startTransition(() => {
      const endIndex = Math.min(
        startIndex + VISIBLE_COUNT,
        items.length
      );

      setVisibleItems(items.slice(startIndex, endIndex));
    });
  };

  return (
    <div
      style={{ height: '400px', overflowY: 'auto' }}
      onScroll={handleScroll}
    >
      {isPending && <Spinner />}
      {visibleItems.map(item => (
        <div key={item.id} style={{ height: ITEM_HEIGHT }}>
          {item.name}
        </div>
      ))}
    </div>
  );
}
```

### 3. 图表数据更新

```tsx
function Chart({ data }: { data: ChartData }) {
  const [chartData, setChartData] = useState(data);
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      // 模拟获取新数据
      const newData = fetchChartData();
      setChartData(newData);
    });
  };

  return (
    <div>
      <button onClick={handleRefresh} disabled={isPending}>
        {isPending ? 'Refreshing...' : 'Refresh'}
      </button>

      <div style={{ opacity: isPending ? 0.5 : 1 }}>
        <LineChart data={chartData} />
      </div>
    </div>
  );
}
```

### 4. 图片懒加载

```tsx
function ImageGallery({ images }: { images: Image[] }) {
  const [visibleImages, setVisibleImages] = useState<Image[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleLoadMore = () => {
    startTransition(() => {
      const nextBatch = images.slice(
        visibleImages.length,
        visibleImages.length + BATCH_SIZE
      );

      setVisibleImages(prev => [...prev, ...nextBatch]);
    });
  };

  return (
    <div>
      <div className="gallery">
        {visibleImages.map(image => (
          <img
            key={image.id}
            src={image.url}
            alt={image.alt}
            loading="lazy"
          />
        ))}
      </div>

      <button onClick={handleLoadMore} disabled={isPending}>
        {isPending ? 'Loading...' : 'Load More'}
      </button>
    </div>
  );
}
```

---

## 常见陷阱和最佳实践

### 1. ❌ 在 startTransition 中更新紧急状态

```tsx
// ❌ 错误：在 startTransition 中更新紧急状态

function Component() {
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [details, setDetails] = useState<Details | null>(null);

  const handleSelect = (id: number) => {
    startTransition(() => {
      // ❌ 错误：selectedId 应该立即更新
      setSelectedId(id);

      // ✅ 正确：details 可以延迟更新
      setDetails(fetchDetails(id));
    });
  };

  return <div>...</div>;
}

// ✅ 正确：紧急状态在 startTransition 外更新

function Component() {
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [details, setDetails] = useState<Details | null>(null);

  const handleSelect = (id: number) => {
    // ✅ 紧急更新：立即更新
    setSelectedId(id);

    // 非紧急更新：延迟更新
    startTransition(() => {
      setDetails(fetchDetails(id));
    });
  };

  return <div>...</div>;
}
```

### 2. ❌ 过度使用 useTransition

```tsx
// ❌ 错误：不需要 useTransition 的情况

function SimpleCounter() {
  const [count, setCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    // ❌ 问题：计数器更新很快，不需要 useTransition
    startTransition(() => {
      setCount(c => c + 1);
    });
  };

  return (
    <div>
      <button onClick={handleClick}>
        Count: {count} {isPending && '(Loading...)'}
      </button>
    </div>
  );

  // 问题：
  // 1. 计数器更新很快，不需要 useTransition
  // 2. 增加了不必要的复杂性
}

// ✅ 正确：简单状态不需要 useTransition

function SimpleCounter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    // ✅ 直接更新
    setCount(c => c + 1);
  };

  return (
    <div>
      <button onClick={handleClick}>
        Count: {count}
      </button>
    </div>
  );
}
```

### 3. ❌ 在 startTransition 中执行副作用

```tsx
// ❌ 错误：在 startTransition 中执行副作用

function Component() {
  const [data, setData] = useState<Data | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      // ❌ 错误：不要在 startTransition 中执行副作用
      const response = await fetch('/api/data');
      const data = await response.json();
      setData(data);

      // ❌ 错误：不要在 startTransition 中操作 DOM
      document.title = data.title;

      // ❌ 错误：不要在 startTransition 中调用外部 API
      analytics.track('data_loaded');
    });
  };

  return <div>...</div>;
}

// ✅ 正确：副作用用 useEffect

function Component() {
  const [data, setData] = useState<Data | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      // ✅ 只更新状态
      setData(null);
    });
  };

  // 副作用用 useEffect
  useEffect(() => {
    if (data) {
      document.title = data.title;
      analytics.track('data_loaded');
    }
  }, [data]);

  // 数据获取也用 useEffect
  useEffect(() => {
    if (!data) {
      fetch('/api/data')
        .then(res => res.json())
        .then(setData);
    }
  }, [data]);

  return <div>...</div>;
}
```

### 4. ❌ 忘记处理过渡状态

```tsx
// ❌ 错误：不显示过渡状态

function Component() {
  const [items, setItems] = useState<Item[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleFilter = (query: string) => {
    startTransition(() => {
      const filtered = filterItems(query);
      setItems(filtered);
    });
  };

  return (
    <div>
      <input
        type="text"
        onChange={(e) => handleFilter(e.target.value)}
      />
      <ul>
        {items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );

  // 问题：
  // 1. 用户不知道过渡正在进行
  // 2. 没有视觉反馈
}

// ✅ 正确：显示过渡状态

function Component() {
  const [items, setItems] = useState<Item[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleFilter = (query: string) => {
    startTransition(() => {
      const filtered = filterItems(query);
      setItems(filtered);
    });
  };

  return (
    <div>
      <input
        type="text"
        onChange={(e) => handleFilter(e.target.value)}
        style={{
          opacity: isPending ? 0.5 : 1
        }}
      />
      {isPending && <p>Filtering...</p>}
      <ul>
        {items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 5. ❌ 混合使用多个 useTransition

```tsx
// ❌ 错误：混合使用多个 useTransition

function Component() {
  const [isPending1, startTransition1] = useTransition();
  const [isPending2, startTransition2] = useTransition();

  const handleUpdate1 = () => {
    startTransition1(() => {
      // 更新 1
    });
  };

  const handleUpdate2 = () => {
    startTransition2(() => {
      // 更新 2
    });
  };

  return (
    <div>
      {isPending1 && <p>Loading 1...</p>}
      {isPending2 && <p>Loading 2...</p>}
    </div>
  );

  // 问题：
  // 1. 难以追踪哪个过渡在进行
  // 2. UI 复杂
}

// ✅ 正确：使用单个 useTransition

function Component() {
  const [isPending, startTransition] = useTransition();

  const handleUpdate1 = () => {
    startTransition(() => {
      // 更新 1
    });
  };

  const handleUpdate2 = () => {
    startTransition(() => {
      // 更新 2
    });
  };

  return (
    <div>
      {isPending && <p>Loading...</p>}
    </div>
  );
}
```

---

## 核心要点总结

### useTransition 的作用

1. **并发渲染**：允许 React 中断正在进行的渲染，处理更高优先级的更新
2. **区分优先级**：将状态更新分为紧急更新和过渡更新
3. **避免阻塞**：繁重的渲染不会阻塞用户交互
4. **过渡状态**：提供 `isPending` 状态，显示加载指示器

### 工作原理

```tsx
// 核心逻辑
const [isPending, startTransition] = useTransition();

startTransition(() => {
  // 这里的状态更新会被标记为低优先级
  setState(newValue);
});

// 流程：
// 1. startTransition 标记过渡开始
// 2. 在低优先级上下文中执行回调
// 3. 期间调用的 setState 会被标记为低优先级
// 4. React 在空闲时执行这些更新
// 5. 如果有更高优先级的更新，会中断过渡
// 6. 过渡完成后，isPending = false
```

### 并发渲染流程

```
用户输入
  ↓
紧急更新（高优先级）
  ↓
立即更新 UI
  ↓
过渡更新（低优先级）
  ↓
请求空闲帧
  ↓
执行过渡更新
  ↓
用户再次输入
  ↓
暂停过渡
  ↓
处理新输入
  ↓
恢复过渡
  ↓
过渡完成
```

### 何时使用 useTransition

**应该使用**：
- ✅ 搜索/过滤大量数据
- ✅ 切换页面/Tab
- ✅ 渲染复杂组件
- ✅ 更新大量列表项
- ✅ 需要保持用户交互响应

**不应该使用**：
- ❌ 简单的状态更新（计数器、切换布尔值）
- ❌ 紧急的用户交互（点击、提交）
- ❌ 数据获取（用 useEffect）
- ❌ 副作用操作（用 useEffect）

### 最佳实践

1. ✅ **分离紧急和非紧急更新**：紧急更新在外部，非紧急在 startTransition 内
2. ✅ **显示过渡状态**：使用 isPending 显示加载指示器
3. ✅ **优化过渡内容**：减少过渡更新的工作量
4. ✅ **使用骨架屏**：过渡时显示骨架屏
5. ✅ **配置超时时间**：避免过渡永远不完成
6. ❌ **不要在 startTransition 中执行副作用**：副作用用 useEffect
7. ❌ **不要过度使用**：只在需要时使用
8. ❌ **不要混合使用多个 useTransition**：使用单个 useTransition

### useTransition vs useDeferredValue

| 特性 | useTransition | useDeferredValue |
|-----|--------------|-------------------|
| 用途 | 标记状态更新 | 延迟值更新 |
| 优先级 | 低优先级 | 低优先级 |
| 状态管理 | 多个状态 | 单个值 |
| 使用场景 | 复杂状态更新 | 简单值延迟 |
| 过渡状态 | isPending | - |

### useTransition + useDeferredValue 模式

```tsx
function Component() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  // 立即更新输入框
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // 使用延迟的值进行过滤
  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [deferredQuery]);

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <p>Loading...</p>}
      <ul>
        {filteredItems.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

记住这些原则，你就能正确使用 useTransition 优化复杂的渲染场景！
