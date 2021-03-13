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

## redux 简介

[ redux](https://redux.js.org/)是一个集中管理JS应用状态的容器，是函数式编程在js中的一个典型应用。

### 3个核心概念

1. Store: 数据状态管理中心
2. Actions: 当数据需要变化时，通过派发actions通知store
3. Reducers: 用于通过actions来生成新数据状态的**纯函数** 

### 主要工作流程

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
- 由于state改变只能通过派发actions来进行改变，所以很容易的监测、记录state的变化。这就使得可以实现一些state的数据回溯、数据穿梭等等。
- 发布订阅模式，简单、高效易于扩展。
