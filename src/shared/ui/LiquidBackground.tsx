import { useEffect, useRef } from "react"

const vertexShader = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragmentShader = `
precision highp float;

uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotation = mat2(0.82, -0.57, 0.57, 0.82);
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = rotation * p * 1.92 + 7.3;
    amplitude *= 0.46;
  }
  return value;
}

float silkSurface(vec2 p, vec2 mouse, float t) {
  vec2 flow = vec2(t * 0.025, -t * 0.018);
  vec2 warp = vec2(
    fbm(p * 0.52 + flow),
    fbm(p * 0.48 - flow + 4.7)
  ) - 0.5;
  vec2 silk = p + warp * 1.45;
  float broad = fbm(silk * 0.58 + vec2(t * 0.018, t * 0.012));
  float foldA = sin(silk.x * 2.15 + silk.y * 0.72 + t * 0.13) * 0.16;
  float foldB = cos(silk.y * 2.0 - silk.x * 0.48 - t * 0.105) * 0.13;
  float foldC = sin((silk.x + silk.y) * 1.18 + t * 0.075) * 0.08;
  float distanceToMouse = length(p - mouse);
  float cursorWave = sin(distanceToMouse * 13.0 - t * 1.15) * exp(-distanceToMouse * 3.7) * 0.055;
  float cursorLens = exp(-distanceToMouse * distanceToMouse * 3.1) * 0.075;
  return broad * 0.74 + foldA + foldB + foldC + cursorWave + cursorLens;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
  vec2 mouse = (uMouse * 2.0 - 1.0) * vec2(uResolution.x / uResolution.y, 1.0);
  float h = silkSurface(p, mouse, uTime);
  float epsilon = 0.009;
  float hx = silkSurface(p + vec2(epsilon, 0.0), mouse, uTime);
  float hy = silkSurface(p + vec2(0.0, epsilon), mouse, uTime);
  vec3 normal = normalize(vec3((h - hx) * 6.2, (h - hy) * 6.2, epsilon * 1.6));

  vec3 lightPosition = normalize(vec3(-0.48 + mouse.x * 0.16, 0.58 + mouse.y * 0.12, 0.92));
  vec3 secondaryLight = normalize(vec3(0.72 - mouse.x * 0.1, -0.22, 0.64));
  float diffuse = max(dot(normal, lightPosition), 0.0);
  float softLight = max(dot(normal, secondaryLight), 0.0);
  float specular = pow(max(dot(reflect(-lightPosition, normal), vec3(0.0, 0.0, 1.0)), 0.0), 34.0);
  float broadSpecular = pow(max(dot(reflect(-secondaryLight, normal), vec3(0.0, 0.0, 1.0)), 0.0), 9.0);
  float fresnel = pow(1.0 - max(normal.z, 0.0), 2.8);

  vec3 graphite = vec3(0.018, 0.017, 0.025);
  vec3 metal = vec3(0.095, 0.086, 0.115);
  vec3 deepPurple = vec3(0.155, 0.018, 0.29);
  vec3 violet = vec3(0.39, 0.055, 0.68);
  vec3 neonWhite = vec3(0.84, 0.78, 0.96);

  float meshA = smoothstep(-0.12, 0.68, h + sin(p.x * 0.7 - p.y * 0.42 + uTime * 0.035) * 0.16);
  float meshB = smoothstep(0.32, 0.82, h - p.x * 0.055 + cos(p.y * 0.62) * 0.1);
  float graphiteBand = smoothstep(0.43, 0.74, abs(h - 0.34));
  vec3 color = mix(graphite, deepPurple, meshA * 0.83);
  color = mix(color, violet, meshB * 0.58);
  color = mix(color, metal, graphiteBand * 0.27);
  color += vec3(0.21, 0.13, 0.29) * diffuse * 0.34;
  color += vec3(0.16, 0.13, 0.22) * softLight * 0.18;
  color += neonWhite * specular * 0.72;
  color += vec3(0.43, 0.30, 0.58) * broadSpecular * 0.22;
  color += vec3(0.16, 0.08, 0.22) * fresnel * 0.22;

  float cursorGlow = exp(-dot(p - mouse, p - mouse) * 3.4);
  color += vec3(0.30, 0.16, 0.48) * cursorGlow * 0.09;
  float vignette = smoothstep(1.48, 0.32, length(p * vec2(0.66, 0.84)));
  color *= mix(0.28, 1.0, vignette);
  color *= 0.78 + 0.22 * smoothstep(0.02, 0.72, 1.0 - uv.x);
  gl_FragColor = vec4(color, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export default function LiquidBackground({
  interactive = true,
  className = "",
}: {
  interactive?: boolean
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    })
    if (!canvas || !gl) return

    const vertex = compile(gl, gl.VERTEX_SHADER, vertexShader)
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentShader)
    const program = gl.createProgram()
    if (!vertex || !fragment || !program) return
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )
    const position = gl.getAttribLocation(program, "position")
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const resolution = gl.getUniformLocation(program, "uResolution")
    const mouseUniform = gl.getUniformLocation(program, "uMouse")
    const timeUniform = gl.getUniformLocation(program, "uTime")
    const pointer = { x: 0.34, y: 0.58, targetX: 0.34, targetY: 0.58 }
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    let frame = 0

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const width = Math.round(canvas!.clientWidth * dpr)
      const height = Math.round(canvas!.clientHeight * dpr)
      if (canvas!.width !== width || canvas!.height !== height) {
        canvas!.width = width
        canvas!.height = height
        gl!.viewport(0, 0, width, height)
      }
    }

    function move(e: PointerEvent) {
      pointer.targetX = e.clientX / window.innerWidth
      pointer.targetY = 1 - e.clientY / window.innerHeight
    }

    const start = performance.now()
    function render(now: number) {
      resize()
      pointer.x += (pointer.targetX - pointer.x) * 0.055
      pointer.y += (pointer.targetY - pointer.y) * 0.055
      gl!.uniform2f(resolution, canvas!.width, canvas!.height)
      gl!.uniform2f(mouseUniform, pointer.x, pointer.y)
      gl!.uniform1f(timeUniform, reducedMotion ? 0 : (now - start) / 1000)
      gl!.drawArrays(gl!.TRIANGLES, 0, 3)
      if (!reducedMotion) frame = requestAnimationFrame(render)
    }

    if (interactive)
      window.addEventListener("pointermove", move, { passive: true })
    window.addEventListener("resize", resize)
    frame = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(frame)
      if (interactive) window.removeEventListener("pointermove", move)
      window.removeEventListener("resize", resize)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      gl.deleteBuffer(buffer)
    }
  }, [interactive])

  return (
    <canvas
      ref={canvasRef}
      className={`original-login__liquid ${className}`}
      aria-hidden="true"
    />
  )
}
