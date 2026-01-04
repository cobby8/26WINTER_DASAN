export interface SheetRow {
  타임스탬프: string;
  결제일: string;
  신청구분: string;
  지점: string;
  일정선택: string;
  "수강생 이름": string;
  "수강생 성별": string;
  학년: string;
  결제방법: string;
  결제액: string;
  수강료: string;
  셔틀비: string;
  "셔틀탑승 여부": string;
  "탑승 장소": string;
  "탑승 시간": string;
  "하차 장소": string;
  "수강생 생년월일": string;
  "학부모 이름을 적어 주세요.": string;
  "수강생 전화번호": string;
  "학부모 전화번호": string;
  안내문자: string;
  주소: string;
  "수강신청 희망 시간 [월요일]": string;
  "수강신청 희망 시간 [화요일]": string;
  "수강신청 희망 시간 [수요일]": string;
  "수강신청 희망 시간 [목요일]": string;
  "수강신청 희망 시간 [금요일]": string;
  "수업선택 [토요일]": string;
  "수업선택 [일요일]": string;
  학교명: string;
  농구경험: string;
  "바라는 점": string;
  "개인정보수집 동의": string;
  "수강신청확정 안내": string;
  가입경로: string;
  "주의사항 확인 및 동의": string;
  이용약관: string;
  발송상태: string;
}

export interface ParsedStudent {
  name: string;
  gender: string;
  grade: string;
  birthDate: string;
  school: string;
  parentName: string;
  studentPhone: string;
  parentPhone: string;
  address: string;
  note: string;
  registrationSource: string;
}

export interface ParsedClass {
  day: string;
  time: string; // "14:00"
  originalText: string;
}

export interface ParsedEnrollment {
  type: string;
  branch: string;
  tuition: number;
  shuttleFee: number;
  totalPayment: number;
  paymentDate: string;
  paymentMethod: string;
  shuttleUse: boolean;
  shuttleBoarding: string;
  shuttleTime: string;
  shuttleDropoff: string;
  desiredClasses: ParsedClass[];
  session?: string; // Added for 1차/2차 distinction
}
