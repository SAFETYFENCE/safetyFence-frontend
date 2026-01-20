/**
 * 전역 설정 및 상태 관리
 * - URL: API 서버 주소
 * - NUMBER: 현재 사용자 전화번호
 * - TARGET_NUMBER: 보호자가 선택한 이용자 전화번호
 * - TARGET_RELATION: 보호자와 이용자 관계
 * - USER_ROLE: 사용자 역할 (user | supporter)
 */
const Global = {
  // API 서버 URL - HTTPS 도메인
  URL: 'https://safetyfencecompany.com',

  // 사용자 정보
  API_KEY: "",
  NUMBER: "",
  TARGET_NUMBER: "",
  TARGET_RELATION: "",
  USER_ROLE: "",
};

export default Global;
