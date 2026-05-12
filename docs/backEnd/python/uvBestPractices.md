---
id: uvBestPractices
title: uv 使用最佳实践
sidebar_label: uv 使用最佳实践
description: Python 包管理工具 uv 的项目初始化、依赖管理、脚本运行、CI 和 Docker 使用最佳实践
keywords:
  - python
  - uv
  - 包管理
  - 虚拟环境
slug: /backEnd/python/uvBestPractices
---

> uv 是 Astral 做的 Python 包和项目管理工具。它把 Python 版本管理、虚拟环境、依赖声明、锁文件和命令运行塞进了一个工具里，可以替代 pip、pip-tools、virtualenv、pipx、pyenv、poetry 各自负责的那部分。

## 安装与升级

macOS 和 Linux：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Windows PowerShell：

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Homebrew：

```bash
brew install uv
```

用 pipx：

```bash
pipx install uv
```

安装后看一眼版本：

```bash
uv --version
```

官方安装脚本安装的 uv 自带自更新：

```bash
uv self update
```

Homebrew、pipx、pip 装的，用对应包管理器升级就行。

## 核心心智模型

uv 项目围绕这几个文件运转：

- `pyproject.toml`：项目元数据和直接依赖。
- `uv.lock`：完整的、可复现的依赖锁文件，该提交到 Git。
- `.python-version`：项目用的 Python 版本，该提交到 Git。
- `.venv`：本地虚拟环境，不用提交。

把 `pyproject.toml` 和 `uv.lock` 当成依赖的唯一来源。

## 新项目初始化

```bash
uv init my-app
cd my-app
```

指定 Python 版本：

```bash
uv python pin 3.12
```

这会生成 `.python-version`。团队项目里提交它，免得每个人本地 Python 小版本不一样。

创建虚拟环境并同步依赖：

```bash
uv sync
```

`uv sync` 会按需创建 `.venv` 和 `uv.lock`。

## 依赖管理

加运行时依赖：

```bash
uv add fastapi
uv add "sqlalchemy>=2.0"
```

加开发依赖：

```bash
uv add --dev pytest ruff mypy
```

移除依赖：

```bash
uv remove fastapi
uv remove --dev mypy
```

只升某个包：

```bash
uv lock --upgrade-package fastapi
uv sync
```

全量升级依赖前跑一遍测试：

```bash
uv lock --upgrade
uv sync
uv run pytest
```

## 运行命令

用 `uv run` 跑项目里的命令，别直接调系统 Python：

```bash
uv run python main.py
uv run pytest
uv run ruff check .
```

`uv run` 执行前会检查 `pyproject.toml`、`uv.lock` 和 `.venv` 是否一致。

你也可以手动激活虚拟环境：

```bash
source .venv/bin/activate
```

但在脚本、CI、Makefile、README 里，统一写 `uv run xxx`，少一件事是一件事。

## 锁文件与同步策略

本地开发：

```bash
uv sync
```

CI 或部署：

```bash
uv sync --locked
```

`--locked` 要求 `uv.lock` 和 `pyproject.toml` 一致，不一致就报错。依赖声明改了但没更新锁文件？CI 直接挂，正好拦住这种遗漏。

只想按锁文件原样安装，不允许 uv 改任何东西：

```bash
uv sync --frozen
```

几点选择：

- 应用项目：提交 `uv.lock`，部署和协作才能复现。
- 库项目：通常也提交 `uv.lock`，用于开发和 CI；发布给用户时还是以 `pyproject.toml` 的版本约束为准。
- 别手动改 `uv.lock`。依赖变更走 `uv add`、`uv remove`、`uv lock`。

## Python 版本管理

安装 Python：

```bash
uv python install 3.12
uv python install 3.11 3.12 3.13
```

查看可用版本：

```bash
uv python list
```

为项目固定版本：

```bash
uv python pin 3.12
```

用指定版本创建环境：

```bash
uv venv --python 3.12
```

项目根目录放 `.python-version`，CI 读同一个版本。

## 工具命令管理

