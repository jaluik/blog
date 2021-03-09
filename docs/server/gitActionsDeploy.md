---
id: gitActionsDeploy
title: 使用github actions实现博客的自动化部署 
sidebar_label: 博客自动化部署
slug: /server/gitActionsDeploy
---

## 项目介绍

> 本博客是用[`docusaurus`](https://v2.docusaurus.io)为框架进行搭建的，docusaurus框架由facebook团队出品，适合偏爱`Typescript`和`React`技术栈的程序员

由于这个框架可以生成静态文件进行部署，所以我这里采用的是腾讯云的COS存储（主要是因为便宜），你也可以使用阿里云的OSS对象存储。这两种存储配合使用cdn加速都可以达到不错的访问体验，费用也很低。

## GitHub项目配置

想要实现自动化部署，我们这里采用github提供的比较成熟的解决方案———— [`GitHub Actions`](https://github.com/features/actions)，主要原理就是在推送分支修改的时候，自动触发钩子事件，然后Github提供的runners就会执行你配置的指令操作。

我们这里就是利用推送到主分支的这个事件，来触发`yarn && yarn build`自动安装依赖并打包，最终把构建的build产物推送到腾讯云COS存储空间上。

#### GitHub配置

想要触发GitHub Actions，首先我们要在项目的根目录位置添加配置文件，项目路径为

```
|-- .github
    |-- workflows
		   |-- node.yml

```
其中 `node.yml`文件名是可以自己改变的，这里我使用`node`命名是因为打包需要使用node环境

具体的内容如下
```yml
name: CI

on:
  push:
    branches:
      - {你的分支}

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout {你的分支}
        uses: actions/checkout@v2
        with:
          ref: {你的分支}

      - name: Setup node
        uses: actions/setup-node@v1
        with:
          node-version: '10.x'

      - name: Build project
        run: yarn && yarn build

      - name: Upload COS
        uses: zkqiang/tencent-cos-action@v0.1.0
        with:
          args: delete -r -f / && upload -r ./build/ /
          secret_id: ${{ secrets.SECRET_ID }}
          secret_key: ${{ secrets.SECRET_KEY }}
          bucket: ${{ secrets.BUCKET }}
          region: ap-shanghai
```

你需要把{你的分支}替换为你希望触发自动打包的分支。

需要特别关注的地方在于最后一个steps， with里面配置的是腾讯云COS里面的鉴权相关的配置。

S



