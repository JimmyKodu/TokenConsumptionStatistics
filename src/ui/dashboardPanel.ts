import * as vscode from 'vscode';
import type { StatsService } from '../usage/statsService';
import type { ProviderScanResult, UsageSummary } from '../usage/types';

type ProviderKey = 'copilot' | 'cline' | 'kilo' | 'custom';

function escapeHtml(input: string): string {
	return input
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function formatNumber(n: number | undefined): string {
	return typeof n === 'number' ? n.toLocaleString() : '--';
}

function formatTokensCompact(tokens: number | undefined): string {
	if (typeof tokens !== 'number') {
		return '--';
	}
	if (tokens >= 1_000_000) {
		return `${(tokens / 1_000_000).toFixed(1)}M`;
	}
	if (tokens >= 1_000) {
		return `${(tokens / 1_000).toFixed(1)}K`;
	}
	return String(tokens);
}

function pct(n: number, d: number): number {
	if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) {
		return 0;
	}
	return Math.max(0, Math.min(100, (n / d) * 100));
}

function providerMeta(provider: ProviderKey): { label: string; className: string } {
	switch (provider) {
		case 'copilot':
			return { label: 'Copilot', className: 'p-copilot' };
		case 'cline':
			return { label: 'Cline', className: 'p-cline' };
		case 'kilo':
			return { label: 'Kilo Code', className: 'p-kilo' };
		case 'custom':
			return { label: 'Custom', className: 'p-custom' };
	}
}

function renderCards(summary: UsageSummary): string {
	const providers: Array<{ key: ProviderKey; stats: UsageSummary['byProvider'][ProviderKey] }> = [
		{ key: 'copilot', stats: summary.byProvider.copilot },
		{ key: 'cline', stats: summary.byProvider.cline },
		{ key: 'kilo', stats: summary.byProvider.kilo },
		{ key: 'custom', stats: summary.byProvider.custom },
	];

	const all = `
		<div class="card card-all">
			<div class="card-title">All</div>
			<div class="card-metric">
				<span class="metric-main">${formatTokensCompact(summary.totalTokens)}</span>
				<span class="metric-sub">${formatNumber(summary.totalTokens)} tokens</span>
			</div>
			<div class="card-kv">
				<div><span class="k">Calls</span><span class="v">${formatNumber(summary.totalRequests)}</span></div>
				<div><span class="k">Prompt</span><span class="v">${formatNumber(summary.promptTokens)}</span></div>
				<div><span class="k">Completion</span><span class="v">${formatNumber(summary.completionTokens)}</span></div>
			</div>
		</div>
	`;

	const cards = providers
		.map(({ key, stats }) => {
			const meta = providerMeta(key);
			return `
				<div class="card ${meta.className}">
					<div class="card-title">${meta.label}</div>
					<div class="card-metric">
						<span class="metric-main">${formatTokensCompact(stats.totalTokens)}</span>
						<span class="metric-sub">${formatNumber(stats.totalTokens)} tokens</span>
					</div>
					<div class="card-kv">
						<div><span class="k">Calls</span><span class="v">${formatNumber(stats.totalRequests)}</span></div>
						<div><span class="k">Prompt</span><span class="v">${formatNumber(stats.promptTokens)}</span></div>
						<div><span class="k">Completion</span><span class="v">${formatNumber(stats.completionTokens)}</span></div>
					</div>
				</div>
			`;
		})
		.join('\n');

	return `<div class="cards">${all}${cards}</div>`;
}

