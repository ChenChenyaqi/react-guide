# useReducer 用法与原理详解

## useReducer 是什么？

useReducer 是一个 React Hook，用于**管理复杂的状态逻辑**。它是 useState 的替代方案，适合管理复杂的状态或多个子值的状态。

**核心特性**：
- **集中管理状态逻辑**：将状态更新逻辑集中在一个地方
- **可预测的状态更新**：通过 dispatch 触发 action，状态更新逻辑清晰
- **适合复杂状态**：多个子值、复杂更新逻辑、需要历史记录的场景
- **类似 Redux**：reducer 模式，易于测试和调试

---

## 基本用法

### 1. 简单计数器

```tsx
// 1. 定义 state 类型
type State = {
  count: number;
};

// 2. 定义 action 类型
type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'set'; payload: number };

// 3. 定义 reducer 函数
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    case 'set':
      return { count: action.payload };
    default:
      return state;
  }
}

// 4. 使用 useReducer
function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>
        +
      </button>
      <button onClick={() => dispatch({ type: 'decrement' })}>
        -
      </button>
      <button onClick={() => dispatch({ type: 'set', payload: 0 })}>
        Reset
      </button>
    </div>
  );
}
```

### 2. 带初始值的 useReducer

```tsx
function Counter({ initialCount = 0 }: { initialCount?: number }) {
  const [state, dispatch] = useReducer(
    reducer,
    { count: initialCount }  // 初始值
  );

  return <div>Count: {state.count}</div>;
}

// 或使用 init 函数（惰性初始化）
function init(initialCount: number) {
  return { count: initialCount };
}

function Counter({ initialCount = 0 }: { initialCount?: number }) {
  const [state, dispatch] = useReducer(
    reducer,
    initialCount,
    init  // init 函数
  );

  return <div>Count: {state.count}</div>;
}
```

---

## 为什么需要 useReducer？

### 1. 对比 useState：复杂状态逻辑

```tsx
// ❌ 使用 useState：状态逻辑分散

function ComplexForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: 0,
    isAdult: false,
    errors: {} as Record<string, string>
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      name: e.target.value,
      errors: {
        ...prev.errors,
        name: e.target.value.length < 2 ? 'Name too short' : ''
      }
    }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      email: e.target.value,
      errors: {
        ...prev.errors,
        email: !isValidEmail(e.target.value) ? 'Invalid email' : ''
      }
    }));
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const age = parseInt(e.target.value) || 0;
    setFormData(prev => ({
      ...prev,
      age,
      isAdult: age >= 18,
      errors: {
        ...prev.errors,
        age: age < 0 ? 'Age must be positive' : ''
      }
    }));
  };

  // 问题：
  // 1. 状态更新逻辑分散在多个函数中
  // 2. 难以追踪状态变化
  // 3. 代码重复（...prev, errors: {...prev.errors}）
  // 4. 难以测试

  return <form>...</form>;
}

// ✅ 使用 useReducer：状态逻辑集中

type State = {
  name: string;
  email: string;
  age: number;
  isAdult: boolean;
  errors: Record<string, string>;
};

type Action =
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_EMAIL'; payload: string }
  | { type: 'SET_AGE'; payload: number }
  | { type: 'CLEAR_ERRORS' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_NAME':
      return {
        ...state,
        name: action.payload,
        errors: {
          ...state.errors,
          name: action.payload.length < 2 ? 'Name too short' : ''
        }
      };

    case 'SET_EMAIL':
      return {
        ...state,
        email: action.payload,
        errors: {
          ...state.errors,
          email: !isValidEmail(action.payload) ? 'Invalid email' : ''
        }
      };

    case 'SET_AGE':
      return {
        ...state,
        age: action.payload,
        isAdult: action.payload >= 18,
        errors: {
          ...state.errors,
          age: action.payload < 0 ? 'Age must be positive' : ''
        }
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: {}
      };

    default:
      return state;
  }
}

function ComplexForm() {
  const [state, dispatch] = useReducer(reducer, {
    name: '',
    email: '',
    age: 0,
    isAdult: false,
    errors: {}
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_NAME', payload: e.target.value });
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_EMAIL', payload: e.target.value });
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const age = parseInt(e.target.value) || 0;
    dispatch({ type: 'SET_AGE', payload: age });
  };

  // 优点：
  // 1. 状态更新逻辑集中在 reducer 中
  // 2. 易于追踪状态变化（所有变化都经过 reducer）
  // 3. 易于测试（独立测试 reducer 函数）
  // 4. 代码更清晰、可维护

  return <form>...</form>;
}
```

