# useEffect 实现原理详解

## 问题

> useEffect 的实现原理是什么？为什么它能够做到根据依赖数组判断是否需要执行？

## 核心原理

useEffect 的核心依赖两个机制：

1. **Fiber 节点存储**：每个组件的 hook 状态存储在 Fiber 节点上
2. **依赖数组浅比较**：对比新旧依赖数组，决定是否执行 effect

---

## React Fiber 架构基础

### 什么是 Fiber？

Fiber 是 React 16 引入的协调算法，每个组件对应一个 Fiber 节点。

```tsx
// Fiber 节点结构（简化版）
interface FiberNode {
  // ... 其他属性

  // 存储 hooks 状态
  memoizedState: Hook | null;

  // 组件函数引用
  type: FunctionComponent;
}

// Hook 链表结构（简化版）
interface Hook {
  // hook 类型：useState, useEffect, useMemo 等
  tag: number;

  // useState: 存储状态值
  // useEffect: 存储 effect 对象
  memoizedState: any;

  // 下一个 hook（形成链表）
  next: Hook | null;
}

// Effect 对象（专门用于 useEffect）
interface Effect {
  // effect 回调函数
  create: () => (() => void) | void;

  // 清理函数（返回值）
  destroy: (() => void) | void;

  // 依赖数组
  deps: DependencyList | null;

  // effect 标记位
  flags: number;

  // 下一个 effect
  next: Effect | null;
}
```

### Fiber 节点与组件的关系

```
组件树：
┌─────────────┐
│    App      │
│  (Fiber A)  │
└──────┬──────┘
       │
       ├─────────────┬─────────────┐
       ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Header    │ │   Content   │ │   Footer    │
│  (Fiber B)  │ │  (Fiber C)  │ │  (Fiber D)  │
│             │ │             │ │             │
│  useState   │ │  useEffect  │ │  useState   │
│  useEffect  │ │  useState   │ │  useEffect  │
└─────────────┘ └─────────────┘ └─────────────┘

每个 Fiber 节点存储该组件所有 hooks 的链表：
Fiber B.memoizedState:
[Hook1 (useState)] -> [Hook2 (useEffect)] -> null
```

---

## useEffect 伪源码实现

### 1. 全局状态管理

```tsx
// React 内部全局状态（简化版）

// 当前正在渲染的 Fiber 节点
let currentlyRenderingFiber: FiberNode | null = null;

// 当前正在处理的 hook
let currentHook: Hook | null = null;

// hooks 链表的索引（确保 hooks 调用顺序一致）
let hookIndex = 0;

// 正在处理的阶段：mount（首次渲染）或 update（重新渲染）
let isMount = true;
```

### 2. useEffect 完整实现

