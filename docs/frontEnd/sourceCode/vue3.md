---
id: vue3
title: vue源码（diff算法）
sidebar_label: vue源码（diff算法）
description: vue源码相关的细节
keywords:
  - vue
  - 源码
  - 实现一个vue
slug: /frontEnd/sourceCode/vue3
---

## 简单 diff 算法

### 减少 DOM 操作的性能和开销

针对这样一个例子：

```js
const oldVnode = {
  tag: 'div',
  children: [
    { type: 'p', children: '1' },
    { type: 'p', children: '2' },
    { type: 'p', children: '3' },
  ],
}

const newVnode = {
  tag: 'div',
  children: [
    { type: 'p', children: '4' },
    { type: 'p', children: '5' },
    { type: 'p', children: '6' },
  ],
}
```

针对这个例子，我们希望只进行一次 DOM 操作，将 1、2、3 替换为 4、5、6，而不是先删除 1、2、3，再插入 4、5、6，并且需要考虑到新旧节点数量不一致的情况（需要先遍历短的节点列表，再遍历剩余的列表）。

```js
function patchChildren(n1, n2, container) {
  if (typeof n2.children === 'string') {
    // 省略代码
  } else if (Array.isArray(n2.children)) {
    const oldChildren = n1.children
    const newChildren = n2.children
    const oldLen = oldChildren.length
    const newLen = newChildren.length
    const commonLength = Math.min(oldLen, newLen)
    for (let i = 0; i < commonLength; i++) {
      patch(oldChildren[i], newChildren[i], container)
    }
    if (newLen > oldLen) {
      for (let i = commonLength; i < newLen; i++) {
        patch(null, newChildren[i], container)
      }
    } else if (newLen < oldLen) {
      for (let i = commonLength; i < oldLen; i++) {
        unmount(oldChildren[i])
      }
    }
  } else {
    // 省略代码
  }
}
```

### DOM 复用与 key 的作用

有下面一种情况：

```js
// oldChildren
const old = [{ type: 'p' }, { type: 'div' }, { type: 'span' }]
  //newChildren
const new =  [{ type: 'span' }, { type: 'p' }, { type: 'div' }]

```

如果采用上面的方法，由于 type 不同，调用 patch 函数时，总共会有 6 次的`DOM`操作，但是实际上`oldChildren`和`newChildren`实际上只有顺序不同，因此只需要进行`DOM`的移动操作即可。

实际操作中，我们需要引入`key`属性来作为标识来帮助判断如何移动`DOM`。

```js
const old = [
  { type: 'p', children: '1', key: 1 },
  { type: 'p', children: '2', key: 2 },
  { type: 'p', children: '3', key: 3 },
]

const new = [
  { type: 'p', children: '3', key: 3 },
  { type: 'p', children: '1', key: 1 },
  { type: 'p', children: '2', key: 2 },
]
```

`key`属性就像身份证，只要`type`属性和`key`属性相同，我们便可以认为他们可以进行`DOM`复用。注意：这里可以进行`DOM`复用并不意味着不需要更新。

```js
function patchChildren(n1, n2, container) {
  if (typeof n2.children === 'string') {
    // 省略代码
  } else if (Array.isArray(n2.children)) {
    const oldChildren = n1.children
    const newChildren = n2.children
    for (let i = 0; i < newChildren.length; i++) {
      const newNode = newChildren[i]
      for (let j = 0; j < oldChildren.length; j++) {
        const oldNode = oldChildren[j]
        if (newNode.key === oldNode.key) {
          patch(oldNode, newNode, container)
          break
        }
      }
    }
  } else {
    // 省略代码
  }
}
```

这里只考虑`patch`内容，下面再考虑移动`DOM`。

### 找到需要移动的元素

这里的主要思路是：

- 遍历新的`nodeList`时，如果匹配到了`key`相同的旧的`node`，则进行`patch`操作，并且此时观察此时匹配到的`index`是否仍然保持递增的序列，如果仍然保持则更新`lastIndex`为新的`index`, 否则说明需要移动`DOM`。

```js
function patchChildren(n1, n2, container) {
  if (typeof n2.children === 'string') {
    // 省略代码
  } else if (Array.isArray(n2.children)) {
    const oldChildren = n1.children
    const newChildren = n2.children
    // 增加了lastIndex变量来记录上一次遍历到的最大index位置
    let lastIndex = 0
    for (let i = 0; i < newChildren.length; i++) {
      const newNode = newChildren[i]
      for (let j = 0; j < oldChildren.length; j++) {
        const oldNode = oldChildren[j]
        if (newNode.key === oldNode.key) {
          patch(oldNode, newNode, container)
          if (j < lastIndex) {
            // 需要移动
          } else {
            lastIndex = j
          }
          break
        }
      }
    }
  } else {
    // 省略代码
  }
}
```