### 2. 对比 useState：多个相关状态

```tsx
// ❌ 使用 useState：多个相关状态

function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 问题：
  // 1. 多个相关状态分散
  // 2. 难以保证状态一致性
  // 3. 难以追踪状态变化

  return <div>...</div>;
}

// ✅ 使用 useReducer：集中管理

type State = {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  editingId: number | null;
  loading: boolean;
  error: string | null;
};

type Action =
  | { type: 'ADD_TODO'; payload: Todo }
  | { type: 'TOGGLE_TODO'; payload: number }
  | { type: 'DELETE_TODO'; payload: number }
  | { type: 'SET_FILTER'; payload: 'all' | 'active' | 'completed' }
  | { type: 'SET_EDITING'; payload: number | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_TODOS_SUCCESS'; payload: Todo[] }
  | { type: 'LOAD_TODOS_ERROR'; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TODO':
      return {
        ...state,
        todos: [...state.todos, action.payload]
      };

    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload
            ? { ...todo, completed: !todo.completed }
            : todo
        )
      };

    case 'DELETE_TODO':
      return {
        ...state,
        todos: state.todos.filter(todo => todo.id !== action.payload)
      };

    case 'SET_FILTER':
      return {
        ...state,
        filter: action.payload
      };

    case 'SET_EDITING':
      return {
        ...state,
        editingId: action.payload
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };

    case 'LOAD_TODOS_SUCCESS':
      return {
        ...state,
        todos: action.payload,
        loading: false,
        error: null
      };

    case 'LOAD_TODOS_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    default:
      return state;
  }
}

function TodoApp() {
  const [state, dispatch] = useReducer(reducer, {
    todos: [],
    filter: 'all',
    editingId: null,
    loading: false,
    error: null
  });

  // 优点：
  // 1. 所有相关状态集中管理
  // 2. 易于保证状态一致性
  // 3. 易于追踪状态变化
  // 4. 易于实现状态历史记录

  return <div>...</div>;
}
```

---

## 实现原理

### useReducer 的内部机制

```tsx
// useReducer 内部逻辑（简化版）

function useReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S,
  init?: (initialArg: S) => S
): [S, React.Dispatch<A>] {
  // ========== 步骤 1：获取当前 hook ==========
  const hook = getHook();
  const fiber = currentlyRenderingFiber!;

  // ========== 步骤 2：首次渲染（mount）==========
  if (fiber.alternate === null) {
    // 惰性初始化
    const state = init ? init(initialState) : initialState;

    // 创建 hook 状态
    hook.memoizedState = {
      state,
      dispatch: createDispatch(fiber, reducer)
    };

    console.log('[useReducer] Mount: initial state:', state);
    return [state, hook.memoizedState.dispatch];
  }

  // ========== 步骤 3：重新渲染（update）==========
  const memoizedState = hook.memoizedState as {
    state: S;
    dispatch: React.Dispatch<A>;
  };

  console.log('[useReducer] Update: current state:', memoizedState.state);
  return [memoizedState.state, memoizedState.dispatch];
}

// ========== 创建 dispatch 函数 ==========

function createDispatch<S, A>(
  fiber: Fiber,
  reducer: (state: S, action: A) => S
): React.Dispatch<A> {
  return function dispatch(action: A) {
    // ========== 步骤 1：获取当前状态 ==========
    const hook = getHookFromFiber(fiber);
    const memoizedState = hook.memoizedState as {
      state: S;
      dispatch: React.Dispatch<A>;
    };

    const oldState = memoizedState.state;

    // ========== 步骤 2：计算新状态 ==========
    const newState = reducer(oldState, action);

    // ========== 步骤 3：比较新旧状态 ==========
    if (Object.is(oldState, newState)) {
      // 状态没变，不触发重新渲染
      console.log('[dispatch] State unchanged, skipping render');
      return;
    }

    // ========== 步骤 4：更新状态 ==========
    memoizedState.state = newState;

    // ========== 步骤 5：标记组件需要重新渲染 ==========
    markComponentNeedsUpdate(fiber);
    scheduleRender();

    console.log('[dispatch] State updated:', oldState, '→', newState);
  };
}
```

