type EventCallback = (...args: any[]) => void;

export class EventBus {
  // 이벤트 이름을 키로, 콜백 함수 배열을 값으로 저장
  private events = new Map<string, EventCallback[]>();
  //           ↓ 예시
  // {
  //   'fishing:spot:enter': [함수1, 함수2],
  //   'player:died': [함수3],
  //   'cooking:complete': [함수4, 함수5, 함수6]
  // }

  // 이벤트 구독 (등록)"
  on(event: string, callback: EventCallback) {
    // 해당 이벤트가 처음이면 빈 배열 생성
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    // 콜백 함수를 배열에 추가
    this.events.get(event)!.push(callback);
  }

  //  이벤트 발생 (발행)"
  emit(event: string, ...args: any[]) {
    // 해당 이벤트에 등록된 모든 콜백 함수 찾기
    const callbacks = this.events.get(event);

    if (callbacks) {
      // 등록된 모든 함수를 순서대로 실행
      callbacks.forEach((cb) => cb(...args));
    }
  }

  // 구독 취소"
  off(event: string, callback: EventCallback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

export const eventBus = new EventBus();
