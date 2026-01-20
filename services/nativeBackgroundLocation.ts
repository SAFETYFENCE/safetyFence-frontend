import { NativeModules, Platform } from 'react-native';

type StartOptions = {
  baseUrl: string;
  apiKey: string;
  userNumber: string;
};

const { BackgroundLocation } = NativeModules as {
  BackgroundLocation?: {
    start: (options: StartOptions) => Promise<boolean>;
    stop: () => Promise<boolean>;
  };
};

export const startNativeBackgroundLocation = async (options: StartOptions): Promise<boolean> => {
  if (Platform.OS !== 'android' || !BackgroundLocation?.start) {
    return false;
  }
  return BackgroundLocation.start(options);
};

export const stopNativeBackgroundLocation = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !BackgroundLocation?.stop) {
    return false;
  }
  return BackgroundLocation.stop();
};