```tsx
// useEffect 实现
function useEffect(
  create: () => (() => void) | void,
  deps: DependencyList | null
) {
  // 1. 获取当前 Fiber 节点
  const fiber = currentlyRenderingFiber!;

  // 2. 创建或获取当前 hook
  let hook: Hook;

  if (isMount) {
    // ==================
    // 首次渲染（mount）
    // ==================

    // 创建新 hook
    hook = {
      tag: HookEffect,        // 标记为 useEffect
      memoizedState: null,     // 初始为 null
      next: null,
    };

    // 添加到 Fiber 的 hook 链表
    if (fiber.memoizedState === null) {
      fiber.memoizedState = hook;
    } else {
      // 添加到链表末尾
      let current = fiber.memoizedState;
      while (current.next !== null) {
        current = current.next;
      }
      current.next = hook;
    }

    // 创建 effect 对象
    const effect: Effect = {
      create,                  // 传入的回调函数
      destroy: undefined,      // 清理函数（初始为 undefined）
      deps,                    // 依赖数组
      flags: PassiveEffect,    // 标记为 passive effect（异步执行）
      next: null,
    };

    // 存储 effect 到 hook
    hook.memoizedState = effect;

  } else {
    // ==================
    // 重新渲染（update）
    // ==================

    // 获取上次渲染时的 hook（按顺序！）
    hook = currentHook!;

    // 获取上次渲染时的 effect
    const oldEffect = hook.memoizedState as Effect;

    // ========== 核心逻辑：依赖数组比较 ==========

    // 情况 1：没有依赖数组（useEffect(() => {})）
    if (deps === null) {
      // 每次渲染都执行
      oldEffect.flags |= PassiveEffect;
    }
    // 情况 2：有依赖数组
    else {
      const oldDeps = oldEffect.deps;

      // 浅比较新旧依赖数组
      const isDepsSame = areDepsEqual(deps, oldDeps!);

      if (!isDepsSame) {
        // 依赖变了，标记 effect 需要执行
        oldEffect.flags |= PassiveEffect;
      } else {
        // 依赖没变，清除 flags（不执行）
        oldEffect.flags &= ~PassiveEffect;
      }
    }

    // 更新 effect 对象
    const effect: Effect = {
      create,
      destroy: oldEffect.destroy,  // 保留旧的清理函数
      deps,
      flags: oldEffect.flags,       // 使用更新后的 flags
      next: null,
    };

    // 存储 effect 到 hook
    hook.memoizedState = effect;
  }

  // 移动到下一个 hook
  currentHook = hook.next;
  hookIndex++;
}

// ========== 依赖数组浅比较实现 ==========

function areDepsEqual(nextDeps: DependencyList, prevDeps: DependencyList): boolean {
  // 长度不同，肯定不等
  if (nextDeps.length !== prevDeps.length) {
    return false;
  }

  // 逐个比较（浅比较）
  for (let i = 0; i < nextDeps.length; i++) {
    // 使用 Object.is 比较
    if (!Object.is(nextDeps[i], prevDeps[i])) {
      return false;
    }
  }

  // 所有依赖都相等
  return true;
}
```

### 3. Effect 执行流程

```tsx
// 执行所有标记为需要执行的 effects（在渲染完成后）

function commitPassiveEffects() {
  // 获取所有 Fiber 节点
  const fibers = getAllFibers();

  fibers.forEach(fiber => {
    let hook = fiber.memoizedState;

    // 遍历该组件的所有 hooks
    while (hook !== null) {
      // 只处理 useEffect 类型的 hook
      if (hook.tag === HookEffect) {
        const effect = hook.memoizedState as Effect;

        // ========== 步骤 1：执行清理函数 ==========

        if (effect.destroy !== undefined) {
          try {
            // 执行上一次的清理函数
            effect.destroy();
          } catch (error) {
            // 捕获清理函数的错误
            console.error('Effect cleanup error:', error);
          }
        }

        // ========== 步骤 2：执行 effect 回调 ==========

        if (effect.flags & PassiveEffect) {
          try {
            // 执行 effect 回调
            const destroy = effect.create();

            // 保存返回的清理函数
            effect.destroy = destroy;
          } catch (error) {
            console.error('Effect error:', error);
          }
        }

        // 清除 flags（下次重新渲染时重新判断）
        effect.flags &= ~PassiveEffect;
      }

      hook = hook.next;
    }
  });
}
```

### 4. 完整渲染流程

```tsx
// React 组件渲染流程（简化版）

function renderComponent(fiber: FiberNode) {
  // 1. 准备全局变量
  currentlyRenderingFiber = fiber;
  currentHook = fiber.alternate?.memoizedState || null;
  hookIndex = 0;
  isMount = fiber.alternate === null;

  // 2. 执行组件函数
  // 在这个过程中，会调用 useEffect、useState 等 hooks
  const element = fiber.type(fiber.props);

  // 3. 生成 Fiber 树（Diff 算法）
  const newFiber = reconcile(element);

  // 4. 提交更新到 DOM
  commitRoot(newFiber);

  // 5. 执行 effects（异步）
  // 使用 setTimeout 确保在 DOM 更新后执行
  setTimeout(() => {
    commitPassiveEffects();
  }, 0);

  // 6. 重置全局变量
  currentlyRenderingFiber = null;
  currentHook = null;
}
```

---

## 依赖数组判断的完整流程

### 示例代码

