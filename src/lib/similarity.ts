function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) grid[i][0] = i;
  for (let j = 0; j < cols; j += 1) grid[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      grid[i][j] = Math.min(
        grid[i - 1][j] + 1,
        grid[i][j - 1] + 1,
        grid[i - 1][j - 1] + cost,
      );
    }
  }

  return grid[a.length][b.length];
}

export function cleanName(value: string): string {
  return value.toLowerCase().trim();
}

/** 0–100. Nickname hits should skip this and attach directly. */
export function nameScore(left: string, right: string): number {
  const a = cleanName(left);
  const b = cleanName(right);
  if (!a || !b) return 0;
  if (a === b) return 100;

  const distance = levenshtein(a, b);
  const longest = Math.max(a.length, b.length);
  let score = (1 - distance / longest) * 100;

  if (a.includes(b) || b.includes(a)) {
    score = Math.max(score, 70);
  }

  return Math.round(score);
}
