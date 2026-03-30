# useMemo 用法与原理详解

## useMemo 是什么？

useMemo 是一个 React Hook，用于**记忆化计算结果**。它会缓存函数的返回值，只有当依赖数组中的值变化时才重新计算，否则复用上次的结果。

---

## 基本用法

### 1. 简单用法

```tsx
// ❌ 未优化：每次渲染都重新计算
function ExpensiveComponent({ items }: { items: number[] }) {
  const total = items.reduce((sum, item) => sum + item, 0);
  return <div>Total: {total}</div>;
}

// ✅ 优化：只在 items 变化时计算
function OptimizedComponent({ items }: { items: number[] }) {
  const total = useMemo(() => {
    console.log('Calculating total...');  // 只在 items 变化时打印
    return items.reduce((sum, item) => sum + item, 0);
  }, [items]);  // 依赖数组

  return <div>Total: {total}</div>;
}
```

### 2. 昂贵的计算

```tsx
function FactorialCalculator({ n }: { n: number }) {
  // 计算阶乘（昂贵操作）
  const factorial = useMemo(() => {
    console.log(`Calculating factorial of ${n}...`);

    const fib = (num: number): number => {
      if (num <= 1) return num;
      return fib(num - 1) + fib(num - 2);
    };

    return fib(n);
  }, [n]);  // 只在 n 变化时计算

  return (
    <div>
      <p>Fibonacci({n}): {factorial}</p>
    </div>
  );
}

function Parent() {
  const [count, setCount] = useState(0);
  const [fibN, setFibN] = useState(10);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <button onClick={() => setFibN(prev => prev + 1)}>
        Fib N: {fibN}
      </button>
      <FactorialCalculator n={fibN} />
    </div>
  );
}

// 点击 Count 按钮：
// - FactorialCalculator 不重新计算（n 没变）
// - 复用上次的 factorial 值
```

### 3. 缓存对象

```tsx
function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState({ theme: 'light' });

  // ✅ 缓存配置对象（避免每次渲染创建新对象）
  const config = useMemo(() => ({
    userId,
    theme: settings.theme,
    lang: 'zh'
  }), [userId, settings.theme]);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  return <Child config={config} />;
}

const Child = React.memo(function Child({ config }: { config: any }) {
  console.log('Child render');
  return <div>{config.theme}</div>;
});
```

---

## useMemo 的工作原理

### 基本机制

useMemo 通过以下步骤工作：

1. **首次渲染**：执行函数，缓存结果和依赖数组
2. **重新渲染**：比较新旧依赖数组
3. **依赖变化**：重新执行函数，更新缓存
4. **依赖不变**：返回缓存的结果

```tsx
// useMemo 内部逻辑（简化版）
function useMemo<T>(
  factory: () => T,
  deps: DependencyList
): T {
  // 1. 获取当前 hook
  const hook = getHook();

  // 2. 检查是否是首次渲染
  if (hook.memoizedState === null) {
    // 首次渲染：计算并缓存
    const value = factory();
    hook.memoizedState = {
      value,
      deps
    };
    return value;
  }

  // 3. 重新渲染：比较依赖
  const { value: cachedValue, deps: cachedDeps } = hook.memoizedState;

  if (areDepsEqual(deps, cachedDeps)) {
    // 依赖没变，返回缓存值
    return cachedValue;
  }

  // 4. 依赖变了，重新计算
  const newValue = factory();
  hook.memoizedState = {
    value: newValue,
    deps
  };
  return newValue;
}
```

---

## 完整伪源码实现

### 1. useMemo 完整实现

