# React.memo 用法与原理详解

## React.memo 是什么？

React.memo 是一个高阶组件（HOC），用于**避免不必要的重新渲染**。它会记忆组件的渲染结果，当 props 没有变化时，复用上次的渲染结果。

---

## 基本用法

### 1. 简单用法

```tsx
// 未优化：每次父组件渲染都会重新渲染
function ExpensiveComponent({ name }: { name: string }) {
  console.log('ExpensiveComponent render');
  return <div>Hello, {name}</div>;
}

// 优化：使用 React.memo
const MemoizedExpensiveComponent = React.memo(function ExpensiveComponent({ name }: { name: string }) {
  console.log('ExpensiveComponent render');
  return <div>Hello, {name}</div>;
});

// 或使用箭头函数
const MemoizedComponent = React.memo(({ name }: { name: string }) => {
  console.log('Component render');
  return <div>Hello, {name}</div>;
});
```

### 2. 函数声明式写法

```tsx
// 先定义组件
function UserCard({ name, age }: { name: string; age: number }) {
  console.log('UserCard render:', name);
  return (
    <div className="card">
      <h2>{name}</h2>
      <p>Age: {age}</p>
    </div>
  );
}

// 然后包装
const MemoizedUserCard = React.memo(UserCard);

// 使用
function App() {
  const [count, setCount] = useState(0);
  const [name] = useState('Alice');  // name 不变

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <MemoizedUserCard name={name} age={25} />
    </div>
  );
}

// 点击按钮时：
// - App 重新渲染
// - MemoizedUserCard 不会重新渲染（name 和 age 没变）
```

---

## React.memo 的工作原理

### 浅比较机制

React.memo 默认使用**浅比较**（shallow comparison）来判断 props 是否变化。

```tsx
// React.memo 内部实现（简化版）
function React.memo<P>(
  Component: React.ComponentType<P>,
  arePropsEqual?: (prevProps: P, nextProps: P) => boolean
) {
  return function MemoizedComponent(props: P) {
    // 1. 获取上次渲染的 props
    const prevProps = useRef<P | null>(null).current;

    // 2. 比较新旧 props
    const propsEqual = arePropsEqual
      ? arePropsEqual(prevProps!, props)
      : shallowEqual(prevProps!, props);

    // 3. 如果 props 相等，复用上次渲染结果
    if (propsEqual) {
      return prevRenderedElement;  // 返回缓存的 VDOM
    }

    // 4. props 不相等，重新渲染
    const newElement = Component(props);
    prevRenderedElement = newElement;
    return newElement;
  };
}

// ========== 浅比较实现 ==========
function shallowEqual(objA: any, objB: any): boolean {
  // 1. 引用相同，直接返回 true
  if (Object.is(objA, objB)) {
    return true;
  }

  // 2. 任一为 null 或非对象，返回 false
  if (typeof objA !== 'object' || objA === null ||
      typeof objB !== 'object' || objB === null) {
    return false;
  }

  // 3. 比较 keys 数量
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // 4. 逐个比较每个 key 的值（浅比较）
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (
      !Object.prototype.hasOwnProperty.call(objB, key) ||
      !Object.is(objA[key], objB[key])
    ) {
      return false;
    }
  }

  return true;
}
```

---

## 完整伪源码实现

### 1. React.memo 完整实现