```tsx
function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);

  // useEffect 1：依赖 userId
  useEffect(() => {
    console.log('Fetch user:', userId);
    fetchUser(userId).then(setUser);
  }, [userId]);

  // useEffect 2：依赖 user
  useEffect(() => {
    console.log('Update document title:', user?.name);
    if (user) {
      document.title = user.name;
    }
  }, [user]);

  return <div>{user?.name}</div>;
}
```

### 首次渲染（Mount）

```
1. 创建 Fiber 节点
   Fiber {
     memoizedState: null,
     type: UserProfile,
     // ...
   }

2. 执行组件函数，遇到第一个 useEffect
   useEffect(() => {...}, [userId])

3. 创建 Hook 1
   Hook {
     tag: HookEffect,
     memoizedState: {
       create: () => { fetchUser(userId).then(setUser) },
       destroy: undefined,
       deps: [1],  // userId = 1
       flags: PassiveEffect,  // 需要执行
       next: null
     },
     next: null
   }

   Fiber.memoizedState = Hook 1

4. 执行组件函数，遇到第二个 useEffect
   useEffect(() => {...}, [user])

5. 创建 Hook 2
   Hook {
     tag: HookEffect,
     memoizedState: {
       create: () => { document.title = user.name },
       destroy: undefined,
       deps: [null],  // user = null
       flags: PassiveEffect,  // 需要执行
       next: null
     },
     next: null
   }

   Hook 1.next = Hook 2

6. Hook 链表：
   Fiber.memoizedState: Hook 1 → Hook 2 → null

7. 渲染完成后，执行所有 effects：
   - 执行 Effect 1：fetchUser(1)
   - 执行 Effect 2：document.title = (不设置，因为 user 是 null)
```

### 重新渲染（Update）- userId 变化

```
假设 userId 从 1 变成 2

1. 恢复 Hook 链表
   currentHook = Hook 1 (上次的)
   hookIndex = 0

2. 执行组件函数，遇到第一个 useEffect
   useEffect(() => {...}, [userId])

3. 获取 Hook 1
   hook = currentHook  // Hook 1

4. 比较依赖数组：
   新 deps: [2]
   旧 deps: [1]
   areDepsEqual([2], [1]) = false

5. 依赖变了，标记需要执行：
   hook.memoizedState.flags |= PassiveEffect

6. 更新 effect：
   effect = {
     create: () => { fetchUser(userId).then(setUser) },  // 新函数
     destroy: undefined,  // 暂时保留旧的清理函数
     deps: [2],  // 新依赖
     flags: PassiveEffect,
     next: null
   }

7. 移动到下一个 hook
   currentHook = Hook 2

8. 执行组件函数，遇到第二个 useEffect
   useEffect(() => {...}, [user])

9. 获取 Hook 2
   hook = currentHook  // Hook 2

10. 比较依赖数组：
    新 deps: [null]  // user 仍是 null
    旧 deps: [null]
    areDepsEqual([null], [null]) = true

11. 依赖没变，不执行：
    hook.memoizedState.flags &= ~PassiveEffect

12. 更新 effect：
    effect = {
      create: () => { document.title = user.name },
      destroy: undefined,
      deps: [null],
      flags: 0,  // 不执行
      next: null
    }

13. 渲染完成后，执行 effects：
    - Effect 1（flags = PassiveEffect）：需要执行
      1. 先执行清理函数（undefined，跳过）
      2. 执行 effect 回调：fetchUser(2)
      3. 保存新的清理函数
    - Effect 2（flags = 0）：不执行
```

### 重新渲染（Update）- userId 不变

```
假设 userId 仍是 1

1. 恢复 Hook 链表
   currentHook = Hook 1

2. 执行组件函数，遇到第一个 useEffect
   useEffect(() => {...}, [userId])

3. 比较依赖数组：
   新 deps: [1]
   旧 deps: [1]
   areDepsEqual([1], [1]) = true

4. 依赖没变，不执行：
   hook.memoizedState.flags &= ~PassiveEffect

5. 同样的逻辑处理第二个 useEffect

6. 渲染完成后，执行 effects：
   - Effect 1（flags = 0）：不执行
   - Effect 2（flags = 0）：不执行
```

