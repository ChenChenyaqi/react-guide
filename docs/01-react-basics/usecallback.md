# useCallback 用法与原理详解

## useCallback 是什么？

useCallback 是一个 React Hook，用于**记忆化函数**。它会缓存函数本身，只有当依赖数组中的值变化时才创建新函数，否则复用上次的函数引用。

**核心目的**：保持函数引用稳定，避免触发子组件不必要的重新渲染。

---

## 基本用法

### 1. 简单用法

```tsx
// ❌ 未优化：每次渲染都创建新函数
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    console.log('Clicked!');
  };

  return <Child onClick={handleClick} />;
}

// ✅ 优化：只在依赖变化时创建新函数
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    console.log('Clicked!');
  }, []);  // 空依赖数组：函数永远不变

  return <Child onClick={handleClick} />;
}
```

### 2. 有依赖的函数

```tsx
function Parent() {
  const [count, setCount] = useState(0);
  const [value, setValue] = useState('');

  // ✅ 函数依赖 value，只在 value 变化时创建新函数
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  const handleSubmit = useCallback(() => {
    console.log('Submitting:', value);
  }, [value]);  // 依赖 value

  return <Child onChange={handleChange} onSubmit={handleSubmit} value={value} />;
}

const Child = React.memo(function Child({
  onChange,
  onSubmit,
  value
}: {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  value: string;
}) {
  console.log('Child render');
  return (
    <div>
      <input value={value} onChange={onChange} />
      <button onClick={onSubmit}>Submit</button>
    </div>
  );
});
```

---

## 为什么需要 useCallback？

### 问题场景

```tsx
// ❌ 问题：父组件更新导致子组件不必要的重新渲染

const Child = React.memo(function Child({ onClick }: { onClick: () => void }) {
  console.log('Child render');
  return <button onClick={onClick}>Click me</button>;
});

function Parent() {
  const [count, setCount] = useState(0);

  // 每次渲染都创建新函数
  const handleClick = () => {
    console.log('Clicked!');
  };

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <Child onClick={handleClick} />
    </div>
  );
}

// 点击 Count 按钮时：
// - Parent 重新渲染
// - handleClick 是新的函数引用
// - React.memo 比较发现 onClick 变了
// - Child 重新渲染（这是不必要的）
```

### 解决方案

```tsx
// ✅ 使用 useCallback 保持函数引用稳定

function Parent() {
  const [count, setCount] = useState(0);

  // 使用 useCallback 缓存函数
  const handleClick = useCallback(() => {
    console.log('Clicked!');
  }, []);  // 空依赖数组

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <Child onClick={handleClick} />
    </div>
  );
}

// 点击 Count 按钮时：
// - Parent 重新渲染
// - handleClick 是同一个函数引用
// - React.memo 比较发现 onClick 没变
// - Child 不重新渲染 ✅
```

---

## 实现原理

### useCallback 是 useMemo 的特例

```tsx
// useCallback 的实现（简化版）

function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList
): T {
  // useCallback 本质上就是 useMemo 的特例
  return useMemo(() => callback, deps);
}

// 等价于：
function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList
): T {
  const memoizedCallback = useMemo(() => callback, deps);
  return memoizedCallback as T;
}
```

### 完整伪源码

