const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const hpValue = document.getElementById('hpValue');
const energyValue = document.getElementById('energyValue');
const levelValue = document.getElementById('levelValue');
const xpValue = document.getElementById('xpValue');
const skillPointsValue = document.getElementById('skillPointsValue');
const inventoryList = document.getElementById('inventoryList');
const objectiveList = document.getElementById('objectiveList');
const logPanel = document.getElementById('logPanel');
const statusText = document.getElementById('statusText');
const questText = document.getElementById('questText');
const skillTree = document.getElementById('skillTree');

const world = { width: 2400, height: 1800 };
const keys = new Set();
const camera = { x: 0, y: 0 };
const random = (min, max) => Math.random() * (max - min) + min;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
let elapsed = 0;
let lastTime = performance.now();

const terrainKnolls = Array.from({ length: 34 }, () => ({
  x: random(60, world.width - 60),
  y: random(60, world.height - 60),
  rx: random(70, 180),
  ry: random(45, 110),
  type: Math.random() > 0.55 ? 'high' : 'low'
}));

const grassClusters = Array.from({ length: 280 }, () => ({
  x: random(20, world.width - 20),
  y: random(20, world.height - 20),
  size: random(8, 18),
  sway: random(0, Math.PI * 2),
}));

const biomePatches = Array.from({ length: 18 }, () => ({
  x: random(100, world.width - 100),
  y: random(100, world.height - 100),
  radius: random(120, 260),
  hue: Math.random() > 0.5 ? 'forest' : 'gold'
}));

const player = {
  x: 400,
  y: 380,
  radius: 24,
  speed: 3.2,
  maxHp: 100,
  hp: 100,
  maxEnergy: 100,
  energy: 100,
  attackRange: 78,
  damage: 18,
  attackCooldown: 0,
  spinCooldown: 0,
  attackAnim: 0,
  spinAnim: 0,
  facing: 1,
  moveX: 0,
  moveY: 0,
  isMoving: false,
  isSprinting: false,
  level: 1,
  xp: 0,
  nextLevelXp: 40,
  skillPoints: 0,
  inventory: { madeira: 0, cristal: 0, erva: 0, ouro: 0 },
  skills: {
    endurance: false,
    efficiency: false,
    fury: false,
    cartography: false,
  },
};

const objectives = [
  { text: 'Abra 3 baús escondidos', target: 3, progress: 0 },
  { text: 'Colete 6 recursos no mapa', target: 6, progress: 0 },
  { text: 'Derrote 5 inimigos em roaming', target: 5, progress: 0 },
];

const skillDefinitions = [
  { id: 'endurance', title: 'Vigor do Andarilho', desc: '+35 HP máximo.', requires: null },
  { id: 'efficiency', title: 'Coleta Precisa', desc: '+1 recurso por coleta.', requires: 'endurance' },
  { id: 'fury', title: 'Fúria Arcana', desc: '+10 dano básico e skill.', requires: 'endurance' },
  { id: 'cartography', title: 'Instinto de Explorador', desc: 'Destaca baús próximos no HUD.', requires: 'efficiency' },
];

const resources = Array.from({ length: 18 }, (_, i) => ({
  x: random(120, world.width - 120),
  y: random(120, world.height - 120),
  radius: 30,
  type: ['madeira', 'cristal', 'erva'][i % 3],
  collected: false,
  sway: random(0, Math.PI * 2),
}));

const chests = Array.from({ length: 8 }, () => ({
  x: random(160, world.width - 160),
  y: random(160, world.height - 160),
  radius: 20,
  opened: false,
  openAnim: 0,
  gold: Math.floor(random(18, 44)),
}));

const enemies = Array.from({ length: 12 }, () => spawnEnemy());

function spawnEnemy() {
  return {
    x: random(140, world.width - 140),
    y: random(140, world.height - 140),
    radius: 24,
    maxHp: 56,
    hp: 56,
    speed: random(1.15, 1.8),
    dir: random(0, Math.PI * 2),
    facing: Math.random() > 0.5 ? 1 : -1,
    attackCooldown: 0,
    attackAnim: 0,
    alive: true,
    roamTimer: random(20, 80),
    variant: Math.random() > 0.5 ? 'fang' : 'moss',
    bob: random(0, Math.PI * 2),
  };
}

function addLog(message) {
  const div = document.createElement('div');
  div.className = 'log-entry';
  div.textContent = message;
  logPanel.prepend(div);
  while (logPanel.children.length > 10) logPanel.removeChild(logPanel.lastChild);
}

