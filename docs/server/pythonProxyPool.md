---
id: pythonProxyPool
title: python代理池爬虫
sidebar_label: python代理池
description: python代理池爬虫
keywords:
  - python
  - 代理池
slug: /server/pythonProxyPool
---

## 项目准备

项目需要准备

> 1. 代理池
> 2. redis 服务
> 3. 爬虫脚本

### 代理池

代理池来源于 github 上的项目：[proxy_poll](https://github.com/jhao104/proxy_pool)。其中收集了相当多的免费代理，可以直接使用。

### redis 服务

redis 服务此次采用 docker 拉取，并暴露 6380 端口供代理池使用。

#### 拉取 redis image

```
docker pull redis
```

#### 本地启动 redis 服务

**此处约定 redis 的登录密码为”mima", 监听端口为 6380.**

```
docker run --name python-redis -d -p 6380:6379 redis --requirepss "mima"
```

#### 检验是否启动成功

```
docker ps
```

#### 进入检验是否 redis 能够使用

```bash
docker exec -it python-redis /bin/bash
# 进入redis交互程序
redis-cli
# 登录
auth mima
# 检验是否可用
ping
# 返回pong 说明redis可用
=> pong
```

### 爬虫脚本

创建`ip-spider.py`的文件进行 ip 地址测试

```python
import requests
from lxml import etree

# 默认会启用本地启动
def get_proxy():
    return requests.get("http://127.0.0.1:5010/get/").json()

def delete_proxy(proxy):
    requests.get("http://127.0.0.1:5010/delete/?proxy={}".format(proxy))

# your spider code

def get_html(url):
    # ....
    retry_count = 5
    proxy = get_proxy().get("proxy")
    while retry_count > 0:
        try:
            html = requests.get(url, proxies={"http": "http://{}".format(proxy)}
)
            # 使用代理访问
            return html
        except Exception:
            retry_count -= 1
    # 删除代理池中代理
    delete_proxy(proxy)
    return None

# 通过百度的主页搜索ip获取当前ip地址
def get_ip():
    url = "http://www.baidu.com/s?wd=ip&rsv_spt=1&rsv_iqid=0xca0f248f000115f5&is"
    page_context = get_html(url).text
    print("抓取成功")
    page = etree.HTML(page_context)
    ip = page.xpath('//tr/td/span[@class="c-gap-right"]/text()')
    print(ip)


if __name__ == "__main__":
    get_ip()
```

## 项目开始

### 拉取[proxy_pool](https://github.com/jhao104/proxy_pool)仓库的源文件

新建本地项目目录,拉取源文件

```
git clone https://github.com/jhao104/proxy_pool.git
```

切换至项目目录

```bash
cd proxy_pool
```

安装依赖

```
pip3 install -r requirements.txt
```

更新配置文件

```bash
vim setting.py
```

更新需要调整的配置文件如下
控制 proxy_pool 服务启动在 5010 端口

```
# setting.py 为项目配置文件

# 配置API服务

HOST = "0.0.0.0"               # IP
PORT = 5010                    # 监听端口


# 配置数据库

#这里我们设置redis的地址，其中mima是redis的登录密码，6380是redis启动的端口号， 2 是使用的database(redis启用时默认会创建16个database)
DB_CONN = 'redis://:mima@127.0.0.1:6380/2'
```

然后需要后台执行 proxy_pool 的服务。
`nohub`用于后台启动服务，不会因命令行关闭而退出
分别需要启动**schedule**和**server**

```
nohup python3 proxyPool.py schedule > schedule.file 2>&1 &
```

```
nohup python3 proxyPool.py server > server.file 2>&1 &
```

此时服务启动完成

#### 检验服务是否启动成功

```
curl http://127.0.0.1:5010/get/
```

如果启动成功，则会返回类似的 json 串

```
{"check_count":79,"fail_count":0,"last_status":1,"last_time":"2020-12-24 16:04:16","proxy":"101.201.31.208:80","region":"","source":"","type":""}
```

如果不正确，则可以进入`schedule.file`和`server.file`来查看日志文件。

##### 失败后需要手动关闭进程

```bash
# 查看后台进程
jobs -l
# 杀死进程
kill -9 [id]
```

## 验证是否代理爬虫成功

### 进入 ip-spider.py 所在文件夹

重复执行

```
python3 ip-spider.py
```

如果返回不同的

```
抓取成功
['本机IP:\xa0171.35.148.193']
```

则恭喜，成功啦~(需要注意，这个可能会有失败的情况)

以后可以修改 ip-spider.py 来代理爬取不同的内容了
