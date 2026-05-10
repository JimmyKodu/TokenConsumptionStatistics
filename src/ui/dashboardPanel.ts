import * as vscode from 'vscode';
import type { StatsService } from '../usage/statsService';
import type { ProviderScanResult, UsageSummary } from '../usage/types';

function escapeHtml(input: string): string {
	return input
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function renderSummary(summary: UsageSummary): string {
	const fmt = (n: number | undefined) => (typeof n === 'number' ? n.toLocaleString() : '--');
	const p = summary.byProvider;

	return `
		<table>
			<thead><tr><th>Provider</th><th>Calls</th><th>Prompt</th><th>Completion</th><th>Total</th></tr></thead>
			<tbody>
				<tr><td><b>All</b></td><td>${fmt(summary.totalRequests)}</td><td>${fmt(summary.promptTokens)}</td><td>${fmt(summary.completionTokens)}</td><td>${fmt(summary.totalTokens)}</td></tr>
				<tr><td>Copilot</td><td>${fmt(p.copilot.totalRequests)}</td><td>${fmt(p.copilot.promptTokens)}</td><td>${fmt(p.copilot.completionTokens)}</td><td>${fmt(p.copilot.totalTokens)}</td></tr>
				<tr><td>Cline</td><td>${fmt(p.cline.totalRequests)}</td><td>${fmt(p.cline.promptTokens)}</td><td>${fmt(p.cline.completionTokens)}</td><td>${fmt(p.cline.totalTokens)}</td></tr>
				<tr><td>Kilo Code</td><td>${fmt(p.kilo.totalRequests)}</td><td>${fmt(p.kilo.promptTokens)}</td><td>${fmt(p.kilo.completionTokens)}</td><td>${fmt(p.kilo.totalTokens)}</td></tr>
				<tr><td>Custom</td><td>${fmt(p.custom.totalRequests)}</td><td>${fmt(p.custom.promptTokens)}</td><td>${fmt(p.custom.completionTokens)}</td><td>${fmt(p.custom.totalTokens)}</td></tr>
			</tbody>
		</table>
	`;
}

function renderErrors(results: ProviderScanResult[]): string {
	const errs = results.flatMap((r) => r.errors.map((e) => `${r.provider}: ${e}`));
	if (errs.length === 0) {
		return '<p class="muted">No parse errors.</p>';
	}
	return `<details><summary>Errors (${errs.length})</summary><pre>${escapeHtml(errs.join('\n'))}</pre></details>`;
}

export class DashboardPanel {
	private static currentPanel: DashboardPanel | undefined;
	private readonly panel: vscode.WebviewPanel;
	private readonly disposables: vscode.Disposable[] = [];

	private constructor(panel: vscode.WebviewPanel, private readonly stats: StatsService) {
		this.panel = panel;

		this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
		this.render();
	}

	public static async show(extensionUri: vscode.Uri, stats: StatsService): Promise<void> {
		if (DashboardPanel.currentPanel) {
			DashboardPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
			DashboardPanel.currentPanel.render();
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			'tokenConsumptionStatistics.dashboard',
			'Token Consumption Statistics',
			vscode.ViewColumn.One,
			{ enableScripts: false, localResourceRoots: [extensionUri] },
		);

		DashboardPanel.currentPanel = new DashboardPanel(panel, stats);
	}

	private render(): void {
		const summary = this.stats.getSummary();
		const results = this.stats.getResults();

		this.panel.webview.html = this.renderHtml(summary, results);
	}

	private renderHtml(summary: UsageSummary | undefined, results: ProviderScanResult[]): string {
		const summaryHtml = summary
			? renderSummary(summary)
			: '<p class="muted">No data yet. Run “Token Consumption: Refresh”.</p>';

		return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>Token Consumption Statistics</title>
	<style>
		body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 16px; }
		table { width: 100%; border-collapse: collapse; }
		th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--vscode-editorWidget-border); }
		th { color: var(--vscode-descriptionForeground); font-weight: 600; }
		.muted { color: var(--vscode-descriptionForeground); }
		pre { white-space: pre-wrap; word-break: break-word; }
	</style>
</head>
<body>
	<p class="muted">Counts are best-effort and depend on each provider’s stored logs/exports.</p>
	${summaryHtml}
	${renderErrors(results)}
</body>
</html>`;
	}

	public dispose(): void {
		DashboardPanel.currentPanel = undefined;
		for (const d of this.disposables) {
			d.dispose();
		}
	}
}

