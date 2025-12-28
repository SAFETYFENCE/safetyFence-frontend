/**
 * 전화번호를 포맷팅하는 유틸리티 함수
 * @param phoneNumber - 포맷팅할 전화번호 (예: "01012341234")
 * @returns 포맷팅된 전화번호 (예: "010-1234-1234")
 */
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return phoneNumber;

  // 숫자만 추출
  const numbers = phoneNumber.replace(/[^0-9]/g, '');

  // 전화번호 길이에 따라 포맷팅
  if (numbers.length === 11) {
    // 휴대폰 번호 (010-XXXX-XXXX)
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  } else if (numbers.length === 10) {
    // 지역번호가 2자리인 경우 (02-XXXX-XXXX)
    if (numbers.startsWith('02')) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
    }
    // 지역번호가 3자리인 경우 (0XX-XXX-XXXX)
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  } else if (numbers.length === 9) {
    // 지역번호가 2자리인 경우 (02-XXX-XXXX)
    if (numbers.startsWith('02')) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 5)}-${numbers.slice(5, 9)}`;
    }
    // 지역번호가 3자리인 경우 (0XX-XXX-XXX)
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 9)}`;
  }

  // 포맷팅할 수 없는 경우 원본 반환
  return phoneNumber;
}
