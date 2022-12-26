---
id: vue
title: vue源码（响应式）
sidebar_label: vue源码（响应式）
description: vue源码相关的细节
keywords:
  - vue
  - 源码
  - 实现一个vue
slug: /frontEnd/sourceCode/vue
---

## Vue 中的工程化优化

纯函数： Vue 中大量使用`/*#__PURE__*/`注释（表明为纯函数），便于 webpack、rollup 等打包工具作`tree shaking`

## 非原始对象实现响应式

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

### 代理 object

访问一个普通对象所可能具有的所有读取条件：

- 直接读取，如`obj.foo`， 代理`get`方法
- 判断对象是否有 key，如`key in obj`， 代理`has`方法
- 遍历对象，如`for const key in obj {}`， 代理`ownKeys`、`set`(只对新增的属性触发)、`deleteProperty`方法，

实现是这样的：

```js
const obj = { foo: 1 }

const ITERATE_KEY = Symbol()
const p = new Proxy(obj, {
  get(target, key, receiver) {
    track(target, key)
    return Reflect.get(target, key, receiver)
  },
  has(target, key) {
    track(target, key)
    return Reflect.get(target, key)
  },
  ownKeys(target) {
    track(target, ITERATE_KEY)
    return Reflect.ownKeys(target)
  },
  set(target, key, newVal, receiver) {
    const type = Object.prototype.hasOwnProperty.call(target, key)
      ? 'SET'
      : 'ADD'
    const res = Reflect.set(target, key, newVal, receiver)
    trigger(target, key, type)
    return res
  },
  deleteProperty(target, key) {
    const hasKey = Object.prototype.hasOwnProperty.call(target, key)
    const res = Reflect.deleteProperty(target, key)
    if (res && hasKey) {
      trigger(target, key, 'DELETE')
    }
    return res
  },
})

function trigger(target, key, type) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)

  const effectsToRun = new Set()
  effects &&
    effects.forEach((effectFn) => {
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn)
      }
    })

  if (type === 'ADD' || type === 'DELETE') {
    const iterateEffects = depsMap.get(ITERATE_KEY)
    iterateEffects &&
      iterateEffects.forEach((effectFn) => {
        if (effectFn !== activeEffect) {
          effectsToRun.add(effectFn)
        }
      })
  }
  effectsToRun.forEach((effectFn) => {
    if (effectFn.options.scheduler) {
      effectFn.options.scheduler(effectFn)
    } else {
      effectFn()
    }
  })
}
```

### 避免不必要的更新

经常有这种情况，对代理对象的属性进行了赋值，但是赋值后代理对象的属性值其实并未变化，所以无需触发更新。

```js
const p = new Proxy(obj, {
  set(target, key, newVal, receiver) {
    const oldVal = target[key]
    const type = Object.prototype.hasOwnProperty.call(target, key)
      ? 'SET'
      : 'ADD'
    const res = Reflect.set(target, key, newVal, receiver)
    // 不同且都不是NaN
    if (oldVal !== newVal && (oldVal !== oldVal || newVal !== newVal)) {
      trigger(target, key, type)
    }
    return res
  },
})
```

针对对象继承时，需要进行一些额外处理。

首先将代理函数封装起来

```js
function reactive(obj) {
  return new Proxy(obj, {
    //前文的代理桉树...
  })
}
```

例子：

```js
const obj = {}
const proto = { bar: 1 }
const child = reactive(obj)
const parent = reactive(proto)

Object.setPrototype(child, parent)

effect(() => {
  console.log(child.bar)
})

// 修改child.bar的值
child.bar = 2 //会导致副作用函数执行两次
```

这里面副作用函数执行了两次，主要原因在于：

1、 当调用`child.bar`时，由于`obj`不存在`bar`属性，所以会通过原型链调用`parent`中的`get`方法。此时会导致`parent`的副作用函数被收集。

