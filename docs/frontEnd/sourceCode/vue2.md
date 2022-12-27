---
id: vue2
title: vue源码（渲染器）
sidebar_label: vue源码（渲染器）
description: vue源码相关的细节
keywords:
  - vue
  - 源码
  - 实现一个vue
slug: /frontEnd/sourceCode/vue2
---

## 渲染器设计

### 与响应式数据结合

首先设计一个简单的渲染器：

这里我们可以直接引入`global`模式下的，`vue`响应式模块，`<script src="https://unpkg.com/@vue/reactivity@3.0.5/dist/reactivity.global.js"></script>`

```js
const { effect, ref } = VueReactivity

window.onload = () => {
  function renderer(domString, container) {
    container.innerHTML = domString
  }

  const count = ref(1)

  effect(() => {
    renderer(`<h1>${count.value}</h1>`, document.getElementById('app'))
  })

  count.value++
}
```

### 渲染器

一般渲染器不仅负责`render`，还可能涉及到`hydrate`等。

一个简单的渲染器：

```js
function createRenderer() {
  function render(vnode, container) {
    if (vnode) {
      path(container._vnode, vnode, container)
    } else {
      if (container._vnode) {
        // vnode为空，卸载操作
        container.innerHTML = ''
      }
    }
    container._vnode = vnode
  }
  return {
    render,
  }
}

// 使用
const renderer = createRenderer()
// 第一次渲染
renderer.render(vnode1, document.querySelector('#app'))
// 第二次渲染
renderer.render(vnode1, document.querySelector('#app'))
// 第三次渲染
renderer.render(vnode1, document.querySelector('#app'))
```
