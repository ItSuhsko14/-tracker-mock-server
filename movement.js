const BOUNDS = {
  minLat: 50.44,
  maxLat: 50.47,
  minLng: 30.50,
  maxLng: 30.55,
};

// --- PARAMETERS ---
const WANDER_STRENGTH = 0.05;      // наскільки об’єкт “дрейфує”
const AVOID_STRENGTH = 0.2;        // сила уникнення меж
const EDGE_THRESHOLD = 0.0015;     // коли вмикати avoid (~150м)
const SPEED = 0.0005;              // ~5м/крок

// --- INITIAL OBJECTS ---
let objects = Array.from({ length: 200 }).map((_, i) => {
  const angle = Math.random() * 2 * Math.PI;
  return {
    id: `obj-${i + 1}`,
    lat: 50.4501 + Math.random() * 0.01,
    lng: 30.5234 + Math.random() * 0.01,
    vx: Math.cos(angle) * SPEED,
    vy: Math.sin(angle) * SPEED,
    updatedAt: Date.now(),
  };
});


// Normalize vector
function normalize(vx, vy) {
  const len = Math.sqrt(vx * vx + vy * vy);
  return len === 0 ? [0, 0] : [vx / len, vy / len];
}


// Apply wander steering
function applyWander(vx, vy) {
  const [nx, ny] = normalize(vx, vy);

  const angle = (Math.random() - 0.5) * WANDER_STRENGTH;

  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const newVx = nx * cosA - ny * sinA;
  const newVy = nx * sinA + ny * cosA;

  return [newVx * SPEED, newVy * SPEED];
}


// Apply boundary avoidance
function applyAvoidance(lat, lng, vx, vy) {
  let steerX = 0;
  let steerY = 0;

  if (lat - BOUNDS.minLat < EDGE_THRESHOLD) steerY += AVOID_STRENGTH;
  if (BOUNDS.maxLat - lat < EDGE_THRESHOLD) steerY -= AVOID_STRENGTH;

  if (lng - BOUNDS.minLng < EDGE_THRESHOLD) steerX += AVOID_STRENGTH;
  if (BOUNDS.maxLng - lng < EDGE_THRESHOLD) steerX -= AVOID_STRENGTH;

  if (steerX === 0 && steerY === 0) return [vx, vy];

  const newVx = vx + steerX;
  const newVy = vy + steerY;

  const [nx, ny] = normalize(newVx, newVy);
  return [nx * SPEED, ny * SPEED];
}


// Update one object
function updateObject(o) {
  // 1. Wander drift
  let [vx, vy] = applyWander(o.vx, o.vy);

  // 2. Avoid borders
  [vx, vy] = applyAvoidance(o.lat, o.lng, vx, vy);

  // 3. New position
  const newLat = o.lat + vy;
  const newLng = o.lng + vx;

  // 4. Compute proper azimuth (bearing)
  const dLat = vy;
  const dLng = vx * Math.cos(o.lat * Math.PI / 180);

  const angle = Math.atan2(dLng, dLat) * 180 / Math.PI;
  const bearing = (angle + 360) % 360;

  return {
    ...o,
    lat: newLat,
    lng: newLng,
    vx,
    vy,
    direction: bearing,
    updatedAt: Date.now(),
  };
}


const DESPAWN_PROBABILITY = 0.1;
const MAX_OBJECTS = 10;

function spawnObject(id) {
  const angle = Math.random() * 2 * Math.PI;

  const vx = Math.cos(angle) * SPEED;
  const vy = Math.sin(angle) * SPEED;

  return {
    id,
    lat: 50.4501 + Math.random() * 0.01,
    lng: 30.5234 + Math.random() * 0.01,
    vx,
    vy,
    direction: (Math.atan2(vx, vy) * 180 / Math.PI + 360) % 360,
    updatedAt: Date.now(),
  };
}

function tryDespawn() {
  return Math.random() < DESPAWN_PROBABILITY;
}


// --- MAIN LOOP ---
function generateObjects() {
  // 1. update movement
  objects = objects.map(updateObject);

  // 2. despawn some
  objects = objects.filter(o => !tryDespawn());

  // 3. respawn until we reach MAX_OBJECTS
  while (objects.length < MAX_OBJECTS) {
    const id = "obj-" + (Math.random() * 1e9 | 0);
    objects.push(spawnObject(id));
  }

  return objects;
}

module.exports = {
  generateObjects,
};