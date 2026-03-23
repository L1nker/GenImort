const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const hpValue = document.getElementById('hpValue');
const energyValue = document.getElementById('energyValue');
const levelValue = document.getElementById('levelValue');
const xpValue = document.getElementById('xpValue');
const skillPointsValue = document.getElementById('skillPointsValue');
const inventoryList = document.getElementById('inventoryList');
const inventoryGrid = document.getElementById('inventoryGrid');
const menuInventoryGrid = document.getElementById('menuInventoryGrid');
const objectiveList = document.getElementById('objectiveList');
const logPanel = document.getElementById('logPanel');
const statusText = document.getElementById('statusText');
const questText = document.getElementById('questText');
const skillTree = document.getElementById('skillTree');
const hpFill = document.getElementById('hpFill');
const energyFill = document.getElementById('energyFill');
const xpFill = document.getElementById('xpFill');
const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');
const menuOverlay = document.getElementById('menuOverlay');
const closeMenuButton = document.getElementById('closeMenuButton');
const lootOverlay = document.getElementById('lootOverlay');
const lootTitle = document.getElementById('lootTitle');
const lootSubtitle = document.getElementById('lootSubtitle');
const lootGrid = document.getElementById('lootGrid');
const closeLootButton = document.getElementById('closeLootButton');
const craftingList = document.getElementById('craftingList');
const craftingGoldLabel = document.getElementById('craftingGoldLabel');

const world = { width: 5200, height: 3800 };
const keys = new Set();
const camera = { x: 0, y: 0 };
const random = (min, max) => Math.random() * (max - min) + min;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const createSpriteCanvas = (width, height) => {
  const sprite = document.createElement('canvas');
  sprite.width = width;
  sprite.height = height;
  return { sprite, ctx: sprite.getContext('2d') };
};

let elapsed = 0;
let lastTime = performance.now();
let isMenuOpen = false;
let activeChestLoot = null;

const terrainKnolls = Array.from({ length: 96 }, () => ({
  x: random(80, world.width - 80),
  y: random(80, world.height - 80),
  rx: random(90, 220),
  ry: random(50, 150),
  type: Math.random() > 0.5 ? 'high' : 'low',
  tint: Math.random() > 0.5 ? 'warm' : 'cool'
}));

const grassClusters = Array.from({ length: 1200 }, () => ({
  x: random(20, world.width - 20),
  y: random(20, world.height - 20),
  size: random(7, 20),
  sway: random(0, Math.PI * 2),
  tone: Math.random() > 0.5 ? '#5caa58' : '#7fcf6d'
}));

const pebbles = Array.from({ length: 650 }, () => ({
  x: random(20, world.width - 20),
  y: random(20, world.height - 20),
  w: random(5, 12),
  h: random(3, 8),
  r: random(0, Math.PI),
}));

const paths = Array.from({ length: 18 }, () => ({
  x: random(120, world.width - 120),
  y: random(120, world.height - 120),
  rx: random(140, 340),
  ry: random(70, 170),
  angle: random(-0.6, 0.6),
}));

const biomePatches = Array.from({ length: 28 }, () => ({
  x: random(120, world.width - 120),
  y: random(120, world.height - 120),
  radius: random(150, 340),
  hue: Math.random() > 0.5 ? 'forest' : 'gold'
}));

const ITEM_DEFS = {
  madeira: { name: 'Madeira', stackable: true, tier: 'base', category: 'resource', order: 1, icon: drawWoodIcon },
  cristal: { name: 'Cristal', stackable: true, tier: 'base', category: 'resource', order: 2, icon: drawCrystalIcon },
  erva: { name: 'Erva', stackable: true, tier: 'base', category: 'resource', order: 3, icon: drawHerbIcon },
  ouro: { name: 'Ouro', stackable: true, tier: 'base', category: 'currency', order: 4, icon: drawGoldIcon },
  hp_small: { name: 'Poção HP P', stackable: true, tier: 'I', category: 'consumable', order: 10, icon: (s) => drawPotionIcon(s, '#da4368', '#ffd1de') },
  mp_small: { name: 'Poção MP P', stackable: true, tier: 'I', category: 'consumable', order: 11, icon: (s) => drawPotionIcon(s, '#3f7dff', '#dbe5ff') },
  hp_medium: { name: 'Poção HP M', stackable: true, tier: 'II', category: 'consumable', order: 12, icon: (s) => drawPotionIcon(s, '#f76f8f', '#ffe0e8') },
  mp_medium: { name: 'Poção MP M', stackable: true, tier: 'II', category: 'consumable', order: 13, icon: (s) => drawPotionIcon(s, '#61a2ff', '#eef5ff') },
  agility_potion: { name: 'Poção Agilidade', stackable: true, tier: 'II', category: 'consumable', order: 14, icon: (s) => drawPotionIcon(s, '#4fe0af', '#e2fff4') },
  rusty_sword: { name: 'Espada Enferrujada', stackable: true, tier: 'I', category: 'equipment', order: 20, icon: (s) => drawSwordIcon(s, '#8f6b4b', '#b18a60') },
  steel_sword: { name: 'Espada de Aço', stackable: true, tier: 'II', category: 'equipment', order: 21, icon: (s) => drawSwordIcon(s, '#8ea3b8', '#d8ecff') },
  mithril_sword: { name: 'Espada de Mithril', stackable: true, tier: 'III', category: 'equipment', order: 22, icon: (s) => drawSwordIcon(s, '#7ae8ff', '#effcff') },
  light_chestplate: { name: 'Peitoral Leve', stackable: true, tier: 'I', category: 'equipment', order: 23, icon: (s) => drawArmorIcon(s, '#8d784d', '#c3b08a') },
  reinforced_chestplate: { name: 'Peitoral Reforçado', stackable: true, tier: 'II', category: 'equipment', order: 24, icon: (s) => drawArmorIcon(s, '#7689a1', '#d8e7f2') },
  mithril_chestplate: { name: 'Peitoral de Mithril', stackable: true, tier: 'III', category: 'equipment', order: 25, icon: (s) => drawArmorIcon(s, '#6edff1', '#eefcff') },
  simple_helm: { name: 'Elmo Simples', stackable: true, tier: 'I', category: 'equipment', order: 26, icon: (s) => drawHelmIcon(s, '#918772', '#d0c4ac') },
  steel_helm: { name: 'Elmo de Aço', stackable: true, tier: 'II', category: 'equipment', order: 27, icon: (s) => drawHelmIcon(s, '#869db7', '#ebf5ff') },
  mithril_helm: { name: 'Elmo de Mithril', stackable: true, tier: 'III', category: 'equipment', order: 28, icon: (s) => drawHelmIcon(s, '#72d8ff', '#f2fdff') },
  simple_leggings: { name: 'Perneiras Simples', stackable: true, tier: 'I', category: 'equipment', order: 29, icon: (s) => drawLeggingsIcon(s, '#8d7655', '#c5aa83') },
  reinforced_leggings: { name: 'Perneiras Reforçadas', stackable: true, tier: 'II', category: 'equipment', order: 30, icon: (s) => drawLeggingsIcon(s, '#7c8fa7', '#dbe8f8') },
  mithril_leggings: { name: 'Perneiras de Mithril', stackable: true, tier: 'III', category: 'equipment', order: 31, icon: (s) => drawLeggingsIcon(s, '#72d8ff', '#ebfeff') },
  simple_gauntlets: { name: 'Manoplas Simples', stackable: true, tier: 'I', category: 'equipment', order: 32, icon: (s) => drawGauntletIcon(s, '#8d7759', '#d3bd9a') },
  steel_gauntlets: { name: 'Manoplas de Aço', stackable: true, tier: 'II', category: 'equipment', order: 33, icon: (s) => drawGauntletIcon(s, '#7c91a8', '#e4f0ff') },
  mithril_gauntlets: { name: 'Manoplas de Mithril', stackable: true, tier: 'III', category: 'equipment', order: 34, icon: (s) => drawGauntletIcon(s, '#72d8ff', '#f1ffff') },
};

