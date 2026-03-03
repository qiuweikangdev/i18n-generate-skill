---
name: i18n-generate-skill
description: 从 Excel 表格生成 i18n 多语言文件到指定目录（支持 js/ts/json）
metadata:
  author: i18n-generate-skill
  version: "1.0.0"
---

# i18n Excel 生成器

从 Excel 翻译表中读取文案，并按语言生成文件。

## 何时使用

- 用户需要将 Excel 翻译内容转换为 i18n 文件。
- 用户提供了 Excel 路径和输出目录。
- 目标输出格式是 `js`、`ts` 或 `json`。

## 必填输入

- `excelPath`：`.xlsx` 文件路径
- `outputDir`：生成文件输出目录

## 可选输入

- `sheetName`（默认 `i18n`）
- `formats`（默认 `ts`，支持 `js,ts,json`）
- `langs`（语言 code，逗号分隔；不传时自动识别）
- `keyColumn`（默认 `key`）
- `tsAsConst`（默认 `false`，仅对 `ts` 生效）

## 执行流程

1. 先校验 `excelPath` 文件存在。
2. 执行命令：
   `node tools/excel-to-i18n.mjs --excel "<excelPath>" --out "<outputDir>" [--sheet "<sheetName>"] [--formats "ts,json"] [--langs "sc,en,ja"] [--key "<keyColumn>"] [--ts-as-const]`
3. 检查 `outputDir` 中生成结果是否完整。
4. 输出生成语言列表与每种语言的 key 数量。

## 表头规则

- 支持直接使用语言 code 作为列名：`sc tc en ja ko th id es fr de pt it ar tr ru vi`。
- 也支持本地化列名（内置映射），如：`简体中文`、`繁體中文`、`English`、`日本語 (日语)`、`한국어 (韩语)` 等。
- key 列支持：`key` / `Key` / `i18n key`。