```tsx
// React.memo 完整实现（简化版）

interface MemoComponentProps<P> {
  type: React.ComponentType<P>;
  compare: (prevProps: P, nextProps: P) => boolean;
  prevProps: P | null;
  prevResult: React.ReactElement | null;
}

function React.memo<P>(
  Component: React.ComponentType<P>,
  arePropsEqual?: (prevProps: P, nextProps: P) => boolean
): React.NamedExoticComponent<P> {
  // 创建记忆组件
  const MemoizedComponent = React.forwardRef(function MemoizedComponent(
    props: P,
    ref: React.ForwardedRef<any>
  ) {
    // ========== 1. 获取或创建记忆状态 ==========
    const memoState = useMemo(() => ({
      prevProps: null as P | null,
      prevResult: null as React.ReactElement | null,
    }), []);

    // ========== 2. 比较新旧 props ==========
    const propsEqual: boolean = useMemo(() => {
      if (memoState.prevProps === null) {
        // 首次渲染，强制重新渲染
        return false;
      }

      // 使用自定义比较函数或默认浅比较
      return arePropsEqual
        ? arePropsEqual(memoState.prevProps, props)
        : shallowEqual(memoState.prevProps, props);
    }, [props, memoState.prevProps, arePropsEqual]);

    // ========== 3. 根据比较结果决定是否重新渲染 ==========
    let result: React.ReactElement;

    if (!propsEqual) {
      // props 不相等，需要重新渲染
      console.log('React.memo: props changed, re-rendering');

      // 重新渲染组件
      result = Component(props);

      // 保存当前 props 和渲染结果
      memoState.prevProps = props;
      memoState.prevResult = result;
    } else {
      // props 相等，复用上次渲染结果
      console.log('React.memo: props unchanged, skipping render');
      result = memoState.prevResult!;
    }

    // ========== 4. 处理 ref ==========
    return React.cloneElement(result, { ref });
  });

  // 设置组件名称
  MemoizedComponent.displayName = `Memo(${Component.displayName || Component.name})`;

  // 标记为记忆组件
  (MemoizedComponent as any).$$typeof = Symbol.for('react.memo');

  return MemoizedComponent as React.NamedExoticComponent<P>;
}

// ========== 浅比较完整实现 ==========
function shallowEqual(objA: any, objB: any): boolean {
  // 1. 引用相同
  if (Object.is(objA, objB)) {
    return true;
  }

  // 2. null 或非对象检查
  if (typeof objA !== 'object' || objA === null ||
      typeof objB !== 'object' || objB === null) {
    return false;
  }

  // 3. 比较 keys
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // 4. 逐个比较
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (
      !Object.prototype.hasOwnProperty.call(objB, key) ||
      !Object.is(objA[key], objB[key])
    ) {
      return false;
    }
  }

  return true;
}
```

---

## 实际应用示例

### 1. 避免不必要的子组件渲染

```tsx
// 场景：父组件频繁更新，但子组件 props 不变

// ❌ 未优化：每次父组件渲染都重新渲染
function ExpensiveList({ items }: { items: number[] }) {
  console.log('ExpensiveList render');  // 每次都打印

  return (
    <ul>
      {items.map(item => (
        <ExpensiveItem key={item} value={item} />
      ))}
    </ul>
  );
}

// ✅ 优化后：只在 items 变化时渲染
const MemoizedExpensiveList = React.memo(function ExpensiveList({ items }: { items: number[] }) {
  console.log('ExpensiveList render');  // 只在 items 变化时打印

  return (
    <ul>
      {items.map(item => (
        <ExpensiveItem key={item} value={item} />
      ))}
    </ul>
  );
});

function App() {
  const [count, setCount] = useState(0);
  const [items] = useState([1, 2, 3, 4, 5]);  // items 不变

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <MemoizedExpensiveList items={items} />
    </div>
  );
}
```

### 2. 对象 props 的问题

```tsx
// ⚠️ 问题：对象 props 会导致 React.memo 失效

function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>

      {/* ❌ 每次渲染都创建新对象，React.memo 失效 */}
      <Child config={{ theme: 'dark', lang: 'zh' }} />
    </div>
  );
}

const Child = React.memo(function Child({ config }: { config: { theme: string; lang: string } }) {
  console.log('Child render');
  return <div>{config.theme}</div>;
});

// 点击按钮时：
// - Parent 重新渲染
// - 创建新对象 { theme: 'dark', lang: 'zh' }
// - React.memo 比较发现对象引用不同
// - Child 重新渲染（这是不好的）

// ✅ 解决方案 1：将配置提取到组件外部
const DEFAULT_CONFIG = { theme: 'dark', lang: 'zh' };

function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <Child config={DEFAULT_CONFIG} />
    </div>
  );
}

// ✅ 解决方案 2：使用 useMemo
function Parent() {
  const [count, setCount] = useState(0);

  const config = useMemo(() => ({
    theme: 'dark',
    lang: 'zh'
  }), []);  // 空依赖数组，只在首次渲染时创建

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <Child config={config} />
    </div>
  );
}
```

### 3. 函数 props 的问题

