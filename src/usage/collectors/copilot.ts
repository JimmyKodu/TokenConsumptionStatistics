import * as fs from 'node:fs/promises';
import type { ProviderScanResult, UsageRecord } from '../types';
import { extractUsageRecordsFromUnknown } from '../extract';

export async function collectCopilotFromExports(exportPaths: string[]): Promise<ProviderScanResult> {
	const errors: string[] = [];
	const records: UsageRecord[] = [];

	for (const p of exportPaths) {
		try {
			const raw = await fs.readFile(p, 'utf8');
			const json = JSON.parse(raw) as unknown;
			records.push(...extractUsageRecordsFromUnknown('copilot', p, json));
		} catch (err) {
			errors.push(`${p}: ${(err as Error)?.message ?? String(err)}`);
		}
	}

	return { provider: 'copilot', records, errors };
}

