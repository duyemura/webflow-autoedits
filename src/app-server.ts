import "dotenv/config";
import { buildApp } from "./app.js";
import { rebuildSite } from "./services/builder.js";
import { supabase } from "./services/supabase/client.js";

const PORT = parseInt(process.env.PORT || "3200", 10);
const HOST = process.env.HOST || "0.0.0.0";

async function rebuildAllSites() {
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('published', true);
  if (!sites?.length) return;
  console.log(`Rebuilding ${sites.length} site(s) on startup...`);
  await Promise.all((sites as { id: string; name: string }[]).map(s => rebuildSite(s.id).catch(e => console.error(`Failed to rebuild ${s.name}:`, e))));
  console.log('Startup rebuild complete.');
}

async function main() {
  await rebuildAllSites();
  const app = await buildApp();
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Server listening on http://${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
