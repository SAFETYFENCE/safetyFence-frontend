import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
interface Location {
  latitude: number;
  longitude: number;
}

interface Geofence {
  id: number;
  latitude: number;
  longitude: number;
  radius?: number;
  name: string;
  type: number; // 0: permanent, 1: temporary
}

interface KakaoMapProps {
  currentLocation: Location | null;
  targetLocation: Location | null;
  geofences: Geofence[];
  userRole: 'user' | 'supporter' | null;
  onGeofenceDelete?: (id: number, name: string) => void;
}

export interface KakaoMapHandle {
  moveToLocation: (lat: number, lng: number) => void;
}

const KAKAO_API_KEY = '3c1e1117852ac5d779b9ece25129a51b'; // JavaScript Key

const HTML_CONTENT = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';">
  <script>
    window.onerror = function(message, source, lineno, colno, error) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', payload: message + ' at ' + source + ':' + lineno }));
    };
  </script>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f0fdf4; }
    #map { width: 100%; height: 100%; background-color: #e5e7eb; } 
    .my-marker {
      width: 40px;
      height: 40px;
      background-color: #fc6868ff;
      /* border: 3px solid white; Removed border */
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .my-marker .icon {
      transform: rotate(45deg); /* Counter-rotate to make icon upright */
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .target-marker {
      width: 24px;
      height: 24px;
      background-color: #ef4444;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 5px rgba(0,0,0,0.3);
    }
    .customoverlay { 
      position: relative; 
      bottom: 25px; /* Reduced from 35px to bring closer */
      border-radius: 20px; 
      border: 2px solid #ffffff; 
      background: #22c55e; 
      float: left; 
      display: flex;
      align-items: center;
      padding: 5px 10px;
      box-shadow: 0px 2px 4px rgba(0,0,0,0.2);
    }
    .customoverlay:nth-of-type(n) { border: 2px solid #ffffff; }
    .customoverlay .icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 4px;
    }
    .customoverlay .title { 
      display: block; 
      text-align: center; 
      color: #ffffff; 
      font-size: 13px; 
      font-weight: bold; 
    }
    .customoverlay:after { 
      content: ''; 
      position: absolute; 
      margin-left: -5px; /* Adjusted for narrower width */
      left: 50%; 
      bottom: -10px; /* Adjusted for longer height */
      width: 0; 
      height: 0; 
      border-left: 5px solid transparent; /* Narrower */
      border-right: 5px solid transparent; /* Narrower */
      border-top: 10px solid #22c55e; /* Longer/Sharper */
    }
    .geofence-pin {
      width: 24px;
      height: 24px;
      background-color: #22c55e;
      border: 2px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
      position: relative;
    }
    .geofence-pin::after {
      content: '';
      width: 4px;
      height: 4px;
      background-color: white;
      border-radius: 50%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    /* Temporary Geofence Styles (Orange) */
    .customoverlay.temporary {
      background: #ffb37cff; /* Orange */
    }
    .customoverlay.temporary:after {
      border-top-color: #ffba88ff;
    }
    .geofence-pin.temporary {
      background-color: #ffbb8bff;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    let map;
    let myLocationMarker = null;
    let targetLocationMarker = null;
    let geofenceCircles = [];
    let geofenceMarkers = [];
    let hasCentered = false;

    function initMap() {
      try {
        const container = document.getElementById('map');
        const options = {
          center: new kakao.maps.LatLng(37.5665, 126.9780),
          level: 3
        };
        map = new kakao.maps.Map(container, options);
        
        kakao.maps.event.addListener(map, 'tilesloaded', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOG', payload: 'Map tiles loaded' }));
        });

        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_LOADED' }));
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOG', payload: 'Map initialized successfully' }));
      } catch (e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', payload: 'Init Error: ' + e.toString() }));
      }
    }

    function loadKakaoMap() {
      const script = document.createElement('script');
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&libraries=services,clusterer,drawing&autoload=false';
      script.async = true;
      
      script.onload = function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOG', payload: 'Kakao script loaded via dynamic injection' }));
        kakao.maps.load(initMap);
      };
      
      script.onerror = function(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', payload: 'Failed to load Kakao Maps SDK: ' + JSON.stringify(e) }));
      };
      
      document.head.appendChild(script);
    }

    // Start loading
    if (document.readyState === 'complete') {
      loadKakaoMap();
    } else {
      window.addEventListener('load', loadKakaoMap);
    }

    function clearGeofences() {
      geofenceCircles.forEach(circle => circle.setMap(null));
      geofenceMarkers.forEach(marker => marker.setMap(null));
      geofenceCircles = [];
      geofenceMarkers = [];
    }

    // 마지막 업데이트 상태를 저장해 동일 데이터로 불필요 재그리기 방지
    let lastPayloadJSON = '';

    function updateData(payload) {
      if (!map) return;
      const payloadJSON = JSON.stringify(payload);
      if (payloadJSON === lastPayloadJSON) return;
      lastPayloadJSON = payloadJSON;

      const { currentLocation, targetLocation, geofences, userRole } = payload;

      // Handle My Location (Blue)
      if (currentLocation) {
        const locPosition = new kakao.maps.LatLng(currentLocation.latitude, currentLocation.longitude);
        
        if (!myLocationMarker) {
          const content = '<div class="my-marker">' + 
            '<div class="icon">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' +
            '</div>' +
            '</div>';
          myLocationMarker = new kakao.maps.CustomOverlay({
            position: locPosition,
            content: content,
            yAnchor: 0.5
          });
          myLocationMarker.setMap(map);
        } else {
          myLocationMarker.setPosition(locPosition);
        }
      }

      // Handle Target Location (Red)
      if (targetLocation) {
        const targetPosition = new kakao.maps.LatLng(targetLocation.latitude, targetLocation.longitude);
        
        if (!targetLocationMarker) {
          const content = '<div class="target-marker"></div>';
          targetLocationMarker = new kakao.maps.CustomOverlay({
            position: targetPosition,
            content: content,
            yAnchor: 0.5
          });
          targetLocationMarker.setMap(map);
        } else {
          targetLocationMarker.setPosition(targetPosition);
        }
      }

      // Handle Geofences
      clearGeofences();
      if (geofences && geofences.length > 0) {
        geofences.forEach(gf => {
          const gfPosition = new kakao.maps.LatLng(gf.latitude, gf.longitude);
          
          // Circle (radius 기본값 100m)
          const circle = new kakao.maps.Circle({
            center: gfPosition,
            radius: gf.radius || 100,
            strokeWeight: 1,
            strokeColor: '#00a0e9',
            strokeOpacity: 0.1,
            strokeStyle: 'solid',
            fillColor: '#00a0e9',
            fillOpacity: 0.2
          });
          circle.setMap(map);
          geofenceCircles.push(circle);

          // Marker (Custom Overlay for click)
          let iconSvg = '';
          // 이름에 따라 아이콘 결정 (집, 병원 등)
          if (gf.name.includes('집')) {
             // House Icon
             iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>';
          } else if (gf.name.includes('병원')) {
             // Hospital (Plus) Icon
             iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
          } else {
             // Default Pin Icon
             iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';
          }

          // Check if temporary (type 1 or 'temporary')
          const isTemporary = gf.type === 1 || gf.type === 'temporary';
          const typeClass = isTemporary ? ' temporary' : '';

          const content = '<div class="customoverlay' + typeClass + '">' +
            '  <div class="icon-wrapper">' + iconSvg + '</div>' +
            '  <span class="title">' + gf.name + '</span>' +
            '</div>';
            
          const overlay = new kakao.maps.CustomOverlay({
            position: gfPosition,
            content: content,
            yAnchor: 1
          });
          overlay.setMap(map);
          geofenceMarkers.push(overlay);
          
          // Custom Pin Marker (Green/Orange)
          const pinContent = '<div class="geofence-pin' + typeClass + '"></div>';
          const pinOverlay = new kakao.maps.CustomOverlay({
            position: gfPosition,
            content: pinContent,
            yAnchor: 0.5
          });
          pinOverlay.setMap(map);
          geofenceMarkers.push(pinOverlay);
        });
      }

      // 초기 센터링: 보호자는 target, 이용자는 current 기준 1회만
      if (!hasCentered) {
        const centerSource = userRole === 'supporter'
          ? targetLocation || currentLocation
          : currentLocation || targetLocation;

        if (centerSource) {
          const centerPos = new kakao.maps.LatLng(centerSource.latitude, centerSource.longitude);
          map.setCenter(centerPos);
          hasCentered = true;
        }
      }
    }

    document.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'UPDATE_DATA') {
          updateData(data.payload);
        } else if (data.type === 'MOVE_TO') {
          if (map) {
            const moveLatLon = new kakao.maps.LatLng(data.payload.lat, data.payload.lng);
            map.panTo(moveLatLon);
          }
        }
      } catch (e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', payload: 'Message Error: ' + e.toString() }));
      }
    });
    
    // For iOS
    window.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'UPDATE_DATA') {
          updateData(data.payload);
        } else if (data.type === 'MOVE_TO') {
          if (map) {
            const moveLatLon = new kakao.maps.LatLng(data.payload.lat, data.payload.lng);
            map.panTo(moveLatLon);
          }
        }
      } catch (e) {
         window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', payload: 'Message Error: ' + e.toString() }));
      }
    });
  </script>
