import 'dotenv/config';
import { rebuildSite } from '../src/services/builder.js';

async function main() {
  console.log('Building Iron Forge CrossFit...');
  const r1 = await rebuildSite('00000000-0000-0000-0001-000000000001');
  console.log('Iron Forge:', r1);

  console.log('Building Peak Performance...');
  const r2 = await rebuildSite('00000000-0000-0000-0001-000000000002');
  console.log('Peak Performance:', r2);
}

main().catch(console.error);
