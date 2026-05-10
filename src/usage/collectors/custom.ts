import * as fs from 'node:fs/promises';
import type { ProviderScanResult, UsageRecord } from '../types';
import { extractUsageRecordsFromUnknown } from '../extract';

function parseJsonOrJsonl(content: string): unknown {
	const trimmed = content.trim();
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
		return JSON.parse(trimmed) as unknown;
	}
	// JSONL fallback
	return trimmed
		.split(/\r?\n/g)
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => JSON.parse(line) as unknown);
}

export async function collectCustomFromExports(exportPaths: string[]): Promise<ProviderScanResult> {
	const errors: string[] = [];
	const records: UsageRecord[] = [];

	for (const p of exportPaths) {
		try {
			const raw = await fs.readFile(p, 'utf8');
			const json = parseJsonOrJsonl(raw);
			records.push(...extractUsageRecordsFromUnknown('custom', p, json));
		} catch (err) {
			errors.push(`${p}: ${(err as Error)?.message ?? String(err)}`);
		}
	}

	return { provider: 'custom', records, errors };
}

