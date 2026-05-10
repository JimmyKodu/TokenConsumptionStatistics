import type { ProviderScanResult, UsageProviderId, UsageRecord, UsageSummary } from './types';

function sumTokens(records: UsageRecord[]): { prompt: number; completion: number; total: number; cost?: number } {
	let prompt = 0;
	let completion = 0;
	let total = 0;
	let cost: number | undefined = undefined;

	for (const r of records) {
		prompt += r.promptTokens ?? 0;
		completion += r.completionTokens ?? 0;
		total += r.totalTokens ?? (r.promptTokens ?? 0) + (r.completionTokens ?? 0);
		if (typeof r.totalCost === 'number' && Number.isFinite(r.totalCost)) {
			cost = (cost ?? 0) + r.totalCost;
		}
	}

	return { prompt, completion, total, cost };
}

function emptyProviderSummary(): Omit<UsageSummary, 'byProvider'> {
	return { totalRequests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, totalCost: undefined };
}

export function summarize(results: ProviderScanResult[]): UsageSummary {
	const byProvider: Record<UsageProviderId, Omit<UsageSummary, 'byProvider'>> = {
		copilot: emptyProviderSummary(),
		cline: emptyProviderSummary(),
		kilo: emptyProviderSummary(),
		custom: emptyProviderSummary(),
	};

	for (const r of results) {
		const sums = sumTokens(r.records);
		byProvider[r.provider] = {
			totalRequests: r.records.length,
			promptTokens: sums.prompt,
			completionTokens: sums.completion,
			totalTokens: sums.total,
			totalCost: sums.cost,
		};
	}

	const allRecords = results.flatMap((r) => r.records);
	const sums = sumTokens(allRecords);

	return {
		totalRequests: allRecords.length,
		promptTokens: sums.prompt,
		completionTokens: sums.completion,
		totalTokens: sums.total,
		totalCost: sums.cost,
		byProvider,
	};
}

