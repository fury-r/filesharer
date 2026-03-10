import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readText = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const packageJson = JSON.parse(readText('../package.json'));
const rootReadme = readText('../../../README.md');
const docsGuide = readText('../../../docs.md');
const moduleReadme = readText('../README.md');
const peerMcpPage = readText('../../../app/src/pages/PeerMCP/index.tsx');

test('package metadata uses the repo-based package name', () => {
  assert.equal(packageJson.name, 'mcp-webrtc-transport');
  assert.equal(packageJson.repository.url, 'git+https://github.com/fury-r/mcp-webrtc-transport.git');
  assert.equal(packageJson.homepage, 'https://github.com/fury-r/mcp-webrtc-transport');
  assert.equal(packageJson.bugs.url, 'https://github.com/fury-r/mcp-webrtc-transport/issues');
});

test('docs and UI references no longer use the old fileshare package name', () => {
  for (const fileContents of [rootReadme, docsGuide, moduleReadme, peerMcpPage]) {
    assert.match(fileContents, /mcp-webrtc-transport/);
    assert.doesNotMatch(fileContents, /@filesharer\/p2p-mcp/);
  }
});