function renderSkillTree() {
  skillTree.innerHTML = '';
  for (const skill of skillDefinitions) {
    const unlocked = player.skills[skill.id];
    const requirementMet = !skill.requires || player.skills[skill.requires];
    const canUnlock = !unlocked && requirementMet && player.skillPoints > 0;
    const card = document.createElement('button');
    card.className = `skill-card ${unlocked ? 'unlocked' : canUnlock ? '' : 'locked'}`;
    card.disabled = unlocked || !requirementMet || player.skillPoints <= 0;
    card.innerHTML = `<h3>${skill.title}</h3><p>${skill.desc}</p>`;
    card.onclick = () => unlockSkill(skill.id);
    skillTree.appendChild(card);
  }
}

function unlockSkill(id) {
  const skill = skillDefinitions.find((entry) => entry.id === id);
  if (!skill || player.skills[id]) return;
  if (skill.requires && !player.skills[skill.requires]) return;
  if (player.skillPoints <= 0) return;
  player.skillPoints -= 1;
  player.skills[id] = true;
  if (id === 'endurance') {
    player.maxHp += 35;
    player.hp += 35;
  }
  if (id === 'fury') player.damage += 10;
  addLog(`Skill desbloqueada: ${skill.title}.`);
  renderSkillTree();
  updateHud();
}

function gainXp(amount) {
  player.xp += amount;
  while (player.xp >= player.nextLevelXp) {
    player.xp -= player.nextLevelXp;
    player.level += 1;
    player.nextLevelXp = Math.floor(player.nextLevelXp * 1.45);
    player.skillPoints += 1;
    player.maxHp += 8;
    player.hp = player.maxHp;
    addLog(`Você subiu para o nível ${player.level} e ganhou 1 ponto de skill!`);
  }
  renderSkillTree();
  updateHud();
}

function updateObjective(index, amount = 1) {
  const objective = objectives[index];
  objective.progress = clamp(objective.progress + amount, 0, objective.target);
  if (objective.progress === objective.target) addLog(`Objetivo concluído: ${objective.text}.`);
  renderObjectives();
}

function renderObjectives() {
  objectiveList.innerHTML = '';
  objectives.forEach((objective) => {
    const li = document.createElement('li');
    li.textContent = `${objective.text} (${objective.progress}/${objective.target})`;
    objectiveList.appendChild(li);
  });
}

function updateHud() {
  hpValue.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
  energyValue.textContent = `${Math.ceil(player.energy)} / ${player.maxEnergy}`;
  levelValue.textContent = `${player.level}`;
  xpValue.textContent = `${player.xp} / ${player.nextLevelXp}`;
  skillPointsValue.textContent = `${player.skillPoints}`;
  inventoryList.innerHTML = Object.entries(player.inventory)
    .map(([item, amount]) => `<li>${item}: ${amount}</li>`)
    .join('');
}

function handleInput() {
  let dx = 0;
  let dy = 0;
  if (keys.has('w')) dy -= 1;
  if (keys.has('s')) dy += 1;
  if (keys.has('a')) dx -= 1;
  if (keys.has('d')) dx += 1;
  const length = Math.hypot(dx, dy) || 1;
  const sprinting = keys.has('shift') && player.energy > 0;
  const speed = player.speed * (sprinting ? 1.75 : 1);
  player.isMoving = Boolean(dx || dy);
  player.isSprinting = sprinting && player.isMoving;
  player.moveX = dx / length;
  player.moveY = dy / length;
  if (dx) player.facing = dx > 0 ? 1 : -1;

  if (player.isMoving) {
    player.x += player.moveX * speed;
    player.y += player.moveY * speed;
    if (player.isSprinting) player.energy = Math.max(0, player.energy - 0.45);
  } else {
    player.energy = Math.min(player.maxEnergy, player.energy + 0.22);
  }

  player.x = clamp(player.x, player.radius, world.width - player.radius);
  player.y = clamp(player.y, player.radius, world.height - player.radius);
}

function attack() {
  if (player.attackCooldown > 0) return;
  player.attackCooldown = 28;
  player.attackAnim = 18;
  let hits = 0;
  for (const enemy of enemies) {
    if (enemy.alive && distance(player, enemy) <= player.attackRange) {
      enemy.hp -= player.damage;
      hits += 1;
      if (enemy.hp <= 0) defeatEnemy(enemy);
    }
  }
  statusText.textContent = hits ? `Ataque acertou ${hits} inimigo(s).` : 'Golpe no vazio.';
}

