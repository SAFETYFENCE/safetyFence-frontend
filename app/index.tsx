
import LoginForm from '@/components/login/LoginForm';
import LoginHeader from '@/components/login/LoginHeader';
import SignupLink from '@/components/login/SignupLink';
import { useLoginLogic } from '@/hooks/useLoginLogic';
import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TouchableWithoutFeedback,
  View
} from 'react-native';

const LoginPage: React.FC = () => {
  const {
    number,
    password,
    isLoading,
    setNumber,
    setPassword,
    handleLogin,
    handleSignup
  } = useLoginLogic();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#22c55e" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <LoginHeader />

            <View className="px-6">
              <LoginForm
                number={number}
                password={password}
                isLoading={isLoading}
                onNumberChange={setNumber}
                onPasswordChange={setPassword}
                onSubmit={handleLogin}
              />

              <SignupLink onSignup={handleSignup} />

              <View className="items-center mt-auto">
                <Text className="text-xs text-gray-400 text-center leading-5">
                  로그인함으로써{'\n'}서비스 이용약관에 동의합니다
                </Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginPage;
