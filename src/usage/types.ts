export type UsageProviderId = 'copilot' | 'cline' | 'kilo' | 'custom';

export interface UsageRecord {
	provider: UsageProviderId;
	source: string;
	model?: string;
	timestamp?: string;
	promptTokens?: number;
	completionTokens?: number;
	totalTokens?: number;
	totalCost?: number;
}

export interface UsageSummary {
	totalRequests: number;
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	totalCost?: number;
	byProvider: Record<UsageProviderId, Omit<UsageSummary, 'byProvider'>>;
}

export interface ProviderScanResult {
	provider: UsageProviderId;
	records: UsageRecord[];
	errors: string[];
}

