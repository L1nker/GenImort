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

const biomePatches = Array.from({ length: 18 }, () => ({
  x: random(100, world.width - 100),
  y: random(100, world.height - 100),
  radius: random(120, 260),
  hue: Math.random() > 0.5 ? 'forest' : 'gold'
}));

const player = {
  x: 400,
  y: 380,
  radius: 18,
  speed: 3.2,
  maxHp: 100,
  hp: 100,
  maxEnergy: 100,
  energy: 100,
  attackRange: 74,
  damage: 18,
  attackCooldown: 0,
  spinCooldown: 0,
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
  radius: 18,
  type: ['madeira', 'cristal', 'erva'][i % 3],
  collected: false,
}));

const chests = Array.from({ length: 8 }, () => ({
  x: random(160, world.width - 160),
  y: random(160, world.height - 160),
  radius: 20,
  opened: false,
  gold: Math.floor(random(18, 44)),
}));

const enemies = Array.from({ length: 12 }, () => spawnEnemy());

function spawnEnemy() {
  return {
    x: random(140, world.width - 140),
    y: random(140, world.height - 140),
    radius: 18,
    maxHp: 42,
    hp: 42,
    speed: random(1.15, 1.8),
    dir: random(0, Math.PI * 2),
    attackCooldown: 0,
    alive: true,
    roamTimer: random(20, 80),
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
  if (objective.progress === objective.target) {
    addLog(`Objetivo concluído: ${objective.text}.`);
  }
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
  if (dx || dy) {
    player.x += (dx / length) * speed;
    player.y += (dy / length) * speed;
    if (sprinting) player.energy = Math.max(0, player.energy - 0.45);
  } else {
    player.energy = Math.min(player.maxEnergy, player.energy + 0.22);
  }
  player.x = clamp(player.x, player.radius, world.width - player.radius);
  player.y = clamp(player.y, player.radius, world.height - player.radius);
}

function attack() {
  if (player.attackCooldown > 0) return;
  player.attackCooldown = 28;
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
    if (!resource.collected && distance(player, resource) <= 42) {
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
      if (dist < 34 && enemy.attackCooldown <= 0) {
        enemy.attackCooldown = 60;
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
    }
    enemy.x = clamp(enemy.x, enemy.radius, world.width - enemy.radius);
    enemy.y = clamp(enemy.y, enemy.radius, world.height - enemy.radius);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - 1);
  }
}

function drawGround() {
  ctx.fillStyle = '#17351f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let x = -((camera.x % 80) + 80); x < canvas.width + 80; x += 80) {
    for (let y = -((camera.y % 52) + 52); y < canvas.height + 52; y += 52) {
      ctx.beginPath();
      ctx.ellipse(x, y, 44, 18, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fill();
    }
  }

  biomePatches.forEach((patch) => {
    const screenX = patch.x - camera.x;
    const screenY = patch.y - camera.y;
    const gradient = ctx.createRadialGradient(screenX, screenY, 10, screenX, screenY, patch.radius);
    if (patch.hue === 'forest') {
      gradient.addColorStop(0, 'rgba(68, 170, 89, 0.34)');
      gradient.addColorStop(1, 'rgba(68, 170, 89, 0)');
    } else {
      gradient.addColorStop(0, 'rgba(233, 200, 88, 0.28)');
      gradient.addColorStop(1, 'rgba(233, 200, 88, 0)');
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, patch.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawEntity(entity, options) {
  const x = entity.x - camera.x;
  const y = entity.y - camera.y;
  ctx.beginPath();
  ctx.ellipse(x, y + entity.radius + 8, entity.radius * 1.2, entity.radius * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, entity.radius, 0, Math.PI * 2);
  ctx.fillStyle = options.color;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = options.outline;
  ctx.stroke();

  if (options.hp) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x - 22, y - entity.radius - 16, 44, 6);
    ctx.fillStyle = options.hpColor;
    ctx.fillRect(x - 22, y - entity.radius - 16, 44 * options.hp, 6);
  }
}

function drawResources() {
  resources.forEach((resource) => {
    if (resource.collected) return;
    const x = resource.x - camera.x;
    const y = resource.y - camera.y;
    ctx.beginPath();
    ctx.ellipse(x, y + 20, 20, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();
    const colors = { madeira: '#8b5a2b', cristal: '#69d2ff', erva: '#63d471' };
    ctx.fillStyle = colors[resource.type];
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x + 16, y + 8);
    ctx.lineTo(x - 16, y + 8);
    ctx.closePath();
    ctx.fill();
  });
}

function drawChests() {
  chests.forEach((chest) => {
    const x = chest.x - camera.x;
    const y = chest.y - camera.y;
    ctx.fillStyle = chest.opened ? '#7f6d5d' : '#d9a441';
    ctx.fillRect(x - 18, y - 12, 36, 24);
    ctx.strokeStyle = '#3b2819';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 18, y - 12, 36, 24);
    if (!chest.opened && player.skills.cartography && distance(player, chest) < 240) {
      ctx.strokeStyle = 'rgba(255, 230, 120, 0.9)';
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
}

function drawWorld() {
  drawGround();
  drawResources();
  drawChests();
  enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    drawEntity(enemy, { color: '#b84568', outline: '#ffd0df', hp: enemy.hp / enemy.maxHp, hpColor: '#ff8ca7' });
  });
  drawEntity(player, { color: '#70f0c5', outline: '#dffff7', hp: player.hp / player.maxHp, hpColor: '#70f0c5' });
}

function updateCamera() {
  camera.x = clamp(player.x - canvas.width / 2, 0, world.width - canvas.width);
  camera.y = clamp(player.y - canvas.height / 2, 0, world.height - canvas.height);
}

function loop() {
  handleInput();
  updateEnemies();
  player.attackCooldown = Math.max(0, player.attackCooldown - 1);
  player.spinCooldown = Math.max(0, player.spinCooldown - 1);
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
