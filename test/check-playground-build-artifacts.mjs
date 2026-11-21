import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

// Run after build:all, so integration shards do not rebuild these playgrounds.
// Each React SPA playground builds a Worker in dist/ssr and its client in dist/client.
const playgrounds = ['spa', 'websockets', 'kitchen-sink'];

function artifactUrl(playground, path) {
  return new URL(`../playground/${playground}/${path}`, import.meta.url);
}

function readConfig(playground) {
  return JSON.parse(readFileSync(artifactUrl(playground, 'dist/ssr/wrangler.json'), 'utf8'));
}

for (const playground of playgrounds) {
  for (const path of ['dist/ssr/index.js', 'dist/ssr/wrangler.json', 'dist/client/index.html']) {
    assert.ok(existsSync(artifactUrl(playground, path)), `${playground}/${path} was not built`);
  }
  assert.equal(
    readConfig(playground).assets?.directory,
    '../client',
    `${playground} has the wrong asset directory`,
  );
}

function checkBindings(playground, { cron, durableObjects = [] } = {}) {
  const config = readConfig(playground);
  assert.ok(
    config.d1_databases?.some((binding) => binding.binding === 'DB'),
    `${playground} is missing the inferred DB binding`,
  );
  assert.ok(
    config.kv_namespaces?.some((binding) => binding.binding === 'KV'),
    `${playground} is missing the inferred KV binding`,
  );
  if (cron) {
    assert.deepEqual(config.triggers?.crons, [cron], `${playground} has the wrong cron schedule`);
  }
  checkDurableObjects(playground, durableObjects);
}

function checkDurableObjects(playground, names) {
  const bound =
    readConfig(playground).durable_objects?.bindings?.map((binding) => binding.name) ?? [];
  for (const name of names) {
    assert.ok(bound.includes(name), `${playground} is missing the inferred ${name} Durable Object`);
  }
}

checkBindings('spa', { cron: '0 * * * *' });
checkBindings('kitchen-sink', { cron: '* * * * *', durableObjects: ['SANDBOX'] });
checkDurableObjects('websockets', ['WsChatRoomWs', 'WsNotificationsWs']);

console.log('Verified SPA playground build artifacts and inferred bindings.');
