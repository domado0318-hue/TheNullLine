export function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name}: 0보다 큰 유한수가 필요합니다.`);
}

export function assertNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name}: 0 이상의 유한수가 필요합니다.`);
}

export function assertInteger(name: string, value: number, minimum = 0): void {
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`${name}: ${minimum} 이상의 안전한 정수가 필요합니다.`);
}
