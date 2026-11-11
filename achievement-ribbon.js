// Палитра лучей как у «Моментов» и «Спасибок»: горячий розовый, светящийся
// почти белый и красный, с яркой красной обводкой по краю каждой ленты.
const materials = {
  '#2ABBFF': { shadow: '#9c0f0a', base: '#ef3124', light: '#ff7a68', edge: '#ff2a1f' },
  '#FA7AB3': { shadow: '#c0347c', base: '#fa7ab3', light: '#ffd9ea', edge: '#ff2a1f' },
  '#FF6837': { shadow: '#9c0f0a', base: '#ef3124', light: '#ff7a68', edge: '#ff2a1f' },
  '#F8E4C2': { shadow: '#f08cbb', base: '#ffd3e6', light: '#ffffff', edge: '#ff2a1f' },
  '#0C0B07': { shadow: '#020101', base: '#0b0306', light: '#1d070f', edge: null },
  '#170407': { shadow: '#040102', base: '#1a050c', light: '#35101f', edge: null },
};
export function achievementRibbonMaterial(fill) {
  return materials[fill.toUpperCase()] || materials['#0C0B07'];
}
export function achievementRibbonAxis(points) {
  if (points.length < 8 || points.some(value => !Number.isFinite(value))) return [0, 0, 1, 0];
  // Opposite long edges of each four-corner ribbon define its cross-light.
  const axis = [(points[0] + points[6]) / 2, (points[1] + points[7]) / 2, (points[2] + points[4]) / 2, (points[3] + points[5]) / 2];
  if (Math.hypot(axis[2] - axis[0], axis[3] - axis[1]) < .001) return [axis[0], axis[1], axis[0] + 1, axis[1]];
  return axis;
}