```tsx
// useCallback 完整实现（基于 useMemo）

function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList
): T {
  // ========== 步骤 1：获取 hook ==========
  const hook = getHook();
  const useCallbackState = hook.memoizedState as useMemoHookState | null;

  // ========== 步骤 2：首次渲染 ==========
  if (useCallbackState === null) {
    // 创建 hook 状态
    hook.memoizedState = {
      value: callback,  // 缓存函数
      deps: deps
    };

    console.log('[useCallback] Mount: cached callback');
    return callback;
  }

  // ========== 步骤 3：重新渲染：比较依赖 ==========
  const cachedCallback = useCallbackState.value;
  const cachedDeps = useCallbackState.deps;

  const shouldCreateNew = shouldRecalcDeps(deps, cachedDeps);

  if (!shouldCreateNew) {
    // 依赖没变，返回缓存的函数
    console.log('[useCallback] Update: using cached callback');
    return cachedCallback;
  }

  // ========== 步骤 4：依赖变化，更新缓存 ==========
  console.log('[useCallback] Update: deps changed, creating new callback');

  hook.memoizedState = {
    value: callback,  // 新函数
    deps: deps
  };

  return callback;
}

// ========== 依赖比较逻辑（与 useMemo 相同）==========
function shouldRecalcDeps(
  newDeps: DependencyList,
  oldDeps: DependencyList
): boolean {
  if (oldDeps === null || newDeps === null) {
    return true;
  }

  if (oldDeps.length !== newDeps.length) {
    return true;
  }

  for (let i = 0; i < oldDeps.length; i++) {
    if (!Object.is(oldDeps[i], newDeps[i])) {
      return true;
    }
  }

  return false;
}
```

---

## 实际应用示例

### 1. 事件处理器

```tsx
function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState('all');

  // ✅ 缓存事件处理器
  const addTodo = useCallback((text: string) => {
    setTodos(prev => [...prev, {
      id: Date.now(),
      text,
      completed: false
    }]);
  }, []);

  const toggleTodo = useCallback((id: number) => {
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  }, []);

  const deleteTodo = useCallback((id: number) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  }, []);

  const setFilterType = useCallback((type: string) => {
    setFilter(type);
  }, []);

  return (
    <div>
      <TodoForm onAdd={addTodo} />
      <TodoFilter current={filter} onChange={setFilterType} />
      <TodoList
        items={todos}
        filter={filter}
        onToggle={toggleTodo}
        onDelete={deleteTodo}
      />
    </div>
  );
}
```

### 2. 子组件列表优化

```tsx
function Parent() {
  const [items, setItems] = useState([
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' }
  ]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // ✅ 缓存处理函数
  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  const handleDelete = useCallback((id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  return (
    <div>
      {items.map(item => (
        <Item
          key={item.id}
          item={item}
          selected={selectedId === item.id}
          onSelect={handleSelect}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}

const Item = React.memo(function Item({
  item,
  selected,
  onSelect,
  onDelete
}: {
  item: { id: number; name: string };
  selected: boolean;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  console.log(`Item ${item.id} render`);
  return (
    <div
      className={selected ? 'selected' : ''}
      onClick={() => onSelect(item.id)}
    >
      {item.name}
      <button onClick={() => onDelete(item.id)}>Delete</button>
    </div>
  );
});

// 点击某个 Item：
// - 只有被点击的 Item 重新渲染
// - 其他 Item 保持渲染结果
```

### 3. 配合 useMemo 使用

```tsx
function Parent() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState({ theme: 'light' });

  // ✅ 缓存函数
  const handleUpdateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light'
    }));
  }, []);

  // ✅ 缓存派生对象
  const config = useMemo(() => ({
    user,
    theme: settings.theme,
    onUpdateUser: handleUpdateUser,
    onToggleTheme: handleToggleTheme
  }), [user, settings.theme, handleUpdateUser, handleToggleTheme]);

  return <Dashboard config={config} />;
}

const Dashboard = React.memo(function Dashboard({
  config
}: {
  config: DashboardConfig;
}) {
  console.log('Dashboard render');
  return <div>{config.theme}</div>;
});
```

---

## 常见陷阱和最佳实践

### 1. ❌ 不必要使用 useCallback

```tsx
// ❌ 错误：不必要使用 useCallback

function Component() {
  const [count, setCount] = useState(0);

  // 问题：这个函数没有被 React.memo 的子组件使用
  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []);

  return (
    <div>
      <button onClick={handleClick}>Click</button>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
    </div>
  );
}

// ✅ 正确：直接使用函数

function Component() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    console.log('Clicked');
  };

  return (
    <div>
      <button onClick={handleClick}>Click</button>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
    </div>
  );
}

// useCallback 只在这些情况下需要：
// 1. 函数传递给 React.memo 的子组件
// 2. 函数作为其他 hook 的依赖（useEffect、useMemo）
```