```tsx
// useMemo 完整实现（简化版）

interface useMemoHookState {
  value: any;
  deps: DependencyList | null;
}

function useMemo<T>(
  factory: () => T,
  deps: DependencyList | null | undefined
): T {
  // ========== 1. 获取当前 Fiber 和 Hook ==========
  const fiber = currentlyRenderingFiber!;
  const hook = getCurrentHook();

  // ========== 2. 首次渲染（mount）==========
  if (fiber.alternate === null) {
    // 执行工厂函数
    const value = factory();

    // 创建 hook 状态
    const useMemoState: useMemoHookState = {
      value,
      deps: deps ?? null
    };

    // 保存到 hook
    hook.memoizedState = useMemoState;

    console.log('useMemo (mount): calculated and cached');
    return value;
  }

  // ========== 3. 重新渲染（update）==========
  const useMemoState = hook.memoizedState as useMemoHookState;
  const cachedValue = useMemoState.value;
  const cachedDeps = useMemoState.deps;

  // ========== 4. 比较依赖数组 ==========

  // 情况 1：没有提供依赖数组
  if (deps === undefined) {
    // React 严格模式下会警告，但行为上等同于空依赖数组
    console.warn('useMemo() was called without dependencies');

    // 强制重新计算
    const newValue = factory();
    useMemoState.value = newValue;
    return newValue;
  }

  // 情况 2：有依赖数组，进行比较
  const isDepsEqual = areDepsEqual(deps, cachedDeps);

  if (isDepsEqual) {
    // 依赖没变，返回缓存值
    console.log('useMemo (update): using cached value');
    return cachedValue;
  }

  // ========== 5. 依赖变化，重新计算 ==========
  console.log('useMemo (update): deps changed, recalculating');

  const newValue = factory();
  useMemoState.value = newValue;
  useMemoState.deps = deps;

  return newValue;
}

// ========== 依赖数组比较 ==========
function areDepsEqual(
  nextDeps: DependencyList | null,
  prevDeps: DependencyList | null
): boolean {
  // 1. 任一为 null，不相等
  if (prevDeps === null || nextDeps === null) {
    return false;
  }

  // 2. 长度不同，不相等
  if (prevDeps.length !== nextDeps.length) {
    return false;
  }

  // 3. 逐个比较（浅比较）
  for (let i = 0; i < prevDeps.length; i++) {
    if (!Object.is(prevDeps[i], nextDeps[i])) {
      return false;
    }
  }

  // 4. 所有依赖都相等
  return true;
}
```

### 2. Hook 链表管理

```tsx
// ========== 全局变量 ==========
let currentlyRenderingFiber: FiberNode | null = null;
let currentHook: Hook | null = null;
let hookIndex = 0;

// ========== 获取当前 Hook ==========
function getCurrentHook(): Hook {
  const fiber = currentlyRenderingFiber!;

  // 首次渲染
  if (fiber.alternate === null) {
    // 创建新 hook
    const hook: Hook = {
      tag: HookMemo,  // useMemo 的 tag
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

// ========== 渲染流程 ==========
function renderComponent(fiber: FiberNode) {
  currentlyRenderingFiber = fiber;
  currentHook = fiber.alternate?.memoizedState || null;
  hookIndex = 0;

  try {
    // 执行组件函数（期间调用 useMemo）
    const element = fiber.type(fiber.props);
    return element;
  } finally {
    currentlyRenderingFiber = null;
    currentHook = null;
    hookIndex = 0;
  }
}
```

---

## useMemo 与 React.memo 的关系

### 区别

```tsx
// useMemo：记忆化函数的返回值
function Component() {
  const expensiveValue = useMemo(() => {
    return expensiveCalculation();
  }, [dep]);

  return <div>{expensiveValue}</div>;
}

// React.memo：记忆化组件的渲染结果
const MemoizedComponent = React.memo(function Component(props) {
  const expensiveValue = expensiveCalculation();
  return <div>{expensiveValue}</div>;
});
```

### 配合使用

```tsx
// 场景：避免父组件更新导致子组件重新渲染

// ❌ 问题：每次渲染都创建新对象
function Parent() {
  const [count, setCount] = useState(0);

  const config = {
    theme: 'dark',
    lang: 'zh'
  };

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <Child config={config} />
    </div>
  );
}

// ✅ 解决方案：使用 useMemo + React.memo

const Child = React.memo(function Child({ config }: { config: { theme: string; lang: string } }) {
  console.log('Child render');
  return <div>{config.theme}</div>;
});

function Parent() {
  const [count, setCount] = useState(0);

  // 使用 useMemo 缓存对象
  const config = useMemo(() => ({
    theme: 'dark',
    lang: 'zh'
  }), []);  // 空依赖数组

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <Child config={config} />
    </div>
  );
}

// 点击 Count 按钮：
// - config 对象复用（useMemo 缓存）
// - Child props 不变
// - Child 不重新渲染（React.memo）
```

