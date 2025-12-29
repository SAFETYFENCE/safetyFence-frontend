import React from 'react';
import { SafeAreaView, ScrollView, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

const PrivacyPolicyPage: React.FC = () => {
  const router = useRouter();

  // 표의 헤더와 행을 그리는 헬퍼 컴포넌트
  const TableRow = ({ col1, col2, col3, col4, isHeader = false }: any) => (
    <View className={`flex-row border-b border-gray-300 ${isHeader ? 'bg-gray-100' : 'bg-white'}`}>
      <View className="w-[15%] p-2 border-r border-gray-300 justify-center">
        <Text className={`text-xs text-center ${isHeader ? 'font-bold' : ''}`}>{col1}</Text>
      </View>
      <View className="w-[15%] p-2 border-r border-gray-300 justify-center">
        <Text className={`text-xs text-center ${isHeader ? 'font-bold' : ''}`}>{col2}</Text>
      </View>
      <View className="w-[35%] p-2 border-r border-gray-300 justify-center">
        <Text className={`text-xs ${isHeader ? 'font-bold text-center' : ''}`}>{col3}</Text>
      </View>
      <View className="w-[35%] p-2 justify-center">
        <Text className={`text-xs ${isHeader ? 'font-bold text-center' : ''}`}>{col4}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white pt-safe">
      {/* 헤더 영역 */}
      {/* <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <ChevronLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-800">개인정보 처리방침</Text>
        <View className="w-10" />
      </View> */}

      {/* 본문 스크롤 영역 */}
      <ScrollView className="flex-1 p-4">
        <Text className="text-xl font-bold mb-6 text-center">GPS 안심 서비스 '안전울타리'{"\n"}개인정보처리방침</Text>
        
        <Text className="text-base mb-6 leading-6">
          [회사명](이하 '회사')은(는) 개인정보보호법, 위치정보의 보호 및 이용 등에 관한 법률 등 관련 법령을 준수하며, '페이패스' 서비스(이하 '서비스') 이용자의 개인정보 및 위치정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </Text>

        {/* 제1조 */}
        <Text className="text-lg font-bold mb-2">제1조 (개인정보의 수집 및 처리 목적)</Text>
        <Text className="text-sm mb-4 leading-5">
          회사는 다음의 목적을 위하여 개인정보를 수집하고 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 관련 법령에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
        </Text>
        <View className="mb-4 pl-2">
          <Text className="text-sm font-bold mb-1">1. 서비스 제공 및 회원 관리</Text>
          <Text className="text-sm mb-1 pl-2">1. GPS 위치 기반 안심 서비스 '안전울타리' 실증 테스트 참여자(어르신 및 보호자) 식별 및 본인 확인</Text>
          <Text className="text-sm mb-1 pl-2">2. 어르신의 현재 위치 확인, 지정 장소(집, 복지관 등) 도착 및 이탈 시 알림 전송</Text>
          <Text className="text-sm mb-1 pl-2">3. 서비스의 기술적 안정성 검증 및 불편한 점이나 필요한 기능에 대한 의견 수렴</Text>
          <Text className="text-sm mb-2 pl-2">4. 서비스 이용 관련 고지·통지 및 원활한 의사소통 경로 확보</Text>

          <Text className="text-sm font-bold mb-1">2. 서비스 개선 및 개발</Text>
          <Text className="text-sm mb-1 pl-2">1. 서비스 이용 현황 통계 분석, 사용 소감 및 느낀 점 등 인터뷰를 통한 서비스 개선 사항 도출</Text>
          <Text className="text-sm mb-1 pl-2">2. 신규 기능 개발 및 맞춤형 서비스 제공을 위한 연구</Text>
        </View>

        {/* 제2조 (표 포함) */}
        <Text className="text-lg font-bold mb-2">제2조 (수집하는 개인정보의 항목 및 수집 방법)</Text>
        <Text className="text-sm mb-2">
          ① 회사는 서비스 제공 및 실증 테스트 진행을 위해 아래와 같은 최소한의 개인정보를 수집합니다.
        </Text>
        
        {/* 테이블 시작 */}
        <View className="border border-gray-300 mb-4">
          <TableRow col1="구분" col2="대상" col3="수집 항목" col4="수집 목적" isHeader={true} />
          <TableRow 
            col1="필수" col2="어르신" 
            col3="성명, 연락처, 스마트폰 기기 정보" 
            col4="서비스 이용자 특정 및 앱 설치 지원" 
          />
          <TableRow 
            col1="필수" col2="보호자" 
            col3="성명, 연락처" 
            col4="본인 식별, 어르신 위치 정보 제공 및 알림 수신, 의견 청취" 
          />
          <TableRow 
            col1="필수" col2="공통" 
            col3="위치정보(GPS 좌표), 위치정보 수집 시간" 
            col4="어르신 위치 확인 및 안심 알림 서비스 제공" 
          />
          <TableRow 
            col1="선택" col2="공통" 
            col3="서비스 이용 소감, 개선 의견 등 인터뷰 내용" 
            col4="서비스 개선" 
          />
        </View>
        {/* 테이블 끝 */}

        <Text className="text-sm mb-4 leading-5 text-gray-600">
          ② 서비스 이용 과정에서 기기 정보(OS, 기기 식별값), 서비스 이용 기록 등이 자동으로 생성되어 수집될 수 있습니다.{"\n"}
          ③ 회사는 다음과 같은 방법으로 개인정보를 수집합니다.{"\n"}
          • 실증 테스트 참여 신청 시 서면 또는 온라인 양식을 통해 직접 수집{"\n"}
          • 서비스 앱 실행 시 스마트폰의 위치정보 수집 기능(GPS)을 통해 자동으로 수집{"\n"}
          • 유선 상담 또는 인터뷰 과정에서 구두로 수집
        </Text>

        {/* 제3조 */}
        <Text className="text-lg font-bold mb-2">제3조 (개인정보의 처리 및 보유 기간)</Text>
        <Text className="text-sm mb-4 leading-5">
          ① 회사는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용 기간 또는 법령에 따른 보유·이용 기간 내에서 개인정보를 처리·보유합니다.{"\n"}
          ② 본 실증 테스트를 위해 수집된 개인정보는 다음의 기간 동안 보유 및 이용됩니다.{"\n"}
          • <Text className="font-bold">보유 기간:</Text> 실증 테스트 시작일(YYYY년 MM월 DD일)로부터 테스트 종료 후 1년까지{"\n"}
          • <Text className="font-bold">파기 시점:</Text> 보유 기간 경과 시 지체없이 파기{"\n"}
          • <Text className="font-bold">근거:</Text> 참여자의 동의, 서비스 개선 및 분석 데이터 활용{"\n"}
          ③ 다만, 위치정보의 경우 「위치정보의 보호 및 이용 등에 관한 법률」 제16조 제2항에 따라 위치정보 수집·이용·제공사실 확인자료를 1년간 자동으로 기록·보존합니다.
        </Text>

        {/* 제4조 */}
        <Text className="text-lg font-bold mb-2">제4조 (개인정보의 제3자 제공)</Text>
        <Text className="text-sm mb-4 leading-5">
          회사는 정보주체의 동의가 있거나 관련 법령의 규정에 의한 경우를 제외하고는 어떠한 경우에도 본 방침에서 명시한 범위를 넘어 이용자의 개인정보를 제3자에게 제공하지 않습니다. 단, 어르신의 긴급한 구조 요청 등 생명이나 신체에 급박한 위험이 확인되는 경우 관련 법령(재난 및 안전관리 기본법 등)에 따라 구조기관(소방서, 경찰서 등)에 위치정보를 제공할 수 있습니다.
        </Text>

        {/* 제5조 */}
        <Text className="text-lg font-bold mb-2">제5조 (개인정보처리의 위탁)</Text>
        <Text className="text-sm mb-4 leading-5">
          회사는 원활한 서비스 제공을 위해 필요한 경우 개인정보 처리업무를 외부에 위탁할 수 있습니다. 위탁 시에는 위탁받는 자(수탁자)와 위탁업무 내용에 대해 참여자에게 사전에 알리고 동의를 받으며, 관련 법령에 따라 수탁자가 개인정보를 안전하게 처리하도록 관리·감독하겠습니다.
        </Text>

        {/* 제6조 */}
        <Text className="text-lg font-bold mb-2">제6조 (정보주체와 법정대리인의 권리·의무 및 행사방법)</Text>
        <Text className="text-sm mb-4 leading-5">
          ① 정보주체(어르신, 보호자)는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.{"\n"}
          1. 개인정보 열람 요구{"\n"}
          2. 오류 등이 있을 경우 정정 요구{"\n"}
          3. 삭제 요구{"\n"}
          4. 처리정지 요구{"\n"}
          ② 권리 행사는 서면, 전화, 전자우편 등을 통하여 하실 수 있으며 회사는 이에 대해 지체없이 조치하겠습니다.{"\n"}
          ③ 정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우에는 회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.
        </Text>

        {/* 제7조 */}
        <Text className="text-lg font-bold mb-2">제7조 (개인정보의 파기)</Text>
        <Text className="text-sm mb-4 leading-5">
          ① 회사는 개인정보 보유 기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.{"\n"}
          ② 개인정보 파기의 절차 및 방법은 다음과 같습니다.{"\n"}
          1. <Text className="font-bold">파기절차:</Text> 파기 사유가 발생한 개인정보를 선정하고, 회사의 개인정보 보호책임자의 승인을 받아 파기합니다.{"\n"}
          2. <Text className="font-bold">파기방법:</Text> 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제하고, 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.
        </Text>

        {/* 제8조 */}
        <Text className="text-lg font-bold mb-2">제8조 (개인정보의 안전성 확보 조치)</Text>
        <Text className="text-sm mb-4 leading-5">
          회사는 이용자의 소중한 개인정보, 특히 민감할 수 있는 위치정보의 안전성 확보를 위해 다음과 같은 기술적·관리적·물리적 조치를 취하고 있습니다.{"\n"}
          1. <Text className="font-bold">개인정보의 암호화:</Text> 이용자의 위치정보 등 주요 개인정보는 암호화하여 저장 및 관리되고 있습니다.{"\n"}
          2. <Text className="font-bold">해킹 등에 대비한 기술적 대책:</Text> 해킹이나 컴퓨터 바이러스 등에 의한 개인정보 유출 및 훼손을 막기 위하여 보안프로그램을 설치하고 주기적인 갱신·점검을 하며 외부로부터 접근이 통제된 구역에 시스템을 설치하고 기술적/물리적으로 감시 및 차단하고 있습니다.{"\n"}
          3. <Text className="font-bold">개인정보 취급 직원의 최소화 및 교육:</Text> 개인정보를 취급하는 직원을 지정하고 담당자에 한정시켜 최소화하여 개인정보를 관리하는 대책을 시행하고 있습니다.
        </Text>

        {/* 제9조 */}
        <Text className="text-lg font-bold mb-2">제9조 (개인정보 보호책임자)</Text>
        <Text className="text-sm mb-4 leading-5">
          ① 회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만 처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
        </Text>
        <View className="bg-gray-50 p-3 rounded mb-4">
          <Text className="text-sm font-bold mb-1">• 개인정보 보호책임자</Text>
          <Text className="text-sm ml-2">• 성명 : [담당자 성명]</Text>
          <Text className="text-sm ml-2">• 직책 : [담당자 직책]</Text>
          <Text className="text-sm ml-2 mb-2">• 연락처 : [전화번호], [이메일]</Text>

          <Text className="text-sm font-bold mb-1">• 개인정보 보호 담당부서</Text>
          <Text className="text-sm ml-2">• 부서명 : [담당 부서명]</Text>
          <Text className="text-sm ml-2">• 담당자 : [담당자 성명]</Text>
          <Text className="text-sm ml-2">• 연락처 : [전화번호], [이메일]</Text>
        </View>
        <Text className="text-sm mb-4 leading-5">
          ② 정보주체는 서비스 이용 과정에서 발생한 모든 개인정보 보호 관련 문의, 불만 처리, 피해구제 등에 관한 사항을 개인정보 보호책임자 및 담당부서로 문의할 수 있습니다. 회사는 정보주체의 문의에 대해 신속하게 답변 및 처리해드릴 것입니다.
        </Text>

        {/* 제10조 */}
        <Text className="text-lg font-bold mb-2">제10조 (개인정보처리방침 변경)</Text>
        <Text className="text-sm mb-6 leading-5">
          이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
        </Text>

        {/* 날짜 */}
        <Text className="text-sm text-gray-500 mb-10 text-right">
          • 공고일자: 2025년 10월 14일{"\n"}
          • 시행일자: 2025년 10월 21일
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrivacyPolicyPage;