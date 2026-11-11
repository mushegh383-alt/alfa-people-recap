// Native Figma layers from node 2861:79, preserving the original geometry.
const layers = [
  {
    "x": 62.22,
    "y": 62.68,
    "boxW": 17.979,
    "boxH": 17.979,
    "w": 17.979,
    "h": 17.979,
    "angle": 0,
    "color": "#00bbfb"
  },
  {
    "x": 58.25,
    "y": 12.81,
    "boxW": 12.76,
    "boxH": 29.911,
    "w": 8.873,
    "h": 28.968,
    "angle": -7.88,
    "color": "#00bbfb"
  },
  {
    "x": 58.25,
    "y": 12.81,
    "boxW": 11.723,
    "boxH": 22.417,
    "w": 8.873,
    "h": 21.403,
    "angle": -7.88,
    "color": "#3589f1"
  },
  {
    "x": 58.25,
    "y": 12.81,
    "boxW": 10.745,
    "boxH": 15.35,
    "w": 8.873,
    "h": 14.268,
    "angle": -7.88,
    "color": "#2269ef"
  },
  {
    "x": 56.46,
    "y": 0,
    "boxW": 10.604,
    "boxH": 14.328,
    "w": 8.873,
    "h": 13.236,
    "angle": -7.88,
    "color": "#3589f1"
  },
  {
    "x": 56.46,
    "y": 0,
    "boxW": 9.985,
    "boxH": 9.852,
    "w": 8.873,
    "h": 8.718,
    "angle": -7.88,
    "color": "#00bbfb"
  },
  {
    "x": 75.85,
    "y": 30.86,
    "boxW": 22.527,
    "boxH": 29.4,
    "w": 8.873,
    "h": 28.968,
    "angle": 31,
    "color": "#00bbfb"
  },
  {
    "x": 79.75,
    "y": 30.86,
    "boxW": 18.63,
    "boxH": 22.915,
    "w": 8.873,
    "h": 21.403,
    "angle": 31,
    "color": "#3589f1"
  },
  {
    "x": 83.42,
    "y": 30.86,
    "boxW": 14.955,
    "boxH": 16.8,
    "w": 8.873,
    "h": 14.268,
    "angle": 31,
    "color": "#2269ef"
  },
  {
    "x": 90.6,
    "y": 19.76,
    "boxW": 14.424,
    "boxH": 15.916,
    "w": 8.873,
    "h": 13.236,
    "angle": 31,
    "color": "#3589f1"
  },
  {
    "x": 92.93,
    "y": 12.07,
    "boxW": 16.718,
    "boxH": 19.733,
    "w": 8.873,
    "h": 17.69,
    "angle": 31,
    "color": "#00bbfb"
  },
  {
    "x": 99.63,
    "y": 58.93,
    "boxW": 29.889,
    "boxH": 12.639,
    "w": 8.873,
    "h": 28.968,
    "angle": 82.37,
    "color": "#00bbfb"
  },
  {
    "x": 107.13,
    "y": 58.93,
    "boxW": 22.391,
    "boxH": 11.635,
    "w": 8.873,
    "h": 21.403,
    "angle": 82.37,
    "color": "#3589f1"
  },
  {
    "x": 114.2,
    "y": 58.93,
    "boxW": 15.32,
    "boxH": 10.688,
    "w": 8.873,
    "h": 14.268,
    "angle": 82.37,
    "color": "#2269ef"
  },
  {
    "x": 128.04,
    "y": 57.2,
    "boxW": 14.297,
    "boxH": 10.552,
    "w": 8.873,
    "h": 13.236,
    "angle": 82.37,
    "color": "#3589f1"
  },
  {
    "x": 44.94,
    "y": 82.69,
    "boxW": 21.717,
    "boxH": 27.891,
    "w": 8.873,
    "h": 27.24,
    "angle": -148.75,
    "color": "#00bbfb"
  },
  {
    "x": 46.21,
    "y": 89.15,
    "boxW": 16.524,
    "boxH": 19.333,
    "w": 8.873,
    "h": 17.229,
    "angle": -148.75,
    "color": "#3589f1"
  },
  {
    "x": 44.94,
    "y": 95.25,
    "boxW": 14.092,
    "boxH": 15.326,
    "w": 8.873,
    "h": 12.542,
    "angle": -148.75,
    "color": "#2269ef"
  },
  {
    "x": 33.22,
    "y": 106.08,
    "boxW": 19.255,
    "boxH": 23.834,
    "w": 8.873,
    "h": 22.494,
    "angle": -148.75,
    "color": "#3589f1"
  },
  {
    "x": 16.69,
    "y": 71.83,
    "boxW": 28.245,
    "boxH": 12.766,
    "w": 8.873,
    "h": 27.24,
    "angle": -98.42,
    "color": "#00bbfb"
  },
  {
    "x": 19.11,
    "y": 72.94,
    "boxW": 18.342,
    "boxH": 11.3,
    "w": 8.873,
    "h": 17.229,
    "angle": -98.42,
    "color": "#3589f1"
  },
  {
    "x": 11.51,
    "y": 73.99,
    "boxW": 18.88,
    "boxH": 11.38,
    "w": 8.873,
    "h": 17.773,
    "angle": -98.42,
    "color": "#2269ef"
  },
  {
    "x": 2.12,
    "y": 76.17,
    "boxW": 13.533,
    "boxH": 10.588,
    "w": 8.873,
    "h": 12.367,
    "angle": -98.42,
    "color": "#fb2023"
  },
  {
    "x": 0,
    "y": 76.89,
    "boxW": 10.807,
    "boxH": 10.185,
    "w": 8.873,
    "h": 9.612,
    "angle": -98.42,
    "color": "#00bbfb"
  },
  {
    "x": 32.32,
    "y": 45.56,
    "boxW": 27.919,
    "boxH": 21.634,
    "w": 8.873,
    "h": 27.24,
    "angle": -59,
    "color": "#00bbfb"
  },
  {
    "x": 34.41,
    "y": 46.82,
    "boxW": 19.338,
    "boxH": 16.479,
    "w": 8.873,
    "h": 17.229,
    "angle": -59,
    "color": "#3589f1"
  },
  {
    "x": 27.83,
    "y": 42.86,
    "boxW": 19.804,
    "boxH": 16.759,
    "w": 8.873,
    "h": 17.773,
    "angle": -59,
    "color": "#2269ef"
  },
  {
    "x": 19.7,
    "y": 37.98,
    "boxW": 15.17,
    "boxH": 13.975,
    "w": 8.873,
    "h": 12.367,
    "angle": -59,
    "color": "#fb2023"
  },
  {
    "x": 11.8,
    "y": 33.24,
    "boxW": 18.859,
    "boxH": 16.191,
    "w": 8.873,
    "h": 16.67,
    "angle": -59,
    "color": "#00bbfb"
  },
  {
    "x": 81.65,
    "y": 75.73,
    "boxW": 28.301,
    "boxH": 22.247,
    "w": 8.873,
    "h": 27.819,
    "angle": 121.94,
    "color": "#00bbfb"
  },
  {
    "x": 88.07,
    "y": 79.73,
    "boxW": 21.808,
    "boxH": 18.199,
    "w": 8.873,
    "h": 20.167,
    "angle": 121.94,
    "color": "#3589f1"
  },
  {
    "x": 107.82,
    "y": 92.05,
    "boxW": 22.474,
    "boxH": 18.614,
    "w": 8.873,
    "h": 20.952,
    "angle": 121.94,
    "color": "#00bbfb"
  },
  {
    "x": 105.38,
    "y": 90.5,
    "boxW": 16.536,
    "boxH": 14.912,
    "w": 8.873,
    "h": 13.955,
    "angle": 121.94,
    "color": "#3589f1"
  }
];

export function createPostcardSpark() {
  const spark = document.createElement('div');
  spark.className = 'postcards-spark';
  spark.setAttribute('aria-hidden', 'true');
  for (const layer of layers) {
    const ray = document.createElement('span');
    Object.assign(ray.style, {
      left: `${layer.x + layer.boxW / 2}px`,
      top: `${layer.y + layer.boxH / 2}px`,
      width: `${layer.w}px`, height: `${layer.h}px`,
      background: layer.color,
      transform: `translate(-50%, -50%) rotate(${layer.angle}deg)`,
    });
    spark.append(ray);
  }
  return spark;
}