---

## 实际应用示例

### 1. 排序和过滤

```tsx
function ProductList({ products, filter, sortBy }: {
  products: Product[];
  filter: string;
  sortBy: 'price' | 'rating';
}) {
  // ✅ 只在 products、filter、sortBy 变化时重新计算
  const filteredAndSortedProducts = useMemo(() => {
    console.log('Filtering and sorting products...');

    let result = products;

    // 过滤
    if (filter) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(filter.toLowerCase())
      );
    }

    // 排序
    result = [...result].sort((a, b) => {
      if (sortBy === 'price') {
        return a.price - b.price;
      } else {
        return b.rating - a.rating;
      }
    });

    return result;
  }, [products, filter, sortBy]);

  return (
    <ul>
      {filteredAndSortedProducts.map(product => (
        <li key={product.id}>
          {product.name} - ${product.price}
        </li>
      ))}
    </ul>
  );
}
```

### 2. 复杂对象派生

```tsx
function Dashboard({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState({ theme: 'light' });

  // 获取用户数据
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  // ✅ 派生复杂的配置对象
  const dashboardConfig = useMemo(() => {
    if (!user) return null;

    return {
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: user.role
      },
      theme: settings.theme,
      permissions: {
        canEdit: user.role === 'admin',
        canDelete: user.role === 'admin',
        canView: true
      },
      layout: user.preferences?.layout || 'grid',
      notifications: user.preferences?.notifications ?? true
    };
  }, [user, settings.theme]);

  return <DashboardPanel config={dashboardConfig} />;
}

const DashboardPanel = React.memo(function DashboardPanel({
  config
}: {
  config: DashboardConfig | null;
}) {
  console.log('DashboardPanel render');
  if (!config) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {config.user.name}</h1>
      <p>Role: {config.user.role}</p>
      {config.permissions.canEdit && <button>Edit</button>}
    </div>
  );
});
```

### 3. 避免 React.memo 失效

```tsx
function Parent() {
  const [count, setCount] = useState(0);
  const [items] = useState([1, 2, 3, 4, 5]);

  // ✅ 缓存计算结果
  const total = useMemo(() => ({
    sum: items.reduce((sum, item) => sum + item, 0),
    average: items.reduce((sum, item) => sum + item, 0) / items.length,
    count: items.length
  }), [items]);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <Stats data={total} />
    </div>
  );
}

const Stats = React.memo(function Stats({
  data
}: {
  data: { sum: number; average: number; count: number };
}) {
  console.log('Stats render');
  return (
    <div>
      <p>Sum: {data.sum}</p>
      <p>Average: {data.average}</p>
      <p>Count: {data.count}</p>
    </div>
  );
});

// 点击 Count 按钮：
// - total 对象复用（items 没变）
// - Stats props 不变
// - Stats 不重新渲染
```

---

## useMemo 与 useCallback 的关系

### useCallback 是 useMemo 的特殊情况

```tsx
// useCallback 的实现（简化版）
function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList
): T {
  // useCallback 其实就是 useMemo 的特例
  return useMemo(() => callback, deps);
}

// 等价于：
function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList
): T {
  return useMemo(() => callback, deps);
}
```

### 实际使用

```tsx
function Parent() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');

  // ✅ 使用 useCallback 缓存函数
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  // ✅ 使用 useMemo 缓存对象
  const formData = useMemo(() => ({
    name,
    count,
    timestamp: Date.now()
  }), [name, count]);

  // ❌ 不要这样用（函数引用没变，但依赖会变化）
  const handleChange = useMemo(() => (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, [name]);  // 每次 name 变化都创建新函数

  return (
    <div>
      <input value={name} onChange={handleChange} />
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <Child data={formData} onClick={handleChange} />
    </div>
  );
}

const Child = React.memo(function Child({
  data,
  onClick
}: {
  data: any;
  onClick: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  console.log('Child render');
  return <button onClick={onClick as any}>Submit</button>;
});
```

---

## useMemo 的执行流程

### 完整流程图