### 完整伪源码

```tsx
// ========== 1. useReducer 类型定义 ==========

type Reducer<S, A> = (state: S, action: A) => S;
type Dispatch<A> = (action: A) => void;
type Init<S> = (initialArg: S) => S;

// ========== 2. useReducer 实现 ==========

function useReducer<S, A, I = S>(
  reducer: Reducer<S, A>,
  initialState: I & S,
  init?: Init<I>
): [S, Dispatch<A>] {
  // ========== 步骤 1：获取当前 Fiber 和 Hook ==========
  const fiber = currentlyRenderingFiber!;
  const hook = getCurrentHook();

  // ========== 步骤 2：首次渲染（mount）==========
  if (fiber.alternate === null) {
    // 计算初始状态
    const state = init
      ? init(initialState as I)
      : (initialState as S);

    // 创建 dispatch 函数
    const dispatch = createDispatch(fiber, hook, reducer);

    // 保存到 hook
    hook.memoizedState = {
      state,
      dispatch,
      queue: null
    };

    console.log('[useReducer] Mount: initial state =', state);
    return [state, dispatch];
  }

  // ========== 步骤 3：重新渲染（update）==========
  const memoizedState = hook.memoizedState as {
    state: S;
    dispatch: Dispatch<A>;
    queue: UpdateQueue<A> | null;
  };

  const { state, dispatch } = memoizedState;

  console.log('[useReducer] Update: current state =', state);
  return [state, dispatch];
}

// ========== 3. 创建 dispatch 函数 ==========

function createDispatch<S, A>(
  fiber: Fiber,
  hook: Hook,
  reducer: Reducer<S, A>
): Dispatch<A> {
  return function dispatch(action: A) {
    console.log('[dispatch] Action:', action);

    // ========== 步骤 1：获取当前状态 ==========
    const memoizedState = hook.memoizedState as {
      state: S;
      dispatch: Dispatch<A>;
      queue: UpdateQueue<A> | null;
    };

    const oldState = memoizedState.state;

    // ========== 步骤 2：创建更新队列 ==========
    const update = {
      action,
      next: null
    };

    if (memoizedState.queue === null) {
      memoizedState.queue = {
        first: update,
        last: update
      };
    } else {
      memoizedState.queue.last.next = update;
      memoizedState.queue.last = update;
    }

    // ========== 步骤 3：标记组件需要重新渲染 ==========
    markComponentNeedsUpdate(fiber);
    scheduleRender();
  };
}

// ========== 4. 处理更新队列（在重新渲染时）==========

function processUpdateQueue<S, A>(
  currentState: S,
  queue: UpdateQueue<A> | null,
  reducer: Reducer<S, A>
): S {
  // ========== 步骤 1：如果没有队列，返回当前状态 ==========
  if (queue === null) {
    return currentState;
  }

  // ========== 步骤 2：处理所有更新 ==========
  let newState = currentState;
  let update = queue.first;

  while (update !== null) {
    newState = reducer(newState, update.action);
    update = update.next;
  }

  // ========== 步骤 3：清空队列 ==========
  queue.first = null;
  queue.last = null;

  console.log('[processUpdateQueue] New state =', newState);
  return newState;
}

// ========== 5. Hook 状态结构 ==========

interface useReducerHookState<S, A> {
  state: S;
  dispatch: Dispatch<A>;
  queue: UpdateQueue<A> | null;
}

interface UpdateQueue<A> {
  first: Update<A> | null;
  last: Update<A> | null;
}

interface Update<A> {
  action: A;
  next: Update<A> | null;
}

// ========== 6. 重新渲染时的 useReducer ==========

function updateReducer<S, A, I = S>(
  fiber: Fiber,
  hook: Hook,
  reducer: Reducer<S, A>,
  initialState: I & S,
  init?: Init<I>
): [S, Dispatch<A>] {
  const memoizedState = hook.memoizedState as useReducerHookState<S, A>;

  // ========== 步骤 1：处理更新队列 ==========
  if (memoizedState.queue !== null) {
    const newState = processUpdateQueue(
      memoizedState.state,
      memoizedState.queue,
      reducer
    );

    memoizedState.state = newState;
  }

  // ========== 步骤 2：返回当前状态和 dispatch ==========
  console.log('[updateReducer] Returning state =', memoizedState.state);
  return [memoizedState.state, memoizedState.dispatch];
}

// ========== 7. Hook 类型 ==========

const HookReducer = 3;  // useReducer 的 tag

// ========== 8. 完整的 useReducer（mount 和 update）==========

function useReducer<S, A, I = S>(
  reducer: Reducer<S, A>,
  initialState: I & S,
  init?: Init<I>
): [S, Dispatch<A>] {
  const fiber = currentlyRenderingFiber!;
  const hook = getCurrentHook();

  if (fiber.alternate === null) {
    // ========== Mount 阶段 ==========
    return mountReducer(fiber, hook, reducer, initialState, init);
  } else {
    // ========== Update 阶段 ==========
    return updateReducer(fiber, hook, reducer, initialState, init);
  }
}

function mountReducer<S, A, I = S>(
  fiber: Fiber,
  hook: Hook,
  reducer: Reducer<S, A>,
  initialState: I & S,
  init?: Init<I>
): [S, Dispatch<A>] {
  // 计算初始状态
  const state = init
    ? init(initialState as I)
    : (initialState as S);

  // 创建 dispatch
  const dispatch = createDispatch(fiber, hook, reducer);

  // 保存到 hook
  hook.tag = HookReducer;
  hook.memoizedState = {
    state,
    dispatch,
    queue: null
  };

  return [state, dispatch];
}

function updateReducer<S, A, I = S>(
  fiber: Fiber,
  hook: Hook,
  reducer: Reducer<S, A>,
  initialState: I & S,
  init?: Init<I>
): [S, Dispatch<A>] {
  const memoizedState = hook.memoizedState as useReducerHookState<S, A>;

  // 处理更新队列
  if (memoizedState.queue !== null) {
    const newState = processUpdateQueue(
      memoizedState.state,
      memoizedState.queue,
      reducer
    );

    memoizedState.state = newState;
  }

  return [memoizedState.state, memoizedState.dispatch];
}
```