const CRAFTING_RECIPES = [
  { from: 'hp_small', to: 'hp_medium', cost: 26 },
  { from: 'hp_medium', to: 'agility_potion', cost: 44 },
  { from: 'mp_small', to: 'mp_medium', cost: 26 },
  { from: 'rusty_sword', to: 'steel_sword', cost: 80 },
  { from: 'steel_sword', to: 'mithril_sword', cost: 170 },
  { from: 'light_chestplate', to: 'reinforced_chestplate', cost: 80 },
  { from: 'reinforced_chestplate', to: 'mithril_chestplate', cost: 170 },
  { from: 'simple_helm', to: 'steel_helm', cost: 70 },
  { from: 'steel_helm', to: 'mithril_helm', cost: 150 },
  { from: 'simple_leggings', to: 'reinforced_leggings', cost: 70 },
  { from: 'reinforced_leggings', to: 'mithril_leggings', cost: 150 },
  { from: 'simple_gauntlets', to: 'steel_gauntlets', cost: 70 },
  { from: 'steel_gauntlets', to: 'mithril_gauntlets', cost: 150 },
];

const commonChestItems = ['hp_small', 'mp_small'];
const rareChestPotions = ['hp_medium', 'mp_medium', 'agility_potion'];
const rareChestEquipment = ['rusty_sword', 'light_chestplate', 'simple_helm', 'simple_leggings', 'simple_gauntlets'];

const itemIcons = buildItemIcons();

const player = {
  x: 460,
  y: 420,
  radius: 28,
  speed: 3.4,
  maxHp: 120,
  hp: 120,
  maxEnergy: 100,
  energy: 100,
  attackRange: 92,
  damage: 20,
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
  nextLevelXp: 55,
  skillPoints: 0,
  inventory: {
    madeira: 0,
    cristal: 0,
    erva: 0,
    ouro: 0,
    hp_small: 0,
    mp_small: 0,
    hp_medium: 0,
    mp_medium: 0,
    agility_potion: 0,
    rusty_sword: 0,
    steel_sword: 0,
    mithril_sword: 0,
    light_chestplate: 0,
    reinforced_chestplate: 0,
    mithril_chestplate: 0,
    simple_helm: 0,
    steel_helm: 0,
    mithril_helm: 0,
    simple_leggings: 0,
    reinforced_leggings: 0,
    mithril_leggings: 0,
    simple_gauntlets: 0,
    steel_gauntlets: 0,
    mithril_gauntlets: 0,
  },
  skills: {
    endurance: false,
    efficiency: false,
    fury: false,
    cartography: false,
    survival: false,
    fortune: false,
  },
};

const objectives = [
  { text: 'Abra 8 baús escondidos', target: 8, progress: 0 },
  { text: 'Colete 20 recursos pelo mapa', target: 20, progress: 0 },
  { text: 'Derrote 18 inimigos em roaming', target: 18, progress: 0 },
  { text: 'Alcance o nível 6', target: 6, progress: 1 },
];

const skillDefinitions = [
  { id: 'endurance', title: 'Vigor do Andarilho', desc: '+35 HP máximo.', requires: null },
  { id: 'efficiency', title: 'Coleta Precisa', desc: '+1 recurso por coleta.', requires: 'endurance' },
  { id: 'fury', title: 'Fúria Arcana', desc: '+12 dano básico e skill.', requires: 'endurance' },
  { id: 'cartography', title: 'Instinto de Explorador', desc: 'Destaca baús próximos no HUD.', requires: 'efficiency' },
  { id: 'survival', title: 'Passos de Caçador', desc: '+15% velocidade e regeneração leve.', requires: 'fury' },
  { id: 'fortune', title: 'Saqueador Veterano', desc: '+40% ouro e baús voltam mais rápido.', requires: 'cartography' },
];

function createResource(type) {
  return {
    x: random(160, world.width - 160),
    y: random(160, world.height - 160),
    radius: 34,
    type,
    collected: false,
    sway: random(0, Math.PI * 2),
    respawnTimer: 0,
  };
}

const resourceTypes = ['madeira', 'cristal', 'erva'];
const resources = Array.from({ length: 72 }, (_, i) => createResource(resourceTypes[i % 3]));

function createChest() {
  const rarity = Math.random() > 0.7 ? 'rare' : 'common';
  return {
    x: random(180, world.width - 180),
    y: random(180, world.height - 180),
    radius: 26,
    opened: false,
    gold: Math.floor(random(26, 78)),
    respawnTimer: 0,
    rarity,
    pendingLoot: null,
  };
}

const chests = Array.from({ length: 24 }, () => createChest());
const enemyVariants = ['fang', 'moss', 'ember'];
const enemies = Array.from({ length: 26 }, () => spawnEnemy());

enemies.forEach((enemy) => { enemy.hp = enemy.maxHp; });

function spawnEnemy() {
  return {
    x: random(180, world.width - 180),
    y: random(180, world.height - 180),
    radius: 26,
    maxHp: Math.floor(random(58, 86)),
    hp: 0,
    speed: random(1.2, 1.95),
    dir: random(0, Math.PI * 2),
    facing: Math.random() > 0.5 ? 1 : -1,
    attackCooldown: 0,
    attackAnim: 0,
    alive: true,
    roamTimer: random(20, 80),
    variant: enemyVariants[Math.floor(random(0, enemyVariants.length))],
    bob: random(0, Math.PI * 2),
    attackDamage: Math.floor(random(8, 13)),
    respawnTimer: 0,
  };
}

function addLog(message) {
  const div = document.createElement('div');
  div.className = 'log-entry';
  div.textContent = message;
  logPanel.prepend(div);
  while (logPanel.children.length > 12) logPanel.removeChild(logPanel.lastChild);
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
  if (id === 'fury') player.damage += 12;
  if (id === 'survival') player.speed += 0.55;
  addLog(`Skill desbloqueada: ${skill.title}.`);
  renderSkillTree();
  updateHud();
}