2、当调用`child.bar = 2`时， 根据规范可知，如果设置的属性不存在于对象上，会调用`parent`中的`set`方法，只是`target`不是指向父元素，而是执行`child`

举一个例子：

```js
function testProxy(obj) {
  const pro = new Proxy(obj, {
    get(target, key, receiver) {
      return Reflect.get(target, key, receiver)
    },
    set(target, key, newVal, receiver) {
      console.log('target', target)
      console.log('receiver', receiver)
      return Reflect.set(target, key, newVal, receiver)
    },
  })
  return pro
}

const p = testProxy({ name: 'parent', age: 10 })

const c = testProxy({ name: 'child' })

Object.setPrototypeOf(c, p)

c.age = 11

// 执行结果
// target { name: 'child' }
// receiver { name: 'child' }
// target { name: 'parent', age: 10 }
// receiver { name: 'child' }
```

这里可以看到，父代理对象的 set 方法也执行了，但是`receiver`还是指向的子对象，所以我们可以通过`receiver`来判断当前当前是否需要执行渲染。

这里对`reactive函数进行改造`

```js
function reactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      if (key === 'raw') {
        return target
      }
      track(target, key)
      return Reflect.get(target, key, receiver)
    },
    set(target, key, newVal, receiver) {
      // 增加这一重判断，判断receiver必须是target的代理对象时才响应
      if (receiver.raw === target) {
        //...之前的判断
      }
    },
  })
}
```

### 浅响应和深响应

之前的方法还没有考虑如`obj.foo.bar = 2`这种修改的情形，需要支持深响应。

```js
function createReactive(obj, isShallow = false) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      if (key === 'raw') {
        return target
      }
      const res = Reflect.get(target, key, receiver)
      if (isShallow) {
        return res
      }
      track(target, key)
      if (typeof res === 'object' && res !== null) {
        return reactive(res)
      }
      return res
    },
  })
}

function reactive(obj) {
  return createReactive(obj)
}

function shallowReactive(obj) {
  return createReactive(obj, true)
}
```

### 代理数组

#### 数组的索引和 length 属性

数组的设值在规范中有说明，如果索引值大于数组长度，则会隐式地修改 length 的属性值
。

因此比如：

```js
const arr = reactive(['foo'])

effect(() => {
  console.log(arr.length)
})

arr[1] = 'bar' //这里应该触发副作用函数
```

这里需要改造，针对数组做特判

```js
function createReactive(obj, isShallow = false, isReadonly= false) {
  return new Proxy(obj, {
    set(target, key,newVal, receiver) {
      if(isReadonly) {
        console.warn(`属性${key}是已读的`)
        return true
      }
      const oldVal = target[key]
      const type = Array.isArray(target)
      ? Number(key) < target.length ? : "SET":"ADD"
      : Object.proto.hasOwnProperty.call(target, key) ? "SET" :"ADD"
      const res  = Reflect.get(target, key, newVal, receiver)
      if(target === receiver.raw) {
        if(newVal !== oldVal && (newVal ==== newVal || oldVal === oldVal)) {
          trigger(target, key, type)
        }
      }
      return res
    },
  })
}
```

注意这里只考虑了设置索引值会影响`length`属性，实际上，如果直接修改`length`也会影响索引值，但是特殊的是这里面只会影响大于新`length`值的索引属性

因此需要特殊处理一下上面的`createReactive`函数，将新的`length`值传递出去

```js
function createReactive(obj, isShallow = false, isReadonly= false) {
  return new Proxy(obj, {
    // 省略方法
    trigger(target, key, type, newVal)
  })
}

function trigger(target, key, type, newVal) {
   const depsMap = bucket.get(target)
   if(!depsMap) return

  //  省略之前写过的函数
  if(type === "ADD" && Array.isArray(target)) {
    const lengthEffects = depsMap.get("length")
    lengthEffects && lengthEffects.forEach(effectFn=> {
      if(effectFn !== activeEffect) {
        effectsToRun.add(effectFn)
      }
    })
  }

  if(Array.isArray(target) && key === "length") {
    depsMap.forEach((effects, key)=> {
      if(key > newVal) {
        effects.forEach(effectFn=> {
          if(effectFn !== activeEffect) {
            effectsToRun.add(effectFn)
          }
        })
      }
    })
  }
  // ...
}
```

