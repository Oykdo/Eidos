varying vec2 vUv;

uniform vec3 uMetal;
uniform vec4 uP0;
uniform vec4 uP1;
uniform vec4 uP2;
uniform vec4 uP3;
uniform vec4 uP4;
uniform float uFamille;
uniform float uPhase;
uniform float uYaw;
uniform float uUsure;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamFwd;
uniform float uFov;
uniform float uAspect;
uniform vec2 uRes;
uniform float uAA;

#define twist     uP0.x
#define graisse   uP0.y
#define coupe     uP0.z
#define nidsU     uP0.w
#define grain     uP1.x
#define orbite    uP1.y
#define fuseau    uP1.z
#define facette   uP1.w
#define halo      uP2.x
#define strie     uP2.y
#define azimuth   uP2.z
#define lean      uP2.w
#define creux     uP3.x
#define anneau    uP3.y
#define pic       uP3.z
#define echelle   uP3.w
#define densite   uP4.x
#define sel       uP4.y
#define mercure   uP4.z
#define soufre    uP4.w

const float PI = 3.14159265359;
const vec3 FOND = vec3(0.0706, 0.0824, 0.1020);
const vec3 L1D = vec3(0.359, 0.807, 0.448);
const vec3 L1C = vec3(0.867, 0.882, 0.902);
const vec3 L2D = vec3(-0.546, 0.364, -0.728);
const vec3 L2C = vec3(0.788, 0.635, 0.153);

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float hash13(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

vec3 hash33(vec3 p) {
  return vec3(hash13(p), hash13(p + 17.13), hash13(p + 31.71)) * 2.0 - 1.0;
}

float gnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(dot(hash33(i + vec3(0, 0, 0)), f - vec3(0, 0, 0)),
          dot(hash33(i + vec3(1, 0, 0)), f - vec3(1, 0, 0)), u.x),
      mix(dot(hash33(i + vec3(0, 1, 0)), f - vec3(0, 1, 0)),
          dot(hash33(i + vec3(1, 1, 0)), f - vec3(1, 1, 0)), u.x),
      u.y),
    mix(
      mix(dot(hash33(i + vec3(0, 0, 1)), f - vec3(0, 0, 1)),
          dot(hash33(i + vec3(1, 0, 1)), f - vec3(1, 0, 1)), u.x),
      mix(dot(hash33(i + vec3(0, 1, 1)), f - vec3(0, 1, 1)),
          dot(hash33(i + vec3(1, 1, 1)), f - vec3(1, 1, 1)), u.x),
      u.y),
    u.z);
}

float sdSphere(vec3 p, float r) { return length(p) - r; }

float sdTorus(vec3 p, float R, float r) {
  return length(vec2(length(p.xz) - R, p.y)) - r;
}

float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

float sdHelix(vec3 p, float radius, float tube, float pitch) {
  float ang = atan(p.z, p.x);
  float y = p.y - (ang / 6.28318530718) * pitch;
  float h = y - pitch * floor(y / pitch + 0.5);
  float radial = length(p.xz) - radius;
  return length(vec2(radial, h)) - tube;
}

float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

vec3 twistY(vec3 p, float k) {
  float a = p.y * k;
  float c = cos(a), s = sin(a);
  return vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
}

float shape(vec3 p) {
  float fat = 0.08 + 0.14 * graisse * (0.4 + 0.6 * sel);
  float cut = 0.06 + 0.22 * coupe * (0.3 + 0.7 * soufre);
  float d;
  int fam = int(uFamille + 0.5);

  if (fam == 0) {
    d = sdSphere(p - vec3(0.0, 0.55, 0.0), 0.16 + fat * 0.6);
    d = smin(d, sdSphere(p, 0.26 + fat), 0.08);
    d = smin(d, sdSphere(p - vec3(0.0, -0.5, 0.0), 0.2 + fat * 0.5), 0.08);
  } else if (fam == 1) {
    d = sdTorus(p, 0.42 + 0.14 * anneau, 0.07 + fat * 0.5);
    d = smin(d, sdSphere(p, 0.2 + fat * 0.4), 0.05);
    d = smin(d, sdTorus(p.xzy, 0.3 + 0.08 * anneau, 0.03), 0.04);
  } else if (fam == 2) {
    vec3 q = vec3(p.x, p.y * (1.0 + 0.35 * fuseau), p.z);
    d = sdSphere(q, 0.46 + fat);
    d = max(d, -sdSphere(p - vec3(0.32 + 0.18 * orbite, 0.08, 0.0), 0.26 + cut));
  } else if (fam == 3) {
    d = sdRoundBox(p, vec3(0.3), 0.07 * (1.0 - facette));
    d = max(d, -sdRoundBox(p, vec3(0.5, 0.07 + cut * 0.4, 0.07), 0.01));
    d = max(d, -sdRoundBox(p, vec3(0.07, 0.5, 0.07), 0.01));
  } else if (fam == 4) {
    d = sdSphere(p, 0.36 + fat * 0.4);
    d = smin(d, sdTorus(p, 0.48 + 0.1 * anneau, 0.035 + fat * 0.25), 0.1);
    d = smin(d, sdSphere(p - vec3(0.0, 0.5 + 0.12 * pic, 0.0), 0.08 + 0.05 * pic), 0.06);
  } else if (fam == 5) {
    d = sdSphere(p - vec3(0.2 + 0.08 * orbite, 0.0, 0.0), 0.3 + fat);
    d = smin(d, sdSphere(p + vec3(0.2 + 0.08 * orbite, 0.0, 0.0), 0.3 + fat), 0.12);
  } else if (fam == 6) {
    d = sdCapsule(p, vec3(0.0, -0.52, 0.0), vec3(0.0, 0.52, 0.0), 0.1 + fat * 0.7);
    d = smin(d, sdHelix(p, 0.22 + 0.08 * anneau, 0.04 + fat * 0.2, 0.26), 0.05);
    d = smin(d, sdSphere(p - vec3(0.24, 0.18, 0.0), 0.15 + fat * 0.4), 0.06);
    d = smin(d, sdSphere(p - vec3(-0.2, -0.16, 0.08), 0.13 + fat * 0.3), 0.06);
  } else if (fam == 7) {
    d = sdSphere(p, 0.44 + fat * 0.3);
    d = max(d, -sdSphere(p - vec3(0.26 + 0.14 * orbite, 0.06, 0.08), 0.38 + cut));
  } else {
    d = sdRoundBox(p - vec3(0.0, -0.22, 0.0), vec3(0.38, 0.16, 0.38), 0.07);
    d = smin(d, sdSphere(p - vec3(0.0, 0.18, 0.0), 0.26 + fat * 0.4), 0.1);
    d = max(d, -sdSphere(p - vec3(0.0, -0.05, 0.0), cut * 0.5));
  }

  int nids = int(nidsU * 6.0);
  float az = azimuth * 6.28318530718;
  for (int i = 0; i < 8; i++) {
    if (i >= nids) break;
    float a = (float(i) / float(nids)) * 6.28318530718 + az;
    vec3 c = vec3(cos(a) * (0.52 + 0.1 * orbite), sin(a) * 0.12, sin(a) * (0.52 + 0.1 * orbite));
    d = smin(d, sdSphere(p - c, 0.04 + fat * 0.2), 0.04);
  }

  if (creux > 0.45) {
    d = max(d, -sdSphere(p, 0.12 + 0.1 * creux));
  }
  d += strie * 0.012 * sin(p.y * 28.0 + az);
  d += grain * 0.008 * gnoise(p * (4.0 + 6.0 * strie));
  return d;
}

float map(vec3 p) {
  float rho = 1.0 + 0.18 * cos(uPhase);
  float s = rho * (0.72 + 0.3 * echelle);
  p.xz = rot(uYaw) * p.xz;
  p.xy = rot(lean * 0.35) * p.xy;
  vec3 q = p / s;
  float k = twist * (0.35 + 1.4 * mercure);
  return shape(twistY(q, k));
}

float march(vec3 ro, vec3 rd, out float tHit) {
  float t = 0.0;
  for (int i = 0; i < 64; i++) {
    float h = map(ro + rd * t);
    if (h < 0.0012) {
      tHit = t;
      return 1.0;
    }
    if (t > 10.0) break;
    t += h;
  }
  tHit = t;
  return 0.0;
}

vec3 calcNormal(vec3 p) {
  const float e = 0.0016;
  vec2 h = vec2(e, 0.0);
  return normalize(vec3(
    map(p + h.xyy) - map(p - h.xyy),
    map(p + h.yxy) - map(p - h.yxy),
    map(p + h.yyx) - map(p - h.yyx)
  ));
}

