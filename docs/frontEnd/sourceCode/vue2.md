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

### 自定义渲染器

我们可以设计一个于平台无关的渲染器，通过配置的方式来传入操作 dom 相关的 api。

```js
function createRenderer(options) {
  const { createElement, setElementText, insert } = options

  function mount(vnode, container) {
    const el = createElement(vnode.type)
    if (typeof vnode.children === 'string') {
      setElementText(el, vnode.children)
    }
    insert(el, container)
  }

  function patch(v1, v2, container) {
    if (!v1) {
      mount(v2, container)
    } else {
      // 更新，暂时忽略实现
    }
  }

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

// 使用时:

const renderer = createRenderer({
  createElement(type) {
    return document.createElement(type)
  },
  setElementText(el, text) {
    el.textContent = el
  },
  insert(el, parent, anchor = null) {
    parent.insert(el, anchor)
  },
})
```

## 挂载与更新

首先对上面的例子做一下改造：

- `vnode`首先需要适配`children`为数组的情况，所以我们需要做一下适配
- `vnode`需要适配属性，传递给元素属性

```js
const vnode = {
  type: 'div',
  props: {
    id: 'foo',
  },
  children: [
    {
      type: 'p',
      children: 'hello',
    },
  ],
}

// 改造一下mountElement
function createContainer(ops) {
  // ...
  function mountElement(vnode, container) {
    const el = createElement(vnode.type)
    if (vnode.props) {
      for (const key in vnode.props) {
        el[key] = vnode.props[key]
      }
    }
    if (typeof vnode === 'string') {
      setElementText(el, vnode.children)
    } else if (Array.isArray(vnode.children)) {
      vnode.children.forEach((child) => {
        patch(null, child, el)
      })
    }
  }
}
```

### 关于 HTML Attributes 于 DOM Properties

什么是`HTML Attributes`，举个例子

```html
<input id="my-input" type="text" class="input-cls" value="foo" />
```

其中`type="text"`就是一个`HTML Attributes`。

什么是`DOM Properties`，举个例子

```js
const el = document.querySelector('#my-input')
```

其中`el`对应的属性就是`DOM Properties`。

`HTML Attributes`和`DOM Properties`基本都要相同的`key`属性，但是也有例外，比如：`HTML Attributes`中类名为`class`，而在`DOM Properties`类名属性为`className`。还有`aria-*`没有对应的`DOM Properties`。

#### 核心原则：`HTML Attributes`设置了`DOM Properties`的初始值

比如有一个`<input value="foo" />`,
当我们用获取`dom`的方式手动改`el.value = bar`后，

```js
console.log(el.getAttribute('value')) // foo
console.log(el.value) // bar
console.log(el.defaultValue) // bar
```

这里说明了一个`HTML Attributes`可能关联多个`DOM Properties`