---

## 实际应用示例

### 1. 待办事项应用

```tsx
type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

type State = {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  editingId: number | null;
};

type Action =
  | { type: 'ADD_TODO'; payload: string }
  | { type: 'TOGGLE_TODO'; payload: number }
  | { type: 'DELETE_TODO'; payload: number }
  | { type: 'EDIT_TODO'; payload: { id: number; text: string } }
  | { type: 'SET_FILTER'; payload: 'all' | 'active' | 'completed' }
  | { type: 'SET_EDITING'; payload: number | null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TODO':
      return {
        ...state,
        todos: [
          ...state.todos,
          {
            id: Date.now(),
            text: action.payload,
            completed: false
          }
        ]
      };

    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload
            ? { ...todo, completed: !todo.completed }
            : todo
        )
      };

    case 'DELETE_TODO':
      return {
        ...state,
        todos: state.todos.filter(todo => todo.id !== action.payload)
      };

    case 'EDIT_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload.id
            ? { ...todo, text: action.payload.text }
            : todo
        ),
        editingId: null
      };

    case 'SET_FILTER':
      return {
        ...state,
        filter: action.payload
      };

    case 'SET_EDITING':
      return {
        ...state,
        editingId: action.payload
      };

    default:
      return state;
  }
}

function TodoApp() {
  const [state, dispatch] = useReducer(reducer, {
    todos: [],
    filter: 'all',
    editingId: null
  });

  const filteredTodos = useMemo(() => {
    switch (state.filter) {
      case 'active':
        return state.todos.filter(todo => !todo.completed);
      case 'completed':
        return state.todos.filter(todo => todo.completed);
      default:
        return state.todos;
    }
  }, [state.todos, state.filter]);

  return (
    <div>
      <div>
        <button
          onClick={() => dispatch({ type: 'SET_FILTER', payload: 'all' })}
        >
          All
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_FILTER', payload: 'active' })}
        >
          Active
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_FILTER', payload: 'completed' })}
        >
          Completed
        </button>
      </div>

      <ul>
        {filteredTodos.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => dispatch({ type: 'TOGGLE_TODO', payload: todo.id })}
            />
            {state.editingId === todo.id ? (
              <input
                type="text"
                defaultValue={todo.text}
                onBlur={(e) =>
                  dispatch({
                    type: 'EDIT_TODO',
                    payload: { id: todo.id, text: e.target.value }
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    dispatch({
                      type: 'EDIT_TODO',
                      payload: { id: todo.id, text: e.currentTarget.value }
                    });
                  } else if (e.key === 'Escape') {
                    dispatch({ type: 'SET_EDITING', payload: null });
                  }
                }}
                autoFocus
              />
            ) : (
              <span
                onClick={() => dispatch({ type: 'SET_EDITING', payload: todo.id })}
              >
                {todo.text}
              </span>
            )}
            <button
              onClick={() => dispatch({ type: 'DELETE_TODO', payload: todo.id })}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem(
            'todo'
          ) as HTMLInputElement;
          if (input.value) {
            dispatch({ type: 'ADD_TODO', payload: input.value });
            input.value = '';
          }
        }}
      >
        <input name="todo" type="text" placeholder="Add todo..." />
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
```

