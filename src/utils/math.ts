const normalizeAngle = (angle: number) => {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
};

export const lerpAngle = (start: number, end: number, t: number) => {
  start = normalizeAngle(start);
  end = normalizeAngle(end);

  if (Math.abs(end - start) > Math.PI) {
    if (end > start) {
      start += 2 * Math.PI;
    } else {
      end += 2 * Math.PI;
    }
  }

  return normalizeAngle(start + (end - start) * t);
};

export const PI_2 = Math.PI * 2;

// 각도 전용 SmoothDamp (최단 거리로 회전)
export function smoothDampAngle(
  current: number,
  target: number,
  currentVelocity: { value: number }, // 속도를 참조(Ref)로 받아야 해서 객체 사용
  smoothTime: number, // 목표까지 걸리는 대략적인 시간 (작을수록 빠름)
  maxSpeed: number, // 최대 회전 속도 제한
  deltaTime: number
): number {
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;

  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  let change = current - target;

  // 각도 보정 (-PI ~ PI 사이로 맞춤)
  while (change > Math.PI) change -= PI_2;
  while (change < -Math.PI) change += PI_2;

  const originalTo = target;

  // 최대 속도 제한 (너무 획 돌아가는 것 방지)
  const maxChange = maxSpeed * smoothTime;
  change = Math.min(Math.max(change, -maxChange), maxChange);

  target = current - change;

  const temp = (currentVelocity.value + omega * change) * deltaTime;
  currentVelocity.value = (currentVelocity.value - omega * temp) * exp;

  let output = target + (change + temp) * exp;

  // 오버슈팅 방지 (목표점을 지나치지 않게)
  if (originalTo - current > 0.0 === output > originalTo) {
    output = originalTo;
    currentVelocity.value = (output - originalTo) / deltaTime;
  }

  return output;
}
