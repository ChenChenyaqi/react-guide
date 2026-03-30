# React.forwardRef 用法与原理详解

## React.forwardRef 是什么？

React.forwardRef 是一个高阶组件（HOC），用于**将 ref 从父组件转发到子组件**。它允许父组件直接访问子组件内部的 DOM 元素或组件实例。

**核心特性**：
- **转发 ref**：将 ref 传递给子组件的 DOM 元素
- **突破组件边界**：ref 无法直接穿透组件，forwardRef 解决了这个问题
- **访问子组件 DOM**：父组件可以直接操作子组件的 DOM
- **TypeScript 支持**：完整的类型推断

---

## 基本用法

### 1. 转发 DOM 元素的 ref

```tsx
// ❌ 问题：ref 无法穿透组件

function MyInput({ placeholder }: { placeholder: string }) {
  return <input type="text" placeholder={placeholder} />;
}

function Parent() {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();  // ❌ inputRef.current 是 MyInput 组件，不是 input 元素
    }
  };

  return (
    <div>
      <MyInput ref={inputRef} placeholder="Type here..." />
      <button onClick={focusInput}>Focus</button>
    </div>
  );

  // TypeScript 报错：Property 'ref' does not exist on type 'IntrinsicAttributes & { placeholder: string; }'
}

// ✅ 解决方案：使用 forwardRef

const MyInput = forwardRef<HTMLInputElement, { placeholder: string }>(
  ({ placeholder }, ref) => {
    return <input ref={ref} type="text" placeholder={placeholder} />;
  }
);

// 显示名称（用于调试）
MyInput.displayName = 'MyInput';

function Parent() {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();  // ✅ 现在可以访问 input 元素了
      inputRef.current.value = 'Hello, forwardRef!';
    }
  };

  return (
    <div>
      <MyInput ref={inputRef} placeholder="Type here..." />
      <button onClick={focusInput}>Focus</button>
    </div>
  );
}
```

### 2. 转发自定义组件的 ref

```tsx
// 子组件
const FancyButton = forwardRef<HTMLButtonElement, { children: React.ReactNode }>(
  ({ children }, ref) => {
    return (
      <button ref={ref} className="fancy-button">
        {children}
      </button>
    );
  }
);

FancyButton.displayName = 'FancyButton';

// 父组件
function Parent() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    if (buttonRef.current) {
      console.log('Button clicked!');
      console.log('Button text:', buttonRef.current.textContent);
    }
  };

  const animateButton = () => {
    if (buttonRef.current) {
      buttonRef.current.style.transform = 'scale(1.2)';
      setTimeout(() => {
        buttonRef.current!.style.transform = 'scale(1)';
      }, 200);
    }
  };

  return (
    <div>
      <FancyButton ref={buttonRef} onClick={handleClick}>
        Click me
      </FancyButton>
      <button onClick={animateButton}>Animate</button>
    </div>
  );
}
```

### 3. TypeScript 类型定义

```tsx
// 基本类型定义
const Component = forwardRef<HTMLDivElement, { title: string }>(
  ({ title }, ref) => {
    return <div ref={ref}>{title}</div>;
  }
);

// 接口形式
interface Props {
  value: string;
  onChange: (value: string) => void;
}

const Input = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange }, ref) => {
    return (
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
);

// 泛型组件
const GenericInput = forwardRef(
  <T extends unknown>(
    { value, onChange, ...props }: {
      value: T;
      onChange: (value: T) => void;
    } & React.HTMLAttributes<HTMLInputElement>,
    ref: React.ForwardedRef<HTMLInputElement>
  ) => {
    return (
      <input
        ref={ref}
        type="text"
        value={String(value)}
        onChange={(e) => onChange(e.target.value as T)}
        {...props}
      />
    );
  }
);
```

---

## 为什么需要 forwardRef？

### 问题：ref 无法穿透组件

```tsx
// ❌ 问题：ref 无法穿透组件

function InnerInput() {
  return <input type="text" />;
}

function OuterComponent() {
  return <InnerInput />;
}

function Parent() {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div>
      <OuterComponent ref={ref} />
      {/* ❌ TypeScript 报错：OuterComponent 没有接受 ref */}
    </div>
  );
}

// 问题分析：
// 1. ref 是 React 的特殊属性，无法通过 props 传递
// 2. 组件默认不接受 ref 属性
// 3. 即使传递了 ref，也无法转发到内部的 DOM 元素
```

### 解决方案：使用 forwardRef

```tsx
// ✅ 解决方案：使用 forwardRef

const InnerInput = forwardRef<HTMLInputElement>((props, ref) => {
  return <input ref={ref} type="text" {...props} />;
});

const OuterComponent = forwardRef<HTMLInputElement>((props, ref) => {
  return <InnerInput ref={ref} {...props} />;
});

function Parent() {
  const ref = useRef<HTMLInputElement>(null);

  const focus = () => {
    if (ref.current) {
      ref.current.focus();  // ✅ 可以访问 input 元素
    }
  };

  return (
    <div>
      <OuterComponent ref={ref} />
      <button onClick={focus}>Focus Input</button>
    </div>
  );
}
```

### ref 传递流程

```
不使用 forwardRef：
Parent (ref) → OuterComponent (ref 拒绝) → InnerInput (无法访问)

使用 forwardRef：
Parent (ref) → OuterComponent (转发 ref) → InnerInput (转发 ref) → input (绑定 ref)

最终：Parent 的 ref 指向 input DOM 元素
```

---

## 实现原理

### forwardRef 的内部机制

```tsx
// forwardRef 内部逻辑（简化版）

function forwardRef<P, T = HTMLElement>(
  render: (props: P, ref: React.Ref<T>) => React.ReactElement | null
): React.ForwardRefExoticComponent<P & React.RefAttributes<T>> {
  // 创建一个特殊的组件
  const ForwardRefComponent = React.forwardRef(render);

  // 设置组件类型
  (ForwardRefComponent as any).$$typeof = Symbol.for('react.forward_ref');

  // 设置渲染函数
  (ForwardRefComponent as any).render = render;

  return ForwardRefComponent;
}
```

### 完整伪源码

```tsx
// ========== 1. forwardRef 类型定义 ==========

type RefObject<T> = {
  readonly current: T | null;
};

type RefCallback<T> = (instance: T | null) => void;

type Ref<T> = RefObject<T> | RefCallback<T> | null;

interface ForwardRefRenderFunction<T, P = {}> {
  (props: P, ref: Ref<T>): React.ReactElement | null;
  displayName?: string;
}

type ForwardRefExoticComponent<P> = React.NamedExoticComponent<P> & {
  defaultProps?: Partial<P>;
  propTypes?: React.WeakValidationMap<P>;
};

// ========== 2. forwardRef 实现 ==========

function forwardRef<T, P = {}>(
  render: ForwardRefRenderFunction<T, P>
): ForwardRefExoticComponent<P & React.RefAttributes<T>> {
  // ========== 步骤 1：创建 ForwardRef 组件 ==========

  const ForwardRefComponent = function ForwardRefComponent(
    props: P,
    ref: Ref<T>
  ) {
    // ========== 步骤 2：获取当前渲染的 Fiber ==========
    const fiber = getFiber();
    const alternate = fiber.alternate;

    // ========== 步骤 3：首次渲染（mount）==========
    if (alternate === null) {
      // 创建 ForwardRef Fiber
      const forwardRefFiber: Fiber = {
        tag: ForwardRef,
        type: render,
        props,
        ref,
        return: null,
        child: null,
        sibling: null,
        memoizedProps: null,
        memoizedState: null,
        pendingProps: null,
        updateQueue: null
      };

      return forwardRefFiber;
    }

    // ========== 步骤 4：重新渲染（update）==========
    // 更新 props 和 ref
    const forwardRefFiber = alternate;
    forwardRefFiber.pendingProps = props;
    forwardRefFiber.ref = ref;

    return forwardRefFiber;
  };

  // ========== 步骤 5：设置组件属性 ==========

  // 设置组件类型标识
  (ForwardRefComponent as any).$$typeof = Symbol.for('react.forward_ref');

  // 保存渲染函数
  (ForwardRefComponent as any).render = render;

  // 设置默认 props（如果有）
  ForwardRefComponent.defaultProps = (render as any).defaultProps;

  // 设置 displayName（用于调试）
  if (render.displayName) {
    (ForwardRefComponent as any).displayName = `ForwardRef(${render.displayName})`;
  }

  return ForwardRefComponent as ForwardRefExoticComponent<P & React.RefAttributes<T>>;
}

// ========== 6. ForwardRef Fiber tag ==========
const ForwardRef = 13;  // ForwardRef 的 Fiber tag

// ========== 7. ForwardRef 组件渲染流程 ==========

function renderForwardRef(
  fiber: Fiber
): React.ReactElement | null {
  // ========== 步骤 1：获取渲染函数和 props/ref ==========
  const render = fiber.type as ForwardRefRenderFunction<any, any>;
  const props = fiber.pendingProps;
  const ref = fiber.ref;

  // ========== 步骤 2：调用渲染函数 ==========
  // 注意：ref 作为第二个参数传递
  const element = render(props, ref);

  // ========== 步骤 3：处理返回的 React 元素 ==========
  if (element === null || element === undefined) {
    return null;
  }

  // ========== 步骤 4：创建子 Fiber ==========
  const childFiber = createFiberFromElement(element);
  fiber.child = childFiber;
  childFiber.return = fiber;

  return element;
}

// ========== 8. ref 转发机制 ==========

function attachRef(
  ref: Ref<any> | null,
  instance: any
): void {
  // ========== 步骤 1：处理 null ref ==========
  if (ref === null) {
    return;
  }

  // ========== 步骤 2：处理函数 ref ==========
  if (typeof ref === 'function') {
    ref(instance);
    return;
  }

  // ========== 步骤 3：处理对象 ref ==========
  if (typeof ref === 'object' && 'current' in ref) {
    (ref as RefObject<any>).current = instance;
    return;
  }

  // ========== 步骤 4：其他类型（字符串 ref，已废弃）==========
  console.warn('String refs are no longer supported');
}

// ========== 9. ref 更新流程 ==========

function updateRef(
  fiber: Fiber,
  oldRef: Ref<any> | null,
  newRef: Ref<any> | null,
  instance: any
): void {
  // ========== 步骤 1：清理旧的 ref ==========
  if (oldRef !== null) {
    attachRef(oldRef, null);
  }

  // ========== 步骤 2：设置新的 ref ==========
  if (newRef !== null) {
    attachRef(newRef, instance);
  }
}

// ========== 10. 完整的 ForwardRef 渲染流程 ==========

function reconcileForwardRef(
  fiber: Fiber,
  oldFiber: Fiber | null
): Fiber {
  // ========== 步骤 1：获取当前 fiber ==========
  const newProps = fiber.pendingProps;
  const oldProps = oldFiber?.memoizedProps;
  const newRef = fiber.ref;
  const oldRef = oldFiber?.ref;

  // ========== 步骤 2：调用渲染函数 ==========
  const render = fiber.type as ForwardRefRenderFunction<any, any>;
  const element = render(newProps, newRef);

  // ========== 步骤 3：比较新旧元素 ==========
  if (oldFiber !== null && element !== null) {
    const oldElement = oldFiber.child?.memoizedProps;

    // 检查类型是否相同
    if (oldElement?.type === element.type) {
      // 类型相同，复用子 fiber
      const childFiber = oldFiber.child!;
      childFiber.pendingProps = element.props;

      // 更新 ref
      updateRef(
        childFiber,
        oldRef,
        newRef,
        childFiber.stateNode
      );

      return childFiber;
    }
  }

  // ========== 步骤 4：创建新的子 fiber ==========
  const childFiber = createFiberFromElement(element);
  fiber.child = childFiber;
  childFiber.return = fiber;

  // 设置 ref
  if (newRef !== null) {
    // ref 会在子 fiber 挂载时设置
    childFiber.ref = newRef;
  }

  return childFiber;
}

// ========== 11. Fiber 节点结构（添加 ForwardRef 相关字段）==========

interface Fiber {
  // ... 其他字段

  // ForwardRef 特有字段
  tag: number;  // ForwardRef 的 tag 是 13
  type: ForwardRefRenderFunction<any, any>;  // 渲染函数
  ref: Ref<any> | null;  // 父组件传递的 ref

  // 子元素
  child: Fiber | null;
  return: Fiber | null;
  sibling: Fiber | null;
}
```

### ref 转发流程图