function gainXp(amount) {
  player.xp += amount;
  while (player.xp >= player.nextLevelXp) {
    player.xp -= player.nextLevelXp;
    player.level += 1;
    player.nextLevelXp = Math.floor(player.nextLevelXp * 1.38);
    player.skillPoints += 1;
    player.maxHp += 10;
    player.hp = player.maxHp;
    addLog(`Você subiu para o nível ${player.level} e ganhou 1 ponto de skill!`);
  }
  objectives[3].progress = Math.min(player.level, objectives[3].target);
  renderObjectives();
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
  hpFill.style.width = `${(player.hp / player.maxHp) * 100}%`;
  energyFill.style.width = `${(player.energy / player.maxEnergy) * 100}%`;
  xpFill.style.width = `${(player.xp / player.nextLevelXp) * 100}%`;
  craftingGoldLabel.textContent = `Ouro disponível: ${player.inventory.ouro}`;
  renderInventorySummary();
  renderInventoryGrid(inventoryGrid, false);
  renderInventoryGrid(menuInventoryGrid, true);
}

function renderInventorySummary() {
  const entries = getSortedInventoryEntries().filter(([, amount]) => amount > 0);
  inventoryList.innerHTML = entries.length
    ? entries.map(([id, amount]) => `<li>${ITEM_DEFS[id].name}: ${amount}</li>`).join('')
    : '<li>Inventário vazio.</li>';
}

function getSortedInventoryEntries() {
  return Object.entries(player.inventory).sort((a, b) => (ITEM_DEFS[a[0]].order || 999) - (ITEM_DEFS[b[0]].order || 999));
}

function renderInventoryGrid(target, showNames = false) {
  target.innerHTML = '';
  const entries = getSortedInventoryEntries().filter(([, amount]) => amount > 0).slice(0, 20);
  for (let i = 0; i < 20; i += 1) {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    const entry = entries[i];
    if (!entry) {
      slot.classList.add('empty');
      target.appendChild(slot);
      continue;
    }
    const [id, amount] = entry;
    const item = ITEM_DEFS[id];
    const img = document.createElement('img');
    img.src = itemIcons[id];
    img.alt = item.name;
    slot.appendChild(img);
    if (showNames || target === inventoryGrid) {
      const label = document.createElement('span');
      label.className = 'inventory-name';
      label.textContent = item.name;
      slot.appendChild(label);
    }
    const count = document.createElement('span');
    count.className = 'inventory-count';
    count.textContent = amount;
    slot.appendChild(count);
    const tier = document.createElement('span');
    tier.className = 'inventory-tier';
    tier.textContent = item.tier;
    slot.appendChild(tier);
    target.appendChild(slot);
  }
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
  const speed = player.speed * (sprinting ? 1.8 : 1);
  player.isMoving = Boolean(dx || dy);
  player.isSprinting = sprinting && player.isMoving;
  player.moveX = dx / length;
  player.moveY = dy / length;
  if (dx) player.facing = dx > 0 ? 1 : -1;

  if (player.isMoving) {
    player.x += player.moveX * speed;
    player.y += player.moveY * speed;
    if (player.isSprinting) player.energy = Math.max(0, player.energy - 0.48);
  } else {
    const regen = player.skills.survival ? 0.36 : 0.24;
    player.energy = Math.min(player.maxEnergy, player.energy + regen);
  }

  if (player.skills.survival) player.hp = Math.min(player.maxHp, player.hp + 0.012);
  player.x = clamp(player.x, player.radius, world.width - player.radius);
  player.y = clamp(player.y, player.radius, world.height - player.radius);
}

function attack() {
  if (player.attackCooldown > 0 || activeChestLoot) return;
  player.attackCooldown = 24;
  player.attackAnim = 20;
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
  if (player.spinCooldown > 0 || player.energy < 24 || activeChestLoot) return;
  player.spinCooldown = 132;
  player.energy -= 24;
  player.spinAnim = 28;
  let hits = 0;
  for (const enemy of enemies) {
    if (enemy.alive && distance(player, enemy) <= player.attackRange + 46) {
      enemy.hp -= player.damage + 12;
      hits += 1;
      if (enemy.hp <= 0) defeatEnemy(enemy);
    }
  }
  addLog(hits ? `Tempestade circular atingiu ${hits} inimigo(s).` : 'A skill giratória não encontrou alvos.');
}

function defeatEnemy(enemy) {
  enemy.alive = false;
  enemy.respawnTimer = player.skills.fortune ? 3200 : 4400;
  gainXp(20 + Math.floor(enemy.maxHp * 0.12));
  addInventoryItem('ouro', 6 + (player.skills.fortune ? 3 : 0));
  updateObjective(2, 1);
  addLog('Inimigo derrotado. Você recebeu XP e ouro.');
}

function addInventoryItem(id, amount = 1) {
  if (!(id in player.inventory)) player.inventory[id] = 0;
  player.inventory[id] += amount;
}

function consumeInventoryItem(id, amount = 1) {
  if (!player.inventory[id] || player.inventory[id] < amount) return false;
  player.inventory[id] -= amount;
  return true;
}

function respawnEntity(entity, factory) {
  const data = factory();
  Object.assign(entity, data);
  if ('maxHp' in entity) entity.hp = entity.maxHp;
}

function interact() {
  if (activeChestLoot) return;
  let interacted = false;
  for (const resource of resources) {
    if (!resource.collected && distance(player, resource) <= 60) {
      resource.collected = true;
      resource.respawnTimer = random(18000, 28000);
      const gain = player.skills.efficiency ? 2 : 1;
      addInventoryItem(resource.type, gain);
      gainXp(8);
      updateObjective(1, 1);
      addLog(`Você coletou ${gain}x ${ITEM_DEFS[resource.type].name}. O ponto voltará a brotar depois.`);
      interacted = true;
      break;
    }
  }

  if (!interacted) {
    for (const chest of chests) {
      if (!chest.opened && distance(player, chest) <= 54) {
        openChest(chest);
        interacted = true;
        break;
      }
    }
  }

  if (!interacted) addLog('Nada para interagir por perto.');
  updateHud();
}

function openChest(chest) {
  chest.opened = true;
  chest.respawnTimer = player.skills.fortune ? random(24000, 38000) : random(36000, 52000);
  chest.pendingLoot = rollChestLoot(chest);
  if (chest.pendingLoot.xp > 0) {
    gainXp(chest.pendingLoot.xp);
    addLog(`XP do baú absorvido automaticamente: +${chest.pendingLoot.xp}.`);
  }
  updateObjective(0, 1);
  addLog(`Baú ${chest.rarity === 'rare' ? 'raro' : 'comum'} aberto! Clique nos itens para coletá-los.`);
  showLootOverlay(chest);
}

