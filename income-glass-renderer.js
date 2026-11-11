import { canvasBudget, getQuality } from './performance.js';
// A single transparent WebGL surface. Text remains data, never baked into a video.
const vertex = `attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0., 1.); }`;
const fragment = `precision highp float;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uTurn;
uniform float uNumber;
uniform float uCaption;
uniform float uLight;
uniform sampler2D uText;
uniform sampler2D uInterior;
const float PI = 3.14159265359;

vec4 label(vec2 uv) {
  if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) return vec4(0.);
  vec4 t = texture2D(uText, uv);
  t.a *= uv.y > .70 ? uCaption : uNumber;
  return t;
}
// Snell refraction at the first glass/air boundary, followed by a real
// intersection with the far wall of the unit sphere (not a radial UV warp).
vec3 farWall(vec3 entry, float ior) {
  vec3 ray = refract(vec3(0., 0., -1.), entry, 1. / ior);
  return entry - 2. * dot(entry, ray) * ray;
}
vec2 throughUV(vec3 entry, float ior) {
  vec3 ray = refract(vec3(0., 0., -1.), entry, 1. / ior);
  // Place the data BEHIND a hollow glass ornament. Trace all four interfaces:
  // front outer glass -> inner air -> rear glass -> exterior air -> data plane.
  float innerRadius = .86 + .008 * sin(uLight * 6.28318);
  float b = dot(entry, ray);
  float discriminant = b * b - (1. - innerRadius * innerRadius);
  vec3 innerFront = entry + ray * (-b - sqrt(max(0., discriminant)));
  vec3 airRay = refract(ray, normalize(innerFront), ior);
  if (dot(airRay, airRay) < .001) return vec2(-1.);
  vec3 innerBack = innerFront - 2. * dot(innerFront, airRay) * airRay;
  vec3 rearRay = refract(airRay, -normalize(innerBack), 1. / ior);
  float rearB = dot(innerBack, rearRay);
  vec3 outerBack = innerBack + rearRay * (-rearB + sqrt(rearB * rearB + 1. - innerRadius * innerRadius));
  vec3 exitRay = refract(rearRay, -normalize(outerBack), ior);
  if (exitRay.z > -.001) return vec2(-1.);
  vec3 plane = outerBack + exitRay * ((-1.22 - outerBack.z) / exitRay.z);
  return vec2(.5 + (plane.x * .92 + uTurn * .26) / 2.30,
              .5 - plane.y * .92 / 2.40 + (1. - uNumber) * .08);
}
vec3 rotateInterior(vec3 q) {
  float yaw = -.65 + uLight * 2.65 + uTurn * .3;
  float tilt = -.22 + .74 * uLight;
  float roll = .16 * sin(uLight * 5.);
  q.xz = mat2(cos(yaw), -sin(yaw), sin(yaw), cos(yaw)) * q.xz;
  q.yz = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * q.yz;
  q.xy = mat2(cos(roll), -sin(roll), sin(roll), cos(roll)) * q.xy;
  return q;
}
vec4 interior(vec3 point) {
  vec3 q = rotateInterior(normalize(point));
  vec2 uv = vec2(fract(atan(q.x, q.z) / (2. * PI) + .5),
                 acos(clamp(q.y, -1., 1.)) / PI);
  return texture2D(uInterior, uv);
}
void main() {
  vec2 pixel = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 p = (pixel - uCenter) / uRadius;
  float rr = dot(p, p);
  if (rr > 1.) {
    float halo = .38 * exp(-(sqrt(rr) - 1.) * 32.);
    // Цвет предумножен на альфу: Safari на iPhone показывал красный с alpha≈0
    // как яркий красный квадрат вокруг шара.
    gl_FragColor = vec4(vec3(1., .16, .09) * halo, halo);
    return;
  }
  float radius = sqrt(rr);
  float z = sqrt(max(0., 1. - rr));
  vec3 entry = vec3(p.x, -p.y, z);
  vec3 ray = refract(vec3(0., 0., -1.), entry, 1. / 1.45);
  vec3 back = farWall(entry, 1.45);
  vec3 bounce = reflect(ray, normalize(back));
  vec3 reflectedWall = back - 2. * dot(back, bounce) * bounce;
  vec3 bounceAgain = reflect(bounce, normalize(reflectedWall));
  vec3 secondWall = reflectedWall - 2. * dot(reflectedWall, bounceAgain) * bounceAgain;
  float fresnel = .035 + .965 * pow(1. - z, 5.);

  // Transmitted red glass, with only a thin Fresnel edge. No inset plate rim.
  vec3 color = mix(vec3(.93, .055, .074), vec3(.82, .018, .032), pow(radius, 7.) * .58);
  color += vec3(.025, .012, .005) * exp(-dot(p - vec2(-.27, -.34), p - vec2(-.27, -.34)) * 4.5);

  // Data is composited first: surface tint, reflected print and highlights
  // then sit in front of the number instead of the number hiding the glass.
  vec4 front = label(throughUV(entry, 1.45));
  vec4 green = label(throughUV(entry, 1.452));
  vec4 blue = label(throughUV(entry, 1.454));
  float readableCore = 1. - smoothstep(.79, .86, radius);
  vec3 coverage = vec3(front.a, green.a, blue.a) * readableCore;
  color = mix(color, vec3(1., .965, .94), coverage);
  color = mix(color, vec3(.93, .055, .074), .018 + .10 * fresnel);

  // Each reflected ray samples a different point on the same live type atlas.
  // Near the critical viewing angle these paths fold and turn the letters over.
  vec4 transmittedType = interior(back);
  vec4 reflectedType = interior(reflectedWall);
  vec4 secondType = interior(secondWall);
  float peripheral = smoothstep(.52, .84, radius);
  float ink = transmittedType.a * peripheral * .88;
  ink = max(ink, reflectedType.a * .92 * peripheral);
  ink = max(ink, secondType.a * peripheral * .36);
  color = mix(color, vec3(.055, .004, .009), clamp(ink * uNumber, 0., .98));

  vec3 light = normalize(vec3(-.62 + .12 * uLight, .72, 1.4));
  float specular = pow(max(0., dot(reflect(-light, entry), vec3(0., 0., 1.))), 135.);
  color += vec3(.19, .075, .055) * specular;
  color += vec3(.32, .12, .08) * fresnel * smoothstep(-.3, .8, p.x + p.y);
  float grain = fract(sin(dot(floor(pixel), vec2(12.9898, 78.233))) * 43758.5453) - .5;
  color += grain * .035;
  // Warm inset bloom and a bright fine edge match the glass in the design.
  float upperLight = max(0., dot(normalize(p + .00001), normalize(vec2(-.6, -.8))));
  float rim = pow(1. - z, 1.5) * (.38 + .60 * upperLight);
  color = mix(color, vec3(.985, .61, .49), rim * .86);
  float hairline = smoothstep(.995, 1., radius);
  color = mix(color, vec3(1., .79, .70), hairline * .60);
  float alpha = 1. - smoothstep(1. - 1.5 / uRadius, 1., radius);
  gl_FragColor = vec4(color * alpha, alpha);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const reason = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(reason);
  }
  return shader;
}

export function createIncomeGlassRenderer(canvas, caption, title, rank) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const program = gl.createProgram();
  const tier=getQuality();
  let source=fragment;
  if(tier!=='full') source=source.replace('vec4 green = label(throughUV(entry, 1.452));','vec4 green = front;').replace('vec4 blue = label(throughUV(entry, 1.454));','vec4 blue = front;');
  if(tier==='lite') source=source.replace('vec4 secondType = interior(secondWall);','vec4 secondType = vec4(0.);');
  const shaders = [compile(gl, gl.VERTEX_SHADER, vertex), compile(gl, gl.FRAGMENT_SHADER, source)];
  shaders.forEach(shader => gl.attachShader(program, shader));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(['Resolution', 'Center', 'Radius', 'Turn', 'Number', 'Caption', 'Light', 'Text', 'Interior'].map(key => [key, gl.getUniformLocation(program, `u${key}`)]));
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const textCanvas = document.createElement('canvas');
  textCanvas.width = textCanvas.height = tier==='lite'?1024:tier==='balanced'?1280:1536;
  const ctx = textCanvas.getContext('2d');
  ctx.scale(textCanvas.width/1536,textCanvas.height/1536);
  const interiorCanvas = document.createElement('canvas');
  interiorCanvas.width = tier==='lite'?1024:tier==='balanced'?1536:2048;
  interiorCanvas.height = interiorCanvas.width/2;
  const interiorContext = interiorCanvas.getContext('2d');
  interiorContext.scale(interiorCanvas.width/2048,interiorCanvas.width/2048);
  const interiorTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, interiorTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0);
  let lastDigits = null;
  let ratio = 1, renderTier=tier, suspended=false;
  function writeText(digits) {
    if (digits === lastDigits) return;
    lastDigits = digits;
    const size = 1536;
    ctx.clearRect(0, 0, size, size);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    let numberSize = 700;
    ctx.font = `${numberSize}px Agse`;
    numberSize *= Math.min(1, size * .78 / Math.max(1, ctx.measureText('8'.repeat(digits.length)).width));
    ctx.font = `${numberSize}px Agse`;
    ctx.shadowColor = '#fff8';
    ctx.shadowBlur = 12;
    ctx.fillText(digits, size / 2, size * .66);
    ctx.shadowBlur = 0;
    let captionSize = 66;
    ctx.font = `700 ${captionSize}px Styrene`;
    const maxWidth = size * .56;
    const lines = [];
    for (const paragraph of caption.split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; }
        else line = next;
      }
      if (line) lines.push(line);
    }
    const max = Math.max(1, ...lines.map(line => ctx.measureText(line).width));
    captionSize *= Math.min(1, maxWidth / max, 3 / Math.max(3, lines.length));
    ctx.font = `700 ${captionSize}px Styrene`;
    ctx.globalAlpha = 1;
    lines.forEach((line, i) => ctx.fillText(line, size / 2, size * .745 + i * captionSize * .98));
    ctx.globalAlpha = 1;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
    // The interior wall carries our own data, repeated around its circumference.
    // It is a separate atlas so reflections never introduce foreign GIF copy.
    const c = interiorContext;
    c.clearRect(0, 0, 2048, 1024);
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    const fit = (text, font, maxWidth, x, y) => {
      c.font = font;
      c.save();
      c.translate(x, y);
      c.scale(Math.min(1, maxWidth / Math.max(1, c.measureText(text).width)), 1);
      c.fillText(text, 0, 0);
      c.restore();
    };
    for (let tile = 0; tile < 3; tile++) {
      const x = (tile + .5) * 2048 / 3;
      fit(title, '700 88px Nauryz', 620, x, 238);
      fit(rank, '500 40px Formular', 600, x, 310);
      fit(digits, '110px Agse', 580, x, 530);
      caption.split('\n').forEach((line, i) => fit(line, '500 43px Formular', 620, x, 635 + i * 46));
      // A second, inverted side of the print becomes visible through the bottom.
      c.save();
      c.translate(x, 860);
      c.rotate(Math.PI);
      fit(title, '700 70px Nauryz', 610, 0, 0);
      c.restore();
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, interiorTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, interiorCanvas);
    gl.activeTexture(gl.TEXTURE0);
  }
  return {
    resize(width, height) {
      suspended=false;
      const budget=canvasBudget(width,height);ratio=budget.ratio;renderTier=getQuality();
      canvas.width=budget.width;canvas.height=budget.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    setVisible(visible) {
      if(!visible&&!suspended){canvas.width=canvas.height=1;gl.viewport(0,0,1,1);suspended=true;}
    },
    draw(pose, geometry, digits, width, height) {
      if(suspended||renderTier!==getQuality())this.resize(width,height);
      writeText(digits);
      gl.useProgram(program);
      const zoom = pose.zoom;
      const centerX = pose.centerX ?? width / 2 + (geometry.x - width / 2) / zoom;
      const centerY = pose.centerY ?? height / 2 + (geometry.y - height / 2) / zoom;
      gl.uniform2f(uniforms.Resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.Center, centerX * ratio, centerY * ratio);
      gl.uniform1f(uniforms.Radius, geometry.radius * zoom * ratio);
      gl.uniform1f(uniforms.Turn, pose.turn);
      gl.uniform1f(uniforms.Number, pose.number);
      gl.uniform1f(uniforms.Caption, pose.caption);
      gl.uniform1f(uniforms.Light, pose.light);
      gl.uniform1i(uniforms.Text, 0);
      gl.uniform1i(uniforms.Interior, 1);
      gl.disable(gl.SCISSOR_TEST);gl.clear(gl.COLOR_BUFFER_BIT);
      const halo=geometry.radius*zoom*ratio*1.3,cx=centerX*ratio,cy=(height-centerY)*ratio;
      const left=Math.max(0,Math.floor(cx-halo)),bottom=Math.max(0,Math.floor(cy-halo));
      const right=Math.min(canvas.width,Math.ceil(cx+halo)),top=Math.min(canvas.height,Math.ceil(cy+halo));
      gl.enable(gl.SCISSOR_TEST);gl.scissor(left,bottom,Math.max(0,right-left),Math.max(0,top-bottom));
      gl.drawArrays(gl.TRIANGLES, 0, 6);gl.disable(gl.SCISSOR_TEST);
    },
    destroy() {
      gl.deleteTexture(texture);
      gl.deleteTexture(interiorTexture);
      gl.deleteBuffer(buffer);
      shaders.forEach(shader => gl.deleteShader(shader));
      gl.deleteProgram(program);
      textCanvas.width = textCanvas.height = 1;
      interiorCanvas.width = interiorCanvas.height = 1;
      canvas.width = canvas.height = 1;
    },
  };
}