一次性运行工具用 `uvx`（等价于 `uv tool run`）：

```bash
uvx ruff check .
uvx black --version
```

常用工具装到用户环境：

```bash
uv tool install ruff
uv tool install pre-commit
```

项目内用的工具更推荐放进开发依赖，然后 `uv run` 执行：

```bash
uv add --dev ruff pytest
uv run ruff check .
uv run pytest
```

工具版本被 `uv.lock` 锁住，CI 和本地跑的是同一个版本。

## 单文件脚本

写个独立脚本不一定非要创建完整项目。uv 支持给单文件声明依赖：

```bash
uv add --script fetch.py requests rich
uv run fetch.py
```

适合临时脚本、数据处理、运维小工具。

## 从老项目迁移

已有 `requirements.txt` 的项目：

```bash
uv init
uv add -r requirements.txt
uv sync
```

迁移完成后：

- 以 `pyproject.toml` 和 `uv.lock` 为主。
- 删掉或停止手动维护 `requirements.txt`。
- 如果部署平台非要 `requirements.txt`，用导出命令生成，别手写两份。

导出：

```bash
uv export --format requirements-txt --output-file requirements.txt
```

## CI 配置

一个 GitHub Actions 示例：

```yaml
name: test

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v5

      - name: Install dependencies
        run: uv sync --locked

      - name: Lint
        run: uv run ruff check .

      - name: Test
        run: uv run pytest
```

核心是 `uv sync --locked`——依赖变更必须带上锁文件更新。

## Docker 写法

利用锁文件做分层缓存：

```dockerfile
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev

COPY . .

CMD ["uv", "run", "python", "main.py"]
```

Web 服务把启动命令换成：

```dockerfile
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

几个点：

- 先复制 `pyproject.toml` 和 `uv.lock`，再 `uv sync`——最大化 Docker 层缓存。
- 部署镜像用 `--no-dev`，不要把测试和格式化工具打进去。
- 线上不需要改依赖的话，加 `--locked` 保持可复现。

## 团队约定

项目 README 最好包含下面的内容：

```bash
# 安装依赖
uv sync

# 添加依赖
uv add package-name

# 添加开发依赖
uv add --dev package-name

# 运行测试
uv run pytest

# 运行格式检查
uv run ruff check .
```

`.gitignore` 里加：

```gitignore
.venv/
__pycache__/
.pytest_cache/
.ruff_cache/
```

应该提交：

```text
pyproject.toml
uv.lock
.python-version
```

## 常见问题

### 仍旧使用 pip install

在 uv 项目里直接：

```bash
pip install requests
```

只会改本地 `.venv`，不会更新 `pyproject.toml` 和 `uv.lock`。该用：

```bash
uv add requests
```

### 忘记提交 uv.lock

改了依赖只提交 `pyproject.toml`，同事和 CI 拿不到同一组依赖版本。解法是在 CI 里用：

```bash
uv sync --locked
```

### 工具装成了全局版本

`ruff`、`pytest`、`mypy` 是项目质量门禁的一部分，放开发依赖，别指望每个人电脑上装了全局版本：

```bash
uv add --dev ruff pytest mypy
```

### 混用多个依赖文件

别同时维护 `requirements.txt`、`Pipfile`、`poetry.lock`、`uv.lock`。迁移期短期共存可以，稳定后收敛到一个主流程。

## 日常命令速查

开发日常：

```bash
uv sync
uv add fastapi
uv add --dev pytest ruff
uv run pytest
uv run ruff check .
```

升级某个依赖：

```bash
uv lock --upgrade-package package-name
uv sync
uv run pytest
```

CI 和部署：

```bash
uv sync --locked
uv run pytest
```

## 参考资料

- [uv 官方文档](https://docs.astral.sh/uv/)
- [uv 项目管理指南](https://docs.astral.sh/uv/guides/projects/)
- [uv 锁文件与同步说明](https://docs.astral.sh/uv/concepts/projects/sync/)
- [uv Docker 使用指南](https://docs.astral.sh/uv/guides/integration/docker/)