```
组件重新渲染
       │
       ▼
┌─────────────────┐
│   useMemo 被调用  │
│   factory(), deps│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   检查是否有缓存  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
  有缓存    无缓存
    │         │
    ▼         ▼
┌────────┐ ┌─────────────────┐
│比较依赖 ││ 执行 factory()   │
└───┬────┘ │ 缓存结果和 deps  │
    │      └────────┬────────┘
    ┌───┴───┐         │
    │       │         ▼
  相等    不相等   ┌────────┐
    │       │      │返回结果 │
    ▼       ▼      └────────┘
┌────────┐ ┌────────┐
│返回缓存 ││返回结果 │
└────────┘ └────────┘
```

### 详细流程伪码

```tsx
function useMemo<T>(
  factory: () => T,
  deps: DependencyList | null | undefined
): T {
  // ========== 步骤 1：获取 hook ==========
  const hook = getHook();
  const useMemoState = hook.memoizedState as useMemoHookState | null;

  // ========== 步骤 2：首次渲染 ==========
  if (useMemoState === null) {
    // 执行工厂函数
    const value = factory();

    // 缓存结果和依赖
    hook.memoizedState = {
      value,
      deps: deps ?? null
    };

    console.log('[useMemo] Mount: calculated');
    return value;
  }

  // ========== 步骤 3：重新渲染 ==========
  const cachedValue = useMemoState.value;
  const cachedDeps = useMemoState.deps;

  // ========== 步骤 4：比较依赖 ==========
  const shouldRecalculate = shouldRecalcDeps(deps, cachedDeps);

  if (!shouldRecalculate) {
    // 依赖没变，返回缓存
    console.log('[useMemo] Update: using cache');
    return cachedValue;
  }

  // ========== 步骤 5：依赖变化，重新计算 ==========
  console.log('[useMemo] Update: recalculating');
  const newValue = factory();

  // 更新缓存
  useMemoState.value = newValue;
  useMemoState.deps = deps ?? null;

  return newValue;
}

// ========== 依赖判断逻辑 ==========
function shouldRecalcDeps(
  newDeps: DependencyList | null | undefined,
  oldDeps: DependencyList | null
): boolean {
  // 情况 1：新 deps 为 undefined
  // React 严格模式下会警告，但行为上等同于空依赖数组
  if (newDeps === undefined) {
    // 开发模式警告
    if (__DEV__) {
      console.warn('useMemo() was called without dependencies. ' +
        'This will cause the function to be re-run on every render.');
    }
    // 重新计算
    return true;
  }

  // 情况 2：任一为 null
  if (oldDeps === null || newDeps === null) {
    return true;
  }

  // 情况 3：长度不同
  if (oldDeps.length !== newDeps.length) {
    return true;
  }

  // 情况 4：逐个比较
  for (let i = 0; i < oldDeps.length; i++) {
    if (!Object.is(oldDeps[i], newDeps[i])) {
      return true;
    }
  }

  // 所有依赖都相等
  return false;
}
```

---

## 常见陷阱和最佳实践

### 1. ❌ 过度使用 useMemo

```tsx
// ❌ 错误：对简单计算使用 useMemo

function Component({ a, b }: { a: number; b: number }) {
  // 问题 1：计算本身很简单，缓存的开销可能比计算还大
  // 问题 2：增加了代码复杂度
  // 问题 3：依赖数组可能搞错
  const sum = useMemo(() => a + b, [a, b]);

  return <div>{sum}</div>;
}

// ✅ 正确：直接计算
function Component({ a, b }: { a: number; b: number }) {
  const sum = a + b;
  return <div>{sum}</div>;
}

// 适合 useMemo 的场景：
// 1. 昂贵的计算（排序、过滤、复杂算法）
// 2. 创建对象（避免 React.memo 失效）
// 3. 计算结果会被 React.memo 的子组件使用
```

### 2. ❌ 依赖数组错误