function renderBars(summary: UsageSummary): string {
	const providers: Array<{ key: ProviderKey; stats: UsageSummary['byProvider'][ProviderKey] }> = [
		{ key: 'copilot', stats: summary.byProvider.copilot },
		{ key: 'cline', stats: summary.byProvider.cline },
		{ key: 'kilo', stats: summary.byProvider.kilo },
		{ key: 'custom', stats: summary.byProvider.custom },
	];

	const maxTokens = Math.max(1, ...providers.map((p) => p.stats.totalTokens ?? 0));

	const rows = providers
		.map(({ key, stats }) => {
			const meta = providerMeta(key);
			const totalTokens = stats.totalTokens ?? 0;
			const promptTokens = stats.promptTokens ?? 0;
			const completionTokens = stats.completionTokens ?? 0;
			const fill = pct(totalTokens, maxTokens);
			const segPrompt = pct(promptTokens, Math.max(1, totalTokens));
			const segCompletion = pct(completionTokens, Math.max(1, totalTokens));

			return `
				<div class="bar-row ${meta.className}">
					<div class="bar-label">${meta.label}</div>
					<div class="bar-track" aria-hidden="true">
						<div class="bar-fill" style="width: ${fill.toFixed(2)}%">
							<div class="bar-seg bar-prompt" style="width: ${segPrompt.toFixed(2)}%"></div>
							<div class="bar-seg bar-completion" style="width: ${segCompletion.toFixed(2)}%"></div>
						</div>
					</div>
					<div class="bar-value">${formatTokensCompact(stats.totalTokens)}</div>
				</div>
			`;
		})
		.join('\n');

	return `
		<section class="bars">
			<div class="section-title">Token by provider</div>
			<div class="legend">
				<span class="dot dot-prompt"></span><span class="legend-label">Prompt</span>
				<span class="dot dot-completion"></span><span class="legend-label">Completion</span>
			</div>
			<div class="bar-table">${rows}</div>
		</section>
	`;
}

function renderDetailsTable(summary: UsageSummary): string {
	const p = summary.byProvider;
	return `
		<details class="details">
			<summary>Details</summary>
			<table>
				<thead><tr><th>Provider</th><th>Calls</th><th>Prompt</th><th>Completion</th><th>Total</th></tr></thead>
				<tbody>
					<tr><td><b>All</b></td><td>${formatNumber(summary.totalRequests)}</td><td>${formatNumber(summary.promptTokens)}</td><td>${formatNumber(summary.completionTokens)}</td><td>${formatNumber(summary.totalTokens)}</td></tr>
					<tr><td>Copilot</td><td>${formatNumber(p.copilot.totalRequests)}</td><td>${formatNumber(p.copilot.promptTokens)}</td><td>${formatNumber(p.copilot.completionTokens)}</td><td>${formatNumber(p.copilot.totalTokens)}</td></tr>
					<tr><td>Cline</td><td>${formatNumber(p.cline.totalRequests)}</td><td>${formatNumber(p.cline.promptTokens)}</td><td>${formatNumber(p.cline.completionTokens)}</td><td>${formatNumber(p.cline.totalTokens)}</td></tr>
					<tr><td>Kilo Code</td><td>${formatNumber(p.kilo.totalRequests)}</td><td>${formatNumber(p.kilo.promptTokens)}</td><td>${formatNumber(p.kilo.completionTokens)}</td><td>${formatNumber(p.kilo.totalTokens)}</td></tr>
					<tr><td>Custom</td><td>${formatNumber(p.custom.totalRequests)}</td><td>${formatNumber(p.custom.promptTokens)}</td><td>${formatNumber(p.custom.completionTokens)}</td><td>${formatNumber(p.custom.totalTokens)}</td></tr>
				</tbody>
			</table>
		</details>
	`;
}

