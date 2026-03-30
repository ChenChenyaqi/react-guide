# useContext 用法与原理详解

## useContext 是什么？

useContext 是一个 React Hook，用于**订阅 Context 的变化**。它允许组件读取最近的 Context Provider 提供的值，无需通过 props 层层传递。

**核心作用**：
- **跨组件共享状态**：避免 props drilling（props 层层传递）
- **订阅 Context 变化**：Context 值变化时，组件自动重新渲染
- **全局状态管理**：适合主题、用户信息、语言设置等全局状态

---

## 基本用法

### 1. 创建 Context

```tsx
import { createContext, useContext } from 'react';

// 1. 创建 Context
const ThemeContext = createContext('light');

// 2. 定义 Provider
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 3. 使用 Context
function ThemeButton() {
  const { theme, setTheme } = useContext(ThemeContext);

  return (
    <button
      style={{
        backgroundColor: theme === 'dark' ? '#333' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000'
      }}
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      Current theme: {theme}
    </button>
  );
}

// 4. 在应用中使用
function App() {
  return (
    <ThemeProvider>
      <ThemeButton />
    </ThemeProvider>
  );
}
```

### 2. 默认值

```tsx
// 创建 Context 时提供默认值
const UserContext = createContext({
  name: 'Guest',
  role: 'visitor'
});

function Component() {
  // 如果没有 Provider，使用默认值
  const user = useContext(UserContext);
  return <div>Welcome, {user.name}</div>;
}

// 使用 Provider 覆盖默认值
function App() {
  const user = {
    name: 'Alice',
    role: 'admin'
  };

  return (
    <UserContext.Provider value={user}>
      <Component />
    </UserContext.Provider>
  );
}
```

---

## 为什么需要 useContext？

### 问题：Props Drilling

```tsx
// ❌ 问题：props 层层传递（props drilling）

function App() {
  const [user, setUser] = useState({ name: 'Alice', role: 'admin' });

  return <Header user={user} setUser={setUser} />;
}

function Header({ user, setUser }: { user: User; setUser: React.Dispatch<User> }) {
  return (
    <div>
      <Navbar user={user} setUser={setUser} />
      <Content />
    </div>
  );
}

function Navbar({ user, setUser }: { user: User; setUser: React.Dispatch<User> }) {
  return (
    <div>
      <Logo />
      <UserMenu user={user} setUser={setUser} />
    </div>
  );
}

function UserMenu({ user, setUser }: { user: User; setUser: React.Dispatch<User> }) {
  return (
    <div>
      <span>{user.name}</span>
      <button onClick={() => setUser({ ...user, role: 'user' })}>
        Change Role
      </button>
    </div>
  );
}

// 问题：
// 1. user 和 setUser 需要在每层组件中传递
// 2. 中间组件（Header、Navbar）不需要这些 props
// 3. 组件耦合度高，难以重构
```

### 解决方案：useContext

```tsx
// ✅ 解决：使用 useContext 避免层层传递

// 1. 创建 Context
const UserContext = createContext<{
  user: User;
  setUser: React.Dispatch<User>;
} | null>(null);

// 2. 创建 Provider
function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState({ name: 'Alice', role: 'admin' });

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

// 3. 自定义 Hook
function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}

// 4. 在需要的地方使用
function UserMenu() {
  const { user, setUser } = useUser();

  return (
    <div>
      <span>{user.name}</span>
      <button onClick={() => setUser({ ...user, role: 'user' })}>
        Change Role
      </button>
    </div>
  );
}

function Navbar() {
  return (
    <div>
      <Logo />
      <UserMenu />
    </div>
  );
}

function Header() {
  return (
    <div>
      <Navbar />
      <Content />
    </div>
  );
}

function App() {
  return (
    <UserProvider>
      <Header />
    </UserProvider>
  );
}

// 优点：
// 1. 只在顶层创建 Provider
// 2. 组件直接使用 useContext 获取数据
// 3. 中间组件不需要传递 props
// 4. 组件解耦，易于重构
```

---

## 实现原理

### Context 的工作机制

