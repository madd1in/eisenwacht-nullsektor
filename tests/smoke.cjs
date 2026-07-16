const assert = require("node:assert/strict");

function makeClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    toggle: (name, force) => {
      if (force === true) values.add(name);
      else if (force === false) values.delete(name);
      else if (values.has(name)) values.delete(name);
      else values.add(name);
    },
    contains: (name) => values.has(name),
  };
}

const canvasMetrics = { drawImage: 0, fillRect: 0 };

function makeContext() {
  const gradient = { addColorStop() {} };
  const target = {
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    getImageData: (_x, _y, width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    putImageData() {},
    measureText: () => ({ width: 0 }),
    drawImage: () => { canvasMetrics.drawImage += 1; },
    fillRect: () => { canvasMetrics.fillRect += 1; },
  };
  return new Proxy(target, {
    get(object, key) {
      if (key in object) return object[key];
      return () => {};
    },
    set(object, key, value) {
      object[key] = value;
      return true;
    },
  });
}

function makeElement(isCanvas = false) {
  const child = { textContent: "" };
  const listeners = new Map();
  return {
    width: isCanvas ? 640 : 0,
    height: isCanvas ? 360 : 0,
    hidden: false,
    style: {},
    dataset: {},
    textContent: "",
    classList: makeClassList(),
    getContext: () => makeContext(),
    querySelector: () => child,
    addEventListener: (name, listener) => listeners.set(name, listener),
    setPointerCapture() {},
    requestPointerLock() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 112, height: 112 }),
  };
}

const canvas = makeElement(true);
const elements = new Map();
global.document = {
  pointerLockElement: null,
  querySelector(selector) {
    if (selector === "#game") return canvas;
    if (!elements.has(selector)) elements.set(selector, makeElement());
    return elements.get(selector);
  },
  querySelectorAll: () => [],
  createElement: (tag) => makeElement(tag === "canvas"),
  addEventListener() {},
  exitPointerLock() {},
};
global.window = global;
global.addEventListener = () => {};
global.matchMedia = () => ({ matches: false });
global.requestAnimationFrame = () => 1;
global.localStorage = {
  values: new Map(),
  getItem(key) { return this.values.get(key) ?? null; },
  setItem(key, value) { this.values.set(key, String(value)); },
};

require("../game.js");

const game = global.__eisenwacht;
assert.ok(game, "debug API should be exposed");
assert.equal(game.levels.length, 3, "campaign should contain three missions");
assert.deepEqual(game.validate(), [], "all level entities should stand on walkable tiles");
assert.equal(typeof game.audio.updateMusic, "function", "adaptive music sequencer should be available");

for (const [index, level] of game.levels.entries()) {
  let spawn;
  let exit;
  for (let y = 0; y < level.map.length; y += 1) {
    for (let x = 0; x < level.map[y].length; x += 1) {
      if (level.map[y][x] === "P") spawn = [x, y];
      if (level.map[y][x] === "X") exit = [x, y];
    }
  }
  const queue = [spawn];
  const visited = new Set([spawn.join(",")]);
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextX = x + dx;
      const nextY = y + dy;
      const tile = level.map[nextY]?.[nextX];
      const key = `${nextX},${nextY}`;
      if (tile && !/[123]/.test(tile) && !visited.has(key)) {
        visited.add(key);
        queue.push([nextX, nextY]);
      }
    }
  }
  assert.ok(visited.has(exit.join(",")), `mission ${index + 1} exit should be reachable once doors open`);
  for (const entity of [...level.enemies, ...level.items]) {
    const key = `${Math.floor(entity.x)},${Math.floor(entity.y)}`;
    assert.ok(visited.has(key), `mission ${index + 1} ${entity.type} at ${key} should be reachable`);
  }
}

game.start("agent");
assert.equal(game.state.mode, "running");
assert.equal(game.state.levelIndex, 0);
assert.equal(game.state.player.health, 100);

game.state.player.pitch = 0;

let scheduledNotes = 0;
const originalTone = game.audio.tone;
const originalNoise = game.audio.noise;
game.audio.context = {};
game.audio.musicBus = {};
game.audio.tone = () => { scheduledNotes += 1; };
game.audio.noise = () => { scheduledNotes += 1; };
game.audio.resetMusic();
game.audio.updateMusic(0.2, 0, false);
assert.ok(scheduledNotes >= 2, "background music should schedule rhythm and bass layers");
game.audio.tone = originalTone;
game.audio.noise = originalNoise;
game.audio.context = null;
game.audio.musicBus = null;
game.applyLookInput(0, 10);
assert.ok(game.state.player.pitch < 0, "moving the pointer down should look down, not up");
game.state.player.pitch = 0;
game.applyLookInput(0, -10);
assert.ok(game.state.player.pitch > 0, "moving the pointer up should look up, not down");
game.state.player.pitch = 0;

const startX = game.state.player.x;
const startY = game.state.player.y;
game.input.keys.add("KeyW");
game.simulateElapsed(0.066);
game.input.keys.delete("KeyW");
const movement = Math.hypot(game.state.player.x - startX, game.state.player.y - startY);
assert.ok(movement > 0.18, "a 66ms frame should preserve real-time movement instead of slowing the simulation");

canvasMetrics.drawImage = 0;
canvasMetrics.fillRect = 0;
game.render();
assert.ok(canvasMetrics.drawImage < 350, `batched renderer should stay below 350 draw calls, got ${canvasMetrics.drawImage}`);

const barrel = game.state.enemies.find((enemy) => enemy.type === "barrel" && enemy.alive);
const blastTarget = game.state.enemies.find((enemy) => enemy.type === "guard" && enemy.alive);
blastTarget.x = barrel.x + 2;
blastTarget.y = barrel.y;
const targetHealthBefore = blastTarget.health;
const killsBeforeBarrel = game.state.totalKills;
game.killEnemy(barrel);
assert.equal(barrel.alive, false, "reactor barrel should be destructible");
assert.ok(blastTarget.health < targetHealthBefore, "reactor barrel should deal area damage");
assert.equal(game.state.totalKills, killsBeforeBarrel, "destroying scenery should not count as an enemy kill");
assert.ok(game.state.particles.length >= 20, "explosion should create a visible particle burst");

const originalEnemies = game.state.enemies;
const chainBarrelA = { ...barrel, id: "chain-a", x: 10, y: 10, health: 46, alive: true };
const chainBarrelB = { ...barrel, id: "chain-b", x: 11, y: 10, health: 46, alive: true };
game.state.enemies = [chainBarrelA, chainBarrelB];
game.killEnemy(chainBarrelA);
assert.equal(chainBarrelB.alive, false, "nearby reactor barrels should trigger a chain reaction");
game.state.enemies = originalEnemies;

const ammoBefore = game.state.player.arsenal.pistol.clip;
game.shoot();
assert.equal(game.state.player.arsenal.pistol.clip, ammoBefore - 1, "shooting should consume one round");

game.state.levelCore = true;
game.completeLevel();
assert.equal(game.state.levelIndex, 1, "completing a mission should load the next one");
assert.equal(game.state.levelCore, false, "mission inventory should reset between levels");

console.log(
  `Eisenwacht smoke test passed: 3 missions, adaptive BGM, reactor blast, ${(movement / 0.066).toFixed(2)} movement units/s, ${canvasMetrics.drawImage} render draw calls.`
);
