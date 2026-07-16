(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const W = canvas.width;
  const H = canvas.height;
  const FOV = Math.PI / 3;
  const PROJECTION = W / 2 / Math.tan(FOV / 2);
  const TAU = Math.PI * 2;

  ctx.imageSmoothingEnabled = false;

  const ui = {
    hud: document.querySelector("#hud"),
    title: document.querySelector("#title-screen"),
    pause: document.querySelector("#pause-screen"),
    end: document.querySelector("#end-screen"),
    missionNumber: document.querySelector("#mission-number"),
    missionName: document.querySelector("#mission-name"),
    objective: document.querySelector("#objective"),
    score: document.querySelector("#score"),
    message: document.querySelector("#message"),
    crosshair: document.querySelector("#crosshair"),
    health: document.querySelector("#health"),
    healthBar: document.querySelector("#health-bar"),
    key: document.querySelector("#key-indicator"),
    core: document.querySelector("#core-indicator"),
    weaponSlot: document.querySelector("#weapon-slot"),
    weaponName: document.querySelector("#weapon-name"),
    clip: document.querySelector("#clip"),
    reserve: document.querySelector("#reserve"),
    damageFlash: document.querySelector("#damage-flash"),
    pickupFlash: document.querySelector("#pickup-flash"),
    bossWrap: document.querySelector("#boss-wrap"),
    bossHealth: document.querySelector("#boss-health"),
    bossHealthText: document.querySelector("#boss-health-text"),
    resume: document.querySelector("#resume-button"),
    mute: document.querySelector("#mute-button"),
    restart: document.querySelector("#restart-button"),
    endKicker: document.querySelector("#end-kicker"),
    endTitle: document.querySelector("#end-title"),
    endCopy: document.querySelector("#end-copy"),
    endScore: document.querySelector("#end-score-value"),
    touchControls: document.querySelector("#touch-controls"),
    touchStick: document.querySelector("#touch-stick"),
    touchLook: document.querySelector("#touch-look"),
    touchFire: document.querySelector("#touch-fire"),
    touchUse: document.querySelector("#touch-use"),
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const normalizeAngle = (angle) => {
    while (angle < -Math.PI) angle += TAU;
    while (angle > Math.PI) angle -= TAU;
    return angle;
  };

  const buildGrid = (source, width = 16) => {
    const cells = source.replace(/\s/g, "");
    if (cells.length % width !== 0) {
      throw new Error(`Ungültige Karte: ${cells.length} Felder lassen sich nicht durch ${width} teilen.`);
    }
    return Array.from({ length: cells.length / width }, (_, row) =>
      cells.slice(row * width, row * width + width).split("")
    );
  };

  const LEVELS = [
    {
      number: "M01",
      name: "DER KORRIDOR",
      briefing: "Sektor eins: Finde den gestohlenen Datenkern und erreiche den Lastenaufzug.",
      floor: "#11191a",
      ceiling: "#101c20",
      map: buildGrid(`
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 P 0 0 0 0 0 D 0 0 0 0 0 0 0 1
        1 0 1 1 1 1 1 1 0 1 1 1 1 1 0 1
        1 0 0 0 0 0 0 1 0 0 0 0 0 1 0 1
        1 1 1 1 1 1 0 1 1 1 1 1 0 1 0 1
        1 0 0 0 0 0 0 0 0 0 0 1 0 0 0 1
        1 0 1 1 1 1 1 1 1 1 0 1 1 1 0 1
        1 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1
        1 1 1 1 0 1 1 1 0 1 1 1 1 1 0 1
        1 0 0 0 0 1 0 0 0 0 0 0 0 1 0 1
        1 0 1 1 1 1 0 1 1 1 1 1 0 1 0 1
        1 0 0 0 0 0 0 0 0 0 0 1 0 0 0 1
        1 1 1 1 1 1 0 1 1 1 0 1 1 1 0 1
        1 0 0 0 0 0 0 1 0 0 0 0 0 0 0 1
        1 0 1 1 1 1 0 0 0 1 1 1 1 1 X 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
      `),
      enemies: [
        { type: "guard", x: 4.5, y: 3.5 },
        { type: "guard", x: 8.5, y: 5.5 },
        { type: "drone", x: 12.5, y: 7.5 },
        { type: "guard", x: 6.5, y: 11.5 },
        { type: "drone", x: 11.5, y: 13.5 },
      ],
      items: [
        { type: "ammo", x: 2.5, y: 5.5 },
        { type: "medkit", x: 8.5, y: 9.5 },
        { type: "weapon", x: 10.5, y: 11.5 },
        { type: "core", x: 12.5, y: 13.5 },
        { type: "ammo", x: 2.5, y: 13.5 },
      ],
    },
    {
      number: "M02",
      name: "ROSTWERK 9",
      briefing: "Die Fabrik ist verriegelt. Beschaffe ein Zugangssiegel und plündere das Archiv.",
      floor: "#1c1513",
      ceiling: "#211515",
      map: buildGrid(`
        2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2
        2 P 0 0 0 0 2 0 0 0 0 0 0 0 0 2
        2 2 2 2 0 0 2 0 2 2 2 2 2 2 0 2
        2 0 0 0 0 2 2 0 0 0 0 0 0 0 0 2
        2 0 2 2 2 2 0 0 2 2 2 2 0 2 2 2
        2 0 0 0 0 0 0 2 0 0 0 2 0 0 0 2
        2 2 2 0 2 2 2 2 0 2 0 2 2 2 0 2
        2 0 0 0 2 0 0 0 0 2 0 0 0 0 0 2
        2 0 2 2 2 0 2 2 2 2 2 2 0 2 0 2
        2 0 2 0 0 0 0 0 0 0 0 2 0 2 0 2
        2 0 2 0 2 2 2 2 2 2 0 2 0 2 0 2
        2 0 0 0 0 0 0 0 0 2 0 0 0 2 0 2
        2 2 2 2 2 2 2 L 2 2 2 2 2 2 2 2
        2 0 0 0 0 0 0 0 0 0 0 0 0 0 0 2
        2 0 2 2 2 2 2 2 2 2 2 2 2 2 X 2
        2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2
      `),
      enemies: [
        { type: "guard", x: 4.5, y: 3.5 },
        { type: "drone", x: 8.5, y: 3.5 },
        { type: "guard", x: 5.5, y: 5.5 },
        { type: "drone", x: 10.5, y: 7.5 },
        { type: "guard", x: 8.5, y: 9.5 },
        { type: "guard", x: 6.5, y: 11.5 },
        { type: "drone", x: 12.5, y: 11.5 },
      ],
      items: [
        { type: "ammo", x: 4.5, y: 1.5 },
        { type: "medkit", x: 3.5, y: 7.5 },
        { type: "key", x: 12.5, y: 7.5 },
        { type: "ammo", x: 4.5, y: 9.5 },
        { type: "medkit", x: 10.5, y: 11.5 },
        { type: "core", x: 5.5, y: 13.5 },
      ],
    },
    {
      number: "M03",
      name: "NULLKAMMER",
      briefing: "Der Verwalter schützt den Sender. Schalte ihn aus und bring den Nullkern ans Licht.",
      floor: "#11151d",
      ceiling: "#111324",
      bossRequired: true,
      map: buildGrid(`
        3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3
        3 P 0 0 0 0 0 0 0 0 0 0 0 0 0 3
        3 0 3 3 3 3 0 3 3 0 3 3 3 3 0 3
        3 0 3 0 0 0 0 3 0 0 0 0 0 3 0 3
        3 0 3 0 3 3 3 3 0 3 3 3 0 3 0 3
        3 0 0 0 3 0 0 0 0 0 0 3 0 0 0 3
        3 3 3 0 3 0 3 3 3 3 0 3 3 3 0 3
        3 0 0 0 0 0 3 0 0 3 0 0 0 0 0 3
        3 0 3 3 3 0 3 0 0 3 0 3 3 3 0 3
        3 0 0 0 3 0 D 0 0 D 0 3 0 0 0 3
        3 3 3 0 3 0 3 3 3 3 0 3 0 3 3 3
        3 0 0 0 3 0 0 0 0 0 0 3 0 0 0 3
        3 0 3 3 3 3 3 0 0 3 3 3 3 3 0 3
        3 0 0 0 0 0 0 0 0 0 0 0 0 0 0 3
        3 0 3 3 3 3 3 3 3 3 3 3 3 3 X 3
        3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3
      `),
      enemies: [
        { type: "guard", x: 5.5, y: 3.5 },
        { type: "drone", x: 12.5, y: 3.5 },
        { type: "guard", x: 2.5, y: 7.5 },
        { type: "drone", x: 13.5, y: 7.5 },
        { type: "boss", x: 7.5, y: 8.5 },
        { type: "guard", x: 2.5, y: 13.5 },
        { type: "drone", x: 12.5, y: 13.5 },
      ],
      items: [
        { type: "ammo", x: 8.5, y: 1.5 },
        { type: "medkit", x: 3.5, y: 5.5 },
        { type: "ammo", x: 10.5, y: 5.5 },
        { type: "medkit", x: 8.5, y: 11.5 },
        { type: "ammo", x: 5.5, y: 13.5 },
      ],
    },
  ];

  const WEAPONS = {
    pistol: {
      name: "V9 DIENSTPISTOLE",
      slot: "01",
      clipSize: 12,
      damage: 42,
      rate: 0.31,
      reload: 1.05,
      automatic: false,
    },
    repeater: {
      name: "K44 IMPULSGEWEHR",
      slot: "02",
      clipSize: 24,
      damage: 24,
      rate: 0.105,
      reload: 1.35,
      automatic: true,
    },
  };

  const ENEMY_TYPES = {
    guard: { health: 76, speed: 0.76, damage: 9, range: 7.5, rate: 1.15, radius: 0.22, height: 0.93, score: 300 },
    drone: { health: 54, speed: 0.93, damage: 7, range: 8.5, rate: 0.88, radius: 0.2, height: 0.72, score: 450 },
    boss: { health: 620, speed: 0.52, damage: 14, range: 10, rate: 0.52, radius: 0.36, height: 1.36, score: 5000 },
  };

  const DIFFICULTIES = {
    rekrut: { enemyHealth: 0.78, enemyDamage: 0.6, enemyAim: 0.72 },
    agent: { enemyHealth: 1, enemyDamage: 1, enemyAim: 1 },
    albtraum: { enemyHealth: 1.28, enemyDamage: 1.35, enemyAim: 1.18 },
  };

  const input = {
    keys: new Set(),
    firing: false,
    stickX: 0,
    stickY: 0,
    lookPointer: null,
    lookX: 0,
    lookY: 0,
  };

  const state = {
    mode: "title",
    difficulty: "agent",
    levelIndex: 0,
    level: null,
    map: null,
    player: null,
    enemies: [],
    items: [],
    score: 0,
    levelCore: false,
    hasKey: false,
    time: 0,
    lastTime: performance.now(),
    fireCooldown: 0,
    reloadTimer: 0,
    weaponKick: 0,
    muzzle: 0,
    shake: 0,
    damageFlash: 0,
    pickupFlash: 0,
    messageUntil: 0,
    messageText: "",
    moveBob: 0,
    moving: 0,
    totalKills: 0,
    soundAlert: 0,
    hadPointerLock: false,
  };

  class SynthAudio {
    constructor() {
      this.context = null;
      this.master = null;
      this.enabled = true;
      this.noiseBuffer = null;
      this.hum = null;
    }

    ensure() {
      if (!this.enabled) return false;
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return false;
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.18;
        this.master.connect(this.context.destination);
        this.noiseBuffer = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const channel = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < channel.length; i += 1) channel[i] = Math.random() * 2 - 1;
      }
      if (this.context.state === "suspended") this.context.resume();
      return true;
    }

    tone(frequency, duration, type = "square", volume = 0.25, endFrequency = frequency) {
      if (!this.ensure()) return;
      const now = this.context.currentTime;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain).connect(this.master);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    noise(duration = 0.12, volume = 0.2, cutoff = 1200) {
      if (!this.ensure()) return;
      const now = this.context.currentTime;
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      source.buffer = this.noiseBuffer;
      filter.type = "lowpass";
      filter.frequency.value = cutoff;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      source.connect(filter).connect(gain).connect(this.master);
      source.start(now);
      source.stop(now + duration);
    }

    shot(kind) {
      this.noise(kind === "pistol" ? 0.11 : 0.07, kind === "pistol" ? 0.42 : 0.3, kind === "pistol" ? 1500 : 2200);
      this.tone(kind === "pistol" ? 128 : 180, 0.08, "sawtooth", 0.22, 48);
    }

    enemyShot(type) {
      this.tone(type === "drone" ? 520 : type === "boss" ? 110 : 230, 0.09, "square", 0.15, 72);
    }

    door() {
      this.tone(94, 0.28, "sawtooth", 0.12, 210);
      this.noise(0.18, 0.08, 500);
    }

    pickup(type) {
      const base = type === "core" ? 420 : type === "key" ? 360 : 280;
      this.tone(base, 0.11, "square", 0.13, base * 1.5);
      window.setTimeout(() => this.tone(base * 1.5, 0.13, "square", 0.1, base * 2), 65);
    }

    hurt() {
      this.noise(0.16, 0.24, 420);
      this.tone(72, 0.14, "sawtooth", 0.13, 42);
    }

    empty() {
      this.tone(70, 0.035, "square", 0.08, 70);
    }

    reload() {
      this.tone(150, 0.045, "square", 0.06, 110);
      window.setTimeout(() => this.tone(210, 0.05, "square", 0.06, 160), 420);
    }

    win() {
      [220, 330, 440, 660].forEach((frequency, index) => {
        window.setTimeout(() => this.tone(frequency, 0.22, "square", 0.12, frequency * 1.05), index * 140);
      });
    }

    startHum() {
      if (!this.ensure() || this.hum) return;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = 42;
      gain.gain.value = 0.018;
      osc.connect(gain).connect(this.master);
      osc.start();
      this.hum = { osc, gain };
    }

    toggle() {
      this.enabled = !this.enabled;
      if (this.master) this.master.gain.value = this.enabled ? 0.18 : 0;
      if (this.enabled) this.startHum();
      ui.mute.textContent = `TON: ${this.enabled ? "AN" : "AUS"}`;
    }
  }

  const audio = new SynthAudio();

  function makeTexture(kind) {
    const texture = document.createElement("canvas");
    texture.width = 64;
    texture.height = 64;
    const g = texture.getContext("2d");
    g.imageSmoothingEnabled = false;

    if (kind === "1") {
      g.fillStyle = "#1b3538";
      g.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 16) {
        for (let x = 0; x < 64; x += 16) {
          g.fillStyle = (x + y) % 32 === 0 ? "#25494a" : "#203f41";
          g.fillRect(x + 1, y + 1, 14, 14);
          g.fillStyle = "#102627";
          g.fillRect(x + 1, y + 14, 14, 1);
          g.fillStyle = "#5a7a73";
          g.fillRect(x + 3, y + 3, 1, 1);
        }
      }
      g.fillStyle = "#d6552f";
      g.fillRect(0, 30, 64, 4);
      g.fillStyle = "#f0a33c";
      for (let x = -8; x < 72; x += 14) {
        g.beginPath();
        g.moveTo(x, 30);
        g.lineTo(x + 7, 30);
        g.lineTo(x + 3, 34);
        g.lineTo(x - 4, 34);
        g.fill();
      }
    } else if (kind === "2") {
      g.fillStyle = "#3b211e";
      g.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 12) {
        const offset = (y / 12) % 2 ? -8 : 0;
        for (let x = offset; x < 64; x += 24) {
          g.fillStyle = "#5a2e28";
          g.fillRect(x + 1, y + 1, 22, 10);
          g.fillStyle = "#6c3b31";
          g.fillRect(x + 2, y + 2, 20, 2);
          g.fillStyle = "#251615";
          g.fillRect(x + 2, y + 10, 21, 1);
        }
      }
      g.fillStyle = "#1d1111";
      g.fillRect(29, 0, 6, 64);
      g.fillStyle = "#a94a31";
      g.fillRect(31, 0, 1, 64);
    } else if (kind === "3") {
      g.fillStyle = "#25293d";
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = "#343b57";
      g.fillRect(2, 2, 60, 28);
      g.fillRect(2, 34, 60, 28);
      g.fillStyle = "#171b2b";
      g.fillRect(0, 30, 64, 4);
      g.fillRect(30, 0, 4, 64);
      g.fillStyle = "#52dacb";
      g.fillRect(8, 9, 14, 2);
      g.fillRect(42, 43, 13, 2);
      g.fillStyle = "#a83252";
      g.fillRect(44, 10, 8, 5);
      g.fillStyle = "#75809e";
      for (const [x, y] of [[5, 5], [58, 5], [5, 58], [58, 58]]) g.fillRect(x, y, 2, 2);
    } else if (kind === "D" || kind === "L") {
      g.fillStyle = kind === "D" ? "#16292b" : "#342619";
      g.fillRect(0, 0, 64, 64);
      for (let x = 0; x < 64; x += 8) {
        g.fillStyle = x % 16 ? "#0c1718" : kind === "D" ? "#274749" : "#66451f";
        g.fillRect(x, 0, 6, 64);
      }
      g.fillStyle = kind === "D" ? "#65ead9" : "#ffb545";
      g.fillRect(0, 7, 64, 3);
      g.fillRect(0, 54, 64, 3);
      g.fillRect(27, 25, 10, 14);
      g.fillStyle = "#081011";
      g.fillRect(30, 28, 4, 8);
    } else {
      g.fillStyle = "#102224";
      g.fillRect(0, 0, 64, 64);
      g.strokeStyle = "#70f6e2";
      g.lineWidth = 3;
      g.strokeRect(4, 4, 56, 56);
      g.fillStyle = "#173b3b";
      g.fillRect(9, 9, 46, 46);
      g.fillStyle = "#70f6e2";
      for (let y = 16; y < 52; y += 14) {
        g.beginPath();
        g.moveTo(17, y);
        g.lineTo(27, y + 7);
        g.lineTo(17, y + 14);
        g.fill();
        g.beginPath();
        g.moveTo(35, y);
        g.lineTo(45, y + 7);
        g.lineTo(35, y + 14);
        g.fill();
      }
    }

    const image = g.getImageData(0, 0, 64, 64);
    for (let i = 0; i < image.data.length; i += 4) {
      const grain = (Math.random() - 0.5) * 14;
      image.data[i] = clamp(image.data[i] + grain, 0, 255);
      image.data[i + 1] = clamp(image.data[i + 1] + grain, 0, 255);
      image.data[i + 2] = clamp(image.data[i + 2] + grain, 0, 255);
    }
    g.putImageData(image, 0, 0);
    return texture;
  }

  function makeEnemySprite(type, frame = 0, hurt = false) {
    const sprite = document.createElement("canvas");
    sprite.width = 64;
    sprite.height = 80;
    const g = sprite.getContext("2d");
    g.imageSmoothingEnabled = false;
    const shift = frame % 2 ? 2 : -2;

    g.fillStyle = "rgba(0,0,0,.42)";
    g.beginPath();
    g.ellipse(32, 75, type === "boss" ? 25 : 17, 4, 0, 0, TAU);
    g.fill();

    if (type === "drone") {
      g.fillStyle = "rgba(71,234,222,.18)";
      g.beginPath();
      g.arc(32, 42, 23, 0, TAU);
      g.fill();
      g.fillStyle = hurt ? "#f4fff9" : "#183d43";
      g.fillRect(16, 31 + shift, 32, 22);
      g.fillStyle = hurt ? "#f4fff9" : "#2e6f72";
      g.fillRect(20, 27 + shift, 24, 7);
      g.fillRect(11, 36 + shift, 7, 12);
      g.fillRect(46, 36 + shift, 7, 12);
      g.fillStyle = "#70f6e2";
      g.fillRect(23, 37 + shift, 18, 5);
      g.fillStyle = "#ff4f32";
      g.fillRect(29, 38 + shift, 6, 3);
      g.fillStyle = "#b7fff4";
      g.fillRect(20, 58, 7, 4);
      g.fillRect(37, 58, 7, 4);
      return sprite;
    }

    const boss = type === "boss";
    const armor = hurt ? "#f4fff9" : boss ? "#63324d" : "#5c2825";
    const armorLight = hurt ? "#ffffff" : boss ? "#a34266" : "#a44231";
    const dark = boss ? "#24152a" : "#191719";
    const skin = hurt ? "#ffffff" : boss ? "#c4a1a4" : "#b99b83";

    g.fillStyle = dark;
    g.fillRect(boss ? 18 : 21, 57, boss ? 11 : 8, 17 + shift);
    g.fillRect(boss ? 35 : 35, 57, boss ? 11 : 8, 17 - shift);
    g.fillStyle = "#101316";
    g.fillRect(boss ? 15 : 18, 70 + shift, boss ? 15 : 12, 6);
    g.fillRect(34, 70 - shift, boss ? 15 : 12, 6);

    g.fillStyle = armor;
    g.fillRect(boss ? 12 : 17, boss ? 28 : 33, boss ? 40 : 30, boss ? 33 : 28);
    g.fillStyle = armorLight;
    g.fillRect(boss ? 15 : 20, boss ? 31 : 36, boss ? 34 : 24, 7);
    g.fillStyle = dark;
    g.fillRect(27, boss ? 28 : 34, 10, boss ? 34 : 28);

    g.fillStyle = armor;
    g.fillRect(boss ? 6 : 11, boss ? 32 : 38, boss ? 9 : 8, boss ? 27 : 22);
    g.fillRect(boss ? 49 : 45, boss ? 32 : 38, boss ? 9 : 8, boss ? 27 : 22);
    g.fillStyle = dark;
    g.fillRect(boss ? 4 : 9, boss ? 51 : 55, boss ? 12 : 11, 7);
    g.fillRect(boss ? 48 : 44, boss ? 51 : 55, boss ? 12 : 11, 7);

    g.fillStyle = skin;
    g.fillRect(boss ? 20 : 23, boss ? 10 : 15, boss ? 24 : 18, boss ? 21 : 20);
    g.fillStyle = dark;
    g.fillRect(boss ? 17 : 21, boss ? 7 : 12, boss ? 30 : 22, 7);
    g.fillRect(boss ? 17 : 21, boss ? 7 : 12, 5, boss ? 19 : 15);
    g.fillStyle = "#ff4f32";
    g.fillRect(boss ? 24 : 25, boss ? 19 : 24, 5, 3);
    g.fillRect(boss ? 36 : 35, boss ? 19 : 24, 5, 3);
    if (boss) {
      g.fillStyle = "#ffb545";
      g.fillRect(29, 43, 6, 9);
      g.fillStyle = "rgba(255,79,50,.25)";
      g.fillRect(24, 38, 16, 18);
    }
    return sprite;
  }

  function makeItemSprite(type) {
    const sprite = document.createElement("canvas");
    sprite.width = 48;
    sprite.height = 48;
    const g = sprite.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.fillStyle = "rgba(0,0,0,.35)";
    g.beginPath();
    g.ellipse(24, 43, 14, 3, 0, 0, TAU);
    g.fill();

    if (type === "medkit") {
      g.fillStyle = "#d9e5da";
      g.fillRect(11, 18, 26, 22);
      g.fillStyle = "#9aa8a1";
      g.fillRect(15, 14, 18, 5);
      g.fillStyle = "#d13b31";
      g.fillRect(20, 22, 8, 14);
      g.fillRect(17, 25, 14, 8);
    } else if (type === "ammo") {
      g.fillStyle = "#3c4542";
      g.fillRect(9, 20, 30, 19);
      g.fillStyle = "#ffb545";
      g.fillRect(12, 16, 5, 17);
      g.fillRect(21, 13, 5, 20);
      g.fillRect(30, 16, 5, 17);
      g.fillStyle = "#b76b27";
      g.fillRect(12, 16, 5, 4);
      g.fillRect(21, 13, 5, 4);
      g.fillRect(30, 16, 5, 4);
    } else if (type === "key") {
      g.fillStyle = "rgba(255,181,69,.16)";
      g.beginPath();
      g.arc(24, 26, 18, 0, TAU);
      g.fill();
      g.fillStyle = "#ffb545";
      g.fillRect(12, 20, 24, 15);
      g.fillStyle = "#5d3e18";
      g.fillRect(16, 24, 7, 7);
      g.fillStyle = "#ffe1a6";
      g.fillRect(28, 17, 4, 21);
      g.fillRect(32, 17, 5, 5);
    } else if (type === "core") {
      g.fillStyle = "rgba(112,246,226,.18)";
      g.beginPath();
      g.arc(24, 25, 21, 0, TAU);
      g.fill();
      g.fillStyle = "#143e42";
      g.fillRect(12, 13, 24, 27);
      g.fillStyle = "#70f6e2";
      g.fillRect(18, 9, 12, 33);
      g.fillStyle = "#d8fff8";
      g.fillRect(21, 12, 5, 27);
      g.fillStyle = "#ff4f32";
      g.fillRect(12, 23, 24, 4);
    } else {
      g.fillStyle = "rgba(112,246,226,.15)";
      g.fillRect(5, 12, 38, 25);
      g.fillStyle = "#293b3e";
      g.fillRect(8, 21, 34, 13);
      g.fillStyle = "#70f6e2";
      g.fillRect(13, 18, 22, 5);
      g.fillStyle = "#ff4f32";
      g.fillRect(36, 23, 7, 6);
      g.fillStyle = "#151e20";
      g.fillRect(16, 33, 9, 10);
    }
    return sprite;
  }

  const textures = {
    1: makeTexture("1"),
    2: makeTexture("2"),
    3: makeTexture("3"),
    D: makeTexture("D"),
    L: makeTexture("L"),
    X: makeTexture("X"),
  };

  const sprites = {};
  for (const type of ["guard", "drone", "boss"]) {
    sprites[`${type}0`] = makeEnemySprite(type, 0, false);
    sprites[`${type}1`] = makeEnemySprite(type, 1, false);
    sprites[`${type}hurt`] = makeEnemySprite(type, 0, true);
  }
  for (const type of ["medkit", "ammo", "key", "core", "weapon"]) sprites[type] = makeItemSprite(type);

  function createPlayer() {
    return {
      x: 1.5,
      y: 1.5,
      dir: 0,
      pitch: 0,
      health: 100,
      weapon: "pistol",
      arsenal: {
        pistol: { owned: true, clip: 12, reserve: 48 },
        repeater: { owned: false, clip: 0, reserve: 0 },
      },
    };
  }

  function cloneMap(map) {
    return map.map((row) => row.slice());
  }

  function findSpawn(map) {
    for (let y = 0; y < map.length; y += 1) {
      for (let x = 0; x < map[y].length; x += 1) {
        if (map[y][x] === "P") return { x: x + 0.5, y: y + 0.5 };
      }
    }
    return { x: 1.5, y: 1.5 };
  }

  function loadLevel(index, preservePlayer = true) {
    const definition = LEVELS[index];
    const previous = state.player;
    state.levelIndex = index;
    state.level = definition;
    state.map = cloneMap(definition.map);
    const spawn = findSpawn(state.map);
    for (let y = 0; y < state.map.length; y += 1) {
      for (let x = 0; x < state.map[y].length; x += 1) {
        if (state.map[y][x] === "P") state.map[y][x] = "0";
      }
    }

    state.player = preservePlayer && previous ? previous : createPlayer();
    state.player.x = spawn.x;
    state.player.y = spawn.y;
    state.player.dir = 0;
    state.player.pitch = 0;
    if (preservePlayer && previous) {
      state.player.health = Math.min(100, state.player.health + 22);
      state.player.arsenal.pistol.reserve = Math.min(120, state.player.arsenal.pistol.reserve + 12);
      if (state.player.arsenal.repeater.owned) {
        state.player.arsenal.repeater.reserve = Math.min(180, state.player.arsenal.repeater.reserve + 24);
      }
    }

    const difficulty = DIFFICULTIES[state.difficulty];
    state.enemies = definition.enemies.map((enemy, indexInLevel) => {
      const config = ENEMY_TYPES[enemy.type];
      return {
        ...enemy,
        id: `${index}-${indexInLevel}`,
        health: Math.round(config.health * difficulty.enemyHealth),
        maxHealth: Math.round(config.health * difficulty.enemyHealth),
        cooldown: 0.35 + Math.random() * 0.7,
        alert: false,
        flash: 0,
        muzzle: 0,
        alive: true,
        phase: Math.random() * TAU,
      };
    });
    state.items = definition.items.map((item, itemIndex) => ({ ...item, id: `${index}-item-${itemIndex}`, alive: true, phase: Math.random() * TAU }));
    state.levelCore = false;
    state.hasKey = false;
    state.fireCooldown = 0;
    state.reloadTimer = 0;
    state.soundAlert = 0;
    state.shake = 0;
    updateHud();
  }

  function newGame(difficulty = "agent") {
    state.difficulty = difficulty;
    state.score = 0;
    state.totalKills = 0;
    state.player = createPlayer();
    loadLevel(0, false);
    state.mode = "running";
    ui.title.hidden = true;
    ui.pause.hidden = true;
    ui.end.hidden = true;
    ui.hud.classList.add("active");
    ui.touchControls.classList.add("active");
    audio.ensure();
    audio.startHum();
    showMessage(state.level.briefing, 4.2);
    requestPointerLock();
  }

  function tileAt(x, y) {
    const mapX = Math.floor(x);
    const mapY = Math.floor(y);
    if (!state.map || mapY < 0 || mapY >= state.map.length || mapX < 0 || mapX >= state.map[0].length) return "1";
    return state.map[mapY][mapX];
  }

  function isBlocking(x, y) {
    return tileAt(x, y) !== "0";
  }

  function circleClear(x, y, radius = 0.22) {
    return !isBlocking(x - radius, y - radius)
      && !isBlocking(x + radius, y - radius)
      && !isBlocking(x - radius, y + radius)
      && !isBlocking(x + radius, y + radius);
  }

  function castRay(angle, maxDistance = 32) {
    const rayDirX = Math.cos(angle);
    const rayDirY = Math.sin(angle);
    let mapX = Math.floor(state.player.x);
    let mapY = Math.floor(state.player.y);
    const deltaX = Math.abs(1 / (rayDirX || 0.00001));
    const deltaY = Math.abs(1 / (rayDirY || 0.00001));
    const stepX = rayDirX < 0 ? -1 : 1;
    const stepY = rayDirY < 0 ? -1 : 1;
    let sideX = rayDirX < 0 ? (state.player.x - mapX) * deltaX : (mapX + 1 - state.player.x) * deltaX;
    let sideY = rayDirY < 0 ? (state.player.y - mapY) * deltaY : (mapY + 1 - state.player.y) * deltaY;
    let side = 0;
    let tile = "1";
    let steps = 0;

    while (steps < 80) {
      if (sideX < sideY) {
        sideX += deltaX;
        mapX += stepX;
        side = 0;
      } else {
        sideY += deltaY;
        mapY += stepY;
        side = 1;
      }
      tile = tileAt(mapX + 0.5, mapY + 0.5);
      if (tile !== "0") break;
      const roughDistance = side === 0 ? sideX - deltaX : sideY - deltaY;
      if (roughDistance > maxDistance) break;
      steps += 1;
    }

    let distance;
    if (side === 0) distance = (mapX - state.player.x + (1 - stepX) / 2) / (rayDirX || 0.00001);
    else distance = (mapY - state.player.y + (1 - stepY) / 2) / (rayDirY || 0.00001);
    distance = Math.max(0.0001, Math.abs(distance));
    let hitPosition = side === 0 ? state.player.y + distance * rayDirY : state.player.x + distance * rayDirX;
    hitPosition -= Math.floor(hitPosition);
    let texX = Math.floor(hitPosition * 64);
    if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) texX = 63 - texX;
    return { distance, tile, side, texX, mapX, mapY };
  }

  function hasLineOfSight(target) {
    const dx = target.x - state.player.x;
    const dy = target.y - state.player.y;
    const distance = Math.hypot(dx, dy);
    return castRay(Math.atan2(dy, dx), distance + 1).distance >= distance - 0.28;
  }

  function movePlayer(dx, dy) {
    const player = state.player;
    const targetX = player.x + dx;
    const targetY = player.y + dy;
    const enemyBlocks = (x, y) => state.enemies.some((enemy) => enemy.alive && Math.hypot(enemy.x - x, enemy.y - y) < 0.47);
    if (circleClear(targetX, player.y, 0.23) && !enemyBlocks(targetX, player.y)) player.x = targetX;
    if (circleClear(player.x, targetY, 0.23) && !enemyBlocks(player.x, targetY)) player.y = targetY;
  }

  function moveEnemy(enemy, dx, dy) {
    const playerDistanceX = Math.hypot(enemy.x + dx - state.player.x, enemy.y - state.player.y);
    const playerDistanceY = Math.hypot(enemy.x - state.player.x, enemy.y + dy - state.player.y);
    if (circleClear(enemy.x + dx, enemy.y, ENEMY_TYPES[enemy.type].radius) && playerDistanceX > 0.58) enemy.x += dx;
    if (circleClear(enemy.x, enemy.y + dy, ENEMY_TYPES[enemy.type].radius) && playerDistanceY > 0.58) enemy.y += dy;
  }

  function showMessage(text, duration = 2.2) {
    state.messageText = text;
    state.messageUntil = state.time + duration;
    ui.message.textContent = text;
    ui.message.classList.add("show");
  }

  function updateObjective() {
    if (state.levelIndex === 0) return state.levelCore ? "ZIEL // LASTENAUFZUG ERREICHEN" : "ZIEL // DATENKERN SICHERN";
    if (state.levelIndex === 1) {
      if (!state.hasKey && !state.levelCore) return "ZIEL // ZUGANGSSIEGEL FINDEN";
      if (!state.levelCore) return "ZIEL // ARCHIVKERN SICHERN";
      return "ZIEL // LASTENAUFZUG ERREICHEN";
    }
    const boss = state.enemies.find((enemy) => enemy.type === "boss" && enemy.alive);
    if (boss) return "ZIEL // VERWALTER AUSSCHALTEN";
    return state.levelCore ? "ZIEL // EVAKUIEREN" : "ZIEL // NULLKERN AUFNEHMEN";
  }

  function updateHud() {
    if (!state.player || !state.level) return;
    const weapon = WEAPONS[state.player.weapon];
    const ammo = state.player.arsenal[state.player.weapon];
    ui.missionNumber.textContent = state.level.number;
    ui.missionName.textContent = state.level.name;
    ui.objective.textContent = updateObjective();
    ui.score.textContent = Math.floor(state.score).toString().padStart(6, "0");
    ui.health.textContent = Math.max(0, Math.ceil(state.player.health)).toString().padStart(3, "0");
    ui.healthBar.style.width = `${clamp(state.player.health, 0, 100)}%`;
    ui.healthBar.style.background = state.player.health < 30 ? "#ff4f32" : "#70f6e2";
    ui.key.classList.toggle("active", state.hasKey);
    ui.core.classList.toggle("active", state.levelCore);
    ui.key.querySelector("b").textContent = state.hasKey ? "◆" : "—";
    ui.core.querySelector("b").textContent = state.levelCore ? "◆" : "—";
    ui.weaponSlot.textContent = weapon.slot;
    ui.weaponName.textContent = weapon.name;
    ui.clip.textContent = ammo.clip.toString().padStart(2, "0");
    ui.reserve.textContent = ammo.reserve.toString().padStart(2, "0");
    const boss = state.enemies.find((enemy) => enemy.type === "boss" && enemy.alive);
    ui.bossWrap.hidden = !boss;
    if (boss) {
      const percent = clamp((boss.health / boss.maxHealth) * 100, 0, 100);
      ui.bossHealth.style.width = `${percent}%`;
      ui.bossHealthText.textContent = `${Math.ceil(percent)}%`;
    }
  }

  function pickupItem(item) {
    const player = state.player;
    const pistol = player.arsenal.pistol;
    const repeater = player.arsenal.repeater;
    if (item.type === "medkit" && player.health >= 100) return false;
    if (item.type === "ammo" && pistol.reserve >= 120 && (!repeater.owned || repeater.reserve >= 180)) return false;

    item.alive = false;
    state.pickupFlash = 0.68;
    let label = "AUSRÜSTUNG GESICHERT";
    let points = 100;
    if (item.type === "medkit") {
      player.health = Math.min(100, player.health + 34);
      label = "+34 VITAL";
    } else if (item.type === "ammo") {
      pistol.reserve = Math.min(120, pistol.reserve + 18);
      if (repeater.owned) repeater.reserve = Math.min(180, repeater.reserve + 32);
      label = "MUNITION AUFGEFÜLLT";
    } else if (item.type === "weapon") {
      repeater.owned = true;
      repeater.clip = Math.max(repeater.clip, WEAPONS.repeater.clipSize);
      repeater.reserve = Math.max(repeater.reserve, 72);
      player.weapon = "repeater";
      label = "K44 IMPULSGEWEHR ERBEUTET";
      points = 500;
    } else if (item.type === "key") {
      state.hasKey = true;
      label = "ZUGANGSSIEGEL GESICHERT";
      points = 350;
    } else if (item.type === "core") {
      state.levelCore = true;
      label = state.levelIndex === 2 ? "NULLKERN GESICHERT // EVAKUIEREN" : "DATENKERN GESICHERT";
      points = 1000;
    }
    state.score += points;
    audio.pickup(item.type);
    showMessage(label, item.type === "core" ? 3 : 1.8);
    updateHud();
    return true;
  }

  function interact() {
    if (state.mode !== "running") return;
    const player = state.player;
    for (let distance = 0.25; distance <= 1.35; distance += 0.1) {
      const x = player.x + Math.cos(player.dir) * distance;
      const y = player.y + Math.sin(player.dir) * distance;
      const mapX = Math.floor(x);
      const mapY = Math.floor(y);
      const tile = tileAt(x, y);
      if (tile === "D") {
        state.map[mapY][mapX] = "0";
        audio.door();
        showMessage("SCHOTT GEÖFFNET", 1.4);
        state.enemies.forEach((enemy) => {
          if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < 6) enemy.alert = true;
        });
        return;
      }
      if (tile === "L") {
        if (!state.hasKey) {
          audio.empty();
          showMessage("ZUGANGSSIEGEL ERFORDERLICH", 2);
          return;
        }
        state.hasKey = false;
        state.map[mapY][mapX] = "0";
        audio.door();
        showMessage("SICHERHEITSSCHLEUSE ENTRIEGELT", 1.8);
        updateHud();
        return;
      }
      if (tile === "X") {
        const bossAlive = state.enemies.some((enemy) => enemy.type === "boss" && enemy.alive);
        if (!state.levelCore) {
          audio.empty();
          showMessage(bossAlive ? "DER VERWALTER BLOCKIERT DIE EVAKUIERUNG" : "MISSIONSKERN FEHLT", 2.2);
          return;
        }
        if (bossAlive) {
          audio.empty();
          showMessage("DER VERWALTER LEBT NOCH", 2);
          return;
        }
        completeLevel();
        return;
      }
      if (tile !== "0") return;
    }
    showMessage("KEINE SCHNITTSTELLE", 1.1);
  }

  function completeLevel() {
    state.score += 1500 + Math.max(0, 2500 - state.time * 6);
    audio.door();
    if (state.levelIndex >= LEVELS.length - 1) {
      finishGame(true);
      return;
    }
    loadLevel(state.levelIndex + 1, true);
    state.mode = "running";
    showMessage(state.level.briefing, 4.4);
  }

  function damagePlayer(amount) {
    if (state.mode !== "running") return;
    const scaled = amount * DIFFICULTIES[state.difficulty].enemyDamage;
    state.player.health = Math.max(0, state.player.health - scaled);
    state.damageFlash = Math.min(1, state.damageFlash + 0.62);
    state.shake = Math.max(state.shake, 3.4);
    audio.hurt();
    updateHud();
    if (state.player.health <= 0) finishGame(false);
  }

  function killEnemy(enemy) {
    enemy.alive = false;
    state.totalKills += 1;
    state.score += ENEMY_TYPES[enemy.type].score;
    state.shake = Math.max(state.shake, enemy.type === "boss" ? 6 : 2);
    if (enemy.type === "boss") {
      state.items.push({ type: "core", x: enemy.x, y: enemy.y, alive: true, phase: 0, id: "boss-core" });
      showMessage("VERWALTER NEUTRALISIERT // NULLKERN FREIGELEGT", 4);
      audio.win();
    }
    updateHud();
  }

  function shoot() {
    if (state.mode !== "running" || state.fireCooldown > 0 || state.reloadTimer > 0) return;
    const player = state.player;
    const definition = WEAPONS[player.weapon];
    const ammo = player.arsenal[player.weapon];
    if (ammo.clip <= 0) {
      audio.empty();
      state.fireCooldown = 0.22;
      if (ammo.reserve > 0) startReload();
      return;
    }

    ammo.clip -= 1;
    state.fireCooldown = definition.rate;
    state.weaponKick = 1;
    state.muzzle = 1;
    state.shake = Math.max(state.shake, player.weapon === "pistol" ? 2.6 : 1.7);
    state.soundAlert = 0.42;
    audio.shot(player.weapon);

    const wallDistance = castRay(player.dir).distance;
    let target = null;
    let targetDistance = Infinity;
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distance = Math.hypot(dx, dy);
      const delta = Math.abs(normalizeAngle(Math.atan2(dy, dx) - player.dir));
      const aimWidth = Math.atan2(ENEMY_TYPES[enemy.type].radius * 1.25, distance) + 0.009;
      if (delta <= aimWidth && distance < targetDistance && distance < wallDistance + 0.18 && hasLineOfSight(enemy)) {
        target = enemy;
        targetDistance = distance;
      }
    }

    if (target) {
      const falloff = player.weapon === "repeater" ? clamp(1.08 - targetDistance * 0.025, 0.72, 1) : 1;
      const damage = definition.damage * falloff * (0.9 + Math.random() * 0.2);
      target.health -= damage;
      target.flash = 0.1;
      target.alert = true;
      state.score += 15;
      ui.crosshair.classList.add("hit");
      window.setTimeout(() => ui.crosshair.classList.remove("hit"), 85);
      if (target.health <= 0) killEnemy(target);
    }
    updateHud();
  }

  function startReload() {
    if (state.mode !== "running" || state.reloadTimer > 0) return;
    const ammo = state.player.arsenal[state.player.weapon];
    const weapon = WEAPONS[state.player.weapon];
    if (ammo.clip >= weapon.clipSize || ammo.reserve <= 0) return;
    state.reloadTimer = weapon.reload;
    input.firing = false;
    audio.reload();
    showMessage("MAGAZINWECHSEL", weapon.reload);
  }

  function finishReload() {
    const ammo = state.player.arsenal[state.player.weapon];
    const weapon = WEAPONS[state.player.weapon];
    const needed = weapon.clipSize - ammo.clip;
    const loaded = Math.min(needed, ammo.reserve);
    ammo.clip += loaded;
    ammo.reserve -= loaded;
    updateHud();
  }

  function switchWeapon(name) {
    if (state.mode !== "running" || !state.player.arsenal[name]?.owned || state.player.weapon === name) return;
    state.player.weapon = name;
    state.reloadTimer = 0;
    state.weaponKick = 0.35;
    audio.tone(120, 0.07, "square", 0.06, 90);
    updateHud();
  }

  function updateEnemies(dt) {
    const player = state.player;
    const difficulty = DIFFICULTIES[state.difficulty];
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const config = ENEMY_TYPES[enemy.type];
      enemy.cooldown -= dt;
      enemy.flash = Math.max(0, enemy.flash - dt);
      enemy.muzzle = Math.max(0, enemy.muzzle - dt);
      enemy.phase += dt * (enemy.alert ? 7 : 2);
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.hypot(dx, dy);
      const visible = distance < 11 && hasLineOfSight(enemy);
      if (!enemy.alert && (visible || (state.soundAlert > 0 && distance < 9))) enemy.alert = true;
      if (!enemy.alert) continue;

      const preferredDistance = enemy.type === "boss" ? 2.8 : enemy.type === "drone" ? 2.3 : 1.85;
      if (distance > preferredDistance) {
        const speed = config.speed * dt * (enemy.type === "boss" && enemy.health < enemy.maxHealth * 0.45 ? 1.35 : 1);
        moveEnemy(enemy, (dx / distance) * speed, (dy / distance) * speed);
      } else if (enemy.type === "drone" && distance < 1.45) {
        moveEnemy(enemy, (-dx / distance) * config.speed * dt * 0.5, (-dy / distance) * config.speed * dt * 0.5);
      }

      if (visible && distance < config.range && enemy.cooldown <= 0) {
        enemy.cooldown = config.rate * (0.85 + Math.random() * 0.4);
        enemy.muzzle = 0.12;
        audio.enemyShot(enemy.type);
        const accuracy = clamp((0.78 - distance * 0.035) * difficulty.enemyAim, 0.24, 0.92);
        if (Math.random() < accuracy) damagePlayer(config.damage * (0.82 + Math.random() * 0.3));
      }
    }
  }

  function updateItems() {
    for (const item of state.items) {
      if (!item.alive) continue;
      if (Math.hypot(item.x - state.player.x, item.y - state.player.y) < 0.48) pickupItem(item);
    }
  }

  function update(dt) {
    state.time += dt;
    if (state.mode !== "running") return;
    const player = state.player;
    state.fireCooldown = Math.max(0, state.fireCooldown - dt);
    state.soundAlert = Math.max(0, state.soundAlert - dt);
    state.weaponKick = Math.max(0, state.weaponKick - dt * 7.2);
    state.muzzle = Math.max(0, state.muzzle - dt * 12);
    state.shake = Math.max(0, state.shake - dt * 12);
    state.damageFlash = Math.max(0, state.damageFlash - dt * 1.9);
    state.pickupFlash = Math.max(0, state.pickupFlash - dt * 2.2);
    if (state.reloadTimer > 0) {
      state.reloadTimer -= dt;
      if (state.reloadTimer <= 0) finishReload();
    }

    const forward = (input.keys.has("KeyW") || input.keys.has("ArrowUp") ? 1 : 0)
      - (input.keys.has("KeyS") || input.keys.has("ArrowDown") ? 1 : 0)
      - input.stickY;
    const strafe = (input.keys.has("KeyD") ? 1 : 0) - (input.keys.has("KeyA") ? 1 : 0) + input.stickX;
    const turn = (input.keys.has("ArrowRight") ? 1 : 0) - (input.keys.has("ArrowLeft") ? 1 : 0);
    player.dir = normalizeAngle(player.dir + turn * dt * 2.25);
    let magnitude = Math.hypot(forward, strafe);
    state.moving = Math.min(1, magnitude);
    if (magnitude > 0.05) {
      magnitude = Math.max(1, magnitude);
      const sprint = input.keys.has("ShiftLeft") || input.keys.has("ShiftRight");
      const speed = 2.28 * (sprint ? 1.52 : 1) * dt;
      const normForward = forward / magnitude;
      const normStrafe = strafe / magnitude;
      const dx = (Math.cos(player.dir) * normForward + Math.cos(player.dir + Math.PI / 2) * normStrafe) * speed;
      const dy = (Math.sin(player.dir) * normForward + Math.sin(player.dir + Math.PI / 2) * normStrafe) * speed;
      movePlayer(dx, dy);
      state.moveBob += dt * (sprint ? 12.5 : 9);
    }

    if (input.firing && WEAPONS[player.weapon].automatic && state.fireCooldown <= 0) shoot();
    updateEnemies(dt);
    updateItems();
    if (state.messageUntil < state.time) ui.message.classList.remove("show");
    ui.damageFlash.style.opacity = state.damageFlash.toFixed(2);
    ui.pickupFlash.style.opacity = state.pickupFlash.toFixed(2);
    updateHud();
  }

  function drawBackground(horizon) {
    const ceiling = ctx.createLinearGradient(0, 0, 0, horizon);
    ceiling.addColorStop(0, "#05090d");
    ceiling.addColorStop(1, state.level.ceiling);
    ctx.fillStyle = ceiling;
    ctx.fillRect(0, 0, W, horizon);

    const floor = ctx.createLinearGradient(0, horizon, 0, H);
    floor.addColorStop(0, state.level.floor);
    floor.addColorStop(1, "#030506");
    ctx.fillStyle = floor;
    ctx.fillRect(0, horizon, W, H - horizon);

    ctx.fillStyle = "rgba(112,246,226,.035)";
    for (let y = horizon + 20; y < H; y += Math.max(7, Math.floor((y - horizon) * 0.22))) ctx.fillRect(0, y, W, 1);
    ctx.fillStyle = state.levelIndex === 1 ? "rgba(255,79,50,.035)" : "rgba(112,246,226,.025)";
    ctx.fillRect(0, horizon - 2, W, 4);
  }

  function drawBillboard(sprite, worldX, worldY, worldHeight, horizon, zBuffer, bob = 0) {
    const dx = worldX - state.player.x;
    const dy = worldY - state.player.y;
    const rawDistance = Math.hypot(dx, dy);
    const angle = normalizeAngle(Math.atan2(dy, dx) - state.player.dir);
    if (Math.abs(angle) > FOV * 0.72 || rawDistance < 0.2) return;
    const distance = rawDistance * Math.cos(angle);
    const screenX = W / 2 + Math.tan(angle) * PROJECTION;
    const height = (PROJECTION * worldHeight) / distance;
    const width = height * (sprite.width / sprite.height);
    const floorLine = horizon + PROJECTION * 0.5 / distance;
    const top = floorLine - height + bob * height * 0.08;
    const left = screenX - width / 2;
    const startX = Math.max(0, Math.floor(left));
    const endX = Math.min(W - 1, Math.ceil(left + width));
    for (let screen = startX; screen <= endX; screen += 1) {
      if (distance >= zBuffer[screen]) continue;
      const sourceX = Math.floor(((screen - left) / width) * sprite.width);
      if (sourceX < 0 || sourceX >= sprite.width) continue;
      ctx.drawImage(sprite, sourceX, 0, 1, sprite.height, screen, top, 1.2, height);
    }
  }

  function drawWorld(horizon) {
    const zBuffer = new Float32Array(W);
    for (let x = 0; x < W; x += 1) {
      const rayAngle = state.player.dir - FOV / 2 + (x / W) * FOV;
      const hit = castRay(rayAngle);
      const corrected = hit.distance * Math.cos(rayAngle - state.player.dir);
      zBuffer[x] = corrected;
      const wallHeight = Math.min(H * 8, PROJECTION / corrected);
      const top = horizon - wallHeight / 2;
      const texture = textures[hit.tile] || textures["1"];
      ctx.drawImage(texture, hit.texX, 0, 1, 64, x, top, 1.1, wallHeight);
      const darkness = clamp(corrected / 14 + (hit.side ? 0.1 : 0), 0.04, 0.78);
      ctx.fillStyle = `rgba(2,6,7,${darkness})`;
      ctx.fillRect(x, top, 1.1, wallHeight);
    }

    const renderables = [];
    for (const item of state.items) {
      if (item.alive) renderables.push({ kind: "item", ref: item, distance: Math.hypot(item.x - state.player.x, item.y - state.player.y) });
    }
    for (const enemy of state.enemies) {
      if (enemy.alive) renderables.push({ kind: "enemy", ref: enemy, distance: Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y) });
    }
    renderables.sort((a, b) => b.distance - a.distance);
    for (const renderable of renderables) {
      if (renderable.kind === "item") {
        const item = renderable.ref;
        const bob = Math.sin(state.time * 3.2 + item.phase) * 0.16;
        drawBillboard(sprites[item.type], item.x, item.y, item.type === "core" ? 0.62 : 0.48, horizon, zBuffer, bob);
      } else {
        const enemy = renderable.ref;
        const frame = Math.floor(enemy.phase) % 2;
        const sprite = sprites[`${enemy.type}${enemy.flash > 0 ? "hurt" : frame}`];
        drawBillboard(sprite, enemy.x, enemy.y, ENEMY_TYPES[enemy.type].height, horizon, zBuffer, enemy.type === "drone" ? Math.sin(enemy.phase) * 0.08 : 0);
        if (enemy.muzzle > 0) {
          const angle = normalizeAngle(Math.atan2(enemy.y - state.player.y, enemy.x - state.player.x) - state.player.dir);
          const distance = renderable.distance * Math.cos(angle);
          if (Math.abs(angle) < FOV / 2 && distance > 0) {
            const x = W / 2 + Math.tan(angle) * PROJECTION;
            const y = horizon + PROJECTION * 0.05 / distance;
            const size = clamp(PROJECTION * 0.11 / distance, 3, 24);
            ctx.fillStyle = "rgba(255,181,69,.9)";
            ctx.fillRect(x - size / 2, y - size / 2, size, size);
          }
        }
      }
    }
  }

  function drawWeapon() {
    if (state.mode === "title") return;
    const bobX = Math.sin(state.moveBob) * 5 * state.moving;
    const bobY = Math.abs(Math.cos(state.moveBob)) * 4 * state.moving;
    const recoil = state.weaponKick * 18;
    const reloadProgress = state.reloadTimer > 0 ? Math.sin((state.reloadTimer / WEAPONS[state.player.weapon].reload) * Math.PI) : 0;
    ctx.save();
    ctx.translate(W / 2 + bobX + reloadProgress * 24, H + bobY - recoil + reloadProgress * 38);
    ctx.rotate(reloadProgress * 0.35);

    ctx.fillStyle = "#705046";
    ctx.beginPath();
    ctx.moveTo(-72, 0);
    ctx.lineTo(-46, -55);
    ctx.lineTo(-22, -47);
    ctx.lineTo(-16, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(72, 0);
    ctx.lineTo(46, -55);
    ctx.lineTo(22, -47);
    ctx.lineTo(16, 0);
    ctx.fill();

    if (state.player.weapon === "pistol") {
      ctx.fillStyle = "#151c1e";
      ctx.fillRect(-23, -83, 46, 75);
      ctx.fillStyle = "#344144";
      ctx.fillRect(-28, -111, 56, 43);
      ctx.fillStyle = "#58676a";
      ctx.fillRect(-24, -108, 48, 8);
      ctx.fillStyle = "#0b0f10";
      ctx.fillRect(-13, -119, 26, 16);
      ctx.fillStyle = "#70f6e2";
      ctx.fillRect(-3, -114, 6, 3);
    } else {
      ctx.fillStyle = "#12191b";
      ctx.fillRect(-36, -76, 72, 70);
      ctx.fillStyle = "#33454a";
      ctx.fillRect(-55, -101, 110, 42);
      ctx.fillStyle = "#1e292c";
      ctx.fillRect(-42, -119, 84, 23);
      ctx.fillStyle = "#547077";
      ctx.fillRect(-34, -116, 68, 5);
      ctx.fillStyle = "#70f6e2";
      ctx.fillRect(-25, -95, 50, 4);
      ctx.fillStyle = "#ff4f32";
      ctx.fillRect(31, -91, 18, 6);
      ctx.fillStyle = "#0a0e10";
      ctx.fillRect(-19, -132, 38, 17);
    }

    if (state.muzzle > 0) {
      const muzzleY = state.player.weapon === "pistol" ? -120 : -133;
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = `rgba(255,210,92,${state.muzzle})`;
      ctx.beginPath();
      ctx.moveTo(0, muzzleY - 38);
      ctx.lineTo(18, muzzleY);
      ctx.lineTo(4, muzzleY - 4);
      ctx.lineTo(0, muzzleY + 11);
      ctx.lineTo(-5, muzzleY - 4);
      ctx.lineTo(-20, muzzleY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,220,${state.muzzle})`;
      ctx.fillRect(-4, muzzleY - 18, 8, 22);
    }
    ctx.restore();
  }

  function render() {
    if (!state.level || !state.player) return;
    const bob = state.moving ? Math.sin(state.moveBob * 2) * 1.2 : 0;
    const horizon = clamp(H / 2 + state.player.pitch + bob, 100, 245);
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawBackground(horizon);
    drawWorld(horizon);
    drawWeapon();
    if (state.damageFlash > 0.35) {
      ctx.fillStyle = `rgba(120,0,0,${state.damageFlash * 0.08})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  function finishGame(won) {
    state.mode = won ? "won" : "dead";
    input.firing = false;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    const highScore = Number(localStorage.getItem("eisenwacht-highscore") || 0);
    if (state.score > highScore) localStorage.setItem("eisenwacht-highscore", Math.floor(state.score).toString());
    ui.endKicker.textContent = won ? "SIGNAL ABGEBROCHEN" : "EINSATZ BEENDET";
    ui.endTitle.textContent = won ? "FREIES LICHT" : "GEFALLEN";
    ui.endCopy.textContent = won
      ? `Der Nullsektor schweigt. ${state.totalKills} Ziele neutralisiert. Höchstwert: ${Math.max(highScore, Math.floor(state.score)).toString().padStart(6, "0")}.`
      : "Der Nullsektor sendet weiter. Noch ist der Einsatz nicht verloren.";
    ui.endScore.textContent = Math.floor(state.score).toString().padStart(6, "0");
    ui.end.hidden = false;
    ui.touchControls.classList.remove("active");
    if (won) audio.win();
  }

  function pauseGame() {
    if (state.mode !== "running") return;
    state.mode = "paused";
    input.firing = false;
    ui.pause.hidden = false;
    ui.touchControls.classList.remove("active");
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }

  function resumeGame() {
    if (state.mode !== "paused") return;
    state.mode = "running";
    ui.pause.hidden = true;
    ui.touchControls.classList.add("active");
    requestPointerLock();
  }

  function requestPointerLock() {
    if (state.mode === "running" && canvas.requestPointerLock && matchMedia("(pointer: fine)").matches) {
      const result = canvas.requestPointerLock();
      if (result?.catch) result.catch(() => {});
    }
  }

  function validateLevels() {
    const issues = [];
    for (const [levelIndex, level] of LEVELS.entries()) {
      if (level.map.length !== 16 || level.map.some((row) => row.length !== 16)) issues.push(`M${levelIndex + 1}: Karte ist nicht 16×16.`);
      const points = [...level.enemies, ...level.items];
      for (const point of points) {
        const tile = level.map[Math.floor(point.y)]?.[Math.floor(point.x)];
        if (!tile || !["0", "P"].includes(tile)) issues.push(`M${levelIndex + 1}: ${point.type} steht auf Feld ${tile} bei ${point.x}/${point.y}.`);
      }
      if (!level.map.some((row) => row.includes("X"))) issues.push(`M${levelIndex + 1}: Ausgang fehlt.`);
      if (!level.map.some((row) => row.includes("P"))) issues.push(`M${levelIndex + 1}: Start fehlt.`);
    }
    return issues;
  }

  function loop(time) {
    const dt = Math.min(0.034, Math.max(0, (time - state.lastTime) / 1000));
    state.lastTime = time;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  document.querySelectorAll("[data-difficulty]").forEach((button) => {
    button.addEventListener("click", () => newGame(button.dataset.difficulty));
  });

  ui.resume.addEventListener("click", resumeGame);
  ui.mute.addEventListener("click", () => audio.toggle());
  ui.restart.addEventListener("click", () => newGame(state.difficulty));

  window.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    input.keys.add(event.code);
    if (event.repeat && ["KeyE", "KeyR", "Digit1", "Digit2", "Escape", "KeyM"].includes(event.code)) return;
    if (event.code === "KeyE") interact();
    if (event.code === "KeyR") startReload();
    if (event.code === "Digit1") switchWeapon("pistol");
    if (event.code === "Digit2") switchWeapon("repeater");
    if (event.code === "Space") {
      input.firing = true;
      shoot();
    }
    if (event.code === "KeyM") audio.toggle();
    if (event.code === "Escape") {
      if (state.mode === "running") pauseGame();
      else if (state.mode === "paused") resumeGame();
    }
  });

  window.addEventListener("keyup", (event) => {
    input.keys.delete(event.code);
    if (event.code === "Space") input.firing = false;
  });

  canvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || state.mode !== "running") return;
    requestPointerLock();
    input.firing = true;
    shoot();
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button === 0) input.firing = false;
  });

  window.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== canvas || state.mode !== "running") return;
    state.player.dir = normalizeAngle(state.player.dir + event.movementX * 0.00225);
    state.player.pitch = clamp(state.player.pitch + event.movementY * 0.13, -45, 45);
  });

  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === canvas) {
      state.hadPointerLock = true;
    } else if (state.hadPointerLock && state.mode === "running" && matchMedia("(pointer: fine)").matches) {
      state.hadPointerLock = false;
      pauseGame();
    }
  });

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("blur", () => {
    input.keys.clear();
    input.firing = false;
    if (state.mode === "running") pauseGame();
  });

  let stickPointer = null;
  const resetStick = () => {
    stickPointer = null;
    input.stickX = 0;
    input.stickY = 0;
    ui.touchStick.querySelector("i").style.transform = "translate(0, 0)";
  };
  ui.touchStick.addEventListener("pointerdown", (event) => {
    stickPointer = event.pointerId;
    ui.touchStick.setPointerCapture(event.pointerId);
  });
  ui.touchStick.addEventListener("pointermove", (event) => {
    if (event.pointerId !== stickPointer) return;
    const rect = ui.touchStick.getBoundingClientRect();
    const dx = clamp(event.clientX - (rect.left + rect.width / 2), -38, 38);
    const dy = clamp(event.clientY - (rect.top + rect.height / 2), -38, 38);
    input.stickX = dx / 38;
    input.stickY = dy / 38;
    ui.touchStick.querySelector("i").style.transform = `translate(${dx}px, ${dy}px)`;
  });
  ui.touchStick.addEventListener("pointerup", resetStick);
  ui.touchStick.addEventListener("pointercancel", resetStick);

  ui.touchLook.addEventListener("pointerdown", (event) => {
    input.lookPointer = event.pointerId;
    input.lookX = event.clientX;
    input.lookY = event.clientY;
    ui.touchLook.setPointerCapture(event.pointerId);
  });
  ui.touchLook.addEventListener("pointermove", (event) => {
    if (event.pointerId !== input.lookPointer || state.mode !== "running") return;
    state.player.dir = normalizeAngle(state.player.dir + (event.clientX - input.lookX) * 0.007);
    state.player.pitch = clamp(state.player.pitch + (event.clientY - input.lookY) * 0.25, -42, 42);
    input.lookX = event.clientX;
    input.lookY = event.clientY;
  });
  const endLook = () => { input.lookPointer = null; };
  ui.touchLook.addEventListener("pointerup", endLook);
  ui.touchLook.addEventListener("pointercancel", endLook);

  ui.touchFire.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    input.firing = true;
    shoot();
  });
  ui.touchFire.addEventListener("pointerup", () => { input.firing = false; });
  ui.touchFire.addEventListener("pointercancel", () => { input.firing = false; });
  ui.touchUse.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    interact();
  });

  const validationIssues = validateLevels();
  if (validationIssues.length) console.error("Levelprüfung fehlgeschlagen", validationIssues);
  loadLevel(0, false);
  state.mode = "title";
  window.__eisenwacht = {
    state,
    levels: LEVELS,
    validate: validateLevels,
    start: newGame,
    interact,
    shoot,
    completeLevel,
  };
  requestAnimationFrame(loop);
})();
