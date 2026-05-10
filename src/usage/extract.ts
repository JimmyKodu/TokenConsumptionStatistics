import type { UsageProviderId, UsageRecord } from './types';

function toNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === 'string') {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return undefined;
}

function toIsoTimestamp(value: unknown): string | undefined {
	if (typeof value === 'string') {
		const d = new Date(value);
		if (!Number.isNaN(d.getTime())) {
			return d.toISOString();
		}
		return undefined;
	}
	if (typeof value === 'number' && Number.isFinite(value)) {
		// Heuristic: seconds vs milliseconds.
		const ms = value < 2_000_000_000 ? value * 1000 : value;
		const d = new Date(ms);
		if (!Number.isNaN(d.getTime())) {
			return d.toISOString();
		}
	}
	return undefined;
}

function getObject(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function normalizeUsageTokens(obj: Record<string, unknown>): { prompt?: number; completion?: number; total?: number; cost?: number } | undefined {
	const usageObj = getObject(obj.usage) ?? obj;

	const promptTokens =
		toNumber(usageObj.prompt_tokens) ??
		toNumber(usageObj.promptTokens) ??
		toNumber(usageObj.tokensIn) ??
		toNumber(usageObj.input_tokens) ??
		toNumber(usageObj.inputTokens);

	const completionTokens =
		toNumber(usageObj.completion_tokens) ??
		toNumber(usageObj.completionTokens) ??
		toNumber(usageObj.tokensOut) ??
		toNumber(usageObj.output_tokens) ??
		toNumber(usageObj.outputTokens);

	const totalTokens =
		toNumber(usageObj.total_tokens) ??
		toNumber(usageObj.totalTokens) ??
		(promptTokens !== undefined || completionTokens !== undefined ? (promptTokens ?? 0) + (completionTokens ?? 0) : undefined);

	const totalCost = toNumber(usageObj.totalCost) ?? toNumber(usageObj.cost) ?? toNumber(usageObj.total_cost);

	if (promptTokens === undefined && completionTokens === undefined && totalTokens === undefined && totalCost === undefined) {
		return undefined;
	}

	return { prompt: promptTokens, completion: completionTokens, total: totalTokens, cost: totalCost };
}

function maybeRecordFromObject(provider: UsageProviderId, source: string, obj: Record<string, unknown>): UsageRecord | undefined {
	const usage = normalizeUsageTokens(obj);
	if (!usage) {
		return undefined;
	}

	// Avoid obvious aggregates without any hint of a single request.
	const model = typeof obj.model === 'string' ? obj.model : (typeof obj.modelId === 'string' ? obj.modelId : undefined);

	const timestamp =
		toIsoTimestamp(obj.timestamp) ??
		toIsoTimestamp(obj.time) ??
		toIsoTimestamp(obj.createdAt) ??
		toIsoTimestamp(obj.created_at) ??
		toIsoTimestamp(obj.startTime);

	return {
		provider,
		source,
		model,
		timestamp,
		promptTokens: usage.prompt,
		completionTokens: usage.completion,
		totalTokens: usage.total,
		totalCost: usage.cost,
	};
}

export function extractUsageRecordsFromUnknown(provider: UsageProviderId, source: string, value: unknown): UsageRecord[] {
	const records: UsageRecord[] = [];
	const stack: unknown[] = [value];
	const visited = new Set<unknown>();

	while (stack.length > 0) {
		const cur = stack.pop();
		if (cur === null || cur === undefined) {
			continue;
		}
		if (typeof cur === 'object') {
			if (visited.has(cur)) {
				continue;
			}
			visited.add(cur);
		}

		if (Array.isArray(cur)) {
			for (const item of cur) {
				stack.push(item);
			}
			continue;
		}

		const obj = getObject(cur);
		if (!obj) {
			continue;
		}

		const record = maybeRecordFromObject(provider, source, obj);
		if (record) {
			records.push(record);
		}

		for (const [k, v] of Object.entries(obj)) {
			// If we already counted the parent with `usage`, don't traverse into it again.
			if (k === 'usage') {
				continue;
			}
			stack.push(v);
		}
	}

	return records;
}
