import { DialogueTurn } from '../types/dialogue';

export const DIALOGUE_DATA: DialogueTurn[] = [
  {
    id: 1,
    partnerRole: 'Emma (Check-in Staff)',
    partnerText: 'Hello! Welcome to Skyline Airways. Where are you traveling today?',
    partnerKorean: '안녕하세요! 스카이라인 항공에 오신 것을 환영합니다. 오늘 어디로 여행하시나요?',
    targetSentence: 'I am flying to London for my vacation.',
    koreanMeaning: '휴가로 런던에 가는 길이에요.',
    keyWords: ['flying', 'London', 'vacation'],
    recastHint: {
      english: 'Good try! You can say, "I am flying to London for my vacation."',
      korean: '좋은 시도예요! 이렇게 말해 보세요.',
    },
    elicitationHint: {
      english: 'Almost there! "I am flying to London for my v_______."',
      korean: '거의 다 왔어요! 빠진 단어는 v로 시작해요.',
      firstLetter: 'v',
    },
    chunkingHint: {
      chunk1: 'I am flying to London',
      chunk2: 'for my vacation.',
      korean: '잘하고 있어요! 짧게 나누어 말해 보세요.',
    },
  },
  {
    id: 2,
    partnerRole: 'Emma (Check-in Staff)',
    partnerText: 'May I please see your passport and flight booking?',
    partnerKorean: '여권과 항공권 예약 확인서를 보여주시겠어요?',
    targetSentence: 'Sure, here are my passport and ticket.',
    koreanMeaning: '네, 여기 제 여권과 티켓이 있습니다.',
    keyWords: ['here', 'passport', 'ticket'],
    recastHint: {
      english: 'Good try! You can say, "Sure, here are my passport and ticket."',
      korean: '좋은 시도예요! 이렇게 말해 보세요.',
    },
    elicitationHint: {
      english: 'Almost there! "Sure, here are my p_______ and ticket."',
      korean: '거의 다 왔어요! 빠진 단어는 p로 시작해요.',
      firstLetter: 'p',
    },
    chunkingHint: {
      chunk1: 'Sure, here are',
      chunk2: 'my passport and ticket.',
      korean: '잘하고 있어요! 짧게 나누어 말해 보세요.',
    },
  },
  {
    id: 3,
    partnerRole: 'Emma (Check-in Staff)',
    partnerText: 'Would you prefer a window seat or an aisle seat?',
    partnerKorean: '창가 쪽 좌석과 복도 쪽 좌석 중 어느 좌석을 선호하시나요?',
    targetSentence: 'I would like a window seat, please.',
    koreanMeaning: '창가 쪽 좌석으로 부탁드립니다.',
    keyWords: ['window', 'seat'],
    recastHint: {
      english: 'Good try! You can say, "I would like a window seat, please."',
      korean: '좋은 시도예요! 이렇게 말해 보세요.',
    },
    elicitationHint: {
      english: 'Almost there! "I would like a w_____ seat, please."',
      korean: '거의 다 왔어요! 빠진 단어는 w로 시작해요.',
      firstLetter: 'w',
    },
    chunkingHint: {
      chunk1: 'I would like',
      chunk2: 'a window seat, please.',
      korean: '잘하고 있어요! 짧게 나누어 말해 보세요.',
    },
  },
  {
    id: 4,
    partnerRole: 'Emma (Check-in Staff)',
    partnerText: 'Do you have any bags to check in today?',
    partnerKorean: '오늘 부치실 위탁 수하물이 있으신가요?',
    targetSentence: 'Yes, I have one suitcase to check in.',
    koreanMeaning: '네, 부칠 캐리어가 하나 있습니다.',
    keyWords: ['suitcase', 'check'],
    recastHint: {
      english: 'Good try! You can say, "Yes, I have one suitcase to check in."',
      korean: '좋은 시도예요! 이렇게 말해 보세요.',
    },
    elicitationHint: {
      english: 'Almost there! "Yes, I have one s_______ to check in."',
      korean: '거의 다 왔어요! 빠진 단어는 s로 시작해요.',
      firstLetter: 's',
    },
    chunkingHint: {
      chunk1: 'Yes, I have',
      chunk2: 'one suitcase to check in.',
      korean: '잘하고 있어요! 짧게 나누어 말해 보세요.',
    },
  },
  {
    id: 5,
    partnerRole: 'Emma (Check-in Staff)',
    partnerText: 'You can take one carry-on bag. Do you have any questions before boarding?',
    partnerKorean: '기내 수하물은 1개 가지고 타실 수 있습니다. 탑승 전 궁금한 점이 있으신가요?',
    targetSentence: 'What time does boarding start for this flight?',
    koreanMeaning: '이 비행기 탑승은 몇 시에 시작하나요?',
    keyWords: ['what', 'time', 'boarding'],
    recastHint: {
      english: 'Good try! You can say, "What time does boarding start for this flight?"',
      korean: '좋은 시도예요! 이렇게 말해 보세요.',
    },
    elicitationHint: {
      english: 'Almost there! "What time does b_______ start for this flight?"',
      korean: '거의 다 왔어요! 빠진 단어는 b로 시작해요.',
      firstLetter: 'b',
    },
    chunkingHint: {
      chunk1: 'What time does',
      chunk2: 'boarding start for this flight?',
      korean: '잘하고 있어요! 짧게 나누어 말해 보세요.',
    },
  },
  {
    id: 6,
    partnerRole: 'Emma (Check-in Staff)',
    partnerText: 'Boarding begins at 1:50 PM at Gate 42. Here is your boarding pass. Have a wonderful flight!',
    partnerKorean: '탑승은 42번 게이트에서 오후 1시 50분에 시작됩니다. 여기 탑승권이 있습니다. 즐거운 비행 되세요!',
    targetSentence: 'Thank you so much for your kind help!',
    koreanMeaning: '친절하게 도와주셔서 정말 감사합니다!',
    keyWords: ['thank', 'kind', 'help'],
    recastHint: {
      english: 'Good try! You can say, "Thank you so much for your kind help!"',
      korean: '좋은 시도예요! 이렇게 말해 보세요.',
    },
    elicitationHint: {
      english: 'Almost there! "Thank you so much for your k___ help!"',
      korean: '거의 다 왔어요! 빠진 단어는 k로 시작해요.',
      firstLetter: 'k',
    },
    chunkingHint: {
      chunk1: 'Thank you so much',
      chunk2: 'for your kind help!',
      korean: '잘하고 있어요! 짧게 나누어 말해 보세요.',
    },
  },
];
