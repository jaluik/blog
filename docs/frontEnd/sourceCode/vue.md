---
id: vue
title: vue源码
sidebar_label: vue源码
description: vue源码相关的细节
keywords:
  - vue
  - 源码
  - 实现一个vue
slug: /frontEnd/sourceCode/vue
---

## Vue 中的工程化优化

纯函数： Vue 中大量使用`/*#__PURE__*/`注释（表明为纯函数），便于 webpack、rollup 等打包工具作`tree shaking`

## 实现响应式

### 一个最基础响应式

为了实现一个响应式，我们需要监听对象的赋值和取值操作。

```js
// 用于收集每次的effect
let activeEffect = null
function effect(fn) {
  activeEffect = fn
  fn()
}

const data = { text: 'originText' }
// 监听数据的读取和写入操作
const bucket = new WeakMap()
const obj = new Proxy(data, {
  get(target, key) {
    track(target, key)
    return target[key]
  },
  set(target, key, newVal) {
    target[key] = newVal
    trigger(target, key)
  },
})

function track(target, key) {
  if (!activeEffect) return
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffect)
}

function trigger(target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const deps = depsMap.get(key)
  if (!deps) return
  deps.forEach((fn) => fn())
}
```

测试代码：

```js
effect(() => {
  console.log('执行了')
  document.body.innerText = obj.text
})

setTimeout(() => {
  obj.text = 'jaluik'
}, 2000)
```

ps: 这里为什么使用`WeakMap`来存储 target 值呢？因为如果 target 不再使用，使用`WeakMap`可以使得 target 被垃圾回收机制回收，而`Map`由于持有 target，target 不会被回收，造成内存泄露

例子：

```js
const map = new Map()
const weakMap = new WeakMap()
;(function () {
  const foo = { foo: 1 }
  const bar = { bar: 2 }
  map.set(foo, 1)
  weakMap.set(bar, 2)
})()
// map.size  1
// weakMap.size undefined
```

### 支持分支切换

简单版本的响应式有一个问题，针对下面的代码，会重复执行无用代码。

```js
const data = { ok: true, text: 'hello world' }
const obj = new Proxy(data, {
  /* */
})

effect(() => {
  document.body.innerText = obj.ok ? obj.text : 'not'
})
```

比如上面代码， 当`obj.ok = false`时，`obj.text`便不应该订阅副作用函数，解决思路：**在每次副作用函数执行前，将其从关联的依赖项中先移除**

首先改造全局处理函数：

```js
let activeEffect = null
function effect(fn) {
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn
    fn()
  }
  effectFn.deps = []
  effectFn()
}

function cleanup(effectFn) {
  for (i === 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i]
    deps.delete(effectFn)
  }
  effectFn.deps.length = 0
}

// ...before

function track(target, key) {
  if (!activeEffect) return
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffect)
  // 这里形成了一个相互引用
  activeEffect.deps.push(deps)
}

function trigger(target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const deps = depsMap.get(key)
  if (!deps) return
  //  deps.forEach((fn) => fn())
  // 注意这里的变化！！！是为了避免无限循环调用
  const effectToRun = new Set(deps)
  effectToRun.forEach((item) => item())
}
```

这里面会有一个无限循环的过程， 因为`trigger`函数执行时，会先执行`cleanup`然后在读取变量时再执行`track操作`，相当于下面的代码，这在对 set 的规范中会无限执行下去。

```js
const set = new Set([1])
set.forEach((item) => {
  set.delete(1)
  set.add(1)
  console.log('遍历中')
})
```

### 支持嵌套的 effect

> 在 vue 中，经常会有组件嵌套组件的场景出现。对于每一个组件，组件的渲染函数其实都是在 effect 中执行的，因此需要支持组件的嵌套

需要我们的响应式支持下面的使用方式：

```js
const data = { foo: true, bar: true }
const obj = new Proxy(data, {
  /* ...*/
})

let temp1, temp2
effect(function effectFn1() {
  console.log('effectFn1执行了')
  effect(function effectFn2() {
    console.log('effectFn2执行了')
    //在effectFn2 中读取bar属性
    temp2 = obj.bar
  })
  // 在effectFn1中读取foo属性
  temp1 = obj.foo
})
```

