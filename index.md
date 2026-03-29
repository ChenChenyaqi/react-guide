# React 学习路线图

## 前言：Vue 开发者转 React 核心差异

| Vue 概念 | React 对应 | 核心差异 |
|---------|----------|---------|
| 模板语法 | JSX | JS 完全驱动，没有指令 |
| Options API / Composition API | Hooks | React 只用 Hooks |
| 响应式系统 | useState + useEffect | 需要手动声明状态和依赖 |
| computed | useMemo | 需要手动声明依赖 |
| watch/watchEffect | useEffect | 按需执行 |
| v-for | map() | 数组方法 |
| v-if/v-else | && / 条件运算符 | 条件渲染是 JS 表达式 |
| 事件绑定 | onClick 等属性 | 驼峰命名，传递函数 |
| 组件 Props | 函数参数 | 父传子完全相同 |
| emit / $emit | 回调函数 props | 子传父通过回调 |
| provide/inject | Context API | 全局状态 |
| slots | children / props.children | 插槽机制 |

---

## 一、React 基础（核心概念）

### 1. JSX 语法
- [React 19 JSX 文档](https://react.dev/learn/writing-markup-with-jsx)
- 样式对象（驼峰：`fontSize` 而非 `font-size`）
- className 而非 class（React Native 用 style）
- `{}` 表达式插值
- 自闭合标签

### 2. 函数式组件
- 定义：`function Component() { return ... }` 或箭头函数
- 只是一个返回 JSX 的函数
- props 作为第一个参数传入

### 3. Props
```tsx
interface Props {
  title: string;
  count: number;
  onPress?: () => void;
}

function Button({ title, count, onPress }: Props) {
  return <Text onPress={onPress}>{title}: {count}</Text>
}
```

### 4. State（状态管理）
- [useState Hook](https://react.dev/reference/react/useState)
- `useState(initial)` 返回 `[value, setValue]`
- state 更新是异步的
- state 改变会触发重新渲染

```tsx
const [count, setCount] = useState(0)
const [user, setUser] = useState<{ name: string } | null>(null)
```

### 5. Effects（副作用）
- [useEffect Hook](https://react.dev/reference/react/useEffect)
- 类似 `onMounted` + `watchEffect`
- 依赖数组决定何时执行
- 返回清理函数（`onUnmounted`）

```tsx
useEffect(() => {
  // 组件挂载或依赖变化时执行
  console.log('effect')
  
  return () => {
    // 清理，类似 onUnmounted
    console.log('cleanup')
  }
}, [count]) // 依赖数组
```

---

## 二、React 19 新特性（必须掌握）

### 1. 新的 Hooks
- [use() Hook](https://react.dev/reference/react/use) - 读取 Promise/Context
- [useActionState](https://react.dev/reference/react/useActionState) - 表单状态
- [useOptimistic](https://react.dev/reference/react/useOptimistic) - 乐观更新

### 2. Server Components
- React 19 原生支持服务端组件
- RN 项目暂不涉及，但了解概念

### 3. Action 支持
- 表单 onAction、按钮 onClickAction
- 异步操作简化

---

## 三、常用 Hooks

| Hook | 用途 | Vue 对应 |
|-----|------|---------|
| useState | 组件状态 | ref/reactive |
| useEffect | 副作用 | onMounted + watch |
| useContext | 上下文数据 | inject |
| useMemo | 缓存计算值 | computed |
| useCallback | 缓存函数 | 无直接对应 |
| useRef | DOM 引用/持久值 | ref |
| useReducer | 复杂状态 | store 模式 |
| useTransition | 优先级更新 | - |
| useDeferredValue | 延迟更新 | - |

---

## 四、本项目技术栈学习

### 4.1 React Native 核心
- [React Native 官方文档](https://reactnative.dev/docs/getting-started)
- 核心组件：View、Text、Image、ScrollView、FlatList
- 样式：`style={{}}` 对象（本项目结合 NativeWind）
- 布局：Flexbox（类似 web CSS）

### 4.2 Expo
- [Expo 官方文档](https://docs.expo.dev/)
- Expo Router（文件路由，类似 Next.js）
- Expo 工具：expo-camera、expo-file-system、expo-haptics 等

### 4.3 Expo Router（路由）
- [Expo Router 文档](https://docs.expo.dev/router/introduction/)
- `app/` 目录自动生成路由
- `useRouter()` / `Link` 组件导航
- 嵌套路由、Tabs、模态

```tsx
import { useRouter } from 'expo-router'

function Page() {
  const router = useRouter()
  
  const goNext = () => {
    router.push('/detail')
    // 或 router.replace() / router.back()
  }
  
  return <Button onPress={goNext} title="Go" />
}
```

### 4.4 Zustand（状态管理）
- [Zustand 文档](https://zustand-demo.pmnd.rs/)
- 比 Redux/Vuex 简单很多
- 定义 store、使用 hooks

```tsx
// store.ts
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))

// 组件中使用
function Counter() {
  const { count, increment } = useStore()
  return <Text onPress={increment}>{count}</Text>
}
```

### 4.5 NativeWind + TailwindCSS
- [NativeWind 文档](https://www.nativewind.dev/)
- 直接写 className，类似 web
- 需要 `tailwind.config.js` 配置

```tsx
// 替代 style 对象
<View className="flex-1 justify-center items-center bg-blue-500">
  <Text className="text-white text-xl font-bold">Hello</Text>
</View>
```

### 4.6 React Native Reanimated（动画）
- [Reanimated 文档](https://docs.swmansion.com/react-native-reanimated/)
- 性能优化的动画库
- useAnimatedStyle、useSharedValue、withTiming 等

```tsx
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'

function AnimatedBox() {
  const offset = useSharedValue(0)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }))

  return (
    <Animated.View style={animatedStyle} />
  )
}
```

### 4.7 测试
- [Testing Library](https://callstack.github.io/react-native-testing-library/)
- `render()`、`fireEvent()`、`waitFor()`
- 测试用户行为，而非实现细节

---

## 五、学习路线（按顺序）

### 阶段 1：React 基础（1-2 天）
1. [React 官方教程](https://react.dev/learn)（跳过 class 组件）
2. 理解 JSX、组件、Props、State
3. 掌握 useState、useEffect

### 阶段 2：React 生态（2-3 天）
1. 常用 Hooks（useMemo、useCallback、useRef）
2. Context API（全局状态）
3. React 19 新特性概览

### 阶段 3：React Native 核心（3-4 天）
1. 核心组件（View、Text、Image、ScrollView、FlatList）
2. 样式系统
3. Flexbox 布局

### 阶段 4：Expo & Router（2 天）
1. Expo 基础
2. Expo Router 路由系统
3. useNavigation/useRouter

### 阶段 5：项目技术栈（按需学习）
1. Zustand 状态管理
2. NativeWind + TailwindCSS
3. Reanimated 动画
4. 其他 Expo 模块

### 阶段 6：实践
1. 阅读 `empty-bottle/app/` 现有代码
2. 尝试修改组件
3. 添加新功能

---

## 六、推荐资源

### 官方文档
- [React 19 官方文档](https://react.dev/)（最新）
- [React Native 官方文档](https://reactnative.dev/)
- [Expo 官方文档](https://docs.expo.dev/)

### 对比学习
- [Vue to React 速查表](https://vue-to-react.netlify.app/)
- [Vue 开发者的 React 指南](https://vue-vs-react.com/)

### 实战
- 本项目 `empty-bottle/app/` 代码
- [React Native Examples](https://reactnativeexamples.com/)

---

## 七、常见坑点（Vue 开发者注意）

1. **State 更新不可变**：必须用 `setCount(c => c + 1)` 或新对象，不能 `count.value++`
2. **useEffect 依赖数组**：漏加依赖会导致闭包陷阱
3. **事件处理**：`onPress={() => handler()}` 会创建新函数，应该用 `useCallback`
4. **列表渲染**：`key` 必须在直接子元素上，且要用稳定值（用 id 而非 index）
5. **样式**：React Native style 是对象，驼峰命名，`borderWidth` 而非 `border-width`
6. **条件渲染**：`{condition && <Component />}`，没有 v-else 指令

---

## 八、快速上手命令

```bash
# 启动开发服务器
cd empty-bottle && pnpm start

# 查看 TypeScript 类型
pnpm typecheck

# Lint 检查
pnpm lint

# 运行测试
pnpm test
```

---

## 九、下一步

1. 先通读 [React 官方教程](https://react.dev/learn)
2. 打开 `empty-bottle/app/index.tsx`，阅读现有组件
3. 尝试修改一个简单组件，理解数据流
4. 逐步学习项目用到的技术栈
