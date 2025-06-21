export function parseSpyText(text) {
  const blocks = text
      .split(/(?=^\s*Name:)/gim)
      .map(b => b.trim())
      .filter(Boolean);

  const get = (block, label) => {
    const match = new RegExp(`${label}:\\s*(.*)`, 'i').exec(block);
    return match ? match[1].trim() : '';
  };

  return blocks.map(block => {
    const nameLine = get(block, 'Name');
    const nameMatch = /(.*)\s\[(\d+)\]/.exec(nameLine);
    const name = nameMatch ? nameMatch[1] : nameLine;

    return {
      name,
      level: get(block, 'Level'),
      speed: get(block, 'Speed'),
      strength: get(block, 'Strength'),
      defense: get(block, 'Defense'),
      dexterity: get(block, 'Dexterity'),
      // total is no longer returned — calculated in UI only
    };
  });
}

export function parseNumber(input) { // TODO move this to a separate utility file
  if (typeof input === 'number') {
    return isNaN(input) ? null : input;
  }

  if (typeof input === 'string') {
    const clean = input.replace(/,/g, '');
    const n = parseInt(clean, 10);
    return isNaN(n) ? null : n;
  }

  return null;
}

export function formatNumber(n) { // TODO move this to a separate utility file
  return n == null ? 'N/A' : n.toLocaleString();
}