#### 遍历数组

针对`for ... in` 方法，虽然对数组的遍历不推荐使用`for ... in`方法，但是数组作为对象，语法上也是可行的。如果使用了`for ... in`方法遍历，正如前文所述，会调用代理对象的`ownKeys`方法。

经过观察发现，如果数组遍历的 key 发生变化，本质上来讲还是数字的`length`属性发生了变化，因此我们可以直接追踪`length`属性

```js
function createReactive(obj, isShallow = false, isReadonly = false) {
  return new Proxy(obj, {
    // 省略方法
    ownKeys(target) {
      track(target, Array.isArray(target) ? 'length' : ITERATE_KEY)
      return Reflect.ownKeys(target)
    },
  })
}
```

针对`for ... of` 迭代，实际上是调用了可迭代对象的迭代协议的。 如果某个对象实现了`@@iterator`方法，则可以通过`for ... of`进行遍历，`js`中的`@@iterator`方法，即`[Symbol.iterator]`方法。

比如

```js
const obj = {
  val: 0,
  [Symbol.iterator]() {
    return {
      next() {
        return {
          value: obj.val++,
          done: obj.val > 10 ? true : false,
        }
      },
    }
  },
}
```

因为`for...of`遍历时会读取`length`和索引属性（产生了监听），所以我们之前的实现可以直接满足。

ps: 这里面有个值得注意的点`Array.prototype.values === Array.prototype[Symbol.iterator]`恒成立。

#### 数组的查找

> 基础类型数组的查找方法我们已经可以很好的满足了,但是这里考虑一种特殊情形，数组中的元素为对象时。

```js
const obj = {}
const arr = reactive([obj])

console.log(arr.includes(arr[0])) // false
```

分析： 这里出现这个的原因在于调用代理对象的`.includes`方法时，调用代理对象的数组索引，由于代理对象是响应式的，所以这里会生成一个`代理对象obj`，直接获取`arr[0]`时，又会生成一个代理对象，这两个代理对象虽然都是空对象，但是地址不一样所以不等。

相关代码：

```js
if (typeof res === 'object' && res !== null) {
  // 就是reactive(res)调用多次时生成了多个代理对象
  return isReadOnly ? readonly(res) : reactive(res)
}
```

这里做一下改进，用 map 来缓存值。

```js
const reactiveMap = new Map()

function reactive(obj) {
  const existProxy = reactiveMap.get(obj)
  if (existProxy) return existProxy
  const proxy = createReactive(obj)
  reactiveMap.set(obj, proxy)
  return proxy
}
```

这样改进了还有一个问题，比如

```js
const obj = {}
const arr = reactive([obj])

console.log(arr.includes(obj)) // false，用户需要它返回为true
```

因此我们需要重写代理数组的`includes`方法

```js
const arrayInstrumentations = {}

;['includes', 'indexOf', 'lastIndexOf'].forEach((method) => {
  const originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function (...args) {
    // this指向了代理对象
    let res = originMethod.apply(this, args)
    if (res === false) {
      res = originMethod.apply(this.raw, args)
    }
    return res
  }
})

function createReactive(obj, isShallow = false, isReadOnly = false) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      if (key === 'raw') {
        return target
      }
      // 注意这里的操作，进行了数组方法的重写
      if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
        return Reflect.get(arrayInstrumentations, key, receiver)
      }

      if (!isReadOnly && typeof key !== 'symbol') {
        track(target, key)
      }
      const res = Reflect.get(target, key, receiver)
      if (isShallow) {
        return res
      }
      if (typeof res === 'object' && res !== null) {
        return reactive(res)
      }
      return res
    },
  })
}
```

