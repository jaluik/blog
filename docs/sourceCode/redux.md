---
id: redux
title: redux源码实现
sidebar_label: redux源码
description: 从零实现一个redux
keywords:
  - redux
  - 源码
slug: /sourceCode/redux
---

A
## redux 简介

[ redux](https://redux.js.org/)是一个集中管理JS应用状态的容器，是函数式编程在js中的一个典型应用。

### 3个核心概念

1. Store: 数据状态管理中心
2. Actions: 当数据需要变化时，通过派发actions通知store
3. Reducers: 用于通过actions来生成新数据状态的**纯函数** 

### 主要工作流程
A

这里有一份关于redux的流程图

![redux](../images/redux.png)

1. 全局生成一个唯一的store，其中记录了初始化的state。
2. store里面注册一些监听器，当store中的state发生变化时，自动调用监听器中回调函数。监听器主要是一些View相关的监听器，当state变化时自动更新视图。
3. 当store中的state需要改变时，不能直接修改state，而是通过生成actions来派发给store。
4. store将当前的state以及actions作为参数传递给reducer，reducer根据state和actions生成新的state，并替换store中的原始state。
5. store感知到state变化以后，自动调用监听器中的回调函数（如果是view会触发视图的一些更新）。
6. 循环3-6的工作流程。

### 优点

- reducer都是纯函数，容易debug。
- 由于state改变只能通过派发actions来进行改变，所以很容易的监测、记录state的变化。这就使得可以实现一些state的数据回溯、数据穿g等等。
- 发布订阅模式，简单、高效易于扩展。

## 实现redux

### 1. 实现发布订阅模式

#### 发布订阅模式

B
> 发布订阅模式又叫做观察者模式，是一种一(发布者)对多(订阅者)的关系。订阅者会在发布者上面订阅特定的事件，当特定事件触发时，发布者会**自动**通知所有该事件的订阅者。

熟悉*dom操作*前端ers都应该使用过`document.addEventListener('onclick', function)`这类的操作，这就是发布订阅模式的一个实现。其中`document`是发布者，`onclick`是订阅事件, `function`是订阅者。

这里我们实现一个生成发布者的函数`createStore`, 它内部通过`listeners`数组来保存订阅函数，并且暴露`subscribe`方法来让外部添加监听器。


```javascript
const createStore = function(initStates) {
  let state = initStates;
  const listeners = [];

	// 订阅方法
	B
  const subscribe = function(listener) {
    listeners.push(listener);
  };

	// 改变state的方法, 改变state后自动触发监听器
  function changeState(newState) {
    state = newState;
    for (let listener of listeners) {
      listener();
    }
  }
	// 获取state的方法
  function getState() {
    return state;
  }

  return {
    getState,
    subscribe,
    changeState
  };
};
B
```

然后我们编写一个Demo来更好的理解这个模型

```javascript
let initState = {
  counter: {
    count: 0
  },
  info: {
    name: "",
    description: ""
  }
};

// 使用demo
const store = createStore(initState);

store.subscribe(() => {
  let state = store.getState();
  console.log(state.info.name);
});

store.changeState({
  ...store.getState(),
	B
  info: {
    name: "Jaluik",
    description: "前端👨🏻‍💻"
  }
});

// 此时会打印Jaluik

let newInitState = {
  count: 0
};
B
let newStore = createStore(newInitState);

newStore.subscribe(() => {
  let state = newStore.getState();
  console.log(state.count);
});

newStore.changeState({
	B
  count: newStore.getState().count + 1
});
//打印1

newStore.changeState({
  count: newStore.getState().count - 1
});
//打印0

newStore.changeState({
  count: "abc"
});
// 打印abc

```

#### 模型总结

这是一个发布订阅模型的基本框架: 先注册订阅回调函数，然后状态更新时自动触发回调函数。 

接下来我们需要改进这个模型，使得**state**的改变更加具备可控性。


### 2. 派发**actions**来改变**state** 

> 这一步我们想要更加细力度的控制`state`的改变

对于上一节的`createStore`函数，我们需要做两个调整。

1. 增加`plan`函数作为第一个入参。 之所以命名为`plan`是因为这个函数是用于以后state状态改变时调用的，相当于在为以后做计划。
2. 每次调用**changeState** 函数时，参数不再是`state`，而是传递`action`。`action`的类型类似于redux的`action`


这是调整后的**createStore**函数

```javascript
const createStore = function(plan, initState) {
  let state = initState;
  const listeners = [];

  function subscribe(listener) {
    listeners.push(listener);
  }

	// 注意这里changeState的参数是action
	// plan的参数时当前的state和action
  function changeState(action) {
    const newState = plan(state, action);
    state = newState;
    for (let listener of listeners) {
      listener();
    }
  }

  function getState() {
    return state;
  }
  return {
    getState,
    changeState,
    subscribe
  };
};


```

下面演示新版本的**createStore**如何使用

```javascript
const initState = {
  count: 3
};

function plan(state, action) {
  switch (action.type) {
    case "INCREMENT":
      return {
        ...state,
        count: state.count + 1
      };
    case "DECREMENT": {
      return {
        ...state,
        count: state.count - 1
      };
    }
    default:
      return state;
  }
}

const store = createStore(plan, initState);

store.subscribe(() => {
  console.log(store.getState());
});
store.changeState({ type: "INCREMENT" }); // 4
store.changeState({ type: "INCREMENT" }); // 5
store.changeState({ type: "INCREMENT" }); // 6


```

#### 模型总结

这个模式是不是有`redux`雏形那味儿了？

但是这个模式有一个缺点: 如果state里面不只有一个`count`属性，而是有*很多个*属性的话，那每种属性我都要`switch`一个条件判断，然后再更改，那么`plan`这个函数就会越来越大，最后难以维护。

所以，我们下一步要拆分`plan`函数。