### 2. ❌ 依赖数组错误

```tsx
// ❌ 错误：缺少依赖

function Component({ userId }: { userId: number }) {
  const [data, setData] = useState(null);

  // 缺少 userId 依赖
  const fetchData = useCallback(() => {
    fetch(`/api/user/${userId}`).then(setData);
  }, []);  // ❌ 应该是 [userId]

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 问题：userId 变化时，fetchData 不会更新
  //       但 useEffect 依赖 fetchData，导致获取错误的数据

  // ✅ 正确：包含所有依赖
  const fetchData = useCallback(() => {
    fetch(`/api/user/${userId}`).then(setData);
  }, [userId]);  // ✅ 包含 userId

  useEffect(() => {
    fetchData();
  }, [fetchData]);
}
```

### 3. ❌ 过度使用 useCallback

```tsx
// ❌ 错误：对所有函数都用 useCallback

function Component() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');

  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = useCallback(() => setCount(c => c - 1), []);
  const reset = useCallback(() => setCount(0), []);
  const handleChange = useCallback((e) => setName(e.target.value), []);
  const handleSubmit = useCallback(() => console.log(name), [name]);
  const handleCancel = useCallback(() => setName(''), []);

  // 问题 1：增加了代码复杂度
  // 问题 2：维护成本高
  // 问题 3：大部分函数不需要缓存

  return <div>...</div>;
}

// ✅ 正确：只缓存必要的函数

function Component() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');

  // 只缓存传递给子组件的函数
  const handleSubmit = useCallback(() => console.log(name), [name]);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <button onClick={() => setCount(c => c - 1)}>-</button>
      <input value={name} onChange={e => setName(e.target.value)} />
      <Child onSubmit={handleSubmit} />
    </div>
  );
}
```

### 4. ❌ 函数闭包陷阱

```tsx
// ❌ 错误：闭包陷阱

function Counter() {
  const [count, setCount] = useState(0);

  // 使用 count 作为依赖
  const increment = useCallback(() => {
    console.log('Current count:', count);
    setCount(count + 1);
  }, [count]);  // 每次_count_ 变化都创建新函数

  return <button onClick={increment}>+</button>;
}

// ✅ 解决方案 1：函数式更新

function Counter() {
  const [count, setCount] = useState(0);

  // 不依赖 count
  const increment = useCallback(() => {
    setCount(c => c + 1);  // 使用函数式更新
  }, []);  // 空依赖数组

  return <button onClick={increment}>+</button>;
}

// ✅ 解决方案 2：使用 ref

function Counter() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);

  // 同步 ref
  useEffect(() => {
    countRef.current = count;
  }, [count]);

  const increment = useCallback(() => {
    console.log('Current count:', countRef.current);
    setCount(countRef.current + 1);
  }, []);  // 空依赖数组

  return <button onClick={increment}>+</button>;
}
```

### 5. ❌ 在 useCallback 中执行副作用

```tsx
// ❌ 错误：在 useCallback 中执行副作用

function Component() {
  const [data, setData] = useState(null);

  const fetchData = useCallback(() => {
    // ❌ 不要在 useCallback 中发起网络请求
    fetch('/api/data').then(res => res.json()).then(setData);

    // ❌ 不要在 useCallback 中操作 DOM
    document.title = 'Data loaded';

    // ❌ 不要在 useCallback 中使用 console.log（开发调试除外）
    console.log('Fetching data...');
  }, []);

  return <div>{data}</div>;
}

// ✅ 正确：副作用用 useEffect

function Component() {
  const [data, setData] = useState(null);

  const fetchData = useCallback(() => {
    return fetch('/api/data').then(res => res.json());
  }, []);

  // 副作用用 useEffect
  useEffect(() => {
    fetchData().then(setData);
  }, [fetchData]);

  useEffect(() => {
    if (data) {
      document.title = 'Data loaded';
    }
  }, [data]);

  return <div>{data}</div>;
}
```

---

## useCallback vs useMemo

### 本质关系

