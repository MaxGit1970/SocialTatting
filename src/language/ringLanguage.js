export const DEFAULT_RING = Object.freeze({
  totalNodes: 12,
  position: Object.freeze({x: 410, y: 270}),
  rotation: 0,
  roundness: 50,
  attachments: Object.freeze([]),
  style: Object.freeze({stroke: '#6750A4', strokeWidth: 2.5}),
});

const idPattern = '[A-Za-z_][A-Za-z0-9_]*';
const knownProperties = new Set([
  'totalNodes', 'position', 'rotation', 'roundness', 'attachments',
  'style.stroke', 'style.strokeWidth', 'hidden', 'locked',
]);

function diagnostic(message, line, from = 0, severity = 'error') {
  return {message, line, from, severity};
}

function splitArguments(text) {
  const result = [];
  let quote = null, depth = 0, start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (char === quote && text[i - 1] !== '\\') quote = null;
    } else if (char === '"' || char === "'") quote = char;
    else if ('([{'.includes(char)) depth += 1;
    else if (')]}'.includes(char)) depth -= 1;
    else if (char === ',' && depth === 0) {
      result.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = text.slice(start).trim();
  if (tail) result.push(tail);
  return result;
}

function parseComposition(raw) {
  const match = raw.match(/^composition\(\s*["']([^"']*)["']\s*\)$/);
  if (!match) return null;
  if (!match[1].trim()) return [];
  const steps = match[1].split('-').map(Number);
  if (steps.some(step => !Number.isInteger(step) || step <= 0)) return null;
  let position = 0;
  return steps.map(step => (position += step));
}

