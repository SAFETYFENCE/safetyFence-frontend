
import PostcodeModal from '@/components/signup/PostcodeModal';
import SignupForm from '@/components/signup/SignupForm';
import SignupHeader from '@/components/signup/SignupHeader';
import SignupSuccessModal from '@/components/signup/SignupSuccessModal';
import { useSignupLogic } from '@/hooks/useSignupLogic';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView
} from 'react-native';

const SignupPage: React.FC = () => {
  const {
    formData,
    showDatePicker,
    isPostcodeMode,
    isCenterPostcodeMode,
    isSuccessModalVisible,
    signedUpUserName,
    handleInputChange,
    handleAddressSelect,
    handleDateChange,
    handleSubmit,
    handleInputConfirm,
    setShowDatePicker,
    setIsPostcodeMode,
    setIsCenterPostcodeMode
  } = useSignupLogic();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <SignupHeader />

          <SignupForm
            formData={formData}
            showDatePicker={showDatePicker}
            onInputChange={handleInputChange}
            onDateChange={handleDateChange}
            onShowDatePicker={setShowDatePicker}
            onOpenPostcode={(isCenter) => isCenter ? setIsCenterPostcodeMode(true) : setIsPostcodeMode(true)}
            onSubmit={handleSubmit}
          />
        </ScrollView>

        <PostcodeModal
          visible={isPostcodeMode}
          title="집 주소 검색"
          onClose={() => setIsPostcodeMode(false)}
          onSelect={(data) => handleAddressSelect(data, false)}
        />

        <PostcodeModal
          visible={isCenterPostcodeMode}
          title="센터 주소 검색"
          onClose={() => setIsCenterPostcodeMode(false)}
          onSelect={(data) => handleAddressSelect(data, true)}
        />

        <SignupSuccessModal
          visible={isSuccessModalVisible}
          userName={signedUpUserName}
          onConfirm={handleInputConfirm}
        />

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignupPage;