```tsx
// ⚠️ 问题：函数 props 会导致 React.memo 失效

function Parent() {
  const [count, setCount] = useState(0);

  // ❌ 每次渲染都创建新函数
  const handleClick = () => {
    console.log('clicked');
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

const Child = React.memo(function Child({ onClick }: { onClick: () => void }) {
  console.log('Child render');
  return <button onClick={onClick}>Click me</button>;
});

// ✅ 解决方案：使用 useCallback
function Parent() {
  const [count, setCount] = useState(0);

  // ✅ 使用 useCallback 缓存函数
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);  // 空依赖数组，只在首次渲染时创建

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <Child onClick={handleClick} />
    </div>
  );
}
```

### 4. 自定义比较函数

```tsx
// 默认浅比较可能不够用

interface UserProps {
  user: {
    id: number;
    name: string;
    email: string;
  };
  showEmail: boolean;
}

// ❌ 默认浅比较：user 对象引用变化就会重新渲染
const UserCard = React.memo(function UserCard({ user, showEmail }: UserProps) {
  console.log('UserCard render:', user.name);
  return (
    <div>
      <h3>{user.name}</h3>
      {showEmail && <p>{user.email}</p>}
    </div>
  );
});

// ✅ 自定义比较：只比较 user.id
const UserCardCustom = React.memo(
  function UserCard({ user, showEmail }: UserProps) {
    console.log('UserCard render:', user.name);
    return (
      <div>
        <h3>{user.name}</h3>
        {showEmail && <p>{user.email}</p>}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // 只比较 user.id 和 showEmail
    return (
      prevProps.user.id === nextProps.user.id &&
      prevProps.showEmail === nextProps.showEmail
    );
    // 即使 user.name 或 user.email 变了，也不会重新渲染
  }
);

function Parent() {
  const [count, setCount] = useState(0);
  const [user, setUser] = useState({
    id: 1,
    name: 'Alice',
    email: 'alice@example.com'
  });

  const updateEmail = () => {
    // 更新 email，但 id 不变
    setUser(prev => ({ ...prev, email: 'new-email@example.com' }));
  };

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <button onClick={updateEmail}>
        Update Email
      </button>
      <UserCardCustom user={user} showEmail={true} />
    </div>
  );
}

// 点击 Update Email 按钮：
// - UserCardCustom 不会重新渲染（id 没变）
// - 但 email 实际上变了，UI 不会更新
// ⚠️ 这可能导致 UI 不同步，谨慎使用自定义比较
```

---

## React.memo 的执行流程

### 渲染流程图

```
父组件重新渲染
       │
       ▼
┌─────────────────┐
│  React.memo     │
│  接收新 props    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  比较新旧 props  │
│  浅比较每一个   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  相等      不相等
    │         │
    ▼         ▼
┌────────┐ ┌─────────────────┐
│ 复用   │ │ 重新渲染组件    │
│ 上次   │ │ 生成新的 VDOM    │
│ 渲染   │ │                 │
│ 结果   │ └────────┬────────┘
└────────┘          │
                    ▼
              ┌──────────────┐
              │ 更新 memo 状态 │
              │ 保存 props    │
              └──────────────┘
```

### 详细流程伪码

