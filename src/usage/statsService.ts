import * as path from 'node:path';
import * as vscode from 'vscode';
import { getConfig } from './config';
import type { ProviderScanResult, UsageSummary } from './types';
import { collectCopilotFromExports } from './collectors/copilot';
import { collectCustomFromExports } from './collectors/custom';
import { collectFromGlobalStorageDir } from './collectors/globalStorageHeuristic';
import { summarize } from './summary';

export class StatsService implements vscode.Disposable {
	private readonly statusBar: vscode.StatusBarItem;
	private readonly disposables: vscode.Disposable[] = [];
	private refreshTimer: NodeJS.Timeout | undefined;
	private lastResults: ProviderScanResult[] = [];
	private lastSummary: UsageSummary | undefined;

	constructor(private readonly context: vscode.ExtensionContext) {
		this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this.statusBar.command = 'token-consumption-statistics.openDashboard';
		this.statusBar.text = '$(pulse) Token Usage: --';
		this.statusBar.show();
		this.disposables.push(this.statusBar);

		this.disposables.push(
			vscode.workspace.onDidChangeConfiguration((e) => {
				if (e.affectsConfiguration('tokenConsumptionStatistics')) {
					void this.refresh({ notify: false });
				}
			}),
		);
	}

	public getSummary(): UsageSummary | undefined {
		return this.lastSummary;
	}

	public getResults(): ProviderScanResult[] {
		return this.lastResults;
	}

	public async refresh(options: { notify: boolean }): Promise<void> {
		this.clearTimer();
		const cfg = getConfig();

		const globalStorageRoot = path.dirname(this.context.globalStorageUri.fsPath);
		const maxFileSizeBytes = Math.max(64, cfg.scanMaxFileSizeKb) * 1024;

		const [copilot, custom, cline, kilo] = await Promise.all([
			collectCopilotFromExports(cfg.copilotExportJsonPaths),
			collectCustomFromExports(cfg.customExportJsonPaths),
			collectFromGlobalStorageDir('cline', path.join(globalStorageRoot, 'saoudrizwan.claude-dev'), {
				maxFiles: cfg.scanMaxFiles,
				maxFileSizeBytes,
				maxDepth: 6,
			}),
			collectFromGlobalStorageDir('kilo', path.join(globalStorageRoot, 'kilocode.kilo-code'), {
				maxFiles: cfg.scanMaxFiles,
				maxFileSizeBytes,
				maxDepth: 6,
			}),
		]);

		this.lastResults = [copilot, cline, kilo, custom];
		this.lastSummary = summarize(this.lastResults);
		this.updateStatusBar(this.lastSummary);

		if (options.notify) {
			void vscode.window.showInformationMessage('Token Consumption Statistics refreshed.');
		}

		if (cfg.refreshIntervalMinutes > 0) {
			this.refreshTimer = setTimeout(() => void this.refresh({ notify: false }), cfg.refreshIntervalMinutes * 60_000);
		}
	}

	private updateStatusBar(summary: UsageSummary): void {
		this.statusBar.text = `$(pulse) Tokens ${summary.totalTokens.toLocaleString()} • Calls ${summary.totalRequests.toLocaleString()}`;
		this.statusBar.tooltip = 'Open Token Consumption Dashboard';
	}

	private clearTimer(): void {
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
			this.refreshTimer = undefined;
		}
	}

	public dispose(): void {
		this.clearTimer();
		for (const d of this.disposables) {
			d.dispose();
		}
	}
}