```tsx
// Context 内部结构（简化版）

// Context 对象
interface Context<T> {
  _currentValue: T;           // 当前值
  _currentValue2: T | null;   // 备用值
  Provider: React.ProviderExoticComponent<T>;
  Consumer: React.ConsumerExoticComponent<T>;
  displayName?: string;
}

// Provider 组件
function Provider({ value, children }: { value: T; children: React.ReactNode }) {
  // 1. 获取当前 Fiber
  const fiber = getFiber();

  // 2. 保存 Context 值到 Fiber
  fiber.contextDependencies = fiber.contextDependencies || [];
  fiber.contextDependencies.push({
    context: this,
    value
  });

  // 3. 渲染子组件
  return children;
}

// useContext Hook
function useContext<T>(context: Context<T>): T {
  // 1. 获取当前 Fiber
  const fiber = getFiber();

  // 2. 向上查找最近的 Provider
  let currentFiber = fiber;
  while (currentFiber) {
    if (currentFiber.contextDependencies) {
      const contextDependency = currentFiber.contextDependencies.find(
        dep => dep.context === context
      );
      if (contextDependency) {
        // 找到 Provider，返回值
        return contextDependency.value;
      }
    }
    currentFiber = currentFiber.return;
  }

  // 没有找到 Provider，返回默认值
  return context._currentValue;
}
```

### 完整伪源码

```tsx
// ========== 1. Context 创建 ==========

interface ReactContext<T> {
  _currentValue: T;
  _currentValue2: T | null;
  _threadCount: number;
  Provider: React.ProviderExoticComponent<T>;
  Consumer: React.ConsumerExoticComponent<T>;
  displayName?: string;
}

function createContext<T>(defaultValue: T): ReactContext<T> {
  // 创建 Context 对象
  const context: ReactContext<T> = {
    _currentValue: defaultValue,
    _currentValue2: null,
    _threadCount: 0,
    Provider: null as any,
    Consumer: null as any,
    displayName: undefined
  };

  // 创建 Provider 组件
  context.Provider = {
    _context: context,
    $$typeof: Symbol.for('react.provider'),
    _type: 'Provider'
  };

  // 创建 Consumer 组件
  context.Consumer = {
    _context: context,
    $$typeof: Symbol.for('react.context'),
    _type: 'Consumer'
  };

  return context;
}

// ========== 2. useContext 实现 ==========

function useContext<T>(context: ReactContext<T>): T {
  // ========== 步骤 1：获取当前渲染的 Fiber ==========
  const dispatcher = ReactCurrentDispatcher.current;
  if (dispatcher === null) {
    throw new Error('Invalid hook call');
  }

  // ========== 步骤 2：调用内部的 readContext ==========
  return dispatcher.readContext(context);
}

// ========== 3. readContext 实现（内部） ==========

function readContext<T>(context: ReactContext<T>): T {
  const fiber = currentlyRenderingFiber!;

  // ========== 步骤 1：查找最近的 Provider ==========
  let currentFiber = fiber.return;
  let providerFiber: Fiber | null = null;
  let value: T | null = null;

  while (currentFiber !== null) {
    // 检查是否是 Provider
    if (currentFiber.tag === ContextProvider) {
      const providerContext = currentFiber.type._context;

      // 找到匹配的 Context
      if (providerContext === context) {
        providerFiber = currentFiber;
        value = currentFiber.memoizedProps.value;
        break;
      }
    }

    currentFiber = currentFiber.return;
  }

  // ========== 步骤 2：如果没有找到 Provider，使用默认值 ==========
  if (providerFiber === null) {
    return context._currentValue;  // 返回默认值
  }

  // ========== 步骤 3：建立依赖关系 ==========
  // 记录组件订阅了这个 Context
  fiber.dependencies = fiber.dependencies || [];
  fiber.dependencies.push({
    context,
    fiber: providerFiber
  });

  // ========== 步骤 4：返回值 ==========
  return value;
}

// ========== 4. Provider 渲染流程 ==========

function renderContextProvider<T>(
  fiber: Fiber,
  context: ReactContext<T>,
  value: T,
  children: React.ReactNode
) {
  // ========== 步骤 1：比较新旧值 ==========
  const oldValue = fiber.memoizedProps?.value;
  const valueChanged = !Object.is(oldValue, value);

  // ========== 步骤 2：更新 Context 值 ==========
  context._currentValue = value;

  // ========== 步骤 3：如果值变化了，标记订阅者需要重新渲染 ==========
  if (valueChanged) {
    // 找到所有订阅这个 Context 的组件
    const dependents = findContextDependents(fiber, context);

    dependents.forEach(dependentFiber => {
      // 标记组件需要重新渲染
      markComponentNeedsUpdate(dependentFiber);
    });
  }

  // ========== 步骤 4：渲染子组件 ==========
  return children;
}

// ========== 5. 查找 Context 订阅者 ==========

function findContextDependents(
  providerFiber: Fiber,
  context: ReactContext<T>
): Fiber[] {
  const dependents: Fiber[] = [];

  // 遍历 Fiber 树
  const traverse = (fiber: Fiber) => {
    if (fiber.dependencies) {
      // 检查这个组件是否订阅了这个 Context
      const dependency = fiber.dependencies.find(
        dep => dep.context === context
      );

      if (dependency) {
        dependents.push(fiber);
      }
    }

    // 递归遍历子节点
    if (fiber.child) {
      traverse(fiber.child);
    }
    if (fiber.sibling) {
      traverse(fiber.sibling);
    }
  };

  // 从 Provider 的子节点开始遍历
  if (providerFiber.child) {
    traverse(providerFiber.child);
  }

  return dependents;
}

// ========== 6. Context 依赖追踪 ==========

// Fiber 节点结构（添加 context 相关字段）
interface Fiber {
  // ... 其他字段

  // Context 依赖列表
  dependencies: Array<{
    context: ReactContext<any>;
    fiber: Fiber;
  }> | null;
}

// Provider Fiber 类型
const ContextProvider = 12;  // Provider 的 tag
```