function rollChestLoot(chest) {
  const multiplier = chest.rarity === 'rare' ? 1.8 : 1;
  const bonus = player.skills.fortune ? 1.4 : 1;
  const goldAmount = Math.floor(chest.gold * multiplier * bonus);
  const loot = [];
  let xp = 0;

  loot.push(makeLootEntry('ouro', goldAmount));

  if (chest.rarity === 'common') {
    loot.push(makeLootEntry(pickOne(commonChestItems), 1));
    if (Math.random() < 0.25) loot.push(makeLootEntry(pickOne(commonChestItems), 1));
    if (Math.random() < 0.18) loot.push(makeLootEntry(randomResource(), 1));
  } else {
    loot.push(makeLootEntry(pickOne(rareChestPotions), 1));
    loot.push(makeLootEntry(pickOne(rareChestEquipment), 1));
    if (Math.random() < 0.4) xp = 28;
    if (Math.random() < 0.28) {
      const extraPool = [...rareChestPotions, ...rareChestEquipment];
      loot.push(makeLootEntry(pickOne(extraPool), 1));
    }
  }

  return { xp, loot, collected: false };
}

function makeLootEntry(itemId, amount = 1) {
  return { id: `${itemId}-${Math.random().toString(36).slice(2, 8)}`, itemId, amount, collected: false };
}

function pickOne(list) {
  return list[Math.floor(random(0, list.length))];
}

function randomResource() {
  return pickOne(resourceTypes);
}

function showLootOverlay(chest) {
  activeChestLoot = chest;
  lootTitle.textContent = `Baú ${chest.rarity === 'rare' ? 'raro' : 'comum'}`;
  lootSubtitle.textContent = chest.pendingLoot.xp > 0
    ? `XP +${chest.pendingLoot.xp} já foi coletado. Clique nos itens abaixo.`
    : 'Clique nos itens para mover para o inventário.';
  lootOverlay.classList.remove('hidden');
  renderLootOverlay();
}

function renderLootOverlay() {
  lootGrid.innerHTML = '';
  if (!activeChestLoot || !activeChestLoot.pendingLoot) return;
  for (const entry of activeChestLoot.pendingLoot.loot) {
    const item = ITEM_DEFS[entry.itemId];
    const card = document.createElement('button');
    card.className = `loot-slot ${entry.collected ? 'collected' : 'collectable'}`;
    card.disabled = entry.collected;
    card.innerHTML = `
      <div class="loot-slot-body">
        <img src="${itemIcons[entry.itemId]}" alt="${item.name}" />
        <strong>${item.name}</strong>
        <small>${entry.collected ? 'Coletado' : 'Clique para coletar'}</small>
      </div>
      <span class="loot-count">x${entry.amount}</span>
    `;
    card.addEventListener('click', () => collectLootEntry(entry.id));
    lootGrid.appendChild(card);
  }
}

function collectLootEntry(entryId) {
  if (!activeChestLoot?.pendingLoot) return;
  const entry = activeChestLoot.pendingLoot.loot.find((item) => item.id === entryId);
  if (!entry || entry.collected) return;
  entry.collected = true;
  addInventoryItem(entry.itemId, entry.amount);
  addLog(`Item coletado do baú: ${ITEM_DEFS[entry.itemId].name} x${entry.amount}.`);
  updateHud();
  renderLootOverlay();
  if (activeChestLoot.pendingLoot.loot.every((item) => item.collected)) closeLootOverlay();
}

function closeLootOverlay() {
  if (activeChestLoot?.pendingLoot) {
    for (const entry of activeChestLoot.pendingLoot.loot) {
      if (!entry.collected) {
        entry.collected = true;
        addInventoryItem(entry.itemId, entry.amount);
      }
    }
    addLog('Itens restantes do baú foram coletados automaticamente.');
  }
  lootOverlay.classList.add('hidden');
  activeChestLoot = null;
  updateHud();
}

function updateResources(delta) {
  for (const resource of resources) {
    if (!resource.collected) continue;
    resource.respawnTimer -= delta;
    if (resource.respawnTimer <= 0) {
      respawnEntity(resource, () => createResource(resource.type));
      addLog(`Um ponto de ${resource.type} reapareceu em outra região do mundo.`);
    }
  }

  for (const chest of chests) {
    if (!chest.opened) continue;
    const stillHasUncollectedLoot = chest === activeChestLoot && chest.pendingLoot?.loot?.some((item) => !item.collected);
    if (stillHasUncollectedLoot) continue;
    chest.respawnTimer -= delta;
    if (chest.respawnTimer <= 0) {
      respawnEntity(chest, createChest);
      addLog('Um novo baú surgiu em algum lugar do mapa aberto.');
    }
  }
}

function updateEnemies(delta) {
  for (const enemy of enemies) {
    if (!enemy.alive) {
      enemy.respawnTimer -= delta;
      if (enemy.respawnTimer <= 0) {
        respawnEntity(enemy, spawnEnemy);
      }
      continue;
    }

    const dist = distance(player, enemy);
    if (dist < 240) {
      const dx = (player.x - enemy.x) / (dist || 1);
      const dy = (player.y - enemy.y) / (dist || 1);
      enemy.x += dx * enemy.speed;
      enemy.y += dy * enemy.speed;
      if (Math.abs(dx) > 0.08) enemy.facing = dx > 0 ? 1 : -1;
      if (dist < 38 && enemy.attackCooldown <= 0) {
        enemy.attackCooldown = 56;
        enemy.attackAnim = 20;
        player.hp -= enemy.attackDamage;
        addLog('Você foi atingido por um monstro errante.');
      }
    } else {
      enemy.roamTimer -= 1;
      if (enemy.roamTimer <= 0) {
        enemy.roamTimer = random(26, 84);
        enemy.dir = random(0, Math.PI * 2);
      }
      enemy.x += Math.cos(enemy.dir) * enemy.speed * 0.58;
      enemy.y += Math.sin(enemy.dir) * enemy.speed * 0.58;
      if (Math.cos(enemy.dir) !== 0) enemy.facing = Math.cos(enemy.dir) > 0 ? 1 : -1;
    }

    enemy.x = clamp(enemy.x, enemy.radius, world.width - enemy.radius);
    enemy.y = clamp(enemy.y, enemy.radius, world.height - enemy.radius);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - 1);
    enemy.attackAnim = Math.max(0, enemy.attackAnim - 1);
  }
}

function craftItem(recipe) {
  if (player.inventory[recipe.from] < 5) return;
  if (player.inventory.ouro < recipe.cost) return;
  consumeInventoryItem(recipe.from, 5);
  consumeInventoryItem('ouro', recipe.cost);
  addInventoryItem(recipe.to, 1);
  addLog(`Craft realizado: 5x ${ITEM_DEFS[recipe.from].name} viraram 1x ${ITEM_DEFS[recipe.to].name}.`);
  renderCrafting();
  updateHud();
}

function renderCrafting() {
  craftingList.innerHTML = '';
  for (const recipe of CRAFTING_RECIPES) {
    const fromItem = ITEM_DEFS[recipe.from];
    const toItem = ITEM_DEFS[recipe.to];
    const card = document.createElement('div');
    card.className = 'craft-card';
    const canCraft = player.inventory[recipe.from] >= 5 && player.inventory.ouro >= recipe.cost;
    card.innerHTML = `
      <div class="craft-preview">
        ${renderIconSlot(recipe.from, player.inventory[recipe.from], true)}
        <div class="craft-arrow">➜</div>
        ${renderIconSlot(recipe.to, player.inventory[recipe.to], true)}
      </div>
      <div class="craft-meta">
        <h3>${fromItem.name} → ${toItem.name}</h3>
        <p>Exige 5 unidades e ${recipe.cost} de ouro.</p>
      </div>
      <button class="craft-button" ${canCraft ? '' : 'disabled'}>Fundir</button>
    `;
    card.querySelector('.craft-button').addEventListener('click', () => craftItem(recipe));
    craftingList.appendChild(card);
  }
}

