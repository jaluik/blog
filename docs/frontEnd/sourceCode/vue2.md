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
renderer.render(vnode2, document.querySelector('#app'))
// 第三次渲染
renderer.render(null, document.querySelector('#app'))
```

### 自定义渲染器

我们可以设计一个于平台无关的渲染器，通过配置的方式来传入操作 dom 相关的 api。

```js
function createRenderer(options) {
  const { createElement, setElementText, insert } = options

  function mountElement(vnode, container) {
    const el = createElement(vnode.type)
    if (typeof vnode.children === 'string') {
      setElementText(el, vnode.children)
    }
    insert(el, container)
  }

  function patch(v1, v2, container) {
    if (!v1) {
      mountElement(v2, container)
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
    if (typeof vnode.children === 'string') {
      setElementText(el, vnode.children)
    } else if (Array.isArray(vnode.children)) {
      vnode.children.forEach((child) => {
        patch(null, child, el)
      })
    }
    insert(el, container)
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

`HTML Attributes`和`DOM Properties`基本都有同的`key`属性，但是也有例外，比如：`HTML Attributes`中类名为`class`，而在`DOM Properties`类名属性为`className`。还有`aria-*`没有对应的`DOM Properties`。

#### 核心原则：`HTML Attributes`设置了`DOM Properties`的初始值

比如有一个`<input value="foo" />`,
当我们用获取`dom`的方式手动改`el.value = bar`后，

```js
console.log(el.getAttribute('value')) // foo
console.log(el.value) // bar
console.log(el.defaultValue) // bar
```

这里说明了一个`HTML Attributes`可能关联多个`DOM Properties`

### 正确设置元素属性

#### 情景 1：空字符串属性

设想有如下场景: `<button disabled>Button</button>`，如果我们使用`DOM Properties`来操作的话需要手动将`disable: ""` 这种类型的属性转换成`disabled=true`这种`DOM Properties`

#### 情景 2: 只读的 dom 属性

设想有如下场景： `<form id="form1"/> <input form="form1" />`，这里`input`元素的`el.form`是只读的，只能通过`setAttribute`赋值。

```js
// 改造一下mountElement
function createContainer(ops) {
  // ...
  // 这是处理场景二
  function shouldSetAsProps(el, key, value) {
    if (key === 'form' && el.tagName === 'INPUT') {
      return false
    }
    return key in el
  }
  function mountElement(vnode, container) {
    const el = createElement(vnode.type)
    if (vnode.props) {
      for (const key in vnode.props) {
        const value = vnode.props[key]
        if (shouldSetAsProps(el, key, value)) {
          const type = typeof el[key]
          // 这里是处理场景一
          if (type === 'boolean' && value === '') {
            el[key] = true
          } else {
            el[key] = value
          }
        } else {
          el.setAttribute(key, vnode.props[key])
        }
      }
    }
    // 省略children的处理
    insert(el, container)
  }
}
```

最后我们做一下小优化，把`mountElement`中属性赋值的操作作为平台无关的配置参数传入。

```js
const renderer = createRenderer({
  // 之前的其他属性
  patchProps(el, key, preValue, nextValue) {
    if (key === 'class') {
      // 设置class属性
      el.className = nextValue || ''
    } else if (shouldSetAsProps(el, key, value)) {
      const type = typeof el[key]
      // 这里是处理场景一
      if (type === 'boolean' && value === '') {
        el[key] = true
      } else {
        el[key] = value
      }
    } else {
      el.setAttribute(key, nextValue)
    }
  },
})

function mountElement(vnode, container) {
  const el = createElement(vnode.type)
  if (typeof vnode.children === 'string') {
    setElementText(el, vnode.children)
  } else if (Array.isArray(vnode.children)) {
    vnode.children.forEach((child) => {
      patch(null, child, el)
    })
  }
  if (vnode.props) {
    for (const key in vnode.props) {
      patchProps(el, key, null, vnode.props[key])
    }
  }
  insert(el, container)
}
```

### 卸载操作

当有`renderer.render(null, document.querySelector("#app"))`时，实际上需要卸载`dom`，这里需要考虑这些情况

- 容器内由多个组件渲染，需要正确调用组件的`beforeUnmount`、`unmounted`等方法
- 内容不由组件渲染的，如果元素存在自定义指令，需要在卸载时正确执行指令对应的钩子函数
- 需要移除绑定在`dom`上的监听函数

我们需要将`vnode`和`dom`建立联系，首先

```js
function mountElement(vnode, container) {
  const el = (vnode.el = createElement(vnode.type))
  // ...省略之前的内容
}

function unmount(vnode) {
  const parent = vnode.el.parentNode
  if (parent) {
    parent.removeChild(vnode.el)
  }
  //...可以根据vnode的类型做一些卸载工作
}

function render(vnode, container) {
  if (vnode) {
    patch(container._vnode, vnode, container)
  } else {
    if (container._vnode) {
      // 卸载vnode
      unmount(container._vnode)
    }
  }
  container._vnode = vnode
}
```

### 区分 vnode 的类型

如果`vnode.type`在更新阶段并不相同，则此时没有必要进行更新操作，而是先卸载之前的元素，再挂载新的`vnode`，并且还需要根据`vnode`的类型执行不同的挂载操作。

```js
function patch(n1, n2， container) {
  if(n1 && n1.type !== n2.type) {
    unmount(n1)
    n1 = null
  }
  const {type} = n2
  // 普通标签元素
  if(typeof type === "string") {
    if(!n1) {
      mountElement(n2,container)
    }else {
      patchElement(n1, n2)
    }
  }else if (typeof type === "object") {
    // ...组件
  } else if(type === "xxx") {
    // 处理其他类型的vnode
  }
}
```

### 事件的处理

> 我们这里约定以`on`开头的属性都视作事件

我们需要增加`patchProps`函数的判断

```js
const renderer = createRenderer({
  // 之前的其他属性
  patchProps(el, key, preValue, nextValue) {
    if (/^on/.test(key)) {
      const name = key.slice(2).toLowerCase()
      // 先卸载，再更新
      preValue && el.removeEventListener(name, preValue)
      el.addEventListener(name, nextValue)
    } else if (key === 'class') {
      // 设置class属性
      el.className = nextValue || ''
    } else if (shouldSetAsProps(el, key, value)) {
      const type = typeof el[key]
      // 这里是处理场景一
      if (type === 'boolean' && value === '') {
        el[key] = true
      } else {
        el[key] = value
      }
    } else {
      el.setAttribute(key, nextValue)
    }
  },
})
```

这里优化一下性能，可以不用重复卸载和挂载监听函数，示例如下：

```js
const renderer = createRenderer({
  patchProps(el, key, preValue, nextValue) {
    if (/^on/.test(key)) {
      // _vei是vue event invoker的简写
      let invoker = el._vei
      const name = key.slice(2).toLowerCase()
      if (nextValue) {
        if (!invoker) {
          invoker = el._vei = (e) => {
            invoker.value(e)
          }
          invoker.value = nextValue
          el.addEventListener(name, invoker)
        } else {
          // 只需要更新invoker.value就会更新处理函数
          invoker.value = nextValue
        }
      } else if (invoker) {
        el.addEventListener(name, invoker)
      }
    }
    // 省略其他判断代码
  },
})
```

### 事件冒泡和更新时机问题

分析下面这种情况

```js
const {effect, ref} = VueReactivity

const bol = ref(false)

effect(()=> {
  const vnode = {
    type: "div",
    props: bol.value ?  {
      onClick: ()=>{
        alert("父元素 clicked")
      } : {}
    },
    children: [{
      type: "p",
      props: {
        onClick:()=> {
          bol.value = true
        }
      },
      children: "text"
    }]
  }
})

```

这一段代码我们预期的表现是子组件点击事件触发以后不会引起父组件点击事件的触发。

实际效果是：`p`组件点击后引起了`bol.value`发生改变，于是触发了`effect`重新执行，这时候给`div`组件重新绑定了点击事件。由于事件冒泡， 所以又会引起`div`组件的点击事件执行。

为了使得表现符合预期，我们需要改造一下`patchProps`函数。

```js
const renderer = createRenderer({
  patchProps(el, key, preValue, nextValue) {
    if (/^on/.test(key)) {
      // _vei是vue event invoker的简写
      let invoker = el._vei
      const name = key.slice(2).toLowerCase()
      if (nextValue) {
        if (!invoker) {
          invoker = el._vei = (e) => {
            if (e.timeStamp < invoker.attached) {
              return
            }
            if (Array.isArray(invoker.value)) {
              invoker.value.forEach((fn) => fn(e))
            } else {
              invoker.value(e)
            }
          }
          invoker.value = nextValue
          invoker.attached = performance.now()
          el.addEventListener(name, invoker)
        } else {
          // 只需要更新invoker.value就会更新处理函数
          invoker.value = nextValue
        }
        //没有nextValue说明是卸载
      } else if (invoker) {
        el.addEventListener(name, invoker)
      }
    }
    // 省略其他判断代码
  },
})
```

### 更新子节点

针对`props.children`有下面三种情况：

- null
- string
- array

在`patchProps`后应该对`children`属性进行比较

```js
function patchElement(n1, n2) {
  const el = (n2.el = n1.el)
  const oldProps = n1.props
  const newProps = n2.props
  // 第一步 更新props
  for (const key in newProps) {
    if (newProps[key] !== oldProps[key]) {
      patchProps(el, key, oldProps[key], newProps[key])
    }
  }
  for (const key in oldProps) {
    if (!(key in newProps)) {
      patchProps(el, key, oldProps[key], null)
    }
  }
  // 第二步： 更新children
  patchChildren(n1, n2, el)
}

function patchChildren(n1, n2, container) {
  if (typeof n2.children === 'string') {
    if (Array.isArray(n1.children)) {
      n1.children.forEach((c) => unmount(c))
    }
    setElementText(container, n2.children)
  } else if (Array.isArray(n2.children)) {
    if (Array.isArray(n1.children)) {
      // 两个都是数组
    } else {
      setElementText(container, '')
      n2.children.forEach((c) => patch(null, c, container))
    }
  } else {
    // 说明新节点不存在
    if (Array.isArray(n1.children)) {
      n1.children.forEach((c) => unmount(c))
    } else if (typeof n1.children === 'string') {
      setElementText(container, '')
    }
  }
}
```

### 增加文本节点和注释节点

对于`<div><!-- 注释节点 -->我是文本节点</div>`这种类型的节点，我们需要创建特殊的唯一标识来作为`type`值。

```js
// 创建文本节点
const Text = Symbol()
//创建注释节点
const Comment = Symbol()

const renderer = createRenderer({
  createElement(tag) {
    //省略
  },
  setElementText(el, text) {
    //省略
  },
  insert(el, parent, anchor = null) {
    //省略
  },
  //跨平台创建文本节点
  createText(text) {
    return document.createTextNode(text)
  },
  //跨平台设置文本节点
  setText(el, text) {
    el.nodeValue = text
  },
  pathProps(el, key, prevValue, nextValue) {
    //省略
  },
})

function patch(n1, n2, container) {
  if (n1 && n1.type !== n2.type) {
    unmount(n1)
    n1 = null
  }
  const { type } = n2
  if (typeof type === 'string') {
    if (!n1) {
      mountElement(n2, container)
    } else {
      patchElement(n1, n2)
    }
  } else if (type === Text) {
    if (!n1) {
      const el = (n2.el = createText(n2.children))
      insert(el, container)
    } else {
      const el = (n2.el = n1.el)
      if (n2.children !== n1.children) {
        setText(el, n2.children)
      }
    }
  }
}
```
