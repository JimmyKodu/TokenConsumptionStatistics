import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface WalkOptions {
	maxFiles: number;
	maxDepth: number;
	includeExtensions: Set<string>;
}

export async function walkFiles(rootDir: string, options: WalkOptions): Promise<string[]> {
	const results: string[] = [];
	const stack: Array<{ dir: string; depth: number }> = [{ dir: rootDir, depth: 0 }];

	while (stack.length > 0 && results.length < options.maxFiles) {
		const { dir, depth } = stack.pop()!;
		if (depth > options.maxDepth) {
			continue;
		}

		let entries: Array<{ name: string; isFile(): boolean; isDirectory(): boolean }> = [];
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			continue;
		}

		for (const entry of entries) {
			if (results.length >= options.maxFiles) {
				break;
			}
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				stack.push({ dir: fullPath, depth: depth + 1 });
				continue;
			}
			if (!entry.isFile()) {
				continue;
			}
			const ext = path.extname(entry.name).toLowerCase();
			if (options.includeExtensions.has(ext)) {
				results.push(fullPath);
			}
		}
	}

	return results;
}