function parseValue(property, raw) {
  const text = raw.trim();
  if (property === 'position') {
    const match = text.match(/^point\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/);
    return match ? {ok: true, value: {x: Number(match[1]), y: Number(match[2])}} : {ok: false, reason: 'position richiede point(x, y)'};
  }
  if (property === 'attachments') {
    const value = parseComposition(text);
    return value ? {ok: true, value} : {ok: false, reason: 'attachments richiede composition("4-4-4-4")'};
  }
  if (property === 'style.stroke') {
    const match = text.match(/^["'](#[0-9a-fA-F]{6})["']$/);
    return match ? {ok: true, value: match[1].toUpperCase()} : {ok: false, reason: 'style.stroke richiede un colore esadecimale, es. "#6750A4"'};
  }
  if (property === 'hidden' || property === 'locked') {
    if (text === 'true' || text === 'false') return {ok: true, value: text === 'true'};
    return {ok: false, reason: `${property} richiede true o false`};
  }
  const unitMatch = text.match(/^(-?\d+(?:\.\d+)?)(?:px|U)?$/);
  if (!unitMatch) return {ok: false, reason: `${property} richiede un numero`};
  const value = Number(unitMatch[1]);
  if (property === 'totalNodes' && (!Number.isInteger(value) || value < 1)) return {ok: false, reason: 'totalNodes deve essere un intero maggiore o uguale a 1'};
  if (property === 'roundness' && (value < 0 || value > 100)) return {ok: false, reason: 'roundness deve essere compreso fra 0 e 100'};
  if (property === 'style.strokeWidth' && value <= 0) return {ok: false, reason: 'style.strokeWidth deve essere maggiore di 0'};
  return {ok: true, value};
}

function assign(ring, property, raw, line, diagnostics) {
  if (!knownProperties.has(property)) {
    diagnostics.push(diagnostic(`La proprietà “${property}” non esiste per Ring`, line));
    return;
  }
  const parsed = parseValue(property, raw);
  if (!parsed.ok) {
    diagnostics.push(diagnostic(parsed.reason, line));
    return;
  }
  if (property.startsWith('style.')) ring.style[property.slice(6)] = parsed.value;
  else ring[property] = parsed.value;
}

function makeRing(id, line) {
  return {
    id, type: 'Ring', totalNodes: DEFAULT_RING.totalNodes,
    position: {...DEFAULT_RING.position}, rotation: 0, roundness: 50,
    attachments: [], style: {...DEFAULT_RING.style}, hidden: false, locked: false,
    sourceLines: [line],
  };
}

export function parseTatting(source) {
  const diagnostics = [];
  const rings = {};
  const lines = source.split(/\r?\n/);
  const statements = [];
  for (let i = 0; i < lines.length; i += 1) {
    const cleaned = lines[i].replace(/\/\/.*$/, '').trim();
    if (!cleaned) continue;
    let statement = cleaned;
    let balance = (cleaned.match(/\(/g) || []).length - (cleaned.match(/\)/g) || []).length;
    const startLine = i + 1;
    while (balance > 0 && i + 1 < lines.length) {
      i += 1;
      const continuation = lines[i].replace(/\/\/.*$/, '').trim();
      statement += ` ${continuation}`;
      balance += (continuation.match(/\(/g) || []).length - (continuation.match(/\)/g) || []).length;
    }
    if (balance !== 0) diagnostics.push(diagnostic('Parentesi non bilanciate', startLine));
    statements.push({text: statement, line: startLine, endLine: i + 1});
  }

  for (const statement of statements) {
    const {text, line, endLine} = statement;
    let match = text.match(new RegExp(`^ring\\s+(${idPattern})(?:\\s*\\((.*)\\))?$`, 'i'));
    if (match) {
      const id = match[1];
      if (rings[id]) {
        diagnostics.push(diagnostic(`L'identificatore “${id}” è già dichiarato`, line));
        continue;
      }
      const ring = makeRing(id, line);
      ring.sourceLines = Array.from({length: endLine - line + 1}, (_, index) => line + index);
      rings[id] = ring;
      if (match[2]?.trim()) {
        for (const item of splitArguments(match[2])) {
          const separator = item.indexOf(':');
          if (separator < 1) {
            diagnostics.push(diagnostic(`Inizializzatore non valido: “${item}”. Usa proprietà: valore`, line));
            continue;
          }
          assign(ring, item.slice(0, separator).trim(), item.slice(separator + 1), line, diagnostics);
        }
      }
      continue;
    }

    match = text.match(new RegExp(`^(${idPattern})\\.([A-Za-z_][A-Za-z0-9_.]*)\\s*=\\s*(.+)$`));
    if (match) {
      const ring = rings[match[1]];
      if (!ring) diagnostics.push(diagnostic(`L'oggetto “${match[1]}” non è stato dichiarato`, line));
      else {
        assign(ring, match[2], match[3], line, diagnostics);
        ring.sourceLines.push(line);
      }
      continue;
    }

    match = text.match(new RegExp(`^(${idPattern})\\.(rotate|move|setNodes)\\((.*)\\)$`));
    if (match) {
      const ring = rings[match[1]];
      if (!ring) diagnostics.push(diagnostic(`L'oggetto “${match[1]}” non è stato dichiarato`, line));
      else {
        const args = splitArguments(match[3]).map(Number);
        if (args.some(Number.isNaN)) diagnostics.push(diagnostic(`Argomenti non validi per ${match[2]}`, line));
        else if (match[2] === 'rotate' && args.length === 1) ring.rotation += args[0];
        else if (match[2] === 'move' && args.length === 2) ring.position = {x: ring.position.x + args[0], y: ring.position.y + args[1]};
        else if (match[2] === 'setNodes' && args.length === 1) assign(ring, 'totalNodes', String(args[0]), line, diagnostics);
        else diagnostics.push(diagnostic(`Numero di argomenti non valido per ${match[2]}`, line));
        ring.sourceLines.push(line);
      }
      continue;
    }
    diagnostics.push(diagnostic(`Istruzione Ring non riconosciuta: “${text}”`, line));
  }

  for (const ring of Object.values(rings)) {
    const invalidAttachment = ring.attachments.find(node => node > ring.totalNodes);
    if (invalidAttachment) diagnostics.push(diagnostic(`Il punto di attacco ${invalidAttachment} supera totalNodes (${ring.totalNodes})`, ring.sourceLines[0]));
  }
  return {valid: diagnostics.length === 0, diagnostics, rings, order: Object.keys(rings)};
}

export function serializeRing(ring, multiline = true) {
  const parts = [
    `totalNodes: ${ring.totalNodes}`,
    `attachments: composition("${ring.attachments.length ? ring.attachments.reduce((acc, node, index) => [...acc, node - (ring.attachments[index - 1] || 0)], []).join('-') : ''}")`,
    `position: point(${ring.position.x}, ${ring.position.y})`,
    `rotation: ${ring.rotation}`,
    `roundness: ${ring.roundness}`,
    `style.stroke: "${ring.style.stroke}"`,
    `style.strokeWidth: ${ring.style.strokeWidth}px`,
  ];
  if (!multiline) return `ring ${ring.id}(${parts.join(', ')})`;
  return `ring ${ring.id}(\n  ${parts.join(',\n  ')}\n)`;
}