function renderIconSlot(itemId, amount, compact = false) {
  const item = ITEM_DEFS[itemId];
  return `
    <div class="inventory-slot ${amount ? '' : 'empty'}">
      <img src="${itemIcons[itemId]}" alt="${item.name}" />
      <span class="inventory-name">${compact ? item.name : item.name}</span>
      <span class="inventory-count">${amount}</span>
      <span class="inventory-tier">${item.tier}</span>
    </div>
  `;
}

function buildItemIcons() {
  const icons = {};
  Object.entries(ITEM_DEFS).forEach(([id, item]) => {
    const { sprite, ctx: s } = createSpriteCanvas(64, 64);
    s.fillStyle = 'rgba(16, 22, 35, 0.94)';
    s.fillRect(0, 0, 64, 64);
    s.strokeStyle = 'rgba(162, 184, 255, 0.18)';
    s.lineWidth = 2;
    s.strokeRect(1, 1, 62, 62);
    item.icon(s);
    icons[id] = sprite.toDataURL('image/png');
  });
  return icons;
}

function drawWoodIcon(s) {
  s.translate(32, 32);
  s.fillStyle = '#5f4126';
  s.fillRect(-8, 8, 16, 18);
  s.fillStyle = '#43a355';
  for (let i = 0; i < 3; i += 1) {
    s.beginPath();
    s.arc(0, -6 - i * 6, 14 - i, 0, Math.PI * 2);
    s.fill();
  }
}

function drawCrystalIcon(s) {
  s.translate(32, 34);
  [[0, -10, '#74ebff'], [-12, 8, '#56cce8'], [12, 10, '#b2fbff']].forEach(([x, y, c]) => {
    s.fillStyle = c;
    s.beginPath();
    s.moveTo(x, y - 16);
    s.lineTo(x + 10, y);
    s.lineTo(x + 4, y + 18);
    s.lineTo(x - 4, y + 18);
    s.lineTo(x - 10, y);
    s.closePath();
    s.fill();
  });
}

function drawHerbIcon(s) {
  s.translate(32, 38);
  for (let i = 0; i < 5; i += 1) {
    s.save();
    s.rotate(-0.6 + i * 0.3);
    s.fillStyle = i % 2 ? '#77d85e' : '#46b54f';
    s.beginPath();
    s.moveTo(0, 10);
    s.quadraticCurveTo(5, -2, 0, -18);
    s.quadraticCurveTo(-5, -2, 0, 10);
    s.fill();
    s.restore();
  }
  s.fillStyle = '#f8df76';
  s.beginPath();
  s.arc(0, -4, 5, 0, Math.PI * 2);
  s.fill();
}

function drawGoldIcon(s) {
  s.translate(32, 32);
  s.fillStyle = '#f0d064';
  for (let i = 0; i < 4; i += 1) {
    s.beginPath();
    s.arc(-10 + i * 8, 6 - i * 3, 9, 0, Math.PI * 2);
    s.fill();
  }
  s.strokeStyle = '#fff3a5';
  s.lineWidth = 2;
  s.strokeRect(-14, -8, 28, 20);
}

function drawPotionIcon(s, liquidColor, glowColor) {
  s.translate(32, 34);
  s.fillStyle = '#d9edff';
  s.fillRect(-7, -26, 14, 10);
  s.fillStyle = '#7d6141';
  s.fillRect(-6, -30, 12, 7);
  s.strokeStyle = '#f3f8ff';
  s.lineWidth = 3;
  s.beginPath();
  s.moveTo(-14, -16);
  s.lineTo(-12, 12);
  s.quadraticCurveTo(-9, 24, 0, 24);
  s.quadraticCurveTo(9, 24, 12, 12);
  s.lineTo(14, -16);
  s.closePath();
  s.stroke();
  s.fillStyle = liquidColor;
  s.beginPath();
  s.moveTo(-11, -2);
  s.lineTo(-9, 10);
  s.quadraticCurveTo(-6, 18, 0, 18);
  s.quadraticCurveTo(6, 18, 9, 10);
  s.lineTo(11, -2);
  s.closePath();
  s.fill();
  s.fillStyle = glowColor;
  s.globalAlpha = 0.35;
  s.beginPath();
  s.arc(0, 4, 18, 0, Math.PI * 2);
  s.fill();
  s.globalAlpha = 1;
}

function drawSwordIcon(s, bladeColor, glowColor) {
  s.translate(32, 32);
  s.rotate(-0.45);
  s.fillStyle = bladeColor;
  s.fillRect(-3, -20, 6, 30);
  s.fillStyle = glowColor;
  s.beginPath();
  s.moveTo(-6, -24);
  s.lineTo(0, -30);
  s.lineTo(6, -24);
  s.closePath();
  s.fill();
  s.fillRect(-11, 8, 22, 5);
  s.fillStyle = '#7a4d22';
  s.fillRect(-3, 8, 6, 18);
}

function drawArmorIcon(s, bodyColor, trimColor) {
  s.translate(32, 34);
  s.fillStyle = bodyColor;
  s.beginPath();
  s.moveTo(-16, -18);
  s.lineTo(-5, -24);
  s.lineTo(5, -24);
  s.lineTo(16, -18);
  s.lineTo(12, 18);
  s.lineTo(-12, 18);
  s.closePath();
  s.fill();
  s.fillStyle = trimColor;
  s.fillRect(-10, -8, 20, 6);
  s.fillRect(-7, 0, 14, 14);
}

function drawHelmIcon(s, bodyColor, trimColor) {
  s.translate(32, 34);
  s.fillStyle = bodyColor;
  s.beginPath();
  s.arc(0, -4, 18, Math.PI, 0);
  s.lineTo(14, 16);
  s.lineTo(-14, 16);
  s.closePath();
  s.fill();
  s.fillStyle = trimColor;
  s.fillRect(-13, 0, 26, 6);
  s.fillStyle = '#09131d';
  s.fillRect(-8, 2, 16, 7);
}

function drawLeggingsIcon(s, bodyColor, trimColor) {
  s.translate(32, 36);
  s.fillStyle = bodyColor;
  s.fillRect(-12, -20, 24, 12);
  s.fillRect(-11, -8, 9, 28);
  s.fillRect(2, -8, 9, 28);
  s.fillStyle = trimColor;
  s.fillRect(-12, -20, 24, 5);
}

