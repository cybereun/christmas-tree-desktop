# 🎄 반짝 크리스마스 트리

바탕화면에 작게 놓는 크리스마스 트리 앱 (Windows 포터블).
눈이 내리고, 전구가 반짝이고, 선물은 시간이 지나면 생기고, 눌러서 열 수 있어요.

**👉 홍보 페이지 · 놀이터:** https://cybereun.github.io/christmas-tree-desktop/
**⬇️ 다운로드:** [ChristmasTree-portable.exe (v1.0.0)](https://github.com/cybereun/christmas-tree-desktop/releases/download/v1.0.0/ChristmasTree-portable.exe)

## 기능
- 투명 배경, 항상 위, 드래그 이동, 투명한 곳은 클릭 통과
- 눈, 반짝이는 전구, 별
- 약 2분마다 선물이 생기고 클릭하면 메시지와 장식이 나옴 (장식은 트리에 저장)
- 소원 별 달기, D-Day, 시간대별 분위기, 산타 썰매
- 오르골 효과음과 BGM (우클릭 메뉴에서 켜기)

설치가 필요 없습니다. 실행 시 SmartScreen 경고가 뜨면 "추가 정보 → 실행"을 누르세요 (코드 서명 없음).

## 개발
```bash
npm install
npm start          # 실행
npm start -- --fast  # 선물 15초마다 (테스트용)
npm run dist       # dist/ChristmasTree-portable.exe 빌드
```
Electron 기반, `renderer/` 에 캔버스 렌더링과 WebAudio 사운드가 있습니다.
