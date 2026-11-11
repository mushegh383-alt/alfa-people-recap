// Positions, rotations and image crops from Figma 2861:292.
export const postcardLayout = [
  { x: 0, y: 418, boxW: 1858.342, boxH: 1634.195, width: 1207.818, height: 1559.222, angle: -71.81, background: '#01b7f8', imageW: 77.78, imageH: 150.66 },
  { x: 34, y: 328.09, boxW: 1899.176, boxH: 1705.885, width: 1207.818, height: 1559.222, angle: -67.89, background: '#01b7f8', imageW: 77.78, imageH: 150.66 },
  { x: 119, y: 268, boxW: 1896.907, boxH: 1696.199, width: 1146.395, height: 1559.222, angle: -65.11, background: '#01b7f8', imageW: 81.94, imageH: 150.66 },
  { x: 258, y: 127, boxW: 1807.203, boxH: 1689.065, width: 1052.752, height: 1470.456, angle: -56.54, background: '#01b7f8', imageW: 81.94, imageH: 146.7 },
  { x: 416, y: 77.94, boxW: 1601.68, boxH: 1511.583, width: 897.843, height: 1328.103, angle: -53.52, background: '#0bd0fb', imageW: 81.94, imageH: 146.7 },
  { x: 540, y: 85, boxW: 1264.543, boxH: 1214.681, width: 716.181, height: 1046.941, angle: -51.12, background: '#02bff9', imageW: 81.94, imageH: 146.7, alternate: true },
  { x: 679, y: 86, boxW: 982.251, boxH: 945.336, width: 556.533, height: 813.56, angle: -50.83, imageW: 100, imageH: 171.06 },
  { x: 817, y: 0, boxW: 745.232, boxH: 720.59, width: 442.461, height: 600.398, angle: -51.33, imageW: 100, imageH: 184.28 },
];

const clamp = value => Math.max(0, Math.min(1, value));
export function smoothProgress(start, end, value) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

export function postcardPose(progress, index, card, continuation = 0) {
  const p = smoothProgress(index * .014, 1, progress);
  const drift = smoothProgress(0, 1, continuation);
  const endX = card.x + card.boxW / 2;
  const endY = card.y + card.boxH / 2;
  // The initial curl lands on the Figma pose; the upper fan can keep drifting
  // as the lower one unfolds. Zero slope at the handoff avoids a sudden turn.
  const arc = Math.sin(p * Math.PI);
  return {
    x: 1032.5 + (endX - 1032.5) * p + arc * (30 + index * 20) + drift * (55 + index * 12),
    y: endY + (1 - p) * (220 + index * 40) - drift * (75 + index * 9),
    rotation: -90 + (card.angle + 90) * p + arc * index * 3 + drift * (14 + index * 2),
    scale: 1,
    opacity: 1,
  };
}

// Hand off from the upper fan when the counters reach the viewport, then keep
// the lower fan moving for the entire remaining scroll down to the frame bottom.
export function postcardsScrollProgress(sectionTop, viewportHeight, sectionHeight, scale) {
  const end = -Math.max(0, sectionHeight - viewportHeight);
  const start = viewportHeight * .9;
  const handoff = Math.min(start - 1, Math.max(end + 1, viewportHeight * .6 - 700 * scale));
  return {
    upper: clamp((start - sectionTop) / (start - handoff)),
    lower: sectionTop <= end + 1 ? 1 : clamp((handoff - sectionTop) / (handoff - end)),
  };
}

// Keep the Figma typography and lower fan proportions; add an upper fan above them.
export const postcardsFrame = { width: 1920, height: 3655, transitionHeight: 2600, lowerTop: 1522 };