### 2. 计数器带历史记录

```tsx
type State = {
  count: number;
  history: number[];
};

type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'set'; payload: number }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return {
        count: state.count + 1,
        history: [...state.history, state.count + 1]
      };

    case 'decrement':
      return {
        count: state.count - 1,
        history: [...state.history, state.count - 1]
      };

    case 'set':
      return {
        count: action.payload,
        history: [...state.history, action.payload]
      };

    case 'reset':
      return {
        count: 0,
        history: []
      };

    default:
      return state;
  }
}

function CounterWithHistory() {
  const [state, dispatch] = useReducer(reducer, {
    count: 0,
    history: []
  });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
      <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>

      <h3>History:</h3>
      <ul>
        {state.history.map((value, index) => (
          <li key={index}>{value}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 3. 表单验证

```tsx
type State = {
  values: {
    name: string;
    email: string;
    password: string;
  };
  errors: {
    name: string;
    email: string;
    password: string;
  };
  touched: {
    name: boolean;
    email: boolean;
    password: boolean;
  };
  isSubmitting: boolean;
};

type Action =
  | { type: 'SET_FIELD'; payload: { field: keyof State['values']; value: string } }
  | { type: 'SET_TOUCHED'; payload: keyof State['touched'] }
  | { type: 'SET_ERRORS'; payload: Partial<State['errors']> }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'RESET' };

const validate = (values: State['values']): Partial<State['errors']> => {
  const errors: Partial<State['errors']> = {};

  if (values.name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Invalid email';
  }

  if (values.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  return errors;
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FIELD': {
      const newValues = {
        ...state.values,
        [action.payload.field]: action.payload.value
      };

      const errors = validate(newValues);

      return {
        ...state,
        values: newValues,
        errors
      };
    }

    case 'SET_TOUCHED':
      return {
        ...state,
        touched: {
          ...state.touched,
          [action.payload]: true
        }
      };

    case 'SET_ERRORS':
      return {
        ...state,
        errors: {
          ...state.errors,
          ...action.payload
        }
      };

    case 'SET_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.payload
      };

    case 'RESET':
      return {
        values: { name: '', email: '', password: '' },
        errors: { name: '', email: '', password: '' },
        touched: { name: false, email: false, password: false },
        isSubmitting: false
      };

    default:
      return state;
  }
}