float shadow(vec3 ro, vec3 rd) {
  float res = 1.0;
  float t = 0.02;
  for (int i = 0; i < 16; i++) {
    float h = map(ro + rd * t);
    res = min(res, 12.0 * h / t);
    t += clamp(h, 0.02, 0.18);
    if (res < 0.02 || t > 6.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

float ao(vec3 p, vec3 n) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.012 + 0.11 * float(i) / 4.0;
    float d = map(p + n * h);
    occ += (h - d) * sca;
    sca *= 0.84;
  }
  return clamp(1.0 - 1.6 * occ, 0.0, 1.0);
}

float D_GGX(float NoH, float r) {
  float a = r * r;
  float a2 = a * a;
  float d = (NoH * a2 - NoH) * NoH + 1.0;
  return a2 / (PI * d * d);
}

float G_Smith(float NoV, float NoL, float r) {
  float k = (r + 1.0) * (r + 1.0) / 8.0;
  float gV = NoV / (NoV * (1.0 - k) + k);
  float gL = NoL / (NoL * (1.0 - k) + k);
  return gV * gL;
}

vec3 shade(vec3 pos, vec3 rd) {
  vec3 n = calcNormal(pos);
  vec3 v = -rd;
  float occ = ao(pos, n);
  float rough = mix(0.18, 0.58, densite);
  vec3 albedo = uMetal * mix(0.55, 0.92, 1.0 - densite * 0.5);
  albedo *= mix(0.62, 1.0, occ);
  albedo *= 0.86 + 0.14 * gnoise(pos * 7.0 + 3.0 * grain);
  albedo *= mix(1.0, 0.74, uUsure);

  vec3 col = albedo * 0.34 * occ;
  float NoV = max(dot(n, v), 0.0);
  vec3 F0 = mix(vec3(0.04), uMetal, mix(0.55, 0.92, 1.0 - densite));

  for (int i = 0; i < 2; i++) {
    vec3 L = i == 0 ? L1D : L2D;
    vec3 Lc = i == 0 ? L1C * 0.85 : L2C * 0.38;
    float sh = i == 0 ? shadow(pos + n * 0.012, L) : mix(0.4, 1.0, occ);
    float NoL = max(dot(n, L), 0.0);
    vec3 h = normalize(L + v);
    float NoH = max(dot(n, h), 0.0);
    float VoH = max(dot(v, h), 0.0);
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - VoH, 5.0);
    float D = D_GGX(NoH, rough);
    float G = G_Smith(NoV, NoL, rough);
    vec3 spec = (D * G * F) / max(4.0 * NoV * NoL, 0.001);
    vec3 diff = (1.0 - F) * albedo / PI;
    col += (diff + spec) * Lc * NoL * sh;
  }

  float fres = pow(1.0 - NoV, 3.0);
  col += fres * mix(uMetal, L1C, 0.35) * 0.18;

  float thick = 0.0;
  vec3 q = pos + rd * 0.02;
  for (int i = 0; i < 8; i++) {
    float h = map(q);
    thick += abs(h);
    q += rd * max(abs(h), 0.02);
    if (h > 0.0 && i > 2) break;
  }
  vec3 absorb = exp(-uMetal * (0.7 + 2.2 * (1.0 - halo)) * thick);
  col += absorb * uMetal * 0.12 * halo;

  return col;
}

vec3 trace(vec2 uv) {
  vec2 ndc = uv * 2.0 - 1.0;
  float tanF = tan(uFov * 0.5);
  vec3 rd = normalize(uCamFwd + ndc.x * uCamRight * tanF * uAspect + ndc.y * uCamUp * tanF);
  vec3 ro = uCamPos;
  float tHit;
  float hit = march(ro, rd, tHit);
  if (hit < 0.5) {
    float glow = exp(-12.0 * abs(ndc.y + 0.35)) * 0.04;
    return FOND + uMetal * glow * 0.25;
  }
  vec3 pos = ro + rd * tHit;
  vec3 col = shade(pos, rd);
  float fog = 1.0 - exp(-0.018 * tHit * tHit);
  col = mix(col, FOND, fog * 0.35);
  col = col / (col + vec3(1.0));
  return col;
}

void main() {
  vec3 col = trace(vUv);
  if (uAA > 0.5) {
    vec2 px = 0.6 / max(uRes, vec2(1.0));
    vec3 acc = col;
    acc += trace(vUv + vec2(px.x, 0.0));
    acc += trace(vUv + vec2(0.0, px.y));
    acc += trace(vUv + vec2(-px.x, px.y * 0.5));
    col = acc * 0.25;
  }
  gl_FragColor = vec4(col, 1.0);
}
