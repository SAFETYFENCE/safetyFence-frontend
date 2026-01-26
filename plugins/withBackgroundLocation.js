const {
  withMainApplication,
  withDangerousMod,
  withAndroidManifest,
  withGradleProperties,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config Plugin: BackgroundLocation 네이티브 모듈 등록
 * EAS build 시 MainApplication.kt에 BackgroundLocationPackage를 자동으로 추가
 * AndroidManifest.xml에 Service 등록
 */
function withBackgroundLocation(config) {
  // 1. MainApplication.kt 수정 - 패키지 등록
  config = withMainApplication(config, (config) => {
    const mainApplication = config.modResults;

    // import 문 추가
    const importStatement = 'import com.paypass.safetyfence.location.BackgroundLocationPackage';
    if (!mainApplication.contents.includes(importStatement)) {
      // expo.modules 관련 import 뒤에 추가
      mainApplication.contents = mainApplication.contents.replace(
        /import expo\.modules\.ReactNativeHostWrapper/,
        `import expo.modules.ReactNativeHostWrapper\n${importStatement}`
      );
    }

    // 패키지 등록 추가
    const packageAddition = 'add(BackgroundLocationPackage())';
    if (!mainApplication.contents.includes(packageAddition)) {
      // PackageList 다음에 추가
      mainApplication.contents = mainApplication.contents.replace(
        /PackageList\(this\)\.packages\.apply \{/,
        `PackageList(this).packages.apply {\n              ${packageAddition}`
      );
    }

    return config;
  });

  // 2. AndroidManifest.xml 수정 - Service 등록
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];

    if (application) {
      // service 배열이 없으면 생성
      if (!application.service) {
        application.service = [];
      }

      // BackgroundLocationService가 이미 있는지 확인
      const serviceName = 'com.paypass.safetyfence.location.BackgroundLocationService';
      const existingService = application.service.find(
        (s) => s.$?.['android:name'] === serviceName
      );

      if (!existingService) {
        // FGS (Foreground Service) 등록 - Android 14+ 호환
        application.service.push({
          $: {
            'android:name': serviceName,
            'android:enabled': 'true',
            'android:exported': 'false',
            'android:foregroundServiceType': 'location',
          },
        });
        console.log('[withBackgroundLocation] Added BackgroundLocationService to AndroidManifest.xml');
      }
    }

    return config;
  });

  // 3. Gradle JVM 메모리 증가 (DEX 병합 시 OOM 방지)
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;

    // 기존 jvmargs 제거 후 새로 추가
    const filtered = props.filter(
      (p) => !(p.type === 'property' && p.key === 'org.gradle.jvmargs')
    );
    filtered.push({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m',
    });

    config.modResults = filtered;
    return config;
  });

  // 4. 네이티브 모듈 파일 복사 (android/app/src/main/java/...)
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const sourceDir = path.join(projectRoot, 'native-modules', 'android', 'location');
      const targetDir = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'paypass',
        'safetyfence',
        'location'
      );

      // 소스 디렉토리 존재 확인
      if (fs.existsSync(sourceDir)) {
        // 타겟 디렉토리 생성
        fs.mkdirSync(targetDir, { recursive: true });

        // 모든 .kt 파일 복사
        const files = fs.readdirSync(sourceDir);
        for (const file of files) {
          if (file.endsWith('.kt')) {
            const sourcePath = path.join(sourceDir, file);
            const targetPath = path.join(targetDir, file);
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`[withBackgroundLocation] Copied: ${file}`);
          }
        }
      } else {
        console.log('[withBackgroundLocation] Native module source directory not found:', sourceDir);
        console.log('[withBackgroundLocation] Expected path:', sourceDir);
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withBackgroundLocation;