---

## 清理函数的执行时机

### 完整生命周期

```tsx
function Timer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('1. Effect 执行（创建定时器）');

    const interval = setInterval(() => {
      console.log('2. 定时器执行');
      setCount(c => c + 1);
    }, 1000);

    // 返回清理函数
    return () => {
      console.log('3. 清理函数执行（清除定时器）');
      clearInterval(interval);
    };
  }, []);  // 空依赖数组

  return <div>{count}</div>;
}
```

### 执行时序

```
首次渲染：
1. 组件函数执行
2. useEffect 被调用，保存 effect 对象
3. DOM 更新完成
4. 执行 effects：
   - Effect 执行（创建定时器）
   - 保存返回的清理函数

1 秒后：
- 定时器执行，count 变成 1
- 触发重新渲染
- useEffect 被调用（依赖数组没变，不执行）
- DOM 更新完成
- 执行 effects：
  - 清理函数执行（清除定时器）  ❌ 错误！
  
❌ 等等，这是错误的！

正确时序：

首次渲染：
1. 组件函数执行
2. useEffect 被调用，保存 effect 对象
3. DOM 更新完成
4. 执行 effects：
   - Effect 执行（创建定时器）
   - 保存返回的清理函数

1 秒后：
- 定时器执行，count 变成 1
- 触发重新渲染
- useEffect 被调用（依赖数组没变，不执行）
- DOM 更新完成
- 执行 effects：
  - Effect 不执行（flags = 0）
  - 旧的清理函数不执行

组件卸载：
- React 检测到组件被移除
- 执行最后一次清理函数：
  - 清理函数执行（清除定时器）
```

### 重新渲染且依赖变化时

```tsx
function Component({ userId }: { userId: number }) {
  useEffect(() => {
    console.log('Effect for userId:', userId);

    return () => {
      console.log('Cleanup for userId:', userId);
    };
  }, [userId]);

  return <div>User {userId}</div>;
}

// userId 从 1 变成 2

执行流程：
1. 组件函数执行
2. useEffect 被调用
3. 比较依赖：[1] vs [2]，不等
4. 标记 effect 需要执行
5. DOM 更新完成
6. 执行 effects：
   - 先执行旧的清理函数：Cleanup for userId: 1
   - 再执行新的 effect 回调：Effect for userId: 2
   - 保存新的清理函数
```

---

## Hooks 调用顺序的重要性

### 为什么必须保持调用顺序？

```tsx
function BadComponent({ condition }: { condition: boolean }) {
  if (condition) {
    // ❌ 错误：条件调用 hook
    useEffect(() => {
      console.log('Effect 1');
    }, []);
  }

  useEffect(() => {
    console.log('Effect 2');
  }, []);

  return <div>Bad</div>;
}
```

### 问题演示

```
首次渲染（condition = true）：
1. useEffect(() => { console.log('Effect 1') }, [])
   → 创建 Hook 1
2. useEffect(() => { console.log('Effect 2') }, [])
   → 创建 Hook 2

Hook 链表：Hook 1 → Hook 2 → null

重新渲染（condition = false）：
1. 跳过第一个 useEffect
2. useEffect(() => { console.log('Effect 2') }, [])
   → 获取 Hook 1（原本应该是 Hook 2！）

结果：
- Effect 2 对应 Hook 1
- 导致错位，状态混乱
```

### 正确做法

```tsx
function GoodComponent({ condition }: { condition: boolean }) {
  useEffect(() => {
    if (condition) {
      console.log('Effect 1');
    }
  }, [condition]);

  useEffect(() => {
    console.log('Effect 2');
  }, []);

  return <div>Good</div>;
}
```

---

## useEffect 与 useLayoutEffect 的区别

### 执行时机