function RegistrationForm() {
  const [state, dispatch] = useReducer(reducer, {
    values: { name: '', email: '', password: '' },
    errors: { name: '', email: '', password: '' },
    touched: { name: false, email: false, password: false },
    isSubmitting: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 标记所有字段为 touched
    dispatch({ type: 'SET_TOUCHED', payload: 'name' });
    dispatch({ type: 'SET_TOUCHED', payload: 'email' });
    dispatch({ type: 'SET_TOUCHED', payload: 'password' });

    const errors = validate(state.values);
    dispatch({ type: 'SET_ERRORS', payload: errors });

    if (Object.keys(errors).length === 0) {
      dispatch({ type: 'SET_SUBMITTING', payload: true });

      try {
        await registerUser(state.values);
        alert('Registration successful!');
        dispatch({ type: 'RESET' });
      } catch (error) {
        dispatch({ type: 'SET_ERRORS', payload: { email: 'Email already exists' } });
      } finally {
        dispatch({ type: 'SET_SUBMITTING', payload: false });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Name:</label>
        <input
          type="text"
          value={state.values.name}
          onChange={(e) =>
            dispatch({
              type: 'SET_FIELD',
              payload: { field: 'name', value: e.target.value }
            })
          }
          onBlur={() => dispatch({ type: 'SET_TOUCHED', payload: 'name' })}
        />
        {state.touched.name && state.errors.name && (
          <span style={{ color: 'red' }}>{state.errors.name}</span>
        )}
      </div>

      <div>
        <label>Email:</label>
        <input
          type="email"
          value={state.values.email}
          onChange={(e) =>
            dispatch({
              type: 'SET_FIELD',
              payload: { field: 'email', value: e.target.value }
            })
          }
          onBlur={() => dispatch({ type: 'SET_TOUCHED', payload: 'email' })}
        />
        {state.touched.email && state.errors.email && (
          <span style={{ color: 'red' }}>{state.errors.email}</span>
        )}
      </div>

      <div>
        <label>Password:</label>
        <input
          type="password"
          value={state.values.password}
          onChange={(e) =>
            dispatch({
              type: 'SET_FIELD',
              payload: { field: 'password', value: e.target.value }
            })
          }
          onBlur={() => dispatch({ type: 'SET_TOUCHED', payload: 'password' })}
        />
        {state.touched.password && state.errors.password && (
          <span style={{ color: 'red' }}>{state.errors.password}</span>
        )}
      </div>

      <button type="submit" disabled={state.isSubmitting}>
        {state.isSubmitting ? 'Submitting...' : 'Register'}
      </button>
    </form>
  );
}
```

---

## useReducer 与 Context 的配合

### 全局状态管理

```tsx
// 1. 创建 useReducer + Context

type State = {
  user: User | null;
  theme: 'light' | 'dark';
  language: string;
};

type Action =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_LANGUAGE'; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);

// 2. 创建 Provider

function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    user: null,
    theme: 'light',
    language: 'en'
  });

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// 3. 自定义 Hook

function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context.state;
}

function useAppDispatch() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppDispatch must be used within AppProvider');
  }
  return context.dispatch;
}

// 4. 使用

function ThemeButton() {
  const { theme } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <button
      onClick={() =>
        dispatch({
          type: 'SET_THEME',
          payload: theme === 'light' ? 'dark' : 'light'
        })
      }
    >
      Toggle Theme ({theme})
    </button>
  );
}

function UserProfile() {
  const { user } = useAppState();
  const dispatch = useAppDispatch();

  const handleLogin = () => {
    const user = { id: 1, name: 'Alice' };
    dispatch({ type: 'SET_USER', payload: user });
  };

  const handleLogout = () => {
    dispatch({ type: 'SET_USER', payload: null });
  };

  if (!user) {
    return <button onClick={handleLogin}>Login</button>;
  }

  return (
    <div>
      <p>Welcome, {user.name}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <ThemeButton />
      <UserProfile />
    </AppProvider>
  );
}
```

---

## 常见陷阱和最佳实践

### 1. ❌ 在 reducer 中执行副作用

```tsx
// ❌ 错误：在 reducer 中执行副作用

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_USER':
      // ❌ 不要在 reducer 中发起网络请求
      fetch('/api/user').then(res => res.json()).then(data => {
        // 这里无法更新 state
      });

      return { ...state, loading: true };

    default:
      return state;
  }
}