function renderSummary(summary: UsageSummary): string {
	return `
		${renderCards(summary)}
		${renderBars(summary)}
		${renderDetailsTable(summary)}
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
		:root {
			--card-bg: var(--vscode-editorWidget-background);
			--card-border: var(--vscode-editorWidget-border);
			--muted: var(--vscode-descriptionForeground);
			--shadow: 0 1px 0 rgba(0,0,0,0.08);

			--p-copilot: var(--vscode-charts-blue);
			--p-cline: var(--vscode-charts-green);
			--p-kilo: var(--vscode-charts-yellow);
			--p-custom: var(--vscode-charts-purple);
		}

		body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 16px; }
		a { color: var(--vscode-textLink-foreground); }
		a:hover { color: var(--vscode-textLink-activeForeground); }
		.muted { color: var(--muted); }
		pre { white-space: pre-wrap; word-break: break-word; }

		.cards {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
			gap: 12px;
			margin: 12px 0 16px;
		}
		.card {
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: 10px;
			padding: 12px 12px 10px;
			box-shadow: var(--shadow);
		}
		.card-title { font-size: 12px; letter-spacing: .02em; color: var(--muted); margin-bottom: 6px; }
		.card-metric { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
		.metric-main { font-size: 20px; font-weight: 700; }
		.metric-sub { font-size: 12px; color: var(--muted); white-space: nowrap; }
		.card-kv { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; margin-top: 10px; }
		.card-kv .k { color: var(--muted); font-size: 12px; }
		.card-kv .v { font-weight: 600; }
		.card-kv > div { display: flex; justify-content: space-between; gap: 10px; }

		.card-all { border-left: 4px solid var(--vscode-charts-foreground); }
		.p-copilot { border-left: 4px solid var(--p-copilot); }
		.p-cline { border-left: 4px solid var(--p-cline); }
		.p-kilo { border-left: 4px solid var(--p-kilo); }
		.p-custom { border-left: 4px solid var(--p-custom); }

		.section-title { font-weight: 700; margin: 0 0 8px; }
		.legend { display: flex; gap: 8px; align-items: center; color: var(--muted); font-size: 12px; margin: 0 0 10px; }
		.legend-label { margin-right: 10px; }
		.dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
		.dot-prompt { background: color-mix(in srgb, var(--vscode-foreground) 20%, transparent); border: 1px solid var(--card-border); }
		.dot-completion { background: var(--vscode-foreground); opacity: .45; border-radius: 2px; width: 14px; height: 10px; }

		.bar-table { display: grid; gap: 10px; }
		.bar-row { display: grid; grid-template-columns: 90px 1fr 56px; gap: 10px; align-items: center; }
		.bar-label { font-size: 12px; color: var(--muted); }
		.bar-value { font-variant-numeric: tabular-nums; text-align: right; color: var(--muted); }
		.bar-track { height: 10px; border-radius: 999px; background: color-mix(in srgb, var(--vscode-foreground) 10%, transparent); overflow: hidden; border: 1px solid var(--card-border); }
		.bar-fill { height: 100%; display: flex; }
		.bar-seg { height: 100%; }
		.bar-row.p-copilot .bar-prompt { background: color-mix(in srgb, var(--p-copilot) 55%, transparent); }
		.bar-row.p-copilot .bar-completion { background: var(--p-copilot); }
		.bar-row.p-cline .bar-prompt { background: color-mix(in srgb, var(--p-cline) 55%, transparent); }
		.bar-row.p-cline .bar-completion { background: var(--p-cline); }
		.bar-row.p-kilo .bar-prompt { background: color-mix(in srgb, var(--p-kilo) 60%, transparent); }
		.bar-row.p-kilo .bar-completion { background: var(--p-kilo); }
		.bar-row.p-custom .bar-prompt { background: color-mix(in srgb, var(--p-custom) 55%, transparent); }
		.bar-row.p-custom .bar-completion { background: var(--p-custom); }

		.details { margin-top: 14px; }
		summary { cursor: pointer; color: var(--muted); }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; }
		th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--card-border); }
		th { color: var(--muted); font-weight: 600; }
		.footer { margin-top: 16px; font-size: 12px; }
	</style>
</head>
<body>
	<p class="muted">Counts are best-effort and depend on each provider’s stored logs/exports.</p>
	${summaryHtml}
	${renderErrors(results)}
	<p class="footer muted">Inspired by <a href="https://github.com/VicBilibily/GCMP">VicBilibily/GCMP</a> token usage charts.</p>
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
