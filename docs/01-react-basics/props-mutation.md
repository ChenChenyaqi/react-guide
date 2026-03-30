# Props 只读性详解

## 问题

> 子组件不能改 props，是代码层面限制了，还是只是建议不能改？如果 props 里是一个对象，我改了对象的子属性会发生什么？又或者我改了基本类型的 props，又会发生什么？

## 核心答案

**React 不会阻止修改 props**（运行时层面），这只是**建议和最佳实践**。但如果违反，会导致严重问题。

## 具体场景分析

### 1. 基本类型 props（string、number、boolean）

```tsx
// 父组件
function Parent() {
  const [count, setCount] = useState(5);
  return <Child count={count} />;
}

// 子组件
function Child({ count }: { count: number }) {
  // ❌ TypeScript 会报错（如果启用严格模式）
  // "Cannot assign to 'count' because it is a read-only property"
  count = 10;

  // ✅ 即使强制运行，也不会报错，但也没用
  const handleClick = () => {
    (count as any) = 10; // 强制修改
    console.log(count); // 10（但父组件的值仍是 5）
  };

  return <div>{count}</div>;
}
```

**结果**：
- TypeScript 限制：如果使用 `readonly` 或 strict 模式，编译时报错
- 运行时：可以强制修改（但子组件内部改了，父组件不受影响）
- **原因**：基本类型按**值传递**，子组件拿到的是副本

---

### 2. 对象类型 props（关键问题！）

```tsx
// 父组件
function Parent() {
  const [user, setUser] = useState({
    name: 'Alice',
    age: 25,
    address: {
      city: 'Beijing'
    }
  });

  console.log('Parent user:', user); // 每次渲染都会打印

  return (
    <div>
      <p>Parent: {user.name}, {user.age}</p>
      <Child user={user} />
    </div>
  );
}

// 子组件
function Child({ user }: { user: { name: string; age: number; address: { city: string } } }) {
  const changeAge = () => {
    // ❌ 直接修改对象属性（不会报错！）
    user.age = 30;
    // 修改嵌套对象
    user.address.city = 'Shanghai';

    console.log('Child changed:', user);
  };

  return (
    <div>
      <p>Child: {user.name}, {user.age}, {user.address.city}</p>
      <button onClick={changeAge}>Change Age</button>
    </div>
  );
}
```

**结果**：
- ✅ **运行时不会报错**（JavaScript 允许修改对象）
- ❌ **父组件的数据被污染**：点击按钮后，父组件的 `user` 也变了
- ❌ **不会触发重新渲染**：React 不知道引用变了（因为是同一个对象）
- ❌ **UI 不会更新**：父组件显示的仍是旧值

---

## 为什么不能改 props

### 违反 React 核心原则

```tsx
function Counter({ count, setCount }: { count: number; setCount: (c: number) => void }) {
  // ❌ 错误做法
  const badIncrement = () => {
    count++;  // 修改 props
  };

  // ✅ 正确做法：通过回调函数
  const goodIncrement = () => {
    setCount(c => c + 1);  // 通知父组件更新
  };

  return <button onClick={goodIncrement}>+1</button>;
}
```

### 修改对象 props 的严重后果

```tsx
// 场景：购物车组件
function Cart({ items }: { items: CartItem[] }) {
  // ❌ 修改了传入的数组
  const removeItem = (index: number) => {
    items.splice(index, 1);  // 直接修改！
  };

  return (
    <ul>
      {items.map((item, i) => (
        <li key={item.id}>
          {item.name}
          <button onClick={() => removeItem(i)}>删除</button>
        </li>
      ))}
    </ul>
  );
}

// 父组件
function App() {
  const [items, setItems] = useState([
    { id: 1, name: '商品A' },
    { id: 2, name: '商品B' }
  ]);

  // 问题：
  // 1. 父组件的 items 被修改了
  // 2. 不会触发重新渲染
  // 3. 其他使用 items 的地方也会被影响
  return <Cart items={items} />;
}
```

---

## 正确做法

### 1. 基本类型：通过回调更新