---

## Context 更新流程

### 完整流程图

```
Provider 的 value 变化
       │
       ▼
┌─────────────────┐
│  Provider 重新渲染 │
│  比较 newValue   │
│  vs oldValue    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
  相等      不相等
    │         │
    ▼         ▼
┌────────┐ ┌─────────────────┐
│ 子组件  ││ 遍历 Fiber 树   │
│ 不重新   ││ 查找订阅者       │
│ 渲染    │└────────┬────────┘
└────────┘          │
                    ▼
              ┌─────────────────┐
              │ 标记订阅者需要   │
              │ 重新渲染        │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ 重新渲染订阅者   │
              │ 调用 useContext │
              │ 获取新值        │
              └─────────────────┘
```

### 示例：Context 更新

```tsx
const ThemeContext = createContext('light');

function ThemeButton() {
  const theme = useContext(ThemeContext);
  console.log('ThemeButton render:', theme);
  return <div>Theme: {theme}</div>;
}

function OtherComponent() {
  console.log('OtherComponent render');
  return <div>Other</div>;
}

function App() {
  const [theme, setTheme] = useState('light');

  console.log('App render, theme:', theme);

  return (
    <ThemeContext.Provider value={theme}>
      <ThemeButton />
      <OtherComponent />
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
    </ThemeContext.Provider>
  );
}

// 执行流程：

// 初始渲染：
// App render, theme: light
// ThemeButton render: light
// OtherComponent render

// 点击 Toggle Theme（light → dark）：

// 1. setState('dark') 触发 App 重新渲染
// App render, theme: dark

// 2. Provider 检测到 value 变化
//    oldValue = 'light'
//    newValue = 'dark'
//    valueChanged = true

// 3. 遍历 Fiber 树，查找订阅者
//    - ThemeButton 订阅了 ThemeContext ✅
//    - OtherComponent 没有订阅 ❌

// 4. 标记订阅者需要重新渲染
//    ThemeButton 标记为 needsUpdate

// 5. 重新渲染订阅者
// ThemeButton render: dark

// 6. OtherComponent 不重新渲染（没有订阅）

// 最终结果：
// ✅ ThemeButton 重新渲染（使用了 Context）
// ❌ OtherComponent 不重新渲染（没有使用 Context）
```

---

## 实际应用示例

### 1. 主题切换

```tsx
// 1. 创建 Context
type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

// 2. Provider
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 3. 自定义 Hook
function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// 4. 使用
function ThemeButton() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        backgroundColor: theme === 'dark' ? '#333' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000'
      }}
    >
      Current theme: {theme}
    </button>
  );
}

// 5. 应用
function App() {
  return (
    <ThemeProvider>
      <Header />
      <Content />
      <ThemeButton />
    </ThemeProvider>
  );
}

function Header() {
  const { theme } = useTheme();
  return <h1 style={{ color: theme === 'dark' ? '#fff' : '#000' }}>
    My App
  </h1>;
}

function Content() {
  const { theme } = useTheme();
  return <p style={{ color: theme === 'dark' ? '#fff' : '#000' }}>
    Content goes here
  </p>;
}
```

### 2. 用户认证

```tsx
// 1. 创建 Context
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// 2. Provider
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // 模拟 API 调用
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const userData = await response.json();
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. 自定义 Hook
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// 4. 受保护的路由
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

// 5. 使用
function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
```

### 3. 多个 Context

