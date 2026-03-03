# i18n-generate-skill

从 Excel 表格读取多语言翻译内容，并在指定目录生成 i18n 多语言文件。

## ✨ 特性
- 基于 Excel 维护多语言文案，研发侧一键生成代码文件。
- 支持输出 `js`、`ts`、`json`，也支持同时输出多种格式。
- 支持配置 Sheet、输出目录、语言列表。
- 保留占位符（如 `{cycle}`、`{startTime}`）和换行内容。
- 生成规则简单透明，方便二次改造。

## 🚀 安装

#### 方法一：使用 npx skills（推荐）

```bash
npx skills add qiuweikangdev/i18n-generate-skill
```

#### 方法二：手动安装

```bash
# 克隆仓库
git clone https://github.com/qiuweikangdev/i18n-generate-skill.git

# 复制到 Claude Code skills 目录
cp -r i18n-generate-skill ~/.claude/skills/
```

## 📊  示例

- 示例1：

```bash
把 ./i18n.xlsx 生成到 ./src/i18n，格式 ts
```

- 示例2

```bash
把 ./i18n.xlsx 生成到 ./src/i18n，输出格式为ts，只生成英语、中文、日语， 工作表为 i18n
```



## 表头映射规则

生成器支持：

- 语言 code 列名：`sc tc en ja ko th id es fr de pt it ar tr ru vi`
- 本地化列名（示例）：`简体中文`、`繁體中文`、`English`、`日本語 (日语)`、`한국어 (韩语)`
- key 列名：`key`

i18n.xlsx

```bash
key              sc        en
home.title       首页       Home
login.submit     登录       Sign in
```