```tsx
function Child({ count, onCountChange }: { count: number; onCountChange: (newCount: number) => void }) {
  return (
    <button onClick={() => onCountChange(count + 1)}>
      Count: {count}
    </button>
  );
}

function Parent() {
  const [count, setCount] = useState(0);

  return <Child count={count} onCountChange={setCount} />;
}
```

### 2. 对象类型：创建新对象

```tsx
function UserProfile({ user, onUpdate }: {
  user: { name: string; age: number };
  onUpdate: (user: { name: string; age: number }) => void;
}) {
  const changeAge = () => {
    // ✅ 创建新对象
    const updatedUser = {
      ...user,
      age: user.age + 1
    };
    onUpdate(updatedUser);
  };

  return (
    <div>
      <p>{user.name}, {user.age} 岁</p>
      <button onClick={changeAge}>增加年龄</button>
    </div>
  );
}

function Parent() {
  const [user, setUser] = useState({ name: 'Alice', age: 25 });

  return <UserProfile user={user} onUpdate={setUser} />;
}
```

### 3. 嵌套对象：深拷贝

```tsx
interface User {
  name: string;
  age: number;
  address: {
    city: string;
    zip: string;
  };
}

function UserForm({ user, onUpdate }: { user: User; onUpdate: (user: User) => void }) {
  const changeCity = () => {
    // ✅ 正确：深拷贝创建新对象
    const updatedUser = {
      ...user,
      address: {
        ...user.address,
        city: 'Shanghai'
      }
    };
    onUpdate(updatedUser);
  };

  return (
    <button onClick={changeCity}>更改城市</button>
  );
}
```

### 4. 使用 immer 简化不可变更新

```tsx
import { produce } from 'immer';

function UserForm({ user, onUpdate }: { user: User; onUpdate: (user: User) => void }) {
  const changeCity = () => {
    // ✅ 使用 immer，可以"看起来"修改，实际创建新对象
    const updatedUser = produce(user, draft => {
      draft.address.city = 'Shanghai';
      draft.age += 1;
    });
    onUpdate(updatedUser);
  };

  return <button onClick={changeCity}>更新</button>;
}
```

---

## 运行时验证（开发环境）

React 提供 `PropTypes` 进行运行时检查（不推荐，建议用 TypeScript）：

```tsx
import PropTypes from 'prop-types';

function Child({ user }: { user: { name: string } }) {
  // 修改 user
  user.name = 'Changed'; // TypeScript 不会阻止
  return <div>{user.name}</div>;
}

// 添加 PropTypes 检查
Child.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired
  }).isRequired
};

// ❌ 但 PropTypes 不会阻止修改，只能在控制台警告类型错误
```

---

## TypeScript 限制

```tsx
// 方式 1: 使用 readonly
interface Props {
  readonly user: { name: string; age: number };
}

function Child({ user }: Props) {
  // ❌ TypeScript 报错
  user.age = 30; // Error: Cannot assign to 'age' because it is a read-only property
}

// 方式 2: 使用 DeepReadonly（工具类型）
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

function Child({ user }: { user: DeepReadonly<User> }) {
  // ❌ 嵌套属性也不能改
  user.address.city = 'Shanghai'; // TypeScript 报错
}
```

---

## 总结

| props 类型 | 可以改吗？ | 后果 | React 限制 |
|-----------|----------|------|-----------|
| 基本类型（string、number） | 运行时可改 | 父组件不受影响 | TypeScript 类型检查 |
| 对象类型 | 运行时可改 | **父组件被污染**，不触发重新渲染 | 无限制 |
| 基本类型 + TypeScript readonly | 不可改 | 编译时报错 | 编译时限制 |
| 对象 + DeepReadonly | 不可改 | 编译时报错 | 编译时限制 |

**关键原则**：
1. ✅ **永远不要修改 props**（即使是运行时允许）
2. ✅ 对象类型要创建新对象（深拷贝）
3. ✅ 通过回调函数通知父组件更新
4. ✅ 使用 TypeScript `readonly` 类型增强类型安全
5. ✅ 复杂对象更新可以用 `immer` 简化

**记住**：React 的单向数据流和不可变性是核心原则，违反会导致难以调试的问题！