如果用之前的源码执行这个示例代码会有一个问题，就是`obj.foo`取值时的依赖函数会被错误的引用到`effectFn2`中，因为`activeEffect`没有复原机制，所以我们需要一个栈来解决这个问题。

```js
let activeEffect = null
const effectStack = []

const effect = (fn) => {
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn
    effectStack.push(effectFn)
    fn()
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
  }
  effectFn.deps = []
  effectFn()
}
```

### 解决无限循环调用问题

> 针对下面的代码，会无限调用下去然后报错。

```js
const data = { foo: 1 }
const obj = new Proxy(data, {
  /*...*/
})

effect(() => {
  obj.foo = obj.foo + 1
})
```

原因在于：`obj.foo`读取时会把 effect 内的函数作为依赖项，在`obj.foo`赋值时，又会调用这个函数进行赋值，这样就会层层循环调用下去

解决思路：如果`trigger`触发的函数和当前函数相同则不再执行当前函数

```js
function trigger(target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const deps = depsMap.get(key)
  if (!deps) return
  const effectToRun = new Set()
  deps &&
    deps.forEach((item) => {
      if (activeEffect !== item) {
        effectToRun.add(item)
      }
    })
  effectToRun.forEach((item) => item())
}
```

### 增加用户自定义的调度器

> 很多时候我们并不希望 `effect`中的函数马上执行，而是传入调度器来控制 `effect` 中的函数执行时机

比如

```js
const data = { foo: 1 }
const obj = new Proxy(data, {
  /*...*/
})
effect(() => {
  console.log(obj.foo)
})

obj.foo++

console.log('执行了')
```

正常的执行顺序为：

```
1
2
'执行了'
```

我们希望能用户自定义执行顺序，比如

```
1
"执行了"
2
```

首先需要用户可以在 effect 函数中传入自定义的配置项

```js
function effect(fn, options = {}) {
  const effectFn = () => {
    //...before
  }
  effectFn.options = options
  effectFn.deps = []
  effectFn()
}
```

在`trigger`触发时，将控制权交给用户

```js
function trigger(target, key) {
  //...before
  effectToRun.forEach((item) => {
    if (item.options.scheduler) {
      item.options.scheduler(item)
    } else {
      item()
    }
  })
}
```

用户端的使用：

```js
const data = { foo: 1 }
const obj = new Proxy(data, {
  /*...*/
})
effect(
  () => {
    console.log(obj.foo)
  },
  {
    scheduler(fn) {
      setTimeout(fn)
    },
  }
)

obj.foo++

console.log('执行了')
```

### 支持 lazy

> 有时候 effect 函数并不想立即执行，而是在需要的时候才执行。

比如我们想支持`computed`属性，使用方式：

```js
const data = { foo: 1, bar: 2 }
const obj = new Proxy(data, {
  /*...*/
})

const sumRes = computed(() => obj.foo + obj.bar)
console.log(sumRes.value) //3
```

改造之前的代码：

```js
function computed(getter) {
  let value
  // 如果监听的值发生了变化，那么我们用这个来标识需要重新计算
  let dirty = true
  const effectFn = effect(getter, {
    lazy: true,
    scheduler: () => {
      dirty = true
    },
  })
  const obj = {
    get value() {
      if (dirty) {
        value = effectFn()
        dirty = false
      }
      return value
    },
  }
  return obj
}

// effect函数需要改造支持lazy参数
function effect(fn, options = {}) {
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn
    effectStack.push(effectFn)
    const res = fn()
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
    return res
  }
  effectFn.options = options
  effectFn.deps = []
  if (!options.lazy) {
    effectFn()
  }
  return effectFn
}
```

改造之后还有一个小缺陷， 比如下面的代码

```js
const sumRes = computed(() => obj.foo + obj.bar)
effect(() => {
  console.log(sumRes.value) //3
})
```

我们期望在 sumRes.value 变化时，执行外层的 effect 函数

于是需要改造`computed`函数：

```js
function computed(getter) {
  let value
  // 如果监听的值发生了变化，那么我们用这个来标识需要重新计算
  let dirty = true
  const effectFn = effect(getter, {
    lazy: true,
    scheduler: () => {
      dirty = true
      // 手动触发
      trigger(obj, 'value')
    },
  })
  const obj = {
    get value() {
      if (dirty) {
        // 手动追踪
        track(obj, 'value')
        value = effectFn()
        dirty = false
      }
      return value
    },
  }
  return obj
}
```

