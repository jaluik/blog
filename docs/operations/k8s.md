---
id: k8s
title: Kubernetes入门与实战
sidebar_label: Kubernetes入门与实战
description: Kubernetes入门与实战
keywords:
  - Kubernetes
  - k8s
slug: /operations/k8s
---

> Kubernetes 简称 K8s, 是用于部署和管理容器化应用的软件平台，简化了应用的开发、部署。

## 安装相关依赖

### Minikube

**Minikube**是快速的构建一个单节点集群的工具，对于测试 Kubernetes 和本地开发应用非常有用。

Mac 安装命令： `brew install Minikube`

### Kubectl

**Kubectl**是与 Kubernetes 交互的客户端

Mac 安装命令： `brew install kubectl`

### 测试节点是否可用

1. 首先启用 minikube，执行： `minikube start`
   这里如果拉取镜像太慢可以使用下面命令切换镜像源：

- `minikube delete`
- `minikube start --image-mirror-country='cn'`

2. 检查集群信息，执行： `kubectl cluster-info`
3. 列出集群节点： `kubectl get nodes`

## 快速开始 - K8s 的使用

这里我们使用**minikube**来进行验证 K8s 的使用

1.  首先启动 minikube：`minikube start`
2.  使用我之前上传的镜像创一个 K8s pod：`kubectl run kubia --image=jaluik/kubia --port=8080`。

    ps： **jaluik/kubia** 是一个简单的 node 服务，暴露了 8080 端口，请求时会返回主机名。

3.  查看 pod 节点： `kubectl get pods`
4.  创建一个**LoadBalancer**服务对象供公共 ip 访问 pod： `kubectl expose pod kubia --type=LoadBalancer`

5.  列出服务： `kubectl get svc`

    ps: 这里 svc 是 services 的缩写， 其它类似的： pods 可以缩写为 po 等。

6.  使用 minikube 暴露 LoadBalancer server;： `minikube tunnel`
7.  访问 `127.0.0.1:8080`就可以获取访问结果啦

## K8s 中的 pod

K8s 中的 pod 是最小的基本单位，可以由多个容器组成。

获取 pods 定义的 yaml 文件： `kubectl get po <pod name> -o yaml`

pods 定义的文件一般包含 3 部分

- metadata 包括名称、命名空间、标签和关于该容器的其他信息；
- spec 包含 pod 内容的实际说明，例如 pod 的容器、卷和其他数据；
- status 包含运行中的 pod 的当前信息，例如 pod 所处的条件，每个容器的描述和状态，以及内部 ip 和其他基本信息

### 根据 yaml 配置生成 pod

#### 定义 yaml 文件

创建 `kubia-manual.yaml` 文件如下：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kubia-manual
spec:
  containers:
    - image: jaluik/kubia
      name: kubia
      ports:
        - containerPort: 8080
          protocol: TCP
```

如果需要文档帮助，可以使用`kubectl explain <type>.<fieldName>[.<fieldName>]` 来获取某一个项目的配置信息。
比如： `kubectl explain pod.metadata`

#### 根据 yaml 文件创建 pod

执行命令： `kubectl create -f kubia-manual.yaml`
再通过`kubectl get pods`可以看到刚才生成的 pod 节点

查看日志： `kubectl logs kubia-manual`; 如果需要指定 pod 中的容器日志： `kubectl logs <pod name> -c <container name>`

#### 转发本地端口到 pod 端口

kubectl port-forward 进程会转发请求到 pod 内部

执行：`kubectl port-forward <pod name> <local port>:<pod port>`, 比如此处的：`kubectl port-forward kubia-manual 8888:8080`

### 标签组织 pod

随着 pod 的数量增多，我们需要标签来统一通过一次操作对属于某个标签组的 pod 进行批量操作。

可以在`yaml`文件的`metadata > labels` 指定标签
比如下面的示例

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kubia-manual-v2
  labels:
    creation_method: manual # 创建了creation_method = manual标签
    env: prod # 创建了env = prod标签
spec:
  containers:
    - image: jaluik/kubia
      name: kubia
      ports:
        - containerPort: 8080
          protocol: TCP
```

#### 标签查看：

查看带标签的 pod 信息：

- 可以通过`kubectl get pods --show-labels` 查看标签
- 可以通过`kubectl get pods -L <name1>,<nam2>`作筛选， 比如这里的`kubectl get pods -L creation_method, env`

筛选特定标签的 pod 信息（这里有一些语法）：命令格式 `kubectl get po -l <语法>`

- 比如 `kubectl get po -l <label>=<name>`
- 比如 `kubectl get po -l <label>`
- 比如 `kubectl get po -l '!<label>'`

如果在条件中用`,`分隔，那么需要同时满足几个条件。

#### 标签修改

新增标签:

命令`kubectl label po <pod name> <label>=<value>`, 示例： `kubectl label po kubia creation_method=manual`

修改标签:

命令：`kubectl label po <pod name> <label>=<value> --overwrite`， 此处的`label` 应该是已有的 label

#### 标签扩展用途

标签不仅可以用于`pod`标记，还可以用于`node`标记

比如新添加了一个节点 `node-name1`, 这个节点用于 gpu 加速的能力，所以我们给他打上`gpu=true`的标签，命令： `kubectl label node node-name1 gpu=true`

查看的时候便可以通过标签来筛选： `kubectl get nodes -l gpu=true`

如果我们想将节点调度到用于`gpu=true`的节点上，需要在创建的`yaml`文件中指定

```yaml
# ...
spec:
  nodeSelector:
    gpu: 'true'
  containers:
    - image: jaluik/kubia
      name: kubia
```

### 注解 Pod
