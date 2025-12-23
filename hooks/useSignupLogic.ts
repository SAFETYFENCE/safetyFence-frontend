
import Global from '@/constants/Global';
import { authService } from '@/services/authService';
import { DaumPostcodeData } from '@/utils/DaumPostcode';
import { storage } from '@/utils/storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

export interface SignupFormData {
    name: string;
    password: string;
    confirmPassword: string;
    birth: Date | null;
    number: string;
    homeAddress: string;
    homeStreetAddress: string;
    homeStreetAddressDetail: string;
    centerAddress: string;
    centerStreetAddress: string;
    isElderly: boolean;
}

export const useSignupLogic = () => {
    const router = useRouter();
    const [formData, setFormData] = useState<SignupFormData>({
        name: '',
        password: '',
        confirmPassword: '',
        birth: null,
        number: '',
        homeAddress: '',
        homeStreetAddress: '',
        homeStreetAddressDetail: '',
        centerAddress: '',
        centerStreetAddress: '',
        isElderly: false
    });

    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [isPostcodeMode, setIsPostcodeMode] = useState<boolean>(false);
    const [isCenterPostcodeMode, setIsCenterPostcodeMode] = useState<boolean>(false);

    const handleInputChange = <K extends keyof SignupFormData>(
        field: K,
        value: SignupFormData[K]
    ): void => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleAddressSelect = (data: DaumPostcodeData, isCenter: boolean = false) => {
        let fullAddress = data.address;
        let extraAddress = '';

        if (data.addressType === 'R') {
            if (data.bname !== '') {
                extraAddress += data.bname;
            }
            if (data.buildingName !== '') {
                extraAddress +=
                    extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
            }
            fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
        }

        if (isCenter) {
            setFormData(prev => ({
                ...prev,
                centerStreetAddress: fullAddress,
                centerAddress: String(data.zonecode),
            }));
            setIsCenterPostcodeMode(false);
        } else {
            setFormData(prev => ({
                ...prev,
                homeStreetAddress: fullAddress,
                homeAddress: String(data.zonecode),
            }));
            setIsPostcodeMode(false);
        }
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            handleInputChange("birth", selectedDate);
        }
    };

    const handleSubmit = async (): Promise<void> => {
        const signupData = {
            name: formData.name,
            password: formData.password,
            birth: formData.birth ? formData.birth.toISOString().slice(0, 10) : null,
            number: formData.number,
            homeAddress: formData.homeAddress,
            centerAddress: formData.centerAddress,
            homeStreetAddress: formData.homeStreetAddress,
            homeStreetAddressDetail: formData.homeStreetAddressDetail,
            centerStreetAddress: formData.centerStreetAddress
        };

        if (!signupData.name || !signupData.password || !signupData.number || !signupData.birth) {
            Alert.alert('입력 오류', '필수 항목을 모두 입력해주세요.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            Alert.alert('입력 오류', '비밀번호가 일치하지 않습니다.');
            return;
        }

        try {
            const response = await authService.signup({
                number: signupData.number,
                name: signupData.name,
                password: signupData.password,
                birth: signupData.birth, // Service expects ISO string YYYY-MM-DD
                homeAddress: signupData.homeAddress,
                centerAddress: signupData.centerAddress,
                homeStreetAddress: signupData.homeStreetAddress,
                homeStreetAddressDetail: signupData.homeStreetAddressDetail,
                centerStreetAddress: signupData.centerStreetAddress,
            });

            console.log('회원가입 성공:', response);

            Global.NUMBER = response.number;
            await storage.setUserNumber(response.number);
            await storage.setUserName(response.name);

            Alert.alert(
                "🎉 회원가입 완료",
                `${response.name}님, 회원가입이 성공적으로 완료되었습니다!\n로그인 페이지로 이동하여 로그인해주세요.`,
                [
                    {
                        text: "확인",
                        onPress: () => {
                            try {
                                router.replace('/');
                            } catch (navError) {
                                router.push('/');
                            }
                        }
                    }
                ]
            );
        } catch (error: any) {
            const message = error?.response?.data?.message || "회원가입에 실패했습니다. 다시 시도해주세요.";
            Alert.alert("회원가입 실패", message);
            console.error('회원가입 실패:', error);
        }
    };

    return {
        formData,
        showDatePicker,
        isPostcodeMode,
        isCenterPostcodeMode,
        handleInputChange,
        handleAddressSelect,
        handleDateChange,
        handleSubmit,
        setShowDatePicker,
        setIsPostcodeMode,
        setIsCenterPostcodeMode
    };
};
