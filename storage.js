const fs = require('fs');
const FILE = 'map.json';

function loadMap() {
  if (fs.existsSync(FILE)) {
    return new Map(JSON.parse(fs.readFileSync(FILE)));
  }
  return new Map();
}

function saveMap(map) {
  fs.writeFileSync(FILE, JSON.stringify([...map.entries()], null, 2));
}

module.exports = { loadMap, saveMap };