现在还有一个问题，举例：

```js
const arr = reactive([])

effect(() => {
  arr.push(1)
})

effect(() => {
  arr.push(1)
})
```

执行这段代码会造成栈溢出，原因在于第一个`effect`会添加`length`到依赖，第二个`effect`执行时会读取`length属性`，造成第一个`effect`函数执行，第一个又会设置`length`值，重复造成第二个`effect`又执行，最终一直嵌套执行下去造成栈溢出。

这里我们需要改造为特定方法执行时，不执行依赖收集。

```js
let shouldTrack = true

;['push', 'pop', 'shift', 'unshift', 'splice'].forEach((method) => {
  const originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function (...args) {
    // this指向了代理对象
    shouldTrack = false
    let res = originMethod.apply(this, args)
    shouldTrack = true
    return res
  }
})

function track(target, key) {
  if (!activeEffect || !shouldTrack) return
  // 省略的逻辑
}
```

### 代理 Set 和 Map

针对`Set`和`Map`的例子，我们需要实现这样的效果：

```js
const proxy = reactive(new Map([['key', 1]]))
effect(() => {
  console.log(proxy.get('key'))
})

proxy.set('key', 2) //触发响应
```

这一节可以省略，主要和之前的方法差不多。 需要注意的是有些内部方法槽如`[[SetData]`只有原始的`Set`或者`Map`才有，因此使用代理对象执行集合类型的操作方法时，需要指定正确的`this`指向。

## 原始对象实现响应式

### 引入 ref 的概念

> 由于 Proxy 的目标只能是非原始值，因此如果想对原始对象实现响应式，只能通过 ref 包裹。

一个简单的方法：

```js
function ref(val) {
  const wrapper = {
    value: val,
  }
  // 可以通过xx.__v_isRef === true 来判断当前返回值是否是一个原始值包裹的响应式对象
  Object.defineProperty(wrapper, '__v_isRef', {
    value: true,
  })
  return reactive(wrapper)
}
```

然后在`effect`函数中，即可订阅`xx.val`来实现响应式。

### 解决响应丢失问题

使用扩展运算符`...`时，可能造成响应丢失的问题，比如：

```js
// obj是响应式对象
const obj = reactive({ foo: 1, bar: 2 })

const newObj = { ...obj }

effect(() => {
  console.log(newObj.foo)
})

// 此时修改后不会触发响应
obj.foo = 100
```

这里可以采用这种方式来解决这个问题

```js
function toRef(obj, key) {
  const wrapper = {
    get value() {
      return obj[key]
    },
    set value(newVal) {
      obj[key] = newVal
    },
  }
  // 保持概念上的一致，认为转换后的数据是真正的ref数据
  Object.defineProperty(wrapper, '__v_isRef', {
    value: true,
  })

  return wrapper
}

function toRefs(obj) {
  const ret = {}
  for (const key in obj) {
    ret[key] = toRef(obj, key)
  }
  return ret
}
```

这样我们只需要一步操作就可以完成对象的转换：

```js
const newObj = { ...toRefs(obj) }

// 通过.value来访问值
newObj.foo.value //1
```

因此 ref 对象不仅可以实现原始对象的响应式方案，也可以解决响应丢失的问题。

### 自动脱 ref

上面的实现有一个不够优雅的地方，必须使用`.value`才能获取到值，

```js
function proxyRefs(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver)
      return value.__v_isRef ? value.value : value
    },
    set(target, key,newValue receiver) {
      // 读取真实值
      const value = target[key]
      if(value.__v_isRef) {
        value.value = newValue
        return true
      }
      return Reflect.set(target, key,newValue receiver)
    },
  })
}

const newObj = proxyRefs({ ...toRefs(obj) })

console.log(newObj.foo) //1
```

在实际使用`vue`时，通过`setup`函数所返回的对象实际上就通过了`proxyRefs`进行了包裹。

除此以外，实际中的`reactive`也具有自动脱`ref`的能力。