// ✅ 正确：副作用用 useEffect

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_USER_START':
      return { ...state, loading: true };

    case 'FETCH_USER_SUCCESS':
      return { ...state, loading: false, user: action.payload };

    case 'FETCH_USER_ERROR':
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
}

function Component() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: 'FETCH_USER_START' });

    fetch('/api/user')
      .then(res => res.json())
      .then(data => dispatch({ type: 'FETCH_USER_SUCCESS', payload: data }))
      .catch(error => dispatch({ type: 'FETCH_USER_ERROR', payload: error }));
  }, []);

  return <div>...</div>;
}
```

### 2. ❌ 在 reducer 中修改 state

```tsx
// ❌ 错误：在 reducer 中修改 state

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_ITEM':
      // ❌ 不要直接修改 state
      state.items.push(action.payload);
      return state;

    case 'UPDATE_ITEM':
      const item = state.items.find(i => i.id === action.payload.id);
      if (item) {
        item.name = action.payload.name;  // ❌ 直接修改
      }
      return state;

    default:
      return state;
  }
}

// ✅ 正确：返回新对象

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, action.payload]
      };

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, name: action.payload.name }
            : item
        )
      };

    default:
      return state;
  }
}
```

### 3. ❌ 在 reducer 中使用随机值或时间

```tsx
// ❌ 错误：在 reducer 中使用随机值

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TODO':
      // ❌ 不要在 reducer 中生成 ID
      return {
        ...state,
        todos: [
          ...state.todos,
          {
            id: Math.random(),  // ❌ 随机值
            text: action.payload,
            completed: false
          }
        ]
      };

    case 'ADD_LOG':
      // ❌ 不要在 reducer 中使用时间
      return {
        ...state,
        logs: [
          ...state.logs,
          {
            message: action.payload,
            timestamp: Date.now()  // ❌ 时间
          }
        ]
      };

    default:
      return state;
  }
}

// ✅ 正确：在 action 中提供值

function Component() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addTodo = (text: string) => {
    dispatch({
      type: 'ADD_TODO',
      payload: {
        id: Date.now(),  // ✅ 在组件中生成
        text,
        completed: false
      }
    });
  };

  const addLog = (message: string) => {
    dispatch({
      type: 'ADD_LOG',
      payload: {
        message,
        timestamp: Date.now()  // ✅ 在组件中生成
      }
    });
  };

  return <div>...</div>;
}
```

### 4. ❌ 过度使用 useReducer

```tsx
// ❌ 错误：简单状态也用 useReducer

function Counter() {
  const [state, dispatch] = useReducer(
    (state, action) => {
      switch (action.type) {
        case 'increment':
          return state + 1;
        case 'decrement':
          return state - 1;
        default:
          return state;
      }
    },
    0
  );

  // 问题：
  // 1. 状态很简单，不需要 useReducer
  // 2. 增加了代码复杂度

  return (
    <div>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <span>{state}</span>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
    </div>
  );
}

// ✅ 正确：简单状态用 useState

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <span>{count}</span>
      <button onClick={() => setCount(c => c - 1)}>-</button>
    </div>
  );
}
```

### 5. ❌ reducer 函数过于复杂

```tsx
// ❌ 错误：reducer 函数过于复杂

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'UPDATE_COMPLEX_DATA':
      // ❌ 逻辑过于复杂
      const newData = state.data.map(item => {
        if (item.category === action.payload.category) {
          const filteredItems = item.items.filter(
            i => i.status === action.payload.status
          );
          const sortedItems = filteredItems.sort((a, b) =>
            a.priority - b.priority
          );
          const groupedItems = sortedItems.reduce((groups, item) => {
            const group = item.group || 'default';
            if (!groups[group]) {
              groups[group] = [];
            }
            groups[group].push(item);
            return groups;
          }, {});

          return {
            ...item,
            items: Object.entries(groupedItems).map(([name, items]) => ({
              name,
              items
            }))
          };
        }
        return item;
      });

      return { ...state, data: newData };

    default:
      return state;
  }
}