function spinSkill() {
  if (player.spinCooldown > 0 || player.energy < 24) return;
  player.spinCooldown = 150;
  player.energy -= 24;
  player.spinAnim = 24;
  let hits = 0;
  for (const enemy of enemies) {
    if (enemy.alive && distance(player, enemy) <= player.attackRange + 38) {
      enemy.hp -= player.damage + 8;
      hits += 1;
      if (enemy.hp <= 0) defeatEnemy(enemy);
    }
  }
  addLog(hits ? `Tempestade circular atingiu ${hits} inimigo(s).` : 'A skill giratória não encontrou alvos.');
}

function defeatEnemy(enemy) {
  enemy.alive = false;
  gainXp(18);
  player.inventory.ouro += 5;
  updateObjective(2, 1);
  addLog('Inimigo derrotado. Você recebeu XP e ouro.');
  setTimeout(() => Object.assign(enemy, spawnEnemy()), 4500);
}

function interact() {
  let interacted = false;
  for (const resource of resources) {
    if (!resource.collected && distance(player, resource) <= 54) {
      resource.collected = true;
      const gain = player.skills.efficiency ? 2 : 1;
      player.inventory[resource.type] += gain;
      gainXp(7);
      updateObjective(1, 1);
      addLog(`Você coletou ${gain}x ${resource.type}.`);
      interacted = true;
      break;
    }
  }
  if (!interacted) {
    for (const chest of chests) {
      if (!chest.opened && distance(player, chest) <= 48) {
        chest.opened = true;
        chest.openAnim = 1;
        player.inventory.ouro += chest.gold;
        gainXp(15);
        updateObjective(0, 1);
        addLog(`Baú aberto! Você ganhou ${chest.gold} de ouro.`);
        interacted = true;
        break;
      }
    }
  }
  if (!interacted) addLog('Nada para interagir por perto.');
  updateHud();
}

function updateEnemies() {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dist = distance(player, enemy);
    if (dist < 220) {
      const dx = (player.x - enemy.x) / (dist || 1);
      const dy = (player.y - enemy.y) / (dist || 1);
      enemy.x += dx * enemy.speed;
      enemy.y += dy * enemy.speed;
      if (Math.abs(dx) > 0.1) enemy.facing = dx > 0 ? 1 : -1;
      if (dist < 34 && enemy.attackCooldown <= 0) {
        enemy.attackCooldown = 60;
        enemy.attackAnim = 18;
        player.hp -= 9;
        addLog('Você foi atingido por um inimigo errante.');
      }
    } else {
      enemy.roamTimer -= 1;
      if (enemy.roamTimer <= 0) {
        enemy.roamTimer = random(30, 90);
        enemy.dir = random(0, Math.PI * 2);
      }
      enemy.x += Math.cos(enemy.dir) * enemy.speed * 0.55;
      enemy.y += Math.sin(enemy.dir) * enemy.speed * 0.55;
      if (Math.cos(enemy.dir) !== 0) enemy.facing = Math.cos(enemy.dir) > 0 ? 1 : -1;
    }
    enemy.x = clamp(enemy.x, enemy.radius, world.width - enemy.radius);
    enemy.y = clamp(enemy.y, enemy.radius, world.height - enemy.radius);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - 1);
    enemy.attackAnim = Math.max(0, enemy.attackAnim - 1);
  }
}

