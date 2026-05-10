import * as vscode from 'vscode';

import { DashboardPanel } from './ui/dashboardPanel';
import { StatsService } from './usage/statsService';

export function activate(context: vscode.ExtensionContext) {
	const statsService = new StatsService(context);
	context.subscriptions.push(statsService);

	context.subscriptions.push(
		vscode.commands.registerCommand('token-consumption-statistics.openDashboard', async () => {
			await DashboardPanel.show(context.extensionUri, statsService);
		}),
		vscode.commands.registerCommand('token-consumption-statistics.refresh', async () => {
			await statsService.refresh({ notify: true });
		}),
	);

	void statsService.refresh({ notify: false });
}

export function deactivate() {}