```tsx
function Component() {
  const [count, setCount] = useState(0);

  // useEffect：在 DOM 更新后异步执行
  useEffect(() => {
    console.log('useEffect: DOM 已更新');
    // 不会阻塞浏览器绘制
  }, [count]);

  // useLayoutEffect：在 DOM 更新后同步执行（但在浏览器绘制前）
  useLayoutEffect(() => {
    console.log('useLayoutEffect: DOM 已更新，但还未绘制');
    // 会阻塞浏览器绘制，直到执行完
    // 适合需要读取 DOM 布局的操作
  }, [count]);

  return <div>{count}</div>;
}
```

### 执行时序图

```
1. 组件函数执行
2. 生成新的 VDOM
3. Diff 算法对比
4. 提交 DOM 更新到浏览器
5. useLayoutEffect 执行（同步，阻塞绘制）
6. 浏览器绘制
7. useEffect 执行（异步）
```

---

## 实际应用示例

### 1. 数据获取

```tsx
function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/posts');
        const data = await response.json();

        // 检查组件是否仍然挂载
        if (isMounted) {
          setPosts(data);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch posts');
        }
      }
    };

    fetchPosts();

    // 清理函数
    return () => {
      isMounted = false;
    };
  }, []);  // 空依赖数组：只在挂载时执行

  if (error) return <div>{error}</div>;
  return <ul>{posts.map(post => <li key={post.id}>{post.title}</li>)}</ul>;
}
```

### 2. 事件监听

```tsx
function WindowSize() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    // 定义事件处理函数
    const handleResize = () => setWidth(window.innerWidth);

    // 添加监听器
    window.addEventListener('resize', handleResize);

    // 清理函数：移除监听器
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);  // 空依赖数组

  return <div>Width: {width}px</div>;
}
```

### 3. 订阅与取消订阅

```tsx
function ChatMessages({ userId }: { userId: number }) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // 创建订阅
    const subscription = chatService.subscribeToMessages(userId, (message) => {
      setMessages(prev => [...prev, message]);
    });

    // 清理函数：取消订阅
    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);  // 依赖 userId，用户切换时重新订阅

  return <ul>{messages.map(msg => <li key={msg.id}>{msg.text}</li>)}</ul>;
}
```

---

## 核心要点总结

### useEffect 的工作原理

1. **存储在 Fiber 节点**：每个 useEffect 对应一个 Hook，存储在组件的 Fiber 节点上
2. **依赖数组浅比较**：使用 `Object.is` 逐个比较新旧依赖数组
3. **标记执行状态**：根据比较结果设置 `flags`，决定是否执行
4. **异步执行**：在 DOM 更新完成后，浏览器绘制前执行 `useLayoutEffect`，绘制后执行 `useEffect`
5. **清理函数**：在下一次 effect 执行前或组件卸载时执行

### 依赖数组判断规则

```tsx
// 1. 无依赖数组：每次渲染都执行
useEffect(() => {
  // 每次渲染都执行
});

// 2. 空依赖数组：只在挂载时执行一次
useEffect(() => {
  // 只执行一次
}, []);

// 3. 有依赖数组：依赖变化时执行
useEffect(() => {
  // userId 变化时执行
}, [userId]);

// 浅比较示例：
const prevDeps = [1, 'hello', { a: 1 }];
const nextDeps = [1, 'hello', { a: 1 }];
areDepsEqual(nextDeps, prevDeps)  // false - 对象是不同引用

const prevDeps = [1, 'hello', obj];
const nextDeps = [1, 'hello', obj];  // 同一个对象引用
areDepsEqual(nextDeps, prevDeps)  // true
```

### Hooks 调用顺序的重要性

```tsx
// ❌ 错误：条件调用
if (condition) {
  useEffect(() => {}, []);
}

// ❌ 错误：循环调用
for (let i = 0; i < 10; i++) {
  useEffect(() => {}, []);
}

// ❌ 错误：嵌套函数调用
function helper() {
  useEffect(() => {}, []);
}

// ✅ 正确：在组件顶层调用
function Component() {
  useEffect(() => {}, []);
  useEffect(() => {}, []);
  useEffect(() => {}, []);
}
```

记住这些原理，你就能深刻理解 useEffect 的工作机制，写出正确、高效的 React 代码！
