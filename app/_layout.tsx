import { Stack } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Global from "../constants/Global";
import { LocationProvider } from "../contexts/LocationContext";
import "../global.css";
import { storage } from "../utils/storage";

/**
 * 앱 초기화 컴포넌트
 * 로그인 상태 복원 (실제 추적/웹소켓 시작은 로그인 성공 시 처리)
 */
function AppInitializer() {
  useEffect(() => {
    const restoreLoginState = async () => {
      try {
        const [apiKey, userNumber, userName, userRole, targetNumber] = await Promise.all([
          storage.getApiKey(),
          storage.getUserNumber(),
          storage.getUserName(),
          storage.getUserRole(),
          storage.getTargetNumber(),
        ]);

        // 저장된 로그인 정보가 있으면 Global 상태 복원
        if (apiKey && userNumber) {
          Global.NUMBER = userNumber;
          if (userRole) {
            Global.USER_ROLE = userRole;
          }
          if (targetNumber) {
            Global.TARGET_NUMBER = targetNumber;
          }
          console.log('✅ 로그인 상태 복원 성공:', { userNumber, userName, userRole, targetNumber });

          // 로그인되어 있으면 Global 상태만 복원 (위치 추적/웹소켓은 로그인 성공 시 시작)
        } else {
          console.log('ℹ️ 저장된 로그인 정보 없음');
        }
      } catch (error) {
        console.error('❌ 로그인 상태 복원 실패:', error);
      }
    };

    restoreLoginState();
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LocationProvider>
        <AppInitializer />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} /> {/* Login Page */}
          <Stack.Screen name="SelectRole" options={{ headerShown: false }} />
          <Stack.Screen name="MapPage" options={{ headerShown: false }} />
          <Stack.Screen name="CalendarPage" options={{ headerShown: false }} />
          <Stack.Screen name="MyPage" options={{ headerShown: false }} />
          <Stack.Screen name="LinkPage" options={{ headerShown: false }} />
          <Stack.Screen name="LogPage" options={{ headerShown: false }} />
          <Stack.Screen name="GalleryPage" options={{ headerShown: false }} />
          <Stack.Screen name="Signup" options={{ headerShown: false }} />
        </Stack>
      </LocationProvider>
    </SafeAreaProvider>
  );
}

// HEADER, FOOTER 기본 설정을 하는 곳