### 实现 watch

> 有这样的使用场景，监听某个数据的变化，如果数据变化就执行回调。

```js
watch(obj, (newValue, oldValue) => {
  console.log('数据变了')
})
// 其中watch的第一个参数可以是函数 比如()=> obj.foo
obj.foo++
```

```js
function watch(source, cb) {
  let getter
  if (typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }
  let newValue, oldValue
  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler: () => {
      newValue = effectFn()
      cb(newValue, oldValue)
      oldValue = newValue
    },
  })

  oldValue = effectFn()
}

function traverse(value, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) return
  // seen用于避免循环引用导致的死循环
  seen.add(value)
  for (const key in value) {
    // value[keu] 用于响应式的注册监听器
    traverse(value[key], seen)
  }
  return value
}
```

下面我们支持一些其他的配置参数，使用方式

```js
watch(
  obj,
  (newValue, oldValue) => {
    console.log('数据变了')
  },
  {
    // immediate表示当前需要立即执行
    immediate: true,
    // post表示同步完成后的微任务中执行
    flush: 'post',
  }
)
// 其中watch的第一个参数可以是函数 比如()=> obj.foo
obj.foo++
```

改造 watch 函数：

```js
function watch(source, cb, options = {}) {
  let getter
  if (typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }
  let newValue, oldValue

  const job = () => {
    newValue = effectFn()
    cb(newValue, oldValue)
    oldValue = newValue
  }
  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler: () => {
      if (options.flush === 'post') {
        Promise.resolve().then(job)
      } else {
        job()
      }
    },
  })
  if (option.immediate) {
    job()
  } else {
    oldValue = effectFn()
  }
}
```

#### 解决竞态问题

如果 watch 中的回调是一个异步回调，当重复执行时回调时会有竞态问题。比如下面的例子：

```js
let finalData
watch(obj, async () => {
  const result = await fetch(obj)
  finalData = result
})
```

如果我们想解决这个竞态问题，可以在回调中提供第三个参数，用于标识过期。使用方式：

```js
let finalData
watch(obj, async (newVal, oldValue, onInvalidate) => {
  let expired = false
  onInvalidate(() => {
    expired = true
  })
  const result = await fetch(obj)
  if (!expired) {
    finalData = result
  }
})
```

然后我们需要改造一下`watch`函数：

```js
function watch(source, cb, options = {}) {
  let getter
  if (typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }
  let newValue, oldValue, cleanup

  function onInvalidate(fn) {
    cleanup = fn
  }

  const job = () => {
    newValue = effectFn()
    if (cleanup) {
      cleanup()
    }
    cb(newValue, oldValue, onInvalidate)
    oldValue = newValue
  }
  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler: () => {
      if (options.flush === 'post') {
        Promise.resolve().then(job)
      } else {
        job()
      }
    },
  })
  if (option.immediate) {
    job()
  } else {
    oldValue = effectFn()
  }
}
```

## 非原始值的响应式方案

首先介绍一下`Reflect`对象，`Reflect`下的方法和`Proxy`拦截器方法名称基本是一一对应的关系，`Reflect`方法一般有第三个参数，用于指定接收值`receiver`, `receiver`会指定替代 this 的指向

```js
const obj = {
  get foo() {
    return this.foo
  },
}
console.log(Reflect.get(obj, 'foo', { foo: 2 }))
```

有如下一个 case，其中`p`是`obj`的拦截对象：

```js
const obj = {
  foo: 1,
  get bar() {
    return this.foo
  },
}
const p = new Proxy(obj, {
  get(target, key) {
    track(target, key)
    return target[key]
  },
  set(target, key, newVal) {
    target[key] = newVal
    trigger(target, key)
  },
})
effect(() => {
  console.log(p.bar)
})

// 不会执行effect
p.foo++
```

分析：原因在于`Proxy`中的`get`返回了`this.foo`值，其中`this`执行了原始对象`obj`，因此`effect`中的函数相当于`effect(()=> {console.log(obj.foo)})`，因此我们此时需要使用`Reflect`的第三个参数来调整`this`的指向

```js

const p = new Proxy(obj, {
  // receiver参数代表谁在读取属性
  get(target, key, receiver) {
    track(target, key)
    return Reflect.get(target, key, receiver)
  },
)

```
