// components/DaumPostcode.tsx
import React from 'react';
import { Alert, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

// 다음 우편번호 API 반환 데이터 타입 정의
export type DaumPostcodeData = {
  address: string;
  addressEnglish: string;
  addressType: 'R' | 'J';
  apartment: string;
  autoJibunAddress: string;
  autoJibunAddressEnglish: string;
  autoRoadAddress: string;
  autoRoadAddressEnglish: string;
  bcode: string;
  bname: string;
  bname1: string;
  bname1English: string;
  bname2: string;
  bname2English: string;
  bnameEnglish: string;
  buildingCode: string;
  buildingName: string;
  hname: string;
  jibunAddress: string;
  jibunAddressEnglish: string;
  noSelected: 'Y' | 'N';
  postcode: string;
  postcode1: string;
  postcode2: string;
  postcodeSeq: string;
  query: string;
  roadAddress: string;
  roadAddressEnglish: string;
  roadname: string;
  roadnameCode: string;
  roadnameEnglish: string;
  sido: string;
  sidoEnglish: string;
  sigungu: string;
  sigunguCode: string;
  sigunguEnglish: string;
  userLanguageType: 'K' | 'E';
  userSelectedType: 'R' | 'J';
  zonecode: string;
};

interface DaumPostcodeProps {
  onSubmit: (data: DaumPostcodeData) => void;
  onClose?: () => void;
}

const DaumPostcode: React.FC<DaumPostcodeProps> = ({ onSubmit, onClose }) => {
  // HTML 템플릿 - 다음 우편번호 API 포함
  const postcodeHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
      <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';">
      <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" async defer></script>
      <style>
        body, html { 
          width: 100%; 
          height: 100%; 
          margin: 0; 
          padding: 0; 
          overflow: hidden;
        }
        #container { 
          width: 100%; 
          height: 100%; 
        }
        .loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 16px;
          color: #666;
          text-align: center;
          z-index: 1000;
        }
        .error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 14px;
          color: #e74c3c;
          text-align: center;
          padding: 20px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          max-width: 300px;
          z-index: 1000;
        }
      </style>
    </head>
    <body>
      <div id="loading" class="loading">주소 검색을 불러오는 중...</div>
      <div id="error" class="error" style="display: none;">
        주소 검색 서비스를 불러올 수 없습니다.<br>
        네트워크 연결을 확인해주세요.
      </div>
      <div id="container"></div>
      
      <script>
        // 로딩 상태 관리
        function showLoading() {
          document.getElementById('loading').style.display = 'block';
          document.getElementById('error').style.display = 'none';
        }
        
        function hideLoading() {
          document.getElementById('loading').style.display = 'none';
        }
        
        function showError(message) {
          document.getElementById('loading').style.display = 'none';
          document.getElementById('error').style.display = 'block';
          document.getElementById('error').innerHTML = message || '주소 검색 서비스를 불러올 수 없습니다.';
          
          // React Native에 에러 알림
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ERROR',
              message: message || '주소 검색 서비스 로딩 실패'
            }));
          }
        }
        
        // 다음 우편번호 API 초기화 (재시도 로직 포함)
        function initDaumPostcode(retryCount = 0) {
          try {
            if (!window.daum || !window.daum.Postcode) {
              // API가 아직 로드되지 않은 경우 재시도
              if (retryCount < 10) {
                setTimeout(function() {
                  initDaumPostcode(retryCount + 1);
                }, 200);
                return;
              }
              throw new Error('다음 우편번호 API가 로드되지 않았습니다.');
            }

            new window.daum.Postcode({
              oncomplete: function(data) {
                try {
                  hideLoading();
                  
                  // React Native로 주소 데이터 전송
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'ADDRESS_SELECTED',
                      data: data
                    }));
                  }
                } catch (error) {
                  console.error('주소 선택 처리 오류:', error);
                  showError('주소 선택 중 오류가 발생했습니다.');
                }
              },
              onresize: function(size) {
                // 크기 조정 처리
              },
              onclose: function(state) {
                // 닫기 버튼 클릭 시
                if (state === 'FORCE_CLOSE') {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'CLOSE_REQUESTED'
                    }));
                  }
                }
              },
              width: '100%',
              height: '100%',
              animation: true,
              hideMapBtn: true,
              hideEngBtn: true,
              autoMapping: true
            }).embed(document.getElementById('container'));
            
            // 로딩 완료 후 로딩 메시지 숨기기
            setTimeout(() => {
              hideLoading();
              
              // React Native에 로딩 완료 알림
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'LOADED'
                }));
              }
            }, 500);
            
          } catch (error) {
            console.error('다음 우편번호 API 초기화 오류:', error);
            showError('주소 검색 기능을 초기화할 수 없습니다.');
          }
        }
        
        // DOM 로드 완료 후 초기화
        window.addEventListener('DOMContentLoaded', function() {
          showLoading();
          
          // React Native에 로딩 시작 알림
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'LOADING_START'
            }));
          }
          
          // 다음 API 로딩 대기 후 초기화 (재시도 로직으로 안전하게 처리)
          setTimeout(function() { initDaumPostcode(0); }, 300);
        });

        // 즉시 실행 (fallback)
        if (document.readyState === 'loading') {
          // DOM이 아직 로딩 중
        } else {
          // DOM이 이미 로드됨
          setTimeout(function() { initDaumPostcode(0); }, 300);
        }
      </script>
    </body>
    </html>
  `;

  // WebView 메시지 처리
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('WebView 메시지:', message);
      
      switch (message.type) {
        case 'LOADING_START':
          console.log('🔄 주소 검색 로딩 시작');
          break;
          
        case 'LOADED':
          console.log('✅ 주소 검색 로딩 완료');
          break;
          
        case 'ADDRESS_SELECTED':
          console.log('✅ 주소 선택 완료:', message.data);
          onSubmit(message.data);
          break;
          
        case 'ERROR':
          console.error('❌ 주소 검색 오류:', message.message);
          Alert.alert(
            '주소 검색 오류',
            message.message || '주소 검색 중 오류가 발생했습니다.',
            [
              { text: '확인', onPress: onClose }
            ]
          );
          break;
          
        case 'CLOSE_REQUESTED':
          console.log('🚪 주소 검색 닫기 요청');
          onClose?.();
          break;
          
        default:
          console.log('알 수 없는 메시지 타입:', message.type);
          // 기존 방식 호환성을 위한 처리
          if (message.zonecode || message.address) {
            onSubmit(message);
          }
      }
    } catch (error) {
      console.error('WebView 메시지 파싱 오류:', error);
      // 기존 방식 호환성을 위한 처리
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.zonecode || data.address) {
          onSubmit(data);
        }
      } catch (legacyError) {
        console.error('레거시 메시지 처리 오류:', legacyError);
        Alert.alert('오류', '주소 선택 중 오류가 발생했습니다.');
      }
    }
  };

  // WebView 에러 처리
  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('❌ WebView 네트워크 오류:', nativeEvent);
    
    Alert.alert(
      '네트워크 오류',
      '주소 검색 서비스에 연결할 수 없습니다.\n인터넷 연결을 확인해주세요.',
      [
        { text: '확인', onPress: onClose }
      ]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{
          html: postcodeHTML,
          baseUrl: 'https://postcode.map.daum.net',
        }}
        onMessage={handleMessage}
        onError={handleWebViewError}
        onHttpError={handleWebViewError}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        bounces={false}
        scrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        // 보안 및 호환성 설정
        originWhitelist={['*']}
        allowsFullscreenVideo={false}
        allowsBackForwardNavigationGestures={false}
        cacheEnabled={true}
        incognito={false}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        style={{ flex: 1 }}
      />
    </View>
  );
};

export default DaumPostcode;