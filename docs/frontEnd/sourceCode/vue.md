---
id: vue
title: vue源码
sidebar_label: vue源码
description: vue源码相关的细节
keywords:
  - vue
  - 源码
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
  set.delete(item)
  set.add(item)
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
