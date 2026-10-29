import { readFileSync } from 'node:fs';
for (const line of readFileSync('.env', 'utf8').split('\n')) {
  if (!line.includes('=') || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

async function main() {
  const { PointsService } = await import('./src/features/gamification/points/PointsService');
  console.log('addPoints (no global crypto assumed)...');
  const entry = await PointsService.addPoints('smoke-test-user-2', 10, 'sorted:retest');
  console.log('addPoints ->', entry);

  console.log('getBalance...');
  const balance = await PointsService.getBalance('smoke-test-user-2');
  console.log('getBalance ->', balance);
  process.exit(0);
}
main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
