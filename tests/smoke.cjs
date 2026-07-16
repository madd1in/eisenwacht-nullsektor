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

const ammoBefore = game.state.player.arsenal.pistol.clip;
game.shoot();
assert.equal(game.state.player.arsenal.pistol.clip, ammoBefore - 1, "shooting should consume one round");

game.state.levelCore = true;
game.completeLevel();
assert.equal(game.state.levelIndex, 1, "completing a mission should load the next one");
assert.equal(game.state.levelCore, false, "mission inventory should reset between levels");

console.log(
  `Eisenwacht smoke test passed: 3 missions, ${(movement / 0.066).toFixed(2)} movement units/s, ${canvasMetrics.drawImage} render draw calls.`
);