```tsx
// React.memo 渲染流程（完整版）

function renderMemoizedComponent<P>(
  component: React.ComponentType<P>,
  props: P,
  memoState: MemoState<P>
): React.ReactElement {
  // ========== 步骤 1：获取上次 props ==========
  const prevProps = memoState.prevProps;

  // ========== 步骤 2：比较 props ==========
  let shouldUpdate = true;

  if (prevProps !== null) {
    // 执行浅比较
    const propsEqual = shallowEqual(prevProps, props);

    if (propsEqual) {
      // props 相等，不需要更新
      shouldUpdate = false;
    }
  }

  // ========== 步骤 3：决定是否重新渲染 ==========
  if (shouldUpdate) {
    // props 不相等或首次渲染
    console.log('Memo component: rendering...');

    // 执行组件函数
    const newElement = component(props);

    // 保存渲染结果和 props
    memoState.prevResult = newElement;
    memoState.prevProps = props;

    return newElement;
  } else {
    // props 相等，复用上次结果
    console.log('Memo component: reusing cached result');

    return memoState.prevResult;
  }
}

// 浅比较详细实现
function shallowEqual(objA: any, objB: any): boolean {
  // 1. 引用检查
  if (Object.is(objA, objB)) {
    return true;
  }

  // 2. null/undefined 检查
  if (objA == null || objB == null) {
    return false;
  }

  // 3. 类型检查
  const typeA = typeof objA;
  const typeB = typeof objB;
  if (typeA !== typeB || typeA !== 'object') {
    return false;
  }

  // 4. 数组特殊处理
  if (Array.isArray(objA) !== Array.isArray(objB)) {
    return false;
  }

  // 5. 比较 keys
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // 6. 逐个比较
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];

    // 检查 key 是否存在
    if (!Object.prototype.hasOwnProperty.call(objB, key)) {
      return false;
    }

    // 比较值（浅比较，不递归）
    const valueA = objA[key];
    const valueB = objB[key];

    if (!Object.is(valueA, valueB)) {
      return false;
    }
  }

  return true;
}
```

---

## 常见陷阱和最佳实践

### 1. ❌ 过度使用 React.memo

```tsx
// ❌ 错误：对所有组件都使用 React.memo

// 问题 1：增加复杂度
// 问题 2：浅比较本身有开销
// 问题 3：大多数情况下 React 已经够快

// ✅ 正确：只在真正需要时使用

// 适合使用 React.memo 的场景：
// 1. 组件渲染成本高（复杂计算、大量 DOM）
// 2. 父组件频繁更新，但子组件 props 不常变
// 3. 组件被多个父组件使用，某些父组件更新频繁

// 不适合使用 React.memo 的场景：
// 1. 组件本身渲染很快
// 2. props 经常变化
// 3. 只有一个父组件
```

### 2. ❌ 对象和函数 props 导致失效

```tsx
// ❌ 问题：对象 props

function Parent() {
  const [count, setCount] = useState(0);

  return (
    <Child
      data={{ id: 1, name: 'Alice' }}  // 每次渲染都创建新对象
    />
  );
}

// ✅ 解决方案 1：提取到组件外
const DEFAULT_DATA = { id: 1, name: 'Alice' };
function Parent() {
  const [count, setCount] = useState(0);
  return <Child data={DEFAULT_DATA} />;
}

// ✅ 解决方案 2：使用 useMemo
function Parent() {
  const [count, setCount] = useState(0);

  const data = useMemo(() => ({
    id: 1,
    name: 'Alice'
  }), []);  // 空依赖数组

  return <Child data={data} />;
}

// ❌ 问题：函数 props

function Parent() {
  const [count, setCount] = useState(0);

  return (
    <Child
      onClick={() => console.log('clicked')}  // 每次渲染都创建新函数
    />
  );
}

// ✅ 解决方案：使用 useCallback
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);  // 空依赖数组

  return <Child onClick={handleClick} />;
}
```

### 3. ❌ 忘记处理 children

```tsx
// ❌ 问题：children 也会影响重新渲染

function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <MemoizedChild>
        {/* children 每次渲染都是新的 React 元素 */}
        <span>Some content</span>
      </MemoizedChild>
    </div>
  );
}

const MemoizedChild = React.memo(function Child({ children }: { children: React.ReactNode }) {
  console.log('Child render');
  return <div>{children}</div>;
});

// 每次点击按钮：
// - Parent 重新渲染
// - children props 变了（新的 React 元素）
// - MemoizedChild 重新渲染

// ✅ 解决方案：明确知道 children 会变化，不使用 React.memo
// 或者使用自定义比较忽略 children
```

### 4. ❌ 自定义比较函数过于复杂

