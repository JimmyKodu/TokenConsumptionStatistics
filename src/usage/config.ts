import * as vscode from 'vscode';

export interface ExtensionConfig {
	refreshIntervalMinutes: number;
	scanMaxFiles: number;
	scanMaxFileSizeKb: number;
	copilotExportJsonPaths: string[];
	copilotEnableHeuristicScan: boolean;
	customExportJsonPaths: string[];
}

export function getConfig(): ExtensionConfig {
	const cfg = vscode.workspace.getConfiguration();

	return {
		refreshIntervalMinutes: cfg.get<number>('tokenConsumptionStatistics.refreshIntervalMinutes', 5),
		scanMaxFiles: cfg.get<number>('tokenConsumptionStatistics.scan.maxFiles', 500),
		scanMaxFileSizeKb: cfg.get<number>('tokenConsumptionStatistics.scan.maxFileSizeKb', 2048),
		copilotExportJsonPaths: cfg.get<string[]>('tokenConsumptionStatistics.copilot.exportJsonPaths', []),
		copilotEnableHeuristicScan: cfg.get<boolean>('tokenConsumptionStatistics.copilot.enableHeuristicScan', true),
		customExportJsonPaths: cfg.get<string[]>('tokenConsumptionStatistics.custom.exportJsonPaths', []),
	};
}
