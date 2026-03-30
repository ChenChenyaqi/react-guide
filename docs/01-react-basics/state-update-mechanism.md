# React 状态更新机制详解

## 问题

> 1. 为什么在子组件里直接改props，父组件无法知道更新了？
> 2. 为什么通过调用父组件传进来的setXXX修改，就能知道更新？
> 3. 通过setXXX修改state，是不是一定会触发组件的重新执行？

## 核心原理：React 如何知道数据变了？

### React 的渲染机制

React 采用**声明式渲染**：你告诉 React "UI 应该是什么样的"，React 负责把 UI 变成那个样子。

关键点：React 通过**引用相等性检查**（`Object.is()`）来判断是否需要重新渲染。

```tsx
// React 内部（简化版）
function shouldReRender(oldState, newState) {
  return !Object.is(oldState, newState);
}

// Object.is() 比较的是引用（对象）或值（基本类型）
Object.is(1, 1)                    // true
Object.is('hello', 'hello')        // true
Object.is({}, {})                  // false - 不同引用！
Object.is({ a: 1 }, { a: 1 })      // false - 不同引用！
const obj = { a: 1 };
Object.is(obj, obj)                // true - 同一引用
```

---

## 问题 1：为什么直接改 props，父组件不知道？

### 场景代码

```tsx
function Parent() {
  const [user, setUser] = useState({ name: 'Alice', age: 25 });

  console.log('Parent render:', user);

  return <Child user={user} />;
}

function Child({ user }: { user: { name: string; age: number } }) {
  console.log('Child render:', user);

  const changeAge = () => {
    user.age = 30;  // ❌ 直接修改对象
    console.log('After change:', user);
  };

  return (
    <div>
      <p>{user.name}, {user.age}</p>
      <button onClick={changeAge}>Change Age</button>
    </div>
  );
}
```

### 执行流程

```
初始渲染：
Parent render: { name: 'Alice', age: 25 }
Child render: { name: 'Alice', age: 25 }

点击按钮后：
After change: { name: 'Alice', age: 30 }  // 对象内部变了

但：
Parent render: { name: 'Alice', age: 30 }  ❌ 没有触发重新渲染！
Child render: { name: 'Alice', age: 30 }   ❌ 没有触发重新渲染！
```

### 原因分析

```
React 父组件内部状态：
user = { name: 'Alice', age: 25 }  // 内存地址：0x1234

子组件收到 props：
user = { name: 'Alice', age: 25 }  // 同一内存地址：0x1234

直接修改对象：
user.age = 30  // 还是同一个对象，地址仍是 0x1234

React 检查是否需要重新渲染：
Object.is(oldUser, newUser) = Object.is(0x1234, 0x1234) = true

结论：引用没变，React 认为数据没变，不触发重新渲染
```

### 图示

```
直接修改对象（错误方式）：

内存中的对象（地址：0x1234）
┌─────────────────────┐
│  name: 'Alice'      │
│  age: 25 → 30 ❌    │  ← 修改内部属性，地址不变
└─────────────────────┘
         ↑
         │
React 检查：oldState === newState？是的（0x1234 === 0x1234）
结果：不重新渲染！
```

---

## 问题 2：为什么通过 setXXX 修改，父组件就知道？

### 场景代码

```tsx
function Parent() {
  const [user, setUser] = useState({ name: 'Alice', age: 25 });

  console.log('Parent render:', user);

  const updateAge = (newAge: number) => {
    setUser({ ...user, age: newAge });  // ✅ 创建新对象
  };

  return <Child user={user} onUpdate={updateAge} />;
}

function Child({ user, onUpdate }: {
  user: { name: string; age: number };
  onUpdate: (age: number) => void;
}) {
  console.log('Child render:', user);

  const changeAge = () => {
    onUpdate(30);  // ✅ 调用父组件的 setUser
  };

  return (
    <div>
      <p>{user.name}, {user.age}</p>
      <button onClick={changeAge}>Change Age</button>
    </div>
  );
}
```

### 执行流程

```
初始渲染：
Parent render: { name: 'Alice', age: 25 }
Child render: { name: 'Alice', age: 25 }

点击按钮后：
调用 setUser({ ...user, age: 30 })  // 创建新对象

触发重新渲染：
Parent render: { name: 'Alice', age: 30 }  ✅ 重新渲染了！
Child render: { name: 'Alice', age: 30 }   ✅ 重新渲染了！
```

### 原因分析

```
React 内部状态管理机制：

1. 调用 setUser(newState) 时：
   React 收到状态更新请求

2. React 对比新旧状态：
   oldUser = { name: 'Alice', age: 25 }  // 地址：0x1234
   newUser = { name: 'Alice', age: 30 }  // 地址：0x5678（新对象！）

   Object.is(oldUser, newUser) = false  // 引用不同！

3. React 知道状态变了，触发重新渲染：
   - 重新执行 Parent 组件函数
   - 生成新的 VDOM
   - Diff 算法对比，更新 DOM
   - 传递新的 props 给 Child

4. Child 收到新 props：
   user = { name: 'Alice', age: 30 }  // 地址：0x5678
   检测到 props 变化，重新渲染
```