```tsx
// useCallback 是 useMemo 的特例

// useMemo：缓存任意值
const value = useMemo(() => computeValue(), [deps]);

// useCallback：缓存函数
const fn = useCallback(() => { ... }, [deps]);

// 等价于：
const fn = useMemo(() => () => { ... }, [deps]);
```

### 何时使用哪个？

```tsx
function Component({ userId, settings }) {
  // ✅ 使用 useMemo：缓存计算结果
  const config = useMemo(() => ({
    userId,
    theme: settings.theme,
    lang: settings.lang
  }), [userId, settings]);

  // ✅ 使用 useCallback：缓存函数
  const handleSubmit = useCallback(() => {
    console.log('Submit:', config.userId);
  }, [config.userId]);  // 注意：依赖 config.userId 而不是整个 config

  // ❌ 错误：不要用 useMemo 缓存函数
  const fn = useMemo(() => () => { ... }, [deps]);

  // ❌ 错误：不要用 useCallback 缓存非函数值
  const value = useCallback(() => ({ a: 1 }), []);  // 这是函数，返回对象
  // 应该用：
  const value = useMemo(() => ({ a: 1 }), []);

  return <Child config={config} onSubmit={handleSubmit} />;
}
```

---

## 性能测试

### 测试 1：减少子组件渲染

```tsx
function Parent() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');

  // ❌ 未优化
  const handleChange1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  // ✅ 优化
  const handleChange2 = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  }, []);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <input value={text} onChange={handleChange1} />
      <input value={text} onChange={handleChange2} />
      <Child1 onChange={handleChange1} />
      <Child2 onChange={handleChange2} />
    </div>
  );
}

const Child1 = React.memo(function Child1({
  onChange
}: {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  console.log('Child1 render');
  return <div>Child1</div>;
});

const Child2 = React.memo(function Child2({
  onChange
}: {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  console.log('Child2 render');
  return <div>Child2</div>;
});

// 点击 Count 按钮：
// - Child1 重新渲染（handleChange1 是新函数）
// - Child2 不重新渲染（handleChange2 是同一个函数）
```

---

## 核心要点总结

### useCallback 的作用

1. **保持函数引用稳定**：避免函数引用变化
2. **配合 React.memo 使用**：避免子组件不必要的重新渲染
3. **作为其他 hook 的依赖**：减少依赖变化

### 工作原理

```tsx
// 核心逻辑（基于 useMemo）
function useCallback(callback, deps) {
  return useMemo(() => callback, deps);
}

// 等价于：
function useCallback(callback, deps) {
  const hook = getHook();
  const cached = hook.memoizedState;

  if (cached && areDepsEqual(cached.deps, deps)) {
    return cached.callback;
  }

  hook.memoizedState = { callback, deps };
  return callback;
}
```

### 何时使用 useCallback

**需要使用**：
- ✅ 函数传递给 `React.memo` 的子组件
- ✅ 函数作为其他 hook 的依赖（useEffect、useMemo）

**不需要使用**：
- ❌ 函数只在本地使用
- ❌ 函数传递给非 `React.memo` 的子组件
- ❌ 函数本身很简单

### 最佳实践

1. ✅ **只在必要时使用**：传递给 React.memo 子组件或作为其他 hook 依赖
2. ✅ **正确设置依赖数组**：包含所有使用的变量
3. ✅ **使用函数式更新**：避免闭包陷阱
4. ✅ **使用 ref**：访问最新的状态值
5. ❌ **不要过度使用**：不必要的使用增加复杂度
6. ❌ **不要在 useCallback 中执行副作用**：副作用用 useEffect
7. ❌ **不要忘记依赖**：缺少依赖会导致逻辑错误

### useMemo vs useCallback

```tsx
// useMemo：缓存任意值
const value = useMemo(() => compute(), [deps]);

// useCallback：缓存函数
const fn = useCallback(() => { ... }, [deps]);

// useCallback 是 useMemo 的特例
const fn = useMemo(() => () => { ... }, [deps]);
```

记住这些原则，你就能正确使用 useCallback 优化组件性能！
