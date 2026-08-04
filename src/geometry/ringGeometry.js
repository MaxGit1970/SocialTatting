export function ringPath(ring) {
  const perimeter = Math.max(48, ring.totalNodes * 8);
  const radius = perimeter / (2 * Math.PI);
  const width = radius * (1.45 + ring.roundness / 125);
  const height = radius * (1.25 + ring.roundness / 100);
  const tipY = -height * 0.95;
  return `M 0 ${tipY} C ${width} ${-height * .7}, ${width} ${height * .6}, 0 ${height} C ${-width} ${height * .6}, ${-width} ${-height * .7}, 0 ${tipY} Z`;
}

export function ringAttachmentPoints(ring) {
  if (!ring.attachments.length) return [];
  const radius = Math.max(24, ring.totalNodes * 8 / (2 * Math.PI));
  return ring.attachments.map(node => {
    const angle = -Math.PI / 2 + (node / ring.totalNodes) * Math.PI * 2;
    return {node, x: Math.cos(angle) * radius * 1.65, y: Math.sin(angle) * radius * 1.5};
  });
}