```tsx
// 1. 创建多个 Context
const ThemeContext = createContext<Theme>('light');
const UserContext = createContext<User | null>(null);
const LanguageContext = createContext('en');

// 2. 嵌套 Provider
function AppProviders({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState('en');

  return (
    <LanguageContext.Provider value={language}>
      <ThemeContext.Provider value={theme}>
        <UserContext.Provider value={user}>
          {children}
        </UserContext.Provider>
      </ThemeContext.Provider>
    </LanguageContext.Provider>
  );
}

// 3. 使用多个 Context
function Component() {
  const theme = useContext(ThemeContext);
  const user = useContext(UserContext);
  const language = useContext(LanguageContext);

  return (
    <div style={{ color: theme === 'dark' ? '#fff' : '#000' }}>
      <p>User: {user?.name}</p>
      <p>Language: {language}</p>
    </div>
  );
}
```

---

## 常见陷阱和最佳实践

### 1. ❌ Context 值频繁变化导致不必要的重新渲染

```tsx
// ❌ 问题：每次渲染都创建新对象

function App() {
  const [count, setCount] = useState(0);

  // 每次渲染都创建新对象
  const value = {
    count,
    setCount
  };

  return (
    <CountContext.Provider value={value}>
      <Child />
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </CountContext.Provider>
  );

  // 问题：
  // 每次渲染都创建新对象，导致所有订阅者重新渲染
}

// ✅ 解决方案 1：使用 useMemo

function App() {
  const [count, setCount] = useState(0);

  // 只在 count 变化时创建新对象
  const value = useMemo(() => ({
    count,
    setCount
  }), [count]);

  return (
    <CountContext.Provider value={value}>
      <Child />
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </CountContext.Provider>
  );
}

// ✅ 解决方案 2：拆分 Context

// CountContext
const CountContext = createContext<number>(0);
const SetCountContext = createContext<(c: number) => void>(() => {});

function App() {
  const [count, setCount] = useState(0);

  return (
    <CountContext.Provider value={count}>
      <SetCountContext.Provider value={setCount}>
        <Child />
        <button onClick={() => setCount(c => c + 1)}>
          Increment
        </button>
      </SetCountContext.Provider>
    </CountContext.Provider>
  );
}

function CountDisplay() {
  const count = useContext(CountContext);
  console.log('CountDisplay render');
  return <div>Count: {count}</div>;
}

function IncrementButton() {
  const setCount = useContext(SetCountContext);
  console.log('IncrementButton render');
  return <button onClick={() => setCount(c => c + 1)}>
    Increment
  </button>;
}

// 优点：
// 1. CountDisplay 只在 count 变化时重新渲染
// 2. IncrementButton 永远不会重新渲染（setCount 是稳定的）
```

### 2. ❌ 在嵌套组件中使用多个 useContext

```tsx
// ❌ 问题：多次调用 useContext

function NestedComponent() {
  const theme = useContext(ThemeContext);
  const user = useContext(UserContext);
  const language = useContext(LanguageContext);
  const settings = useContext(SettingsContext);

  // 问题：
  // 1. 多次调用 useContext
  // 2. 组件订阅了多个 Context，任何一个变化都会重新渲染
  // 3. 代码可读性差

  return <div>...</div>;
}

// ✅ 解决方案：组合 Context

function App() {
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('en');
  const [settings, setSettings] = useState({});

  // 组合成单个 Context
  const value = useMemo(() => ({
    theme,
    setTheme,
    user,
    setUser,
    language,
    setLanguage,
    settings,
    setSettings
  }), [theme, user, language, settings]);

  return (
    <AppContext.Provider value={value}>
      <NestedComponent />
    </AppContext.Provider>
  );
}

function NestedComponent() {
  const appContext = useContext(AppContext);

  // 优点：
  // 1. 只调用一次 useContext
  // 2. 更清晰的 API

  return <div>...</div>;
}
```

### 3. ❌ 忘记检查 Context 是否为 null

```tsx
// ❌ 问题：未检查 Context 是否为 null

const UserContext = createContext<User | null>(null);

function Component() {
  const user = useContext(UserContext);

  // 直接使用，可能报错
  return <div>Welcome, {user.name}</div>;

  // 如果没有 Provider，user 为 null，会报错
}

// ✅ 解决方案 1：检查 null

function Component() {
  const user = useContext(UserContext);

  if (!user) {
    return <div>Loading...</div>;
  }

  return <div>Welcome, {user.name}</div>;
}

// ✅ 解决方案 2：自定义 Hook

function useUser() {
  const user = useContext(UserContext);

  if (!user) {
    throw new Error('useUser must be used within UserProvider');
  }

  return user;
}

function Component() {
  const user = useUser();  // 确保 user 不为 null

  return <div>Welcome, {user.name}</div>;
}
```

