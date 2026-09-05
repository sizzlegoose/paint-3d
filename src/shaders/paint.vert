varying vec3 vLocalPos;

void main() {
  vLocalPos = position;
  gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
}