# 🎄 반짝 크리스마스 트리

[![Release](https://img.shields.io/github/v/release/cybereun/christmas-tree-desktop?style=for-the-badge&color=e63946&label=release)](https://github.com/cybereun/christmas-tree-desktop/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/cybereun/christmas-tree-desktop/total?style=for-the-badge&color=2a9d68)](https://github.com/cybereun/christmas-tree-desktop/releases)
[![Platform](https://img.shields.io/badge/platform-Windows-0078d4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/cybereun/christmas-tree-desktop/releases/latest)
[![Electron](https://img.shields.io/badge/Electron-45-47848f?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Pages](https://img.shields.io/badge/site-GitHub%20Pages-ffd166?style=for-the-badge&logo=github&logoColor=black)](https://cybereun.github.io/christmas-tree-desktop/)
[![Developer](https://img.shields.io/badge/developer-cybereun-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/cybereun)
[![Copyright](https://img.shields.io/badge/%C2%A9%202026-cybereun-c1121f?style=for-the-badge)](#-저작권)

바탕화면에 작게 놓는 크리스마스 트리 앱 (Windows 포터블).
눈이 내리고, 전구가 반짝이고, 선물은 시간이 지나면 생기고, 눌러서 열 수 있어요.

**👉 홍보 페이지 · 놀이터:** https://cybereun.github.io/christmas-tree-desktop/
**⬇️ 다운로드:** [ChristmasTree-portable.exe (v1.0.1)](https://github.com/cybereun/christmas-tree-desktop/releases/download/v1.0.1/ChristmasTree-portable.exe)

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

## 👩‍💻 개발자
| | |
|---|---|
| **개발자** | [cybereun](https://github.com/cybereun) |
| **프로젝트** | [christmas-tree-desktop](https://github.com/cybereun/christmas-tree-desktop) |
| **문의 · 버그 제보** | [GitHub Issues](https://github.com/cybereun/christmas-tree-desktop/issues) |

## ©️ 저작권
Copyright © 2026 cybereun. All rights reserved.

이 앱의 소스 코드, 디자인, 그림, 소리(합성 음원)와 홍보 페이지의 저작권은 개발자 cybereun에게 있습니다.
개인적인 사용과 앱 다운로드는 자유롭게 할 수 있지만, 사전 동의 없는 재배포·수정본 배포·상업적 이용은 허용되지 않습니다.
앱에 포함된 Electron 등 오픈소스 구성요소는 각각의 라이선스를 따릅니다.