### 图示

```
创建新对象（正确方式）：

旧对象（地址：0x1234）          新对象（地址：0x5678）
┌─────────────────────┐        ┌─────────────────────┐
│  name: 'Alice'      │        │  name: 'Alice'      │
│  age: 25            │   →    │  age: 30 ✅         │  ← 新对象，新地址
└─────────────────────┘        └─────────────────────┘
         ↑                            ↑
         │                            │
React 检查：oldState === newState？不（0x1234 !== 0x5678）
结果：触发重新渲染！
```

### setState 的内部机制

```tsx
// React useState 内部实现（简化版）
function useState<T>(initialValue: T): [T, (value: T) => void] {
  let state = initialValue;

  const setState = (newState: T) => {
    // 关键：检查状态是否真的变了
    if (!Object.is(state, newState)) {
      state = newState;

      // 标记组件需要重新渲染
      scheduleRerender();
    }
  };

  return [state, setState];
}

// scheduleRerender 会触发：
// 1. 重新执行组件函数
// 2. 生成新的 VDOM
// 3. Diff 对比，更新 DOM
```

---

## 问题 3：setState 一定会触发重新渲染吗？

### 答案：不一定！

### 场景 1：状态值没变，不触发重新渲染

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  console.log('Counter render');

  const handleClick = () => {
    setCount(0);  // 设置相同的值
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={handleClick}>Set to 0</button>
    </div>
  );
}
```

**执行结果**：
```
初始渲染：Counter render
点击按钮：Counter render ❌ 不会重新渲染！
```

**原因**：`Object.is(0, 0) === true`，React 检测到状态没变，跳过渲染。

---

### 场景 2：多次 setState，只触发一次重新渲染（批处理）

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  console.log('Counter render:', count);

  const handleClick = () => {
    setCount(1);
    setCount(2);
    setCount(3);
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={handleClick}>+1</button>
    </div>
  );
}
```

**执行结果**：
```
初始渲染：Counter render: 0
点击按钮：Counter render: 3  ✅ 只渲染了一次！
```

**原因**：React 的**批处理机制**（Batching）：
```
事件处理函数中：
setCount(1);  // React 标记：状态需要更新
setCount(2);  // React 标记：状态需要更新
setCount(3);  // React 标记：状态需要更新

事件处理函数结束后：
React 合并所有状态更新
只执行一次重新渲染
```

---

### 场景 3：异步场景下，每次 setState 都会触发重新渲染

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  console.log('Counter render:', count);

  useEffect(() => {
    setTimeout(() => {
      console.log('setTimeout 开始');
      setCount(1);  // 触发重新渲染
      setCount(2);  // 触发重新渲染
      setCount(3);  // 触发重新渲染
      console.log('setTimeout 结束');
    }, 1000);
  }, []);

  return <p>Count: {count}</p>;
}
```

**执行结果**：
```
初始渲染：Counter render: 0
setTimeout 开始
Counter render: 1
Counter render: 2
Counter render: 3  ✅ 渲染了 3 次！
setTimeout 结束
```

**原因**：React 18 的**自动批处理**只在以下情况生效：
- ✅ React 事件处理函数中
- ✅ React 生命周期方法中
- ❌ setTimeout、setInterval、Promise.then 中（React 18 会自动批处理，旧版本不会）

---

### 场景 4：React.memo 阻止子组件不必要的重新渲染

```tsx
function Parent() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('Alice');

  console.log('Parent render');

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <button onClick={() => setName('Bob')}>
        Change Name
      </button>
      <Child name={name} />
    </div>
  );
}

// 使用 React.memo 优化
const Child = React.memo(function Child({ name }: { name: string }) {
  console.log('Child render:', name);
  return <p>Child: {name}</p>;
});
```

**执行结果**：
```
初始渲染：
Parent render
Child render: Alice

点击 Count 按钮：
Parent render
Child render: Alice  ✅ Child 也重新渲染了！

点击 Change Name 按钮：
Parent render
Child render: Bob   ✅ Child 确实需要重新渲染

❌ 问题：点击 Count 按钮时，Child 不应该重新渲染
```

**优化后**：

```tsx
const Child = React.memo(function Child({ name }: { name: string }) {
  console.log('Child render:', name);
  return <p>Child: {name}</p>;
});
```

**执行结果**：
```
初始渲染：
Parent render
Child render: Alice

点击 Count 按钮：
Parent render
✅ Child 没有重新渲染（name props 没变）

