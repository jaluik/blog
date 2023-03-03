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

### 减少 dom 操作的性能和开销

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
      patch(oldChildren[i], newChildren[i])
    }
    if (newLen > oldLen) {
      for (let i = commonLength; i < newLen; i++) {
        patch(null, newChildren[i])
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