</body>
</html>
`;

const KakaoMap = forwardRef<KakaoMapHandle, KakaoMapProps>(({
  currentLocation,
  targetLocation,
  geofences,
  userRole,
  onGeofenceDelete
}, ref) => {
  const webViewRef = useRef<WebView>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useImperativeHandle(ref, () => ({
    moveToLocation: (lat: number, lng: number) => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'MOVE_TO',
          payload: { lat, lng }
        }));
      }
    }
  }));

  useEffect(() => {
    if (isMapLoaded && webViewRef.current) {
      const data = {
        type: 'UPDATE_DATA',
        payload: {
          currentLocation,
          targetLocation,
          geofences,
          userRole
        }
      };
      webViewRef.current.postMessage(JSON.stringify(data));
    }
  }, [currentLocation, targetLocation, geofences, userRole, isMapLoaded]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_LOADED') {
        setIsMapLoaded(true);
        console.log('KakaoMap: Map Loaded');
      } else if (data.type === 'GEOFENCE_CLICK') {
        if (onGeofenceDelete) {
          onGeofenceDelete(data.payload.id, data.payload.name);
        }
      } else if (data.type === 'LOG') {
        console.log('KakaoMap WebView Log:', data.payload);
      } else if (data.type === 'ERROR') {
        console.error('KakaoMap WebView Error:', data.payload);
      }
    } catch (e) {
      console.error('KakaoMap: Failed to parse message', event.nativeEvent.data);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: HTML_CONTENT, baseUrl: 'https://dapi.kakao.com' }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error: ', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error: ', nativeEvent);
        }}
      />
      {!isMapLoaded && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
});

export default KakaoMap;
