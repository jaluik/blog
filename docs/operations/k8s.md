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

## Pod 介绍

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

注解类似于标签，主要用于工具使用，可以容纳更多信息。

yaml 文件中配置注解：

```yaml
# ....
metadata:
  # ....
  annotations:
    imageRegistry: 'https://hub.docker.com/'
```

为已有节点添加注解：`kubectl annotate pod <pod name> <key>=<value>`

查看注解：`kubectl describe pod <pod name>`返回的`Annotations`可以看到添加到注解

### 命名空间

k8s 中的命名空间为对象名称提供了一个作用域，便于多用户使用同一`k8s`集群时，资源间在不同的命名空间中互不影响。

查看命名空间： `kubectl get ns`， 其中 ns 为`namespace`的简称

指定命名空间查看 pod： `kubectl get po -n <namespace name>`, `-n` 可以写作`--namespace`

创建命名空间：

- 使用命令行： `kubectl create namespace <name>`
- 定义`yaml`文件创建:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: custom-space
```

如果想在指定的命名空间中创建资源： `kubectl create -f <filename>.yaml -n <namespace name>` 这里`-n <namespace name>`就是指定命名空间

### 停止和移除 Pod

指定单个或多个 Pod 删除: `kubectl delete po <name1> <name2> <name3>` 通过空格来分隔

根据标签名称来产出 Pod： `kubectl delete po -l <label name>=<label value>`

删除整个命名空间会删除空间内的所有 Pod： `kubectl delete ns <namespace name>`

可以删除所有 pod 和 service 资源： `kubectl delete all --all` 第一个 all 表示删除所有类型，第二个表示删除所有资源实例

## Pod 管理

### Pod 健康管理

k8s 中可以使用存活探针（liveness probe）来检测 Pod 内部运行是否正常，如果探测失败，k8s 会定期重启容器。

探针有局限性： 如果节点挂了，就无法重启 pod 了。

有 3 种探测方式：

- HTTP GET 请求探针： 检测服务器是否响应 2xx、3xx 的状态码
- TCP 套接子探针：检测是否可以建立 TCP 连接
- Exec 探针：检测是否可以在容器内执行任意命令

#### HTTP 存活探针

定义一个带有存活探针的 Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kubia-liveness
spec:
  containers:
    - image: luksa/kubia-unhealthy
      name: kubia
      livenessProbe:
        httpGet:
          path: /
          port: 8080
```

创建完成后，观察生成的`kubia-liveness`这个 pod，可以看到他的重启次数

`kubectl logs <pod name> --previous` 可以看到`pod`上一次重启的日志

这里我们通过`kubectl describe po <pod name>` 可以看到

- `Containers > Last State`中显示了之前是因为 137 状态码而重启容器。ps: 137 是 128 + x， 这里 x=9，表示是外部强行终止`SIGKILL`

- `Liveness: http-get http://:8080/ delay=0s timeout=1s period=10s #success=1 #failure=3` 表示可以在创建文件中定义这些探针的参数，比如延时、超时时间等。
- 最后设置第一次初始延时用于等待容器启动： `initialDelaySeconds: 15s`表示第一次探测时延迟 15 秒。

### ReplicationController

`ReplicationController`简称`rc`的工作是确保 pod 的数量始终于其标签选择器匹配

一个`ReplicationController`由 3 部分组成：

- `label selector` 标签选择器
- `replica count` 副本个数
- `pod template` pod 模板

### 创建一个 rc

```yaml
apiVersion: v1
kind: ReplicationController
metadata:
  name: kubia
spec:
  replicas: 3
  selector:
    app: kubia  # 一般不指定会从template获取
  template:
    metadata:
      labels:
        app: kubia
    spec:
      containers:
        - image: kubia
          image: luksa/kubia
          ports:
            - containerPort: 8080

```

然后执行命令创建： `kubectl create -f <filename>`

然后查看 pods: `kubectl get pods` 可以看到刚才创建的 pods 有 3 个。

查看所有的`ReplicationController`命令： `kubectl get rc`

查看某个`ReplicationController`命令： `kubectl describe rc <rc name>`

#### 编辑已生成的 rc

编辑已生成的 rc 模板只会影响之后的模板

执行命令： `kubectl edit rc <rc name>`可以打开 yaml 文件的编辑模式

扩容： `kubectl scale rc <rc name> --replicas=<number>` 可以更改`rc`的副本个数