function drawGround() {
  ctx.fillStyle = '#264f2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  terrainKnolls.forEach((knoll) => {
    const x = knoll.x - camera.x;
    const y = knoll.y - camera.y;
    ctx.beginPath();
    ctx.ellipse(x, y, knoll.rx, knoll.ry, 0.2, 0, Math.PI * 2);
    if (knoll.type === 'high') {
      const gradient = ctx.createLinearGradient(x, y - knoll.ry, x, y + knoll.ry);
      gradient.addColorStop(0, 'rgba(186, 220, 148, 0.16)');
      gradient.addColorStop(1, 'rgba(25, 55, 23, 0.04)');
      ctx.fillStyle = gradient;
    } else {
      const gradient = ctx.createLinearGradient(x, y - knoll.ry, x, y + knoll.ry);
      gradient.addColorStop(0, 'rgba(15, 32, 16, 0.04)');
      gradient.addColorStop(1, 'rgba(9, 25, 15, 0.18)');
      ctx.fillStyle = gradient;
    }
    ctx.fill();
  });

  biomePatches.forEach((patch) => {
    const screenX = patch.x - camera.x;
    const screenY = patch.y - camera.y;
    const gradient = ctx.createRadialGradient(screenX, screenY, 10, screenX, screenY, patch.radius);
    if (patch.hue === 'forest') {
      gradient.addColorStop(0, 'rgba(68, 170, 89, 0.28)');
      gradient.addColorStop(1, 'rgba(68, 170, 89, 0)');
    } else {
      gradient.addColorStop(0, 'rgba(233, 200, 88, 0.14)');
      gradient.addColorStop(1, 'rgba(233, 200, 88, 0)');
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, patch.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  grassClusters.forEach((tuft) => {
    const x = tuft.x - camera.x;
    const y = tuft.y - camera.y;
    const sway = Math.sin(elapsed * 0.003 + tuft.sway) * 2.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i += 1) {
      const offset = (i - 1.5) * 3;
      ctx.beginPath();
      ctx.moveTo(offset, 8);
      ctx.quadraticCurveTo(offset + sway * 0.6, -4, offset + sway, -tuft.size);
      ctx.strokeStyle = i % 2 === 0 ? '#60a65e' : '#87c86f';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
  });

  for (let x = -((camera.x % 90) + 90); x < canvas.width + 90; x += 90) {
    for (let y = -((camera.y % 60) + 60); y < canvas.height + 60; y += 60) {
      ctx.beginPath();
      ctx.ellipse(x, y, 50, 22, 0.08, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + 8, y + 6, 44, 18, 0.08, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(12,35,16,0.08)';
      ctx.fill();
    }
  }
}

function drawShadow(x, y, radiusX, radiusY, alpha = 0.22) {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fill();
}

function drawTreeResource(resource) {
  const x = resource.x - camera.x;
  const y = resource.y - camera.y;
  const sway = Math.sin(elapsed * 0.0035 + resource.sway) * 2;
  drawShadow(x, y + 24, 30, 12, 0.18);
  ctx.save();
  ctx.translate(x, y + sway * 0.4);
  ctx.fillStyle = '#5a381f';
  ctx.fillRect(-8, -8, 16, 40);
  ctx.beginPath();
  ctx.moveTo(-6, 10);
  ctx.lineTo(-16, -8);
  ctx.lineTo(-2, -6);
  ctx.closePath();
  ctx.fillStyle = '#6f4724';
  ctx.fill();
  for (let i = 0; i < 3; i += 1) {
    const crownY = -24 - i * 12;
    ctx.beginPath();
    ctx.moveTo(0, crownY - 26);
    ctx.quadraticCurveTo(-24 - sway, crownY, 0, crownY + 12);
    ctx.quadraticCurveTo(24 + sway, crownY, 0, crownY - 26);
    ctx.fillStyle = i === 1 ? '#2f8b44' : '#43a85a';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, -58, 18, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(132, 214, 134, 0.18)';
  ctx.fill();
  ctx.restore();
}

function drawCrystalResource(resource) {
  const x = resource.x - camera.x;
  const y = resource.y - camera.y;
  const pulse = Math.sin(elapsed * 0.004 + resource.sway) * 2;
  drawShadow(x, y + 20, 26, 10, 0.16);
  ctx.save();
  ctx.translate(x, y);
  [[0, -8, 0], [-16, 4, -0.2], [16, 6, 0.22], [4, 12, 0.1]].forEach(([ox, oy, rot], index) => {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(rot + pulse * 0.01);
    ctx.beginPath();
    ctx.moveTo(0, -24 - index * 2);
    ctx.lineTo(13, -2);
    ctx.lineTo(7, 18);
    ctx.lineTo(-7, 18);
    ctx.lineTo(-13, -2);
    ctx.closePath();
    ctx.fillStyle = index % 2 === 0 ? '#6eddff' : '#8af0ff';
    ctx.fill();
    ctx.strokeStyle = '#d8ffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  });
  ctx.beginPath();
  ctx.arc(0, 0, 28 + pulse, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(118, 240, 255, 0.14)';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
}

function drawHerbResource(resource) {
  const x = resource.x - camera.x;
  const y = resource.y - camera.y;
  drawShadow(x, y + 16, 22, 8, 0.14);
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 7; i += 1) {
    const angle = -0.8 + i * 0.26;
    const sway = Math.sin(elapsed * 0.0038 + resource.sway + i * 0.6) * 0.22;
    ctx.save();
    ctx.rotate(angle + sway);
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.quadraticCurveTo(5, -2, 0, -24 - (i % 3) * 4);
    ctx.quadraticCurveTo(-5, -2, 0, 12);
    ctx.fillStyle = i % 2 === 0 ? '#4fc458' : '#77de73';
    ctx.fill();
    ctx.restore();
  }
  for (let i = 0; i < 3; i += 1) {
    const ox = (i - 1) * 8;
    ctx.beginPath();
    ctx.arc(ox, -6 - i * 4, 4, 0, Math.PI * 2);
    ctx.fillStyle = ['#f3e97a', '#ffb36a', '#b5f28d'][i];
    ctx.fill();
  }
  ctx.restore();
}

function drawResources() {
  resources.forEach((resource) => {
    if (resource.collected) return;
    if (resource.type === 'madeira') drawTreeResource(resource);
    if (resource.type === 'cristal') drawCrystalResource(resource);
    if (resource.type === 'erva') drawHerbResource(resource);
  });
}

function drawChests() {
  chests.forEach((chest) => {
    const x = chest.x - camera.x;
    const y = chest.y - camera.y;
    const lidLift = chest.opened ? 12 : Math.max(0, Math.sin(elapsed * 0.0025 + x * 0.01) * 1.2);
    drawShadow(x, y + 18, 24, 10, 0.2);
    ctx.fillStyle = '#7a5020';
    ctx.fillRect(x - 18, y - 2, 36, 18);
    ctx.fillStyle = '#cf9f3a';
    ctx.fillRect(x - 18, y - 14 - lidLift, 36, 12);
    ctx.strokeStyle = '#3b2819';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 18, y - 2, 36, 18);
    ctx.strokeRect(x - 18, y - 14 - lidLift, 36, 12);
    ctx.fillStyle = '#f6d36c';
    ctx.fillRect(x - 3, y - 4, 6, 8);

    if (!chest.opened && player.skills.cartography && distance(player, chest) < 240) {
      ctx.strokeStyle = 'rgba(255, 230, 120, 0.9)';
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(x, y, 32 + Math.sin(elapsed * 0.004) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
}

function drawHealthBar(x, y, ratio, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x - 22, y, 44, 6);
  ctx.fillStyle = color;
  ctx.fillRect(x - 22, y, 44 * ratio, 6);
}

function drawHero() {
  const x = player.x - camera.x;
  const y = player.y - camera.y;
  const stride = player.isMoving ? Math.sin(elapsed * (player.isSprinting ? 0.028 : 0.018)) : 0;
  const bodyBob = player.isMoving ? Math.abs(stride) * (player.isSprinting ? 5 : 3) : Math.sin(elapsed * 0.004) * 1.5;
  const weaponSwing = player.attackAnim > 0 ? (1 - player.attackAnim / 18) * 1.4 : 0;
  const spinAura = player.spinAnim > 0 ? (1 - player.spinAnim / 24) : 0;

  drawShadow(x, y + 30, 24, 10, 0.24);
  ctx.save();
  ctx.translate(x, y - bodyBob);
  ctx.scale(player.facing, 1);

  if (player.spinAnim > 0) {
    ctx.beginPath();
    ctx.arc(0, -4, 36 + spinAura * 26, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(112, 240, 197, ${0.45 - spinAura * 0.25})`;
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  ctx.fillStyle = '#4c3427';
  ctx.fillRect(-6, 12, 5, 24 + Math.max(0, stride) * 6);
  ctx.fillRect(1, 12, 5, 24 + Math.max(0, -stride) * 6);
  ctx.fillStyle = '#acb7c8';
  ctx.fillRect(-8, -16, 16, 32);
  ctx.fillStyle = '#315b96';
  ctx.fillRect(-9, -10, 18, 18);
  ctx.fillStyle = '#d9b48f';
  ctx.beginPath();
  ctx.arc(0, -26, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#433227';
  ctx.beginPath();
  ctx.moveTo(-11, -28);
  ctx.quadraticCurveTo(0, -44, 12, -27);
  ctx.lineTo(11, -20);
  ctx.lineTo(-11, -20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8f989f';
  ctx.fillRect(-22, -10, 8, 24 - stride * 3);
  ctx.fillRect(14, -10, 8, 24 + stride * 3);
  ctx.fillStyle = '#d9b48f';
  ctx.beginPath();
  ctx.arc(-18, 8 - stride * 3, 4, 0, Math.PI * 2);
  ctx.arc(18, 8 + stride * 3, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(18, -4);
  ctx.rotate(-0.4 + weaponSwing + (player.spinAnim > 0 ? elapsed * 0.05 : 0));
  ctx.fillStyle = '#9ba8b7';
  ctx.fillRect(-2, -4, 5, 44);
  ctx.fillStyle = '#dce8f2';
  ctx.beginPath();
  ctx.moveTo(-4, -26);
  ctx.lineTo(8, -8);
  ctx.lineTo(2, 12);
  ctx.lineTo(-6, -8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7a4b22';
  ctx.fillRect(-6, -4, 14, 5);
  ctx.restore();

  ctx.restore();
  drawHealthBar(x, y - 48, player.hp / player.maxHp, '#70f0c5');
}

function drawEnemy(enemy) {
  const x = enemy.x - camera.x;
  const y = enemy.y - camera.y;
  const stride = Math.sin(elapsed * 0.02 + enemy.bob);
  const bob = Math.abs(stride) * 3;
  const bite = enemy.attackAnim > 0 ? (1 - enemy.attackAnim / 18) * 10 : 0;
  const palette = enemy.variant === 'fang'
    ? { body: '#7d4fc2', belly: '#c7b4ff', horn: '#f6d5ff', eye: '#ff6f91' }
    : { body: '#4f9a4b', belly: '#cef1ae', horn: '#f0f5b0', eye: '#ffb14f' };

  drawShadow(x, y + 24, 22, 10, 0.22);
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.scale(enemy.facing, 1);

  ctx.fillStyle = palette.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.belly;
  ctx.beginPath();
  ctx.ellipse(0, 4, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.lineTo(-20, -24);
  ctx.lineTo(-4, -18);
  ctx.closePath();
  ctx.moveTo(10, -10);
  ctx.lineTo(20, -24);
  ctx.lineTo(4, -18);
  ctx.closePath();
  ctx.fillStyle = palette.horn;
  ctx.fill();

  ctx.fillStyle = palette.body;
  ctx.fillRect(-18, 10, 8, 16 + Math.max(0, stride) * 4);
  ctx.fillRect(10, 10, 8, 16 + Math.max(0, -stride) * 4);
  ctx.fillRect(-8, 10, 6, 14 + Math.max(0, -stride) * 2);
  ctx.fillRect(2, 10, 6, 14 + Math.max(0, stride) * 2);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-8, -2, 4, 0, Math.PI * 2);
  ctx.arc(8, -2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.eye;
  ctx.beginPath();
  ctx.arc(-8, -2, 2, 0, Math.PI * 2);
  ctx.arc(8, -2, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f9e4e4';
  ctx.beginPath();
  ctx.moveTo(-8, 10);
  ctx.lineTo(0, 6 + bite);
  ctx.lineTo(8, 10);
  ctx.lineTo(0, 16 + bite);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
  drawHealthBar(x, y - 38, enemy.hp / enemy.maxHp, '#ff8ca7');
}

function drawWorld() {
  drawGround();
  drawResources();
  drawChests();
  enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    drawEnemy(enemy);
  });
  drawHero();
}

function updateCamera() {
  camera.x = clamp(player.x - canvas.width / 2, 0, world.width - canvas.width);
  camera.y = clamp(player.y - canvas.height / 2, 0, world.height - canvas.height);
}

function tickAnimations() {
  player.attackCooldown = Math.max(0, player.attackCooldown - 1);
  player.spinCooldown = Math.max(0, player.spinCooldown - 1);
  player.attackAnim = Math.max(0, player.attackAnim - 1);
  player.spinAnim = Math.max(0, player.spinAnim - 1);
}

function loop(now = performance.now()) {
  const delta = now - lastTime;
  lastTime = now;
  elapsed += delta;

  handleInput();
  updateEnemies();
  tickAnimations();

  if (player.hp <= 0) {
    player.hp = player.maxHp;
    player.energy = player.maxEnergy;
    player.x = 400;
    player.y = 380;
    addLog('Você foi derrotado, mas retornou ao acampamento inicial.');
  }

  questText.textContent = `Explore o mapa aberto (${Math.round(player.x)}, ${Math.round(player.y)}) e fortaleça sua build.`;
  updateCamera();
  drawWorld();
  updateHud();
  requestAnimationFrame(loop);
}

document.addEventListener('keydown', (event) => {
  keys.add(event.key.toLowerCase());
  if (event.key.toLowerCase() === 'j') attack();
  if (event.key.toLowerCase() === 'k') spinSkill();
  if (event.key.toLowerCase() === 'e') interact();
});

document.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));

renderObjectives();
renderSkillTree();
updateHud();
addLog('Bem-vindo ao protótipo GenImort. Explore e evolua livremente.');
loop();