```
父组件渲染
    │
    ▼
<MyComponent ref={myRef} />
    │
    ▼
ForwardRef 组件接收 ref
    │
    ▼
调用 render(props, ref)
    │
    ▼
子组件返回 <div ref={ref} />
    │
    ▼
div 组件挂载
    │
    ▼
创建 DOM 节点
    │
    ▼
attachRef(myRef, DOM 节点)
    │
    ▼
myRef.current = DOM 节点
```

---

## 实际应用示例

### 1. 封装可复用的输入组件

```tsx
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'ref'> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ...props }, ref) => {
    return (
      <div className="input-group">
        {label && <label>{label}</label>}
        <input
          ref={ref}
          className={`input ${error ? 'input-error' : ''}`}
          {...props}
        />
        {error && <span className="error-message">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

// 使用
function Form() {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (emailRef.current) {
      console.log('Email:', emailRef.current.value);
    }
    if (passwordRef.current) {
      console.log('Password:', passwordRef.current.value);
    }
  };

  const focusFirstInput = () => {
    if (emailRef.current) {
      emailRef.current.focus();
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <Input
        ref={emailRef}
        type="email"
        label="Email"
        placeholder="Enter your email"
      />
      <Input
        ref={passwordRef}
        type="password"
        label="Password"
        placeholder="Enter your password"
      />
      <button type="button" onClick={focusFirstInput}>
        Focus First Input
      </button>
      <button type="submit">Submit</button>
    </form>
  );
}
```

### 2. 转发 ref 到多个元素

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ isOpen, onClose, title, children }, ref) => {
    const overlayRef = useRef<HTMLDivElement>(null);

    // 同时转发 ref 到 overlay 和 content
    const setRefs = (instance: HTMLDivElement | null) => {
      // 传递给外部 ref
      if (typeof ref === 'function') {
        ref(instance);
      } else if (ref) {
        ref.current = instance;
      }

      // 同时设置到内部 ref
      overlayRef.current = instance;
    };

    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
      <div className="modal-overlay" ref={setRefs}>
        <div className="modal-content">
          <div className="modal-header">
            <h2>{title}</h2>
            <button onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            {children}
          </div>
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

// 使用
function App() {
  const modalRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('Modal Title');

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const animateModal = () => {
    if (modalRef.current) {
      modalRef.current.style.opacity = '0';
      modalRef.current.style.transform = 'scale(0.8)';

      requestAnimationFrame(() => {
        if (modalRef.current) {
          modalRef.current.style.transition = 'all 0.3s ease';
          modalRef.current.style.opacity = '1';
          modalRef.current.style.transform = 'scale(1)';
        }
      });
    }
  };

  return (
    <div>
      <button onClick={openModal}>Open Modal</button>
      <button onClick={animateModal}>Animate Modal</button>

      <Modal
        ref={modalRef}
        isOpen={isOpen}
        onClose={closeModal}
        title={title}
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Modal>
    </div>
  );
}
```

### 3. 在高阶组件中使用 forwardRef

```tsx
// HOC：添加日志功能
function withLog<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  const WithLog = forwardRef<any, P>((props, ref) => {
    useEffect(() => {
      console.log(`${WrappedComponent.name} mounted`);
      return () => {
        console.log(`${WrappedComponent.name} unmounted`);
      };
    }, []);

    return <WrappedComponent {...props} ref={ref} />;
  });

  WithLog.displayName = `withLog(${WrappedComponent.name})`;

  return WithLog;
}

// 原始组件
const Button = forwardRef<HTMLButtonElement, { children: React.ReactNode }>(
  ({ children }, ref) => {
    return (
      <button ref={ref} className="button">
        {children}
      </button>
    );
  }
);

// 使用 HOC
const LoggedButton = withLog(Button);