### 4. ❌ 在循环中使用 useContext

```tsx
// ❌ 错误：在循环中使用 useContext

function Component() {
  const items = [1, 2, 3];

  return (
    <div>
      {items.map(item => (
        // ❌ 错误：在循环中使用 useContext
        <Item key={item} value={useContext(ValueContext)} />
      ))}
    </div>
  );
}

// ✅ 解决方案：在组件顶层使用 useContext

function Component() {
  const value = useContext(ValueContext);

  return (
    <div>
      {items.map(item => (
        <Item key={item} value={value} />
      ))}
    </div>
  );
}
```

### 5. ❌ 使用 Context 存储频繁变化的状态

```tsx
// ❌ 问题：存储频繁变化的状态

const MousePositionContext = createContext({ x: 0, y: 0 });

function App() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <MousePositionContext.Provider value={position}>
      <Child />
    </MousePositionContext.Provider>
  );

  // 问题：
  // 1. 鼠标移动时，position 频繁变化
  // 2. 所有订阅者都会重新渲染
  // 3. 性能问题
}

// ✅ 解决方案 1：使用 ref

function App() {
  const positionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      positionRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return <Child positionRef={positionRef} />;
}

// ✅ 解决方案 2：节流

function App() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition(prev => {
        // 只在一定距离后才更新
        const distance = Math.sqrt(
          Math.pow(e.clientX - prev.x, 2) +
          Math.pow(e.clientY - prev.y, 2)
        );

        if (distance > 50) {
          return { x: e.clientX, y: e.clientY };
        }

        return prev;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <MousePositionContext.Provider value={position}>
      <Child />
    </MousePositionContext.Provider>
  );
}
```

---

## 核心要点总结

### useContext 的作用

1. **跨组件共享状态**：避免 props drilling
2. **订阅 Context 变化**：Context 值变化时自动重新渲染
3. **全局状态管理**：适合主题、用户信息、语言设置等

### 工作原理

```tsx
// 核心：Provider 和 useContext 的协作

// 1. 创建 Context
const Context = createContext(defaultValue);

// 2. Provider 提供值
<Context.Provider value={value}>
  {children}
</Context.Provider>

// 3. 组件订阅 Context
const value = useContext(Context);

// 4. Context 变化时：
// - Provider 检测到 value 变化
// - 遍历 Fiber 树，查找订阅者
// - 标记订阅者需要重新渲染
// - 订阅者重新渲染，获取新值
```

### Context 更新流程

```
Provider value 变化
    ↓
比较 newValue vs oldValue
    ↓
如果值变化
    ↓
遍历 Fiber 树，查找订阅者
    ↓
标记订阅者 needsUpdate
    ↓
重新渲染订阅者
    ↓
调用 useContext 获取新值
```

### 何时使用 Context

**适合使用**：
- ✅ 全局状态（主题、用户信息、语言）
- ✅ 避免多层 props 传递
- ✅ 应用级配置（路由、API 配置）

**不适合使用**：
- ❌ 频繁变化的状态（鼠标位置、输入框值）
- ❌ 复杂的状态管理（使用 Redux、Zustand）
- ❌ 组件树层级较浅（使用 props）

### 最佳实践

1. ✅ **使用自定义 Hook 封装 useContext**
2. ✅ **拆分 Context，避免不必要的重新渲染**
3. ✅ **使用 useMemo 缓存 Context value**
4. ✅ **检查 Context 是否为 null**
5. ✅ **在组件顶层使用 useContext**
6. ❌ **不要在循环中使用 useContext**
7. ❌ **不要存储频繁变化的状态**
8. ❌ **不要忘记处理 Context 为 null 的情况**

### Context vs Props

| 特性 | Props | Context |
|-----|-------|---------|
| 数据流向 | 单向，父子组件 | 跨组件共享 |
| 传递方式 | 显式传递 | 隐式访问 |
| 层级限制 | 需要层层传递 | 跨任意层级 |
| 类型安全 | ✅ TypeScript 支持 | ✅ TypeScript 支持 |
| 性能 | 好 | 可能性能问题（订阅者多） |
| 适用场景 | 简单父子通信 | 全局状态、避免 drilling |

记住这些原则，你就能正确使用 Context 实现跨组件状态共享！
