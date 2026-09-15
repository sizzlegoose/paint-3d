uniform sampler2D uMask;
uniform vec3 uColor;
varying vec2 vUv;

void main() {
  if (texture2D(uMask, vUv).r < 0.5) discard;
  gl_FragColor = vec4(uColor, 1.0);
}
