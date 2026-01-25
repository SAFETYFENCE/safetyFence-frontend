/**
 * WebSocket 실시간 위치 공유 서비스
 * - STOMP over WebSocket (순수 WebSocket)
 * - 위치 전송: /app/location
 * - 위치 구독: /topic/location/{targetUserNumber}
 */

import Global from '@/constants/Global';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
// import SockJS from 'sockjs-client'; // React Native에서는 순수 WebSocket 사용

export interface LocationData {
  latitude: number;
  longitude: number;
  timestamp?: number;
  batteryLevel?: number;
}

export interface ReceivedLocationData extends LocationData {
  userNumber: string;
}

type LocationCallback = (location: ReceivedLocationData) => void;
type ConnectionCallback = (connected: boolean) => void;

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private locationCallbacks: Map<string, LocationCallback> = new Map();
  private connectionCallback: ConnectionCallback | null = null;
  private userNumber: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private _isConnected = false;  // 연결 상태 플래그
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;  // 재연결 타이머 (누수 방지)

  /**
   * WebSocket 연결
   * @param userNumber 현재 사용자 전화번호
   * @param onConnectionChange 연결 상태 변경 콜백
   */
  connect(userNumber: string, onConnectionChange?: ConnectionCallback): void {
    if (this.client?.connected) {
      console.log('WebSocket 이미 연결되어 있음');
      return;
    }

    this.userNumber = userNumber;
    this.connectionCallback = onConnectionChange || null;

    try {
      // HTTP URL을 WebSocket URL로 변환 (http:// → ws://, https:// → wss://)
      const wsUrl = Global.URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws';
      console.log('WebSocket 연결 시도:', wsUrl);

      // STOMP 클라이언트 생성 (순수 WebSocket 사용)
      this.client = new Client({
        webSocketFactory: () => {
          console.log('[WS DEBUG] 네이티브 WebSocket 생성:', wsUrl);
          const socket = new WebSocket(wsUrl, ['v12.stomp', 'v11.stomp', 'v10.stomp']);
          (socket as any).binaryType = 'arraybuffer';

          const originalSend = socket.send.bind(socket);

          const wrapAndSend = (data: any) => {
            if (typeof data === 'string') {
              if (data === '\n' || data === '\r\n' || data.length <= 2) {
                console.log('[WS DEBUG] 네이티브 WebSocket heartbeat LF 전송');
                return originalSend(data);
              }
              const encoder = new TextEncoder();
              const textBytes = encoder.encode(data);
              const alreadyTerminated = textBytes.length > 0 && textBytes[textBytes.length - 1] === 0;
              const bufferLength = alreadyTerminated ? textBytes.length : textBytes.length + 1;
              const frameBytes = new Uint8Array(bufferLength);
              frameBytes.set(textBytes);
              if (!alreadyTerminated) {
                frameBytes[textBytes.length] = 0;
              }
              return originalSend(frameBytes.buffer);
            }

            if (data instanceof ArrayBuffer) {
              const view = new Uint8Array(data);
              console.log('[WS DEBUG] 네이티브 WebSocket send binary bytes', Array.from(view.slice(0, 120)));
              return originalSend(view.buffer);
            }

            if (ArrayBuffer.isView(data)) {
              const view = data instanceof Uint8Array ? data : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
              console.log('[WS DEBUG] 네이티브 WebSocket send arraybuffer view bytes', Array.from(view.slice(0, 120)));
              return originalSend(view.buffer);
            }

            return originalSend(data);
          };

          (socket as any).send = (data: any) => wrapAndSend(data);

          const attachListener = (eventName: string, handler: (...args: any[]) => void) => {
            if (typeof (socket as any).addEventListener === 'function') {
              (socket as any).addEventListener(eventName, handler);
            } else {
              const prop = `on${eventName}` as keyof WebSocket;
              const originalHandler = (socket as any)[prop];
              (socket as any)[prop] = (...args: any[]) => {
                handler(...args);
                if (typeof originalHandler === 'function') {
                  originalHandler(...args);
                }
              };
            }
          };

          attachListener('open', () => {
            console.log('[WS DEBUG] 네이티브 WebSocket open');
          });

          attachListener('close', (event: any) => {
            console.log('[WS DEBUG] 네이티브 WebSocket close', {
              code: event?.code,
              reason: event?.reason,
              wasClean: event?.wasClean,
            });
          });

          attachListener('error', (event: any) => {
            console.log('[WS DEBUG] 네이티브 WebSocket error', event);
          });

          attachListener('message', (event: any) => {
            const payloadPreview = typeof event?.data === 'string' ? event.data.slice(0, 120) : '[binary]';
            console.log('[WS DEBUG] 네이티브 WebSocket message 수신', payloadPreview);
          });

          return socket;
        },
        connectHeaders: {
          userNumber: userNumber,
          'X-API-Key': Global.API_KEY,
        },
        // Heartbeat 설정: 백그라운드에서도 연결 유지
        heartbeatIncoming: 10000, // 서버로부터 10초마다 heartbeat 수신
        heartbeatOutgoing: 10000, // 서버로 10초마다 heartbeat 전송
        debug: (str) => {
          console.log('STOMP:', str);
        },
        onConnect: () => {
          console.log('✅ WebSocket 연결 성공');
          this._isConnected = true;  // 연결 상태 업데이트
          this.reconnectAttempts = 0;

          // 재연결 시 기존 구독 정보 초기화 (새 클라이언트이므로 이전 구독은 무효)
          this.subscriptions.clear();
          this.locationCallbacks.clear();
          console.log('🔄 구독 정보 초기화 (재연결)');

          this.connectionCallback?.(true);
        },
        onDisconnect: () => {
          console.log('❌ WebSocket 연결 해제');
          this._isConnected = false;  // 연결 상태 업데이트
          this.connectionCallback?.(false);

          // 기존 재연결 타이머 정리 (중복 방지)
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }

          // 자동 재연결
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null;
              this.connect(this.userNumber, this.connectionCallback || undefined);
            }, this.reconnectDelay);
          }
        },
        onStompError: (frame) => {
          // console.warn 사용 (console.error는 Expo Dev에서 빨간 에러 화면 트리거)
          console.warn('⚠️ STOMP 에러:', frame.headers['message']);
          console.warn('에러 상세:', frame.body);
          this.connectionCallback?.(false);
        },
        onWebSocketError: (event) => {
          // console.warn 사용 (console.error는 Expo Dev에서 빨간 에러 화면 트리거)
          console.warn('⚠️ WebSocket 에러:', event?.type || 'unknown');
          this.connectionCallback?.(false);
        },
        onWebSocketClose: (event) => {
          console.info('🔌 WebSocket close 이벤트 발생', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          });
        },
        onUnhandledMessage: (message) => {
          console.log('📨 처리되지 않은 STOMP MESSAGE', message);
        },
        onUnhandledFrame: (frame) => {
          console.log('📨 처리되지 않은 STOMP FRAME', frame);
        },
        onUnhandledReceipt: (frame) => {
          console.log('📨 처리되지 않은 STOMP RECEIPT', frame);
        },
      });

      this.client.activate();
    } catch (error) {
      console.error('WebSocket 연결 실패:', error);
      this.connectionCallback?.(false);
    }
  }

  /**
   * WebSocket 연결 해제
   */
  async disconnect(): Promise<void> {
    // 재연결 타이머 취소 (가장 먼저 실행 - 타이머 누수 방지)
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      console.log('🔄 재연결 타이머 취소됨');
    }

    if (this.client) {
      console.log('WebSocket 연결 해제 중...');

      // 모든 구독 해제
      this.subscriptions.forEach((subscription) => {
        subscription.unsubscribe();
      });
      this.subscriptions.clear();
      this.locationCallbacks.clear();

      // 연결 상태 업데이트
      this._isConnected = false;

      // 재연결 시도 횟수 리셋 (다음 connect 시 새로 시작)
      this.reconnectAttempts = 0;

      // 클라이언트 비활성화 (await 추가)
      await this.client.deactivate();
      this.client = null;
      this.connectionCallback?.(false);

    }
  }

  /**
   * 내 위치 전송
   * @param location 위도, 경도 정보
   */
  sendLocation(location: LocationData): void {
    if (!this.client?.connected) {
      console.warn('WebSocket이 연결되지 않음 - 위치 전송 불가');
      return;
    }

    try {
      const locationData = {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp || Date.now(),
        ...(location.batteryLevel !== undefined && { batteryLevel: location.batteryLevel }),
      };

      this.client.publish({
        destination: '/app/location',
        body: JSON.stringify(locationData),
      });

      console.log('📍 위치 전송:', locationData);
    } catch (error) {
      console.error('위치 전송 실패:', error);
    }
  }

  /**
   * 특정 사용자 위치 구독 (보호자가 이용자 위치 구독)
   * @param targetUserNumber 구독할 대상 사용자 전화번호
   * @param callback 위치 업데이트 콜백
   */
  subscribeToUserLocation(targetUserNumber: string, callback: LocationCallback): void {
    if (!this.client?.connected) {
      console.warn('WebSocket이 연결되지 않음 - 구독 불가');
      return;
    }

    // 이미 구독 중인지 확인
    if (this.subscriptions.has(targetUserNumber)) {
      console.log(`이미 ${targetUserNumber}의 위치를 구독 중`);
      return;
    }

    try {

      const destination = `/topic/location/${targetUserNumber}`;

      const subscription = this.client.subscribe(destination, (message: IMessage) => {
        try {
          const locationData: ReceivedLocationData = JSON.parse(message.body);
          console.log(`📍 ${targetUserNumber} 위치 수신:`, locationData);
          callback(locationData);
        } catch (error) {
          console.error('위치 데이터 파싱 실패:', error);
        }
      });

      this.subscriptions.set(targetUserNumber, subscription);
      this.locationCallbacks.set(targetUserNumber, callback);
      console.log(`✅ ${targetUserNumber}의 위치 구독 시작`);
    } catch (error) {
      console.error('위치 구독 실패:', error);
    }
  }

  /**
   * 특정 사용자 위치 구독 해제
   * @param targetUserNumber 구독 해제할 대상 사용자 전화번호
   */
  unsubscribeFromUserLocation(targetUserNumber: string): void {
    const subscription = this.subscriptions.get(targetUserNumber);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(targetUserNumber);
      this.locationCallbacks.delete(targetUserNumber);
      console.log(`❌ ${targetUserNumber}의 위치 구독 해제`);
    }
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.client?.connected || false;
  }

  /**
   * 현재 구독 중인 사용자 목록
   */
  getSubscribedUsers(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// 싱글톤 인스턴스
export const websocketService = new WebSocketService();