点击 Change Name 按钮：
Parent render
Child render: Bob   ✅ Child 重新渲染
```

---

## React 渲染触发条件总结

### 一定会触发重新渲染的情况

| 条件 | 说明 |
|-----|------|
| `setState(newState)` 且 `!Object.is(oldState, newState)` | 状态值真正改变 |
| `setProps(newProps)` 且 `!Object.is(oldProps, newProps)` | props 值真正改变 |
| 父组件重新渲染（子组件未用 `React.memo`） | 默认行为 |

### 不会触发重新渲染的情况

| 条件 | 说明 |
|-----|------|
| `setState(oldState)` | 设置相同的值 |
| 直接修改对象属性 | 引用没变 |
| 子组件使用 `React.memo` 且 props 没变 | 浅比较优化 |

### 批处理影响

| 场景 | 批处理？ | 渲染次数 |
|-----|---------|---------|
| 事件处理函数中多次 `setState` | ✅ 是 | 1 次 |
| `useEffect` 中多次 `setState` | ✅ 是（React 18） | 1 次 |
| `setTimeout` 中多次 `setState` | ✅ 是（React 18） | 1 次 |
| `Promise.then` 中多次 `setState` | ✅ 是（React 18） | 1 次 |

---

## 核心概念总结

### 1. 引用相等性检查

```tsx
// React 判断是否重新渲染的核心
function shouldReRender(oldValue, newValue) {
  return !Object.is(oldValue, newValue);
}

// 示例
const obj1 = { a: 1 };
const obj2 = { a: 1 };

shouldReRender(obj1, obj1);  // false（同一引用）
shouldReRender(obj1, obj2);  // true（不同引用）

// 这就是为什么需要创建新对象！
setUser({ ...user, age: 30 });  // 新对象，触发重新渲染
user.age = 30;                   // 同一对象，不触发重新渲染
```

### 2. React 的单向数据流

```
┌─────────────┐
│   Parent    │
│             │
│  setState() │  ← React 追踪 setState 调用
│  触发更新    │
└──────┬──────┘
       │
       │ 传递新的 props
       ▼
┌─────────────┐
│    Child    │
│  props 变化 │  ← React 检测到 props 变化
│  重新渲染    │
└─────────────┘

❌ 子组件直接改 props：
┌─────────────┐
│   Parent    │
│  ❌ 不知道   │  ← React 没有监听对象内部变化
└─────────────┘

┌─────────────┐
│    Child    │
│  直接修改    │  ← 修改发生在 React 监听范围外
│  不触发更新   │
└─────────────┘
```

### 3. 渲染触发机制

```tsx
// React 内部渲染流程（简化）

// 1. setState 被调用
setState(newState);

// 2. 检查状态是否真的变了
if (!Object.is(oldState, newState)) {
  // 3. 标记组件需要重新渲染
  markComponentNeedsUpdate();

  // 4. 安排渲染任务
  scheduleRender();

  // 5. 重新执行组件函数
  const newVDOM = Component();

  // 6. Diff 算法对比新旧 VDOM
  const patches = diff(oldVDOM, newVDOM);

  // 7. 应用差异到 DOM
  applyPatches(patches);
}
```

---

## 最佳实践总结

### ✅ 正确做法

```tsx
// 1. 使用 setState 更新状态
const [user, setUser] = useState({ name: 'Alice', age: 25 });
setUser({ ...user, age: 30 });

// 2. 通过回调函数通知父组件
function Child({ user, onUpdate }: Props) {
  const updateAge = () => {
    onUpdate({ ...user, age: 30 });
  };
}

// 3. 函数式更新避免闭包陷阱
setCount(prev => prev + 1);

// 4. 使用 React.memo 优化性能
const Child = React.memo(function Child({ name }) {
  return <div>{name}</div>;
});
```

### ❌ 错误做法

```tsx
// 1. 直接修改 props
user.age = 30;

// 2. 直接修改 state
const [items, setItems] = useState([1, 2, 3]);
items.push(4);  // ❌ 不会触发重新渲染

// 3. 在子组件中修改父组件的数据
function Child({ data }: { data: any[] }) {
  data.push(5);  // ❌ 父组件不知道
}
```

---

## 关键要点

1. **React 通过引用相等性判断是否重新渲染**：`Object.is(oldState, newState)`
2. **直接修改对象不会触发重新渲染**：因为引用没变
3. **setState 会触发重新渲染**：React 追踪 setState 调用，检测到引用变化
4. **setState 不一定触发重新渲染**：值相同时会跳过，React 会批处理多次更新
5. **React.memo 可以阻止不必要的渲染**：浅比较 props
6. **永远不要直接修改 props 或 state**：这是 React 单向数据流的核心原则

记住这些原理，你就能理解 React 的渲染机制，写出性能更好的代码！