function drawGauntletIcon(s, bodyColor, trimColor) {
  s.translate(32, 34);
  s.fillStyle = bodyColor;
  s.beginPath();
  s.moveTo(-14, 8);
  s.lineTo(-8, -8);
  s.lineTo(8, -12);
  s.lineTo(14, -2);
  s.lineTo(8, 14);
  s.lineTo(-10, 16);
  s.closePath();
  s.fill();
  s.fillStyle = trimColor;
  s.fillRect(-8, -2, 12, 5);
}

function makeHeroSprite() {
  const { sprite, ctx: s } = createSpriteCanvas(180, 180);
  s.imageSmoothingEnabled = true;
  s.translate(90, 120);
  s.fillStyle = '#2d2118';
  s.beginPath();
  s.ellipse(0, 34, 28, 12, 0, 0, Math.PI * 2);
  s.fill();
  s.fillStyle = '#6d4b33';
  s.fillRect(-18, 34, 12, 28);
  s.fillRect(6, 34, 12, 28);
  s.fillStyle = '#9aabb7';
  s.beginPath();
  s.moveTo(-26, -12);
  s.lineTo(-12, -52);
  s.lineTo(12, -52);
  s.lineTo(26, -12);
  s.lineTo(20, 26);
  s.lineTo(-20, 26);
  s.closePath();
  s.fill();
  s.fillStyle = '#2e5f9d';
  s.fillRect(-18, -6, 36, 24);
  s.fillStyle = '#d7b38a';
  s.beginPath();
  s.arc(0, -64, 20, 0, Math.PI * 2);
  s.fill();
  s.fillStyle = '#4e3728';
  s.beginPath();
  s.moveTo(-22, -66);
  s.quadraticCurveTo(0, -92, 22, -66);
  s.lineTo(20, -52);
  s.lineTo(-20, -52);
  s.closePath();
  s.fill();
  s.fillStyle = '#657687';
  s.fillRect(-38, -8, 14, 44);
  s.fillRect(24, -8, 14, 44);
  s.fillStyle = '#d7b38a';
  s.beginPath();
  s.arc(-30, 36, 8, 0, Math.PI * 2);
  s.arc(30, 36, 8, 0, Math.PI * 2);
  s.fill();
  s.fillStyle = '#8f9fb2';
  s.fillRect(34, -18, 8, 86);
  s.fillStyle = '#dfe9f1';
  s.beginPath();
  s.moveTo(26, -84);
  s.lineTo(48, -34);
  s.lineTo(40, 10);
  s.lineTo(22, -38);
  s.closePath();
  s.fill();
  s.fillStyle = '#8b5a2b';
  s.fillRect(24, -22, 24, 8);
  return sprite;
}

function makeEnemySprite(variant) {
  const { sprite, ctx: s } = createSpriteCanvas(160, 160);
  s.translate(80, 108);
  const palette = {
    fang: { body: '#6b57be', belly: '#d9d1ff', horn: '#f3e3ff', eye: '#ff7591', fin: '#a08cff' },
    moss: { body: '#3f8e54', belly: '#d8f2b8', horn: '#f2f0ae', eye: '#ffbf57', fin: '#8cca66' },
    ember: { body: '#b95833', belly: '#ffd6a8', horn: '#ffe09b', eye: '#fff2b0', fin: '#ff8b54' },
  }[variant];
  s.fillStyle = '#1b160f';
  s.beginPath();
  s.ellipse(0, 30, 26, 11, 0, 0, Math.PI * 2);
  s.fill();
  s.fillStyle = palette.body;
  s.beginPath();
  s.moveTo(-34, 0);
  s.quadraticCurveTo(-28, -34, 0, -38);
  s.quadraticCurveTo(36, -34, 34, 8);
  s.quadraticCurveTo(12, 42, -18, 34);
  s.closePath();
  s.fill();
  s.fillStyle = palette.fin;
  s.beginPath();
  s.moveTo(-20, -10);
  s.lineTo(-44, -30);
  s.lineTo(-30, 0);
  s.closePath();
  s.moveTo(16, -12);
  s.lineTo(42, -26);
  s.lineTo(26, 2);
  s.closePath();
  s.fill();
  s.fillStyle = palette.belly;
  s.beginPath();
  s.ellipse(2, 2, 15, 12, 0, 0, Math.PI * 2);
  s.fill();
  s.fillStyle = palette.horn;
  s.beginPath();
  s.moveTo(-12, -34);
  s.lineTo(-24, -58);
  s.lineTo(-4, -42);
  s.closePath();
  s.moveTo(10, -36);
  s.lineTo(24, -58);
  s.lineTo(2, -42);
  s.closePath();
  s.fill();
  s.fillStyle = '#fff';
  s.beginPath();
  s.arc(-10, -8, 7, 0, Math.PI * 2);
  s.arc(12, -10, 7, 0, Math.PI * 2);
  s.fill();
  s.fillStyle = palette.eye;
  s.beginPath();
  s.arc(-10, -8, 3, 0, Math.PI * 2);
  s.arc(12, -10, 3, 0, Math.PI * 2);
  s.fill();
  s.fillStyle = '#f8ece2';
  s.beginPath();
  s.moveTo(-12, 16);
  s.lineTo(0, 6);
  s.lineTo(16, 18);
  s.lineTo(0, 28);
  s.closePath();
  s.fill();
  s.fillStyle = palette.body;
  s.fillRect(-24, 22, 10, 24);
  s.fillRect(-6, 24, 9, 22);
  s.fillRect(10, 22, 10, 24);
  s.fillRect(24, 18, 8, 24);
  return sprite;
}

const heroSprite = makeHeroSprite();
const enemySpriteMap = {
  fang: makeEnemySprite('fang'),
  moss: makeEnemySprite('moss'),
  ember: makeEnemySprite('ember'),
};

