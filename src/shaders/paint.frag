varying vec3 vLocalPos;
uniform vec3 uBrushPos;
uniform float uRadius;
uniform vec3 uColor;

void main() {
  float d = distance(vLocalPos, uBrushPos);
  
  float mask = 1.0 - smoothstep(uRadius * 0.6, uRadius, d);
  if (mask <= 0.0) discard;

  gl_FragColor = vec4(uColor, mask);
}
