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

### ReplicationController（rc）

`ReplicationController`简称`rc`的工作是确保 pod 的数量始终于其标签选择器匹配

一个`ReplicationController`由 3 部分组成：

- `label selector` 标签选择器
- `replica count` 副本个数
- `pod template` pod 模板

#### 创建一个 rc

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

不保留 pod 删除 rc: `kubectl delete rc <rc name>`

保留 pod 删除 rc: `kubectl delete rc <rc name> --cascade=false`

### ReplicaSet（rs）

> `ReplicaSet`作用是用于替代`ReplicationController`, 拥有更强的标签选择能力

定义`ReplicaSet`仅需要将之前`rc`创建的 yaml 文件中的`kind`字段值从`ReplicationController`替换为`ReplicaSet`，并且需要修改`apiVersion`以及`selector`

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: kubia
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kubia
  template:
  #......
```

`rs`可以定义更为强大的标签选择器，比如：

```yaml
selector:
  matchExpressions:
    - key: app
      operator: In
      values:
        - kubia
        - kubia1
```

表示了 labels 为`app`的标签必须值等于`kubia`或者`kubia1`

删除类似于 rc: `kubectl delete rs <name>`

### DaemonSet（ds）

> `DaemonSet`作用是在集群的每一个节点上运行一个`pod`

创建一个`DaemonSet`（这里我们需要节点必须有`disk=ssd`标签才会生成 ds）：

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ssd-monitor
spec:
  selector:
    matchLabels:
      app: ssd-monitor
  template:
    metadata:
      labels:
        app: ssd-monitor
    spec:
      nodeSelector:
        disk: ssd
      containers:
        - name: main
          image: luksa/ssd-monitor
```

查看 ds： `kubectl get ds`

查看节点信息： `kubectl get node`

给当前节点打标签：`kubectl label node <node name> <label>=<value>`

如果给拥有`ds`的节点更改了标签，使得其不满足`ds`的规则，那么该节点会被删除。

### Job

`k8s`中的`job`用于统一管理`pod`， 确保`pod`完成任务后退出。相对于 rs 和 rc，任务不需要保持一直运行，而是运行结束后退出。

定义一个简单的 job：

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: batched-job
spec:
  template:
    metadata:
      labels:
        app: batch-job
    spec:
      restartPolicy: OnFailure
      containers:
        - name: main
          image: luksa/batch-job
```

查看 job： `kubectl get jobs`
查看 job 相关的 pod： `kubectl get po`

如果需要一个 pod 依次运行多次，需要在 yaml 文件中`spec > completions: 5` 指定了 pod 创建并运行完成后会创建第二个 pod，直到 5 个 pod 都运行完毕。

如果需要同时运行 n 个 pod，可以使用`parallelism`，示例：

```yaml
#....
spec:
  completions: 5 # 需要完成5个job
  parallelism: 2 # 同时运行2个job
  template:
    # some value...
```

更改运行中 job 的`parallelism`属性： `kubectl scale job <name> --replicas 3`

### CronJob

即 linux 中的定时任务

创建一个`cronjob`:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: batch-job-every-fifteen-minutes
spec:
  schedule: '0,15,30,45 * * * *'
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: periodic-batch-job
        spec:
          restartPolicy: OnFailure
          containers:
            - name: main
              image: luksa/batch-job
```

## Pod 通信 （Service）

> Service 服务通过暴露一个固定的 ip 地址和端口来开放外部访问 pod 的入口

创建一个 Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kubia
spec:
  ports:
    - port: 80
      targetPort: 8080
  selector:
    app: kubia
```

查看创建的 Service: `kubectl get svc`

在已有的的 pod 节点执行 curl 命令: `kubectl exec <pod name> -- curl -s <svc ip address>`

这里`--`代表了命令行参数的结束，这就使得`-s`表示不是`kubectl exec`的参数

如果希望特定的客户端每次访问同一个 pod： 可以在配置文件中指定：`spec > sessionAffinity: ClientIP`。该属性的默认值为`None`

使用具名的端口号：

1. pod 中定义端口名称

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: kubia
      ports:
        - name: http
          containerPort: 8080
        - name: https:
          containerPort: 8443

```

2. 在服务的 spec 中引用端口

```yaml
apiVersion: v1
kind: Service
spec:
  ports:
    - name: http
      port: 80
      targetPort: http  # 指代了Pod中定义的8080
    - name: https:
      port: 443
      targetPort: https # 指代了Pod中定义的8443

```

### 服务发现

1. 通过启动的 pod 查看环境变量: `kubectl exec <pod name> env`
2. 通过 dns 发现： 由于在每个 pod 中，k8s 使用 k8s 创建的`kube-dns`的 pod 作`dns`解析，所以可以在 pod 内部使用`<pod name>.<namespace>.svc.cluster.local`来访问其他 service

### 连接集群外部服务

> endpoint 是连接 service 和 pod 之间的一种资源

查看 endpoint 信息： `kubectl get endpoint <svc name>`

如果服务没有成功获得选择器设置的 pod，则不会自动创建 endpoint 资源。

连接外部服务有两种方法

1. 创建 endpoints 资源，指定服务重定向地址

示例，创建一个没有选择器的 service：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-service
spec:
  ports:
    - port: 80
```

再手动创建 endpoint 资源

```yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: external-service # 名字必须与service一致
subsets:
  - addresses:
      - ip: 11.11.11.11
      - ip: 22.22.22.22
    ports:
      - port: 80 # 目标端口
```

2. 配置 cname 的 dns 服务

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-service
spec:
  type: ExternalName
  externalName: some-api.some-company.com
  ports:
    - port: 80
```

服务完成后可以通过`external-service.default.svc.cluster.local`来访问外部域名

### 服务暴露给外部客户端

可以使用的方式有下面 3 种：

1. 服务类型设置为`NodePort`：每个集群节点都打开一个端口。
2. 服务类型设置为`LoadBalance`
3. 创建一个`Ingress`资源

#### 使用 NodePort

文件定义如下

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kubia-nodeport
spec:
  type: NodePort # 注意这里定义了类型
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30123
  selector:
    app: kubia
```

#### 使用 LoadBalance

文件定义如下

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kubia-loadbalancer
spec:
  type: LoadBalancer # 注意这里定义了类型
  ports:
    - port: 80
      targetPort: 8080
  selector:
    app: kubia
```

#### 使用 Ingress

> 对于每个 LoadBalancer 都需要自己的负载均衡器，以及独有的公有 IP 地址。而 Ingress 只需要一个公网 IP 就能为许多服务提供访问。

首先在`minikube`上启用 Ingress: `minikube addons enable ingress`

创建 Ingress 资源:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kubia
spec:
  rules:
    - host: kubia.example.com
      http:
        paths:
          - pathType: Prefix
            path: /
            backend:
              service:
                name: kubia-nodeport
                port:
                  number: 80
```

### Pod 的就绪信号

> 就绪探针用于检测 pod 是否启动完成，如果未通过检测，则客户端不会重定向该 pod。与存活探针不同在于： 对于就绪探针，如果容器未通过准备检查，容器不会被终止或重启应用

向一个 pod 添加就绪探针：`kubectl edit rc <rc name>`

修改 yaml 文件：

```yaml
#....
spec:
  #...
  template:
    containers:
      - name: kubia
        image: luksa/kubia
        readinessProbe: # 这里开始就是就绪指针
          exec:
            command:
              - ls
              - /var/ready
```

创建一个 headless 服务：

```yaml
#...
kind: Service
#...
spec:
  clusterIP: None
  # ....
```