// ✅ 正确：提取复杂逻辑到辅助函数

function updateComplexData(
  data: DataItem[],
  payload: UpdatePayload
): DataItem[] {
  return data.map(item => {
    if (item.category !== payload.category) {
      return item;
    }

    const filteredItems = item.items.filter(
      i => i.status === payload.status
    );
    const sortedItems = filteredItems.sort((a, b) =>
      a.priority - b.priority
    );
    const groupedItems = sortedItems.reduce((groups, item) => {
      const group = item.group || 'default';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
      return groups;
    }, {} as Record<string, Item[]>);

    return {
      ...item,
      items: Object.entries(groupedItems).map(([name, items]) => ({
        name,
        items
      }))
    };
  });
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'UPDATE_COMPLEX_DATA':
      return {
        ...state,
        data: updateComplexData(state.data, action.payload)
      };

    default:
      return state;
  }
}
```

---

## 核心要点总结

### useReducer 的作用

1. **集中管理状态逻辑**：将状态更新逻辑集中在 reducer 中
2. **可预测的状态更新**：通过 dispatch 触发 action，状态更新清晰
3. **适合复杂状态**：多个子值、复杂更新逻辑、需要历史记录
4. **易于测试**：reducer 是纯函数，易于单元测试

### 工作原理

```tsx
// 核心逻辑
function useReducer(reducer, initialState) {
  const [state, dispatch] = useState(initialState);

  const dispatchWrapper = useCallback((action) => {
    setState(currentState => reducer(currentState, action));
  }, [reducer]);

  return [state, dispatchWrapper];
}

// 实际实现更复杂，但本质如此
```

### useState vs useReducer

| 特性 | useState | useReducer |
|-----|---------|-----------|
| 简单度 | ✅ 简单 | ❌ 复杂 |
| 状态逻辑 | 分散在多个 setter 中 | 集中在 reducer 中 |
| 可测试性 | ❌ 难以测试 | ✅ 易于测试 |
| 适用场景 | 简单状态、独立状态 | 复杂状态、多个相关状态 |
| 代码可读性 | ✅ 直观 | ⚠️ 需要理解 reducer 模式 |
| 性能 | 相同 | 相同 |

### 何时使用 useReducer

**适合使用**：
- ✅ 状态更新逻辑复杂
- ✅ 多个相关状态
- ✅ 需要状态历史记录
- ✅ 需要 Undo/Redo 功能
- ✅ 状态更新依赖于前一个状态

**不适合使用**：
- ❌ 简单的状态（布尔值、数字、简单对象）
- ❌ 独立的状态
- ❌ 状态更新逻辑简单

### 最佳实践

1. ✅ **reducer 必须是纯函数**：不修改输入，无副作用
2. ✅ **返回新对象**：不要直接修改 state
3. ✅ **使用 TypeScript**：为 State 和 Action 定义类型
4. ✅ **提取复杂逻辑**：将复杂逻辑提取到辅助函数
5. ✅ **配合 Context 使用**：实现全局状态管理
6. ✅ **编写单元测试**：测试 reducer 函数
7. ❌ **不要在 reducer 中执行副作用**：副作用用 useEffect
8. ❌ **不要在 reducer 中使用随机值或时间**：在 action 中提供
9. ❌ **不要过度使用**：简单状态用 useState

### useReducer + Context 模式

```tsx
// 1. 定义 reducer
function reducer(state, action) { ... }

// 2. 创建 Context
const Context = createContext(null);

// 3. 创建 Provider
function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <Context.Provider value={{ state, dispatch }}>
      {children}
    </Context.Provider>
  );
}

// 4. 创建自定义 Hook
function useApp() {
  const context = useContext(Context);
  if (!context) throw new Error('useApp must be used within Provider');
  return context;
}

// 5. 使用
function Component() {
  const { state, dispatch } = useApp();
  return <div>...</div>;
}
```

记住这些原则，你就能正确使用 useReducer 管理复杂的状态逻辑！