```tsx
// ❌ 错误：缺少依赖

function Component({ userId, settings }: Props) {
  const [data, setData] = useState(null);

  // 缺少 settings 依赖
  const config = useMemo(() => ({
    userId,
    theme: settings.theme,  // 使用了 settings 但没在依赖数组中
    lang: settings.lang
  }), [userId]);  // ❌ 应该是 [userId, settings]

  useEffect(() => {
    fetch(config).then(setData);
  }, [config]);

  // 问题：settings 变化时，config 不会更新
  //       但 useEffect 依赖 config，导致数据获取逻辑错误

  // ✅ 正确：包含所有依赖
  const config = useMemo(() => ({
    userId,
    theme: settings.theme,
    lang: settings.lang
  }), [userId, settings]);  // ✅ 包含所有依赖
}
```

### 3. ❌ 过度记忆化

```tsx
// ❌ 错误：对每个计算都用 useMemo

function Component({ items }: { items: Item[] }) {
  // 问题 1：这些计算本身很快
  // 问题 2：增加了大量 hook 调用
  // 问题 3：维护成本高
  const total = useMemo(() => items.reduce((sum, i) => sum + i.value, 0), [items]);
  const average = useMemo(() => total / items.length, [total, items.length]);
  const max = useMemo(() => Math.max(...items.map(i => i.value)), [items]);
  const min = useMemo(() => Math.min(...items.map(i => i.value)), [items]);

  return (
    <div>
      <p>Total: {total}</p>
      <p>Average: {average}</p>
      <p>Max: {max}</p>
      <p>Min: {min}</p>
    </div>
  );
}

// ✅ 正确：合并相关计算
function Component({ items }: { items: Item[] }) {
  const stats = useMemo(() => {
    const total = items.reduce((sum, i) => sum + i.value, 0);
    return {
      total,
      average: total / items.length,
      max: Math.max(...items.map(i => i.value)),
      min: Math.min(...items.map(i => i.value))
    };
  }, [items]);

  return (
    <div>
      <p>Total: {stats.total}</p>
      <p>Average: {stats.average}</p>
      <p>Max: {stats.max}</p>
      <p>Min: {stats.min}</p>
    </div>
  );
}
```

### 4. ❌ 在 useMemo 中使用副作用

```tsx
// ❌ 错误：在 useMemo 中执行副作用

function Component({ userId }: { userId: number }) {
  const data = useMemo(() => {
    // ❌ 不要在 useMemo 中发起网络请求
    fetch(`/api/user/${userId}`).then(res => res.json()).then(setData);

    // ❌ 不要在 useMemo 中操作 DOM
    document.title = `User ${userId}`;

    // ❌ 不要在 useMemo 中使用 console.log（开发调试除外）
    console.log('Calculating data for userId:', userId);

    return { userId };
  }, [userId]);

  return <div>{data.userId}</div>;
}

// ✅ 正确：副作用用 useEffect
function Component({ userId }: { userId: number }) {
  const [data, setData] = useState(null);

  // 数据获取用 useEffect
  useEffect(() => {
    fetch(`/api/user/${userId}`)
      .then(res => res.json())
      .then(setData);
  }, [userId]);

  // DOM 操作用 useEffect
  useEffect(() => {
    document.title = `User ${userId}`;
  }, [userId]);

  // useMemo 只用于纯函数计算
  const memoizedValue = useMemo(() => {
    return { userId, processed: processData(userId) };
  }, [userId]);

  return <div>{memoizedValue.userId}</div>;
}
```

### 5. ❌ 忘记处理空数组

```tsx
// ❌ 错误：未处理空数组

function Component({ items }: { items: number[] | null }) {
  const total = useMemo(() => {
    // items 可能是 null，会报错
    return items.reduce((sum, item) => sum + item, 0);
  }, [items]);

  return <div>{total}</div>;
}

// ✅ 正确：处理边界情况
function Component({ items }: { items: number[] | null }) {
  const total = useMemo(() => {
    if (!items || items.length === 0) {
      return 0;
    }

    return items.reduce((sum, item) => sum + item, 0);
  }, [items]);

  return <div>{total}</div>;
}

// 或使用可选链和空值合并
function Component({ items }: { items: number[] | null }) {
  const total = useMemo(() => {
    return items?.reduce((sum, item) => sum + item, 0) ?? 0;
  }, [items]);

  return <div>{total}</div>;
}
```

---

## 性能测试

### 测试 1：昂贵的计算