function drawGround() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#4f7e3f');
  gradient.addColorStop(0.45, '#386d33');
  gradient.addColorStop(1, '#244928');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  paths.forEach((path) => {
    const x = path.x - camera.x;
    const y = path.y - camera.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(path.angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, path.rx, path.ry, 0, 0, Math.PI * 2);
    const pathGradient = ctx.createLinearGradient(0, -path.ry, 0, path.ry);
    pathGradient.addColorStop(0, 'rgba(171, 144, 92, 0.08)');
    pathGradient.addColorStop(1, 'rgba(112, 87, 48, 0.18)');
    ctx.fillStyle = pathGradient;
    ctx.fill();
    ctx.restore();
  });

  terrainKnolls.forEach((knoll) => {
    const x = knoll.x - camera.x;
    const y = knoll.y - camera.y;
    ctx.beginPath();
    ctx.ellipse(x, y, knoll.rx, knoll.ry, 0.22, 0, Math.PI * 2);
    const gradient = ctx.createLinearGradient(x, y - knoll.ry, x, y + knoll.ry);
    if (knoll.type === 'high') {
      gradient.addColorStop(0, knoll.tint === 'warm' ? 'rgba(190, 224, 150, 0.22)' : 'rgba(145, 198, 136, 0.18)');
      gradient.addColorStop(1, 'rgba(37, 74, 26, 0.03)');
    } else {
      gradient.addColorStop(0, 'rgba(18, 30, 14, 0.05)');
      gradient.addColorStop(1, 'rgba(8, 21, 12, 0.22)');
    }
    ctx.fillStyle = gradient;
    ctx.fill();
  });

  biomePatches.forEach((patch) => {
    const x = patch.x - camera.x;
    const y = patch.y - camera.y;
    const glow = ctx.createRadialGradient(x, y, 20, x, y, patch.radius);
    if (patch.hue === 'forest') {
      glow.addColorStop(0, 'rgba(82, 177, 97, 0.18)');
      glow.addColorStop(1, 'rgba(82, 177, 97, 0)');
    } else {
      glow.addColorStop(0, 'rgba(230, 201, 102, 0.12)');
      glow.addColorStop(1, 'rgba(230, 201, 102, 0)');
    }
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, patch.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  pebbles.forEach((pebble) => {
    const x = pebble.x - camera.x;
    const y = pebble.y - camera.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(pebble.r);
    ctx.fillStyle = 'rgba(93, 88, 70, 0.22)';
    ctx.fillRect(-pebble.w / 2, -pebble.h / 2, pebble.w, pebble.h);
    ctx.restore();
  });

  grassClusters.forEach((tuft) => {
    const x = tuft.x - camera.x;
    const y = tuft.y - camera.y;
    const sway = Math.sin(elapsed * 0.003 + tuft.sway) * 2.8;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i += 1) {
      const offset = (i - 2) * 3.2;
      ctx.beginPath();
      ctx.moveTo(offset, 8);
      ctx.quadraticCurveTo(offset + sway * 0.6, -2, offset + sway, -tuft.size);
      ctx.strokeStyle = tuft.tone;
      ctx.lineWidth = i === 2 ? 1.8 : 1.2;
      ctx.stroke();
    }
    ctx.restore();
  });

  for (let x = -((camera.x % 96) + 96); x < canvas.width + 96; x += 96) {
    for (let y = -((camera.y % 68) + 68); y < canvas.height + 68; y += 68) {
      ctx.beginPath();
      ctx.ellipse(x, y, 54, 24, 0.08, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.028)';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + 10, y + 8, 44, 18, 0.08, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(12,26,13,0.09)';
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
  const sway = Math.sin(elapsed * 0.0032 + resource.sway) * 3;
  drawShadow(x, y + 28, 34, 12, 0.18);
  ctx.save();
  ctx.translate(x, y + sway * 0.35);
  ctx.fillStyle = '#604127';
  ctx.beginPath();
  ctx.moveTo(-8, 46);
  ctx.lineTo(-14, -4);
  ctx.lineTo(14, -4);
  ctx.lineTo(8, 46);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 4; i += 1) {
    const crownY = -16 - i * 16;
    ctx.beginPath();
    ctx.moveTo(0, crownY - 34);
    ctx.bezierCurveTo(-34 - sway, crownY - 8, -36 - sway, crownY + 16, 0, crownY + 20);
    ctx.bezierCurveTo(36 + sway, crownY + 16, 34 + sway, crownY - 8, 0, crownY - 34);
    ctx.fillStyle = i % 2 === 0 ? '#3d9954' : '#2f8244';
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(170, 232, 164, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, -74, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCrystalResource(resource) {
  const x = resource.x - camera.x;
  const y = resource.y - camera.y;
  const pulse = Math.sin(elapsed * 0.0042 + resource.sway) * 2.4;
  drawShadow(x, y + 18, 30, 10, 0.15);
  ctx.save();
  ctx.translate(x, y + pulse * 0.2);
  [[0, -14, 0], [-20, 4, -0.24], [18, 10, 0.28], [4, 18, 0.12], [-8, 20, -0.12]].forEach(([ox, oy, rot], index) => {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(rot + pulse * 0.012);
    ctx.beginPath();
    ctx.moveTo(0, -30 - index * 1.5);
    ctx.lineTo(14, -6);
    ctx.lineTo(8, 22);
    ctx.lineTo(-8, 22);
    ctx.lineTo(-14, -6);
    ctx.closePath();
    ctx.fillStyle = index % 2 === 0 ? '#6ddcff' : '#95f4ff';
    ctx.fill();
    ctx.strokeStyle = '#e5ffff';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
  });
  ctx.beginPath();
  ctx.arc(0, 2, 32 + pulse, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(118, 240, 255, 0.12)';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
}

function drawHerbResource(resource) {
  const x = resource.x - camera.x;
  const y = resource.y - camera.y;
  drawShadow(x, y + 16, 24, 8, 0.14);
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 10; i += 1) {
    const angle = -1 + i * 0.22;
    const sway = Math.sin(elapsed * 0.004 + resource.sway + i * 0.5) * 0.26;
    ctx.save();
    ctx.rotate(angle + sway);
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.quadraticCurveTo(6, -4, 0, -28 - (i % 3) * 5);
    ctx.quadraticCurveTo(-6, -4, 0, 12);
    ctx.fillStyle = i % 2 === 0 ? '#5ad25d' : '#84eb7f';
    ctx.fill();
    ctx.restore();
  }
  for (let i = 0; i < 4; i += 1) {
    const ox = (i - 1.5) * 7;
    ctx.beginPath();
    ctx.arc(ox, -6 - i * 5, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = ['#f2f58b', '#ffc26d', '#b6f28d', '#d9f9b8'][i];
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
    if (chest.opened) return;
    const x = chest.x - camera.x;
    const y = chest.y - camera.y;
    const lidLift = Math.max(0, Math.sin(elapsed * 0.0024 + x * 0.01) * 1.4);
    drawShadow(x, y + 18, 26, 10, 0.2);
    ctx.fillStyle = chest.rarity === 'rare' ? '#7b2f80' : '#7a5020';
    ctx.fillRect(x - 20, y - 2, 40, 20);
    ctx.fillStyle = chest.rarity === 'rare' ? '#d69cff' : '#cf9f3a';
    ctx.fillRect(x - 20, y - 16 - lidLift, 40, 12);
    ctx.strokeStyle = '#3b2819';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 20, y - 2, 40, 20);
    ctx.strokeRect(x - 20, y - 16 - lidLift, 40, 12);
    ctx.fillStyle = '#f6d36c';
    ctx.fillRect(x - 4, y - 4, 8, 10);
    if (chest.rarity === 'rare') {
      ctx.beginPath();
      ctx.arc(x, y - 20, 8 + Math.sin(elapsed * 0.005) * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(229, 181, 255, 0.28)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (player.skills.cartography && distance(player, chest) < 280) {
      ctx.strokeStyle = chest.rarity === 'rare' ? 'rgba(235, 181, 255, 0.9)' : 'rgba(255, 230, 120, 0.9)';
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(x, y, 34 + Math.sin(elapsed * 0.004) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
}

function drawHealthBar(x, y, ratio, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x - 26, y, 52, 6);
  ctx.fillStyle = color;
  ctx.fillRect(x - 26, y, 52 * ratio, 6);
}

function drawHero() {
  const x = player.x - camera.x;
  const y = player.y - camera.y;
  const stride = player.isMoving ? Math.sin(elapsed * (player.isSprinting ? 0.03 : 0.019)) : 0;
  const bodyBob = player.isMoving ? Math.abs(stride) * (player.isSprinting ? 6 : 4) : Math.sin(elapsed * 0.004) * 1.8;
  const weaponSwing = player.attackAnim > 0 ? (1 - player.attackAnim / 20) * 1.35 : 0;
  const spinAura = player.spinAnim > 0 ? 1 - player.spinAnim / 28 : 0;

  drawShadow(x, y + 32, 28, 11, 0.24);
  ctx.save();
  ctx.translate(x, y - bodyBob);
  ctx.scale(player.facing, 1);

  if (player.spinAnim > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, 44 + spinAura * 30, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(112, 240, 197, ${0.48 - spinAura * 0.25})`;
    ctx.lineWidth = 7;
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(0, stride * 2);
  ctx.drawImage(heroSprite, -90, -120);
  ctx.restore();

  ctx.fillStyle = '#4a3828';
  ctx.fillRect(-18, 40, 10, 20 + Math.max(0, stride) * 6);
  ctx.fillRect(8, 40, 10, 20 + Math.max(0, -stride) * 6);

  ctx.save();
  ctx.translate(36, -2);
  ctx.rotate(-0.5 + weaponSwing + (player.spinAnim > 0 ? elapsed * 0.05 : 0));
  ctx.fillStyle = '#90a1af';
  ctx.fillRect(-4, 0, 8, 58);
  ctx.fillStyle = '#e5eef5';
  ctx.beginPath();
  ctx.moveTo(-10, -44);
  ctx.lineTo(10, -4);
  ctx.lineTo(4, 18);
  ctx.lineTo(-8, -4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
  drawHealthBar(x, y - 64, player.hp / player.maxHp, '#70f0c5');
}

function drawEnemy(enemy) {
  const x = enemy.x - camera.x;
  const y = enemy.y - camera.y;
  const stride = Math.sin(elapsed * 0.02 + enemy.bob);
  const bob = Math.abs(stride) * 4;
  const bite = enemy.attackAnim > 0 ? 1 - enemy.attackAnim / 20 : 0;

  drawShadow(x, y + 26, 24, 10, 0.22);
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.scale(enemy.facing, 1);
  ctx.drawImage(enemySpriteMap[enemy.variant], -80, -108);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(-16, 26, 12, 18 + Math.max(0, stride) * 6);
  ctx.fillRect(6, 26, 12, 18 + Math.max(0, -stride) * 6);
  if (bite > 0) {
    ctx.beginPath();
    ctx.arc(0, 14, 18 + bite * 8, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 140, 167, ${0.32 - bite * 0.12})`;
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  ctx.restore();
  drawHealthBar(x, y - 50, enemy.hp / enemy.maxHp, '#ff8ca7');
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

function drawMinimap() {
  const size = minimapCanvas.width;
  minimapCtx.clearRect(0, 0, size, size);
  minimapCtx.save();
  minimapCtx.beginPath();
  minimapCtx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  minimapCtx.clip();

  const gradient = minimapCtx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, '#33552e');
  gradient.addColorStop(1, '#16231d');
  minimapCtx.fillStyle = gradient;
  minimapCtx.fillRect(0, 0, size, size);

  const plot = (x, y) => ({
    x: (x / world.width) * size,
    y: (y / world.height) * size,
  });

  resources.forEach((resource) => {
    if (resource.collected) return;
    const point = plot(resource.x, resource.y);
    minimapCtx.fillStyle = resource.type === 'madeira' ? '#59a85f' : resource.type === 'cristal' ? '#77eaff' : '#baf57f';
    minimapCtx.fillRect(point.x - 1, point.y - 1, 3, 3);
  });

  chests.forEach((chest) => {
    if (chest.opened) return;
    const point = plot(chest.x, chest.y);
    minimapCtx.fillStyle = chest.rarity === 'rare' ? '#e4a4ff' : '#f5cd68';
    minimapCtx.beginPath();
    minimapCtx.arc(point.x, point.y, 2.2, 0, Math.PI * 2);
    minimapCtx.fill();
  });

  enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    const point = plot(enemy.x, enemy.y);
    minimapCtx.fillStyle = '#ff6d8d';
    minimapCtx.beginPath();
    minimapCtx.arc(point.x, point.y, 2, 0, Math.PI * 2);
    minimapCtx.fill();
  });

  const playerPoint = plot(player.x, player.y);
  minimapCtx.strokeStyle = 'rgba(255,255,255,0.16)';
  minimapCtx.lineWidth = 1;
  minimapCtx.beginPath();
  minimapCtx.arc(playerPoint.x, playerPoint.y, 20, 0, Math.PI * 2);
  minimapCtx.stroke();
  minimapCtx.fillStyle = '#19f0d4';
  minimapCtx.beginPath();
  minimapCtx.arc(playerPoint.x, playerPoint.y, 4.2, 0, Math.PI * 2);
  minimapCtx.fill();
  minimapCtx.restore();
}

function updateCamera() {
  camera.x = clamp(player.x - canvas.width / 2, 0, world.width - canvas.width);
  camera.y = clamp(player.y - canvas.height / 2, 0, world.height - canvas.height);
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function setMenuOpen(open) {
  isMenuOpen = open;
  menuOverlay.classList.toggle('hidden', !open);
  if (open) {
    keys.clear();
    renderCrafting();
  }
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

  if (!isMenuOpen && !activeChestLoot) {
    elapsed += delta;
    handleInput();
    updateResources(delta);
    updateEnemies(delta);
    tickAnimations();
  }

  if (player.hp <= 0) {
    player.hp = player.maxHp;
    player.energy = player.maxEnergy;
    player.x = 460;
    player.y = 420;
    addLog('Você foi derrotado, mas retornou ao acampamento inicial.');
  }

  questText.textContent = `Mapa aberto ampliado: ${Math.round(player.x)}, ${Math.round(player.y)} / ${world.width} x ${world.height}.`;
  statusText.textContent = activeChestLoot
    ? 'Baú aberto: clique nos itens para coletar.'
    : 'Recursos reaparecem, baús retornam e monstros seguem rondando o mundo.';
  updateCamera();
  drawWorld();
  drawMinimap();
  updateHud();
  requestAnimationFrame(loop);
}

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'enter') {
    event.preventDefault();
    if (activeChestLoot) return;
    setMenuOpen(!isMenuOpen);
    return;
  }
  if (isMenuOpen || activeChestLoot) return;
  keys.add(key);
  if (key === 'j') attack();
  if (key === 'k') spinSkill();
  if (key === 'e') interact();
});

document.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('resize', resizeCanvas);
closeMenuButton.addEventListener('click', () => setMenuOpen(false));
closeLootButton.addEventListener('click', closeLootOverlay);

resizeCanvas();
renderObjectives();
renderSkillTree();
renderCrafting();
updateHud();
drawMinimap();
addLog('Bem-vindo ao GenImort expandido. Pressione Enter para abrir o menu principal.');
loop();
