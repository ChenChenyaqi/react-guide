# React 基础

本文档介绍 React 的核心概念，帮助 Vue 开发者快速理解 React 的基础语法。

## 目录

- [JSX 语法](#jsx-语法)
- [函数式组件](#函数式组件)
- [Props](#props)
- [State（状态管理）](#state状态管理)
- [Effects（副作用）](#effects副作用)

## JSX 语法

JSX 是 JavaScript 的语法扩展，允许在 JS 中编写类似 HTML 的代码。React 使用 JSX 来描述 UI 结构。

### 基本语法

```tsx
// 在 JS 中返回 HTML
const element = <h1>Hello, world!</h1>;
```

### 关键差异（Vue 对比）

| Vue 模板      | React JSX                                     | 说明                                       |
| ------------- | --------------------------------------------- | ------------------------------------------ |
| `class`       | `className`                                   | React 使用 className（避免 JS 关键字冲突） |
| `@click`      | `onClick`                                     | 事件绑定使用驼峰命名                       |
| `{{ value }}` | `{value}`                                     | 变量插值使用单花括号                       |
| `v-if`        | `{condition && <Component />}`                | 条件渲染是 JS 表达式                       |
| `v-for`       | `{items.map(item => <Item key={item.id} />)}` | 数组方法渲染列表                           |

### 样式

```tsx
// 内联样式（对象形式）
const style = {
  fontSize: '16px',    // 驼峰命名
  color: '#333',
  backgroundColor: '#fff'
}

<div style={style}>内容</div>

// className（推荐）
<div className="container text-center">内容</div>
```

### 注意事项

- JSX 中 HTML 标签必须闭合（`<div></div>` 或 `<div />`）
- 表达式用 `{}` 包裹
- 属性名使用驼峰命名（`fontSize` 而非 `font-size`）

## 函数式组件

React 组件就是一个返回 JSX 的函数。React 19 只使用函数式组件，不使用类组件。

### 基本定义

```tsx
// 简单组件
function Welcome() {
  return <h1>Hello!</h1>;
}

// 箭头函数写法
const Welcome = () => {
  return <h1>Hello!</h1>;
};

// 隐式返回（单表达式）
const Welcome = () => <h1>Hello!</h1>;
```

### 组件使用

```tsx
// 在其他组件中使用
function App() {
  return (
    <div>
      <Welcome />
      <Welcome />
    </div>
  );
}
```

### 与 Vue 的对比

| Vue 组件                  | React 函数式组件           |
| ------------------------- | -------------------------- |
| `<template>` + `<script>` | 单一函数返回 JSX           |
| `defineComponent()`       | `function ComponentName()` |
| 自动响应式                | 手动管理状态               |

## Props

Props 是组件的输入数据，父组件通过 props 向子组件传递数据。

### 基本用法

```tsx
// 定义 props 接口
interface ButtonProps {
  title: string; // 必填
  count?: number; // 可选（使用 ?）
  onPress?: () => void;
}

// 子组件接收 props
function Button({ title, count = 0, onPress }: ButtonProps) {
  return (
    <button onClick={onPress}>
      {title}: {count}
    </button>
  );
}

// 父组件传递 props
function App() {
  const handleClick = () => {
    console.log("Clicked!");
  };

  return (
    <div>
      <Button title="提交" count={5} onPress={handleClick} />
      <Button title="取消" />
    </div>
  );
}
```

### Props 特点

- **单向数据流**：数据从父组件流向子组件
- **只读**：子组件不能修改 props
- **默认值**：使用 ES6 默认参数 `count = 0`
- **类型安全**：TypeScript 接口确保 props 类型正确

### 与 Vue 对比

| Vue                                | React                                     |
| ---------------------------------- | ----------------------------------------- |
| `props: ['title']`                 | `interface ButtonProps { title: string }` |
| `defineProps<{ title: string }>()` | `function Button({ title }: ButtonProps)` |
| `$emit`                            | 回调函数 props                            |

## State（状态管理）

State 是组件内部的可变数据，当 state 改变时会触发组件重新渲染。

### useState Hook

```tsx
import { useState } from "react";

function Counter() {
  // 语法：const [state, setState] = useState(initialValue)
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(count + 1); // 使用当前值
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+1</button>
    </div>
  );
}
```

### State 更新规则

**重要**：State 更新是**不可变**的，必须创建新值而非修改原值。

```tsx
// ✅ 正确：创建新对象/数组
const [user, setUser] = useState({ name: "Alice", age: 25 });

const updateAge = () => {
  setUser({ ...user, age: 26 }); // 展开运算符复制旧对象
};

const [items, setItems] = useState([1, 2, 3]);

const addItem = () => {
  setItems([...items, 4]); // 创建新数组
};

// ❌ 错误：直接修改（不会触发重新渲染）
user.age = 26; // 不会重新渲染！
```

### 函数式更新

当新状态依赖于旧状态时，使用函数式更新避免闭包陷阱：

```tsx
const [count, setCount] = useState(0);

// ✅ 正确：使用函数式更新
const increment = () => {
  setCount((prev) => prev + 1);
};

// ❌ 可能有问题：依赖当前值
const increment = () => {
  setCount(count + 1); // 如果多次快速调用，可能基于旧值
};
```

### 多个 State

```tsx
function Form() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // 提交逻辑
      await submitForm({ name, email });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="姓名"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="邮箱"
      />
      <button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? "提交中..." : "提交"}
      </button>
    </form>
  );
}
```

### State 类型

```tsx
// 基础类型
const [count, setCount] = useState<number>(0);
const [name, setName] = useState<string>("");
const [isActive, setIsActive] = useState<boolean>(true);

// 联合类型
const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

// 对象类型
interface User {
  id: number;
  name: string;
}
const [user, setUser] = useState<User | null>(null);

// 数组类型
const [items, setItems] = useState<number[]>([]);
```

### 与 Vue 响应式对比

| Vue            | React                  | 关键差异                                |
| -------------- | ---------------------- | --------------------------------------- |
| `ref/reactive` | `useState`             | Vue 自动追踪依赖，React 手动管理        |
| `ref.value++`  | `setCount(c => c + 1)` | Vue 直接修改，React 创建新值            |
| `computed`     | `useMemo`              | Vue 自动缓存，React 手动声明依赖        |
| 自动响应式     | 手动触发渲染           | Vue 拦截属性访问，React 需要调用 setter |

## Effects（副作用）

useEffect Hook 用于处理副作用，比如数据获取、订阅、定时器等操作。

### 基本用法

```tsx
import { useState, useEffect } from "react";

function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 副作用：获取数据
    setIsLoading(true);
    fetchUser(userId)
      .then((data) => {
        setUser(data);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userId]); // 依赖数组：只在 userId 变化时执行

  if (isLoading) return <div>加载中...</div>;
  if (!user) return <div>未找到用户</div>;

  return <div>{user.name}</div>;
}
```

### 依赖数组

依赖数组决定了 effect 何时执行：

```tsx
// 1. 空数组：只在挂载时执行一次
useEffect(() => {
  console.log("组件挂载");
  return () => {
    console.log("组件卸载");
  };
}, []); // 无依赖，类似 Vue 的 onMounted + onUnmounted

// 2. 有依赖：依赖变化时执行
useEffect(() => {
  console.log("userId 变化:", userId);
  fetchUser(userId);
}, [userId]); // 类似 Vue 的 watch(() => userId, handler)

// 3. 无依赖数组：每次渲染都执行
useEffect(() => {
  console.log("每次渲染都执行"); // 类似 Vue 的 watchEffect
}); // ⚠️ 谨慎使用，容易导致无限循环
```

### 清理函数

Effect 可以返回清理函数，在组件卸载或下次 effect 执行前调用：

```tsx
// 定时器示例
function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    // 副作用：创建定时器
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    // 清理：清除定时器
    return () => {
      clearInterval(interval);
    };
  }, []); // 只在挂载时创建，卸载时清理

  return <div>已运行: {seconds} 秒</div>;
}

// 事件监听示例
function WindowSize() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);

    // 清理：移除监听器
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <div>窗口宽度: {width}px</div>;
}
```

### 常见模式

#### 数据获取

```tsx
function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPosts = async () => {
      try {
        const response = await fetch("/api/posts");
        const data = await response.json();

        if (isMounted) {
          // 避免组件卸载后更新状态
          setPosts(data);
        }
      } catch (err) {
        if (isMounted) {
          setError("获取数据失败");
        }
      }
    };

    fetchPosts();

    return () => {
      isMounted = false; // 清理标记
    };
  }, []);

  if (error) return <div>{error}</div>;
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

#### 组合多个 effects

```tsx
function App() {
  const [userId, setUserId] = useState(1);
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState({ theme: "light" });

  // Effect 1: 获取用户数据
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  // Effect 2: 保存设置到 localStorage
  useEffect(() => {
    localStorage.setItem("settings", JSON.stringify(settings));
  }, [settings]);

  // Effect 3: 根据主题更新 document title
  useEffect(() => {
    document.title = `${user?.name || "User"} - ${settings.theme} Mode`;
  }, [user, settings.theme]);

  return <div>...</div>;
}
```

### 常见错误

#### 1. 缺少依赖

```tsx
// ❌ 错误：userId 在 effect 中使用但未在依赖数组中
useEffect(() => {
  fetchUser(userId).then(setUser);
}, []); // 应该是 [userId]

// ✅ 正确：包含所有使用的变量
useEffect(() => {
  fetchUser(userId).then(setUser);
}, [userId]);
```

#### 2. 闭包陷阱

```tsx
// ❌ 错误：effect 捕获了初始的 count 值
useEffect(() => {
  const interval = setInterval(() => {
    console.log(count); // 永远输出 0
  }, 1000);
  return () => clearInterval(interval);
}, []); // 空依赖数组

// ✅ 正确：使用函数式更新
useEffect(() => {
  const interval = setInterval(() => {
    setCount((c) => c + 1); // 总是使用最新值
  }, 1000);
  return () => clearInterval(interval);
}, []);
```

#### 3. 在 effect 中调用 setState 导致无限循环

```tsx
// ❌ 错误：无依赖数组 + setState 导致无限循环
useEffect(() => {
  setCount(count + 1); // 每次渲染都执行
}); // 导致无限重新渲染

// ✅ 正确：使用条件或依赖数组
useEffect(() => {
  if (count < 10) {
    setCount(count + 1);
  }
}, [count]); // 或添加条件
```

### 与 Vue 生命周期对比

| Vue                          | React useEffect                           | 说明           |
| ---------------------------- | ----------------------------------------- | -------------- |
| `onMounted`                  | `useEffect(() => {}, [])`                 | 组件挂载时执行 |
| `onUnmounted`                | `useEffect(() => { return cleanup }, [])` | 组件卸载时执行 |
| `watch(() => data, handler)` | `useEffect(() => handler(data), [data])`  | 数据变化时执行 |
| `watchEffect(handler)`       | `useEffect(() => handler())`              | 自动追踪依赖   |

## 总结

### 核心要点

1. **JSX**: 类似 HTML 的语法扩展，使用 `className`、驼峰命名
2. **函数式组件**: 返回 JSX 的函数，React 19 唯一使用的组件类型
3. **Props**: 父子组件通信，单向数据流，类型安全
4. **State**: 组件内部状态，不可变更新，`useState` 管理
5. **Effects**: 处理副作用，`useEffect` 管理，注意依赖数组和清理函数

### Vue 开发者注意事项

- ❌ 不要直接修改 state（`count++`），使用 setter 函数
- ⚠️ 依赖数组要完整，避免闭包陷阱
- ✅ 使用函数式更新 `setCount(c => c + 1)` 处理异步场景
- 🧹 记得在 effect 中返回清理函数，防止内存泄漏
- 🔑 渲染列表时必须提供稳定的 `key` prop（使用 ID 而非索引）

### 下一步

- 学习其他常用 Hooks：`useMemo`、`useCallback`、`useRef`
- 了解 React 19 新特性：`use`、`useActionState`、`useOptimistic`
- 掌握 Context API 实现跨组件状态共享
- 实践 React Native 项目中的应用