```tsx
function ExpensiveCalculation({ n }: { n: number }) {
  // 计算第 n 个斐波那契数（昂贵）
  const fib = useMemo(() => {
    console.log(`Calculating fib(${n})...`);

    const calculate = (num: number): number => {
      if (num <= 1) return num;
      return calculate(num - 1) + calculate(num - 2);
    };

    return calculate(n);
  }, [n]);

  return <div>Fib({n}): {fib}</div>;
}

function Parent() {
  const [count, setCount] = useState(0);
  const [fibN, setFibN] = useState(30);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <button onClick={() => setFibN(prev => prev + 1)}>
        Fib N: {fibN}
      </button>
      <ExpensiveCalculation n={fibN} />
    </div>
  );
}

// 测试结果：
// 点击 Count 按钮：
// - ExpensiveCalculation 不重新计算（n 没变）
// - 性能提升明显（fib(30) 计算很慢）

// 点击 Fib N 按钮：
// - ExpensiveCalculation 重新计算（n 变了）
```

### 测试 2：对象创建

```tsx
function Parent() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState('light');

  // ❌ 未优化：每次渲染都创建新对象
  const style1 = {
    color: theme === 'dark' ? '#fff' : '#000',
    backgroundColor: theme === 'dark' ? '#333' : '#fff'
  };

  // ✅ 优化：只在 theme 变化时创建新对象
  const style2 = useMemo(() => ({
    color: theme === 'dark' ? '#fff' : '#000',
    backgroundColor: theme === 'dark' ? '#333' : '#fff'
  }), [theme]);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        Toggle Theme
      </button>
      <div style={style1}>Unoptimized</div>
      <div style={style2}>Optimized</div>
    </div>
  );
}

// 测试结果：
// 点击 Count 按钮：
// - style1：新对象（每次渲染）
// - style2：复用对象（theme 没变）

// 点击 Toggle Theme 按钮：
// - style1：新对象
// - style2：新对象（theme 变了）
```

---

## 核心要点总结

### useMemo 的作用

1. **记忆化计算结果**：缓存函数返回值，避免重复计算
2. **依赖驱动的更新**：只有依赖变化时才重新计算
3. **提升性能**：在特定场景下减少不必要的计算

### 工作原理

```tsx
// 核心逻辑
function useMemo(factory, deps) {
  // 1. 检查是否有缓存
  const cached = getCache();

  // 2. 比较依赖
  if (cached && areDepsEqual(cached.deps, deps)) {
    // 依赖没变，返回缓存
    return cached.value;
  }

  // 3. 依赖变了，重新计算
  const value = factory();

  // 4. 更新缓存
  setCache({ value, deps });

  return value;
}
```

### 依赖数组规则

```tsx
// 1. 空依赖数组：只在首次渲染时计算
useMemo(() => expensiveCalculation(), []);

// 2. 有依赖数组：依赖变化时计算
useMemo(() => expensiveCalculation(a, b), [a, b]);

// 3. 无依赖数组：每次渲染都计算（不推荐）
useMemo(() => expensiveCalculation());  // 相当于没有 useMemo

// 浅比较
const obj1 = { a: 1 };
const obj2 = { a: 1 };
useMemo(() => {}, [obj1]);  // 缓存
useMemo(() => {}, [obj2]);  // 重新计算（不同引用）
```

### 最佳实践

1. ✅ **只在需要时使用**：昂贵的计算、对象创建
2. ✅ **正确设置依赖数组**：包含所有使用的变量
3. ✅ **处理边界情况**：null、undefined、空数组
4. ✅ **配合 React.memo 使用**：避免子组件不必要的渲染
5. ❌ **不要在 useMemo 中执行副作用**：副作用用 useEffect
6. ❌ **不要过度使用**：简单计算不需要记忆化
7. ❌ **不要忘记依赖**：缺少依赖会导致逻辑错误

### useMemo vs useCallback

```tsx
// useMemo：缓存任意值
const value = useMemo(() => computeValue(), [deps]);

// useCallback：缓存函数（useMemo 的特例）
const fn = useCallback(() => { ... }, [deps]);

// 等价于：
const fn = useMemo(() => () => { ... }, [deps]);
```

记住这些原则，你就能正确使用 useMemo 优化组件性能！