// 使用
function App() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    if (buttonRef.current) {
      console.log('Button text:', buttonRef.current.textContent);
    }
  };

  return (
    <LoggedButton ref={buttonRef} onClick={handleClick}>
      Click me
    </LoggedButton>
  );

  // 控制台输出：
  // Button mounted
  // Button text: Click me
  // Button unmounted
}
```

### 4. 配合 React.memo 使用

```tsx
const ExpensiveComponent = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => {
    console.log('ExpensiveComponent render');

    // 模拟昂贵的计算
    const processedData = useMemo(() => {
      return data.map((item: any) => ({
        ...item,
        processed: true
      }));
    }, [data]);

    return (
      <div ref={ref} className="expensive-component">
        {processedData.map((item: any) => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
    );
  }
);

ExpensiveComponent.displayName = 'ExpensiveComponent';

// 使用 React.memo 优化
const MemoizedExpensiveComponent = React.memo(ExpensiveComponent);

function App() {
  const [count, setCount] = useState(0);
  const [data] = useState([
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ]);
  const componentRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (componentRef.current) {
      componentRef.current.scrollTop = 0;
    }
  };

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <button onClick={handleScroll}>Scroll to Top</button>
      <MemoizedExpensiveComponent ref={componentRef} data={data} />
    </div>
  );
}

// 点击 Count 按钮：
// - App 重新渲染
// - MemoizedExpensiveComponent 不重新渲染（data 没变）
// - componentRef.current 仍然有效
```

---

## 常见陷阱和最佳实践

### 1. ❌ 直接通过 props 传递 ref

```tsx
// ❌ 错误：直接通过 props 传递 ref

function Child({ inputRef }: { inputRef: React.Ref<HTMLInputElement> }) {
  return <input ref={inputRef} />;
}

function Parent() {
  const inputRef = useRef<HTMLInputElement>(null);

  return <Child inputRef={inputRef} />;

  // 问题：
  // 1. 使用非标准的 props 名称（inputRef 而非 ref）
  // 2. 不符合 React 的约定
  // 3. 可能与其他 HOC 冲突
}

// ✅ 正确：使用 forwardRef

const Child = forwardRef<HTMLInputElement>((props, ref) => {
  return <input ref={ref} {...props} />;
});

function Parent() {
  const inputRef = useRef<HTMLInputElement>(null);

  return <Child ref={inputRef} />;
}
```

### 2. ❌ 在 forwardRef 中使用 useState

```tsx
// ❌ 错误：在 forwardRef 的渲染函数中使用 useState

const Component = forwardRef<HTMLDivElement>((props, ref) => {
  const [count, setCount] = useState(0);  // ❌ 不应该在渲染函数中使用 hooks

  return <div ref={ref}>{count}</div>;
});

// ✅ 正确：渲染函数本身就是一个组件，可以使用 hooks

const Component = forwardRef<HTMLDivElement>((props, ref) => {
  const [count, setCount] = useState(0);  // ✅ 这是正确的

  return <div ref={ref}>{count}</div>;
});

// 或者写成箭头函数形式
const Component = forwardRef<HTMLDivElement>(({ }, ref) => {
  const [count, setCount] = useState(0);  // ✅ 正确

  return <div ref={ref}>{count}</div>;
});
```

### 3. ❌ 忘记处理 ref 为 null 的情况

```tsx
// ❌ 错误：未处理 ref 为 null

const Component = forwardRef<HTMLDivElement>((props, ref) => {
  // 直接使用 ref，可能为 null
  return <div ref={ref as any}>{props.children}</div>;
});

// ✅ 正确：检查 ref 是否为 null

const Component = forwardRef<HTMLDivElement>((props, ref) => {
  // React 会自动处理 null ref，不需要手动检查
  return <div ref={ref}>{props.children}</div>;
});
```

### 4. ❌ 过度使用 forwardRef

```tsx
// ❌ 错误：不必要的 forwardRef

const SimpleDiv = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => {
    return <div ref={ref}>{children}</div>;
  }
);

function Parent() {
  const divRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <SimpleDiv ref={divRef}>Content</SimpleDiv>
    </div>
  );

  // 问题：
  // 1. SimpleDiv 只是简单的 div，不需要 forwardRef
  // 2. 增加了代码复杂度
  // 3. 性能开销（额外的组件层级）
}

// ✅ 正确：直接使用 div

function Parent() {
  const divRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div ref={divRef}>Content</div>
    </div>
  );
}

// 何时使用 forwardRef：
// 1. 组件封装了多个元素，需要访问内部的特定元素
// 2. 组件作为库发布，需要暴露内部元素的访问
// 3. 需要在父组件中操作子组件的 DOM
```

### 5. ❌ 在 forwardRef 中使用 useEffect 依赖 ref

```tsx
// ❌ 错误：在 useEffect 中依赖 ref.current

