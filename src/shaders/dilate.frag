uniform sampler2D uTex;
uniform vec2 uTexel;
varying vec2 vUv;

void main() {
  vec4 c = texture2D(uTex, vUv);

  if (c.a > 0.0) {
    gl_FragColor = c;
    return;
  }

  vec3 sum = vec3(0.0);
  float weight = 0.0;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec4 s = texture2D(uTex, vUv + vec2(float(x), float(y)) * uTexel);
      sum += s.rgb * s.a;
      weight += s.a;
    }
  }

  gl_FragColor = weight > 0.0 ? vec4(sum / weight, 1.0) : c;
}
