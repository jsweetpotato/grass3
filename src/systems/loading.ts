import type { LoadingManager } from "three/webgpu";

const HOLD_MS = 400;

let paths: SVGPathElement[] = [];
let lens: number[] = [];
let total = 0;
let wobbleId = 0;

function drawLetters(pr: number) {
  let left = total * pr;
  paths.forEach((path, i) => {
    path.style.strokeDashoffset = String(lens[i] - Math.max(0, Math.min(lens[i], left)));
    left -= lens[i];
  });
}

function startWobble() {
  const turb = document.querySelector("#wob feTurbulence");
  if (!turb) return;
  let seed = 1;
  // ponytail: SMIL은 메인스레드 로드 중 자주 멈춤 → interval로 seed 갱신
  clearInterval(wobbleId);
  wobbleId = window.setInterval(() => {
    seed = seed >= 18 ? 1 : seed + 1;
    turb.setAttribute("seed", String(seed));
  }, 45);
}

function stopWobble() {
  clearInterval(wobbleId);
  wobbleId = 0;
}

function reveal() {
  const loading = document.querySelector("#loading") as HTMLElement | null;
  const art = document.querySelector("#art");
  if (!loading || !art) return;

  loading.classList.add("reveal");
  art.addEventListener(
    "transitionend",
    (e) => {
      if ((e as TransitionEvent).propertyName === "opacity") {
        stopWobble();
        loading.style.display = "none";
      }
    },
    { once: true }
  );
}

/** LoadSystem 생성 시 1회 호출 */
export function bindLoading(manager: LoadingManager) {
  paths = [...document.querySelectorAll<SVGPathElement>("#letters path")];
  lens = paths.map((p) => p.getTotalLength());
  total = lens.reduce((a, b) => a + b, 0);

  paths.forEach((p, i) => {
    p.style.strokeDasharray = p.style.strokeDashoffset = String(lens[i]);
  });

  startWobble();

  manager.onProgress = (_, loaded, totalCount) => {
    drawLetters((loaded / totalCount) * 0.9);
  };
}

/** scene:ready 에서 호출 */
export function finishLoading() {
  drawLetters(1);
  setTimeout(reveal, HOLD_MS);
}