```tsx
// ❌ 问题：自定义比较函数过于复杂

const ComplexComponent = React.memo(
  function ComplexComponent({ user, settings, data }: ComplexProps) {
    // ...
  },
  (prevProps, nextProps) => {
    // 比较逻辑太复杂
    if (prevProps.user.id !== nextProps.user.id) return false;
    if (prevProps.user.name !== nextProps.user.name) return false;
    if (prevProps.settings.theme !== nextProps.settings.theme) return false;
    if (prevProps.settings.lang !== nextProps.settings.lang) return false;
    if (JSON.stringify(prevProps.data) !== JSON.stringify(nextProps.data)) return false;
    return true;
    // 问题：JSON.stringify 性能差，比较逻辑容易出错
  }
);

// ✅ 解决方案：简化比较，或接受默认行为

// 方案 1：只比较关键 props
const OptimizedComponent = React.memo(
  function OptimizedComponent({ user, settings, data }: ComplexProps) {
    // ...
  },
  (prevProps, nextProps) => {
    // 只比较最关键的 props
    return prevProps.user.id === nextProps.user.id;
  }
);

// 方案 2：拆分组件，分别优化
const UserHeader = React.memo(function UserHeader({ user }: { user: User }) {
  return <h2>{user.name}</h2>;
});

const SettingsPanel = React.memo(function SettingsPanel({ settings }: { settings: Settings }) {
  return <div>{settings.theme}</div>;
});

function ComplexComponent({ user, settings, data }: ComplexProps) {
  return (
    <div>
      <UserHeader user={user} />
      <SettingsPanel settings={settings} />
      <DataList data={data} />
    </div>
  );
}
```

---

## 性能测试

### 测试场景

```tsx
// 性能测试：计算斐波那契数列

function Fibonacci({ n }: { n: number }) {
  const result = useMemo(() => {
    console.log('Calculating Fibonacci...');
    const fib = (num: number): number => {
      if (num <= 1) return num;
      return fib(num - 1) + fib(num - 2);
    };
    return fib(n);
  }, [n]);

  return <div>Fib({n}): {result}</div>;
}

// ❌ 未优化：每次父组件渲染都计算
const UnoptimizedFibonacci = Fibonacci;

// ✅ 优化：只在 n 变化时计算
const OptimizedFibonacci = React.memo(Fibonacci);

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
      <UnoptimizedFibonacci n={fibN} />
      <OptimizedFibonacci n={fibN} />
    </div>
  );
}

// 测试结果：
// 点击 Count 按钮：
// - UnoptimizedFibonacci: 重新计算（即使 n 没变）
// - OptimizedFibonacci: 不计算（n 没变，复用结果）
```

---

## 核心要点总结

### React.memo 的作用

1. **记忆化渲染结果**：缓存上次的 VDOM，避免不必要的重新渲染
2. **浅比较 props**：默认使用浅比较判断 props 是否变化
3. **提升性能**：在特定场景下显著减少渲染次数

### 工作原理

```tsx
// 核心逻辑
function React.memo(Component) {
  let prevProps = null;
  let prevResult = null;

  return function MemoizedComponent(props) {
    if (prevProps !== null && shallowEqual(prevProps, props)) {
      // props 相等，复用结果
      return prevResult;
    }

    // props 不相等，重新渲染
    const result = Component(props);
    prevProps = props;
    prevResult = result;
    return result;
  };
}
```

### 浅比较规则

```tsx
// 比较规则
shallowEqual({ a: 1 }, { a: 1 })           // true - 值相等
shallowEqual({ a: 1 }, { a: 2 })           // false - 值不等
shallowEqual({ a: 1 }, { a: 1, b: 2 })     // false - keys 不等
shallowEqual({}, {})                       // true
shallowEqual([], [])                       // true
shallowEqual([1, 2], [1, 2])               // true
shallowEqual([1, 2], [1, 2, 3])           // false - 长度不等

// 对象引用
const obj = { a: 1 };
shallowEqual(obj, obj)                     // true - 同一引用
shallowEqual({ a: 1 }, { a: 1 })           // true - 不同引用但值相等
shallowEqual({ a: {} }, { a: {} })         // true - 浅比较，不看内部对象
```

### 最佳实践

1. ✅ **只在需要时使用**：组件渲染成本高或父组件频繁更新
2. ✅ **配合 useMemo 和 useCallback**：避免对象和函数 props 失效
3. ✅ **谨慎使用自定义比较**：避免复杂逻辑和性能问题
4. ❌ **不要过度使用**：大多数情况下 React 已经够快
5. ❌ **不要忘记 children**：children props 也会影响重新渲染

记住这些原则，你就能正确使用 React.memo 优化组件性能！
