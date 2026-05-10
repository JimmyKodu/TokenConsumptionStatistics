import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ProviderScanResult, UsageProviderId, UsageRecord } from '../types';
import { extractUsageRecordsFromUnknown } from '../extract';
import { walkFiles } from '../fileWalker';

export interface HeuristicScanOptions {
	maxFiles: number;
	maxFileSizeBytes: number;
	maxDepth: number;
}

function parseJsonOrJsonl(content: string): unknown {
	const trimmed = content.trim();
	if (trimmed.length === 0) {
		return undefined;
	}
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
		return JSON.parse(trimmed) as unknown;
	}
	return trimmed
		.split(/\r?\n/g)
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => JSON.parse(line) as unknown);
}

export async function collectFromGlobalStorageDir(
	provider: UsageProviderId,
	dirPath: string,
	options: HeuristicScanOptions,
): Promise<ProviderScanResult> {
	const errors: string[] = [];
	const records: UsageRecord[] = [];

	let stat;
	try {
		stat = await fs.stat(dirPath);
	} catch {
		return { provider, records: [], errors: [] };
	}
	if (!stat.isDirectory()) {
		return { provider, records: [], errors: [] };
	}

	const files = await walkFiles(dirPath, {
		maxFiles: options.maxFiles,
		maxDepth: options.maxDepth,
		includeExtensions: new Set(['.json', '.jsonl', '.log', '.txt']),
	});

	for (const filePath of files) {
		try {
			const s = await fs.stat(filePath);
			if (s.size > options.maxFileSizeBytes) {
				continue;
			}
			const raw = await fs.readFile(filePath, 'utf8');
			const parsed = parseJsonOrJsonl(raw);
			if (parsed === undefined) {
				continue;
			}
			records.push(...extractUsageRecordsFromUnknown(provider, filePath, parsed));
		} catch (err) {
			errors.push(`${path.basename(filePath)}: ${(err as Error)?.message ?? String(err)}`);
		}
	}

	return { provider, records, errors };
}