const Component = forwardRef<HTMLDivElement>((props, ref) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // ❌ 不要依赖 ref.current
    if (ref && 'current' in ref && ref.current) {
      setIsActive(true);
    }
  }, [ref]);  // ref 本身是稳定的，但 ref.current 会变化

  return <div ref={ref} className={isActive ? 'active' : ''}>
    {props.children}
  </div>;
});

// ✅ 正确：使用 ref callback 或直接在 ref 中操作

const Component = forwardRef<HTMLDivElement>((props, ref) => {
  const [isActive, setIsActive] = useState(false);

  // 使用 ref callback
  const setRef = (instance: HTMLDivElement | null) => {
    if (typeof ref === 'function') {
      ref(instance);
    } else if (ref) {
      ref.current = instance;
    }

    // 在这里设置状态
    setIsActive(instance !== null);
  };

  return <div ref={setRef} className={isActive ? 'active' : ''}>
    {props.children}
  </div>;
});
```

---

## 核心要点总结

### React.forwardRef 的作用

1. **转发 ref**：将 ref 从父组件转发到子组件的 DOM 元素
2. **突破组件边界**：解决 ref 无法穿透组件的问题
3. **访问子组件 DOM**：父组件可以直接操作子组件的 DOM
4. **TypeScript 支持**：完整的类型推断和类型安全

### 工作原理

```tsx
// 核心逻辑
function forwardRef(render) {
  return function ForwardRefComponent(props, ref) {
    return render(props, ref);
  };
}

// 使用
const MyComponent = forwardRef((props, ref) => {
  return <div ref={ref}>{props.children}</div>;
});

// 调用
<MyComponent ref={myRef}>Content</MyComponent>

// 流程：
// 1. 父组件传递 ref={myRef}
// 2. ForwardRefComponent 接收 ref
// 3. 调用 render(props, ref)
// 4. render 返回 <div ref={ref} />
// 5. div 挂载时，myRef.current = div DOM 节点
```

### ref 转发流程

```
父组件渲染
    ↓
<MyComponent ref={myRef} />
    ↓
ForwardRef 组件接收 ref
    ↓
调用 render(props, ref)
    ↓
子组件返回 <div ref={ref} />
    ↓
div 组件挂载
    ↓
创建 DOM 节点
    ↓
attachRef(myRef, DOM 节点)
    ↓
myRef.current = DOM 节点
```

### 何时使用 forwardRef

**应该使用**：
- ✅ 组件封装了多个元素，需要访问内部的特定元素
- ✅ 组件作为库发布，需要暴露内部元素的访问
- ✅ 需要在父组件中操作子组件的 DOM（聚焦、滚动等）
- ✅ 配合高阶组件使用，保持 ref 传递

**不应该使用**：
- ❌ 简单的包装组件（如直接返回一个 div）
- ❌ 不需要访问子组件 DOM 的情况
- ❌ 可以通过其他方式解决的问题（如 props 回调）

### 最佳实践

1. ✅ **设置 displayName**：便于调试
2. ✅ **使用 TypeScript**：正确的类型定义
3. ✅ **配合 React.memo 使用**：优化性能
4. ✅ **在高阶组件中使用**：保持 ref 传递
5. ✅ **使用 ref callback**：当需要访问 ref.current 时
6. ❌ **不要过度使用**：只在需要时使用
7. ❌ **不要通过 props 传递 ref**：使用 forwardRef
8. ❌ **不要在 useEffect 中依赖 ref.current**

### forwardRef + HOC 模式

```tsx
// HOC 模板
function withHOC<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  const WithHOC = forwardRef<any, P>((props, ref) => {
    // HOC 逻辑
    useEffect(() => {
      // ...
    }, []);

    return <WrappedComponent {...props} ref={ref} />;
  });

  WithHOC.displayName = `withHOC(${WrappedComponent.name})`;

  return WithHOC;
}

// 使用
const OriginalComponent = forwardRef<HTMLDivElement, Props>(...);
const EnhancedComponent = withHOC(OriginalComponent);
```

记住这些原则，你就能正确使用 React.forwardRef 转发 ref！
