# Token Consumption Statistics

VS Code 扩展：统计 AI API 调用条数与 Token 消耗（初版：Copilot / Cline / Kilo Code，Codebuddy 以“自定义导入”方式尽量支持）。

## Features

- 状态栏展示总 Token / 调用条数
- Dashboard（Webview）展示分来源汇总（Copilot / Cline / Kilo / Custom）
- 自动刷新（可关闭）

## Supported providers (v0)

- GitHub Copilot Chat：通过 Copilot 的“导出聊天日志”JSON 文件统计（需在设置里填写导出文件路径）
- Cline（`saoudrizwan.claude-dev`）：扫描其 `globalStorage` 下的 JSON/JSONL 日志并提取 usage（best-effort）
- Kilo Code（`kilocode.kilo-code`）：扫描其 `globalStorage` 下的 JSON/JSONL 日志并提取 usage（best-effort）
- Codebuddy：不开源，使用 `Custom` 导入 JSON/JSONL usage 日志（best-effort）

## Commands

- `Token Consumption: Open Dashboard`
- `Token Consumption: Refresh`

## Extension Settings

- `tokenConsumptionStatistics.refreshIntervalMinutes`: 自动刷新间隔（分钟，0=关闭）
- `tokenConsumptionStatistics.scan.maxFiles`: 每个 provider 扫描文件上限
- `tokenConsumptionStatistics.scan.maxFileSizeKb`: 跳过超过该大小的文件
- `tokenConsumptionStatistics.copilot.exportJsonPaths`: Copilot Chat 导出日志 JSON 的绝对路径数组
- `tokenConsumptionStatistics.custom.exportJsonPaths`: 额外导入的 JSON/JSONL usage 日志（例如 Codebuddy）

## Notes / Limitations

- 目前对 Cline / Kilo Code 是“启发式扫描”，不同版本或存储结构变化可能导致统计不完整或重复。
- Copilot 目前依赖导出 JSON（扩展无法稳定读取其内部内存日志/请求日志）。

## Credits

- Dashboard 统计图样式致敬：https://github.com/VicBilibily/GCMP
