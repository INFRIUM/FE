# INFREUM DB 워크스페이스

프런트엔드는 백엔드 REST API를 통해 서버 DB를 조회합니다. DB에 직접 연결하거나 로컬 가짜 데이터로 대체하지 않습니다.

## 실행 및 연결

```powershell
npm.cmd install
npm.cmd run dev
```

프로젝트 루트의 `.env.local`에는 백엔드가 공유한 최신 ngrok origin만 입력하세요.

```dotenv
VITE_API_BASE_URL=https://최신-ngrok-도메인
```

주소 뒤에 `/api/v1`은 붙이지 않습니다. API 경로는 `src/API.js`에서 관리합니다.
설정 변경 후 서버를 재시작하고 http://localhost:5173/ 에 접속하세요.
모든 화면은 항상 API를 사용합니다. 이전 `VITE_DATA_SOURCE` 모드 설정은 제거했습니다.
ngrok 요청에는 안내 우회 헤더를 추가하고, HTTP/HTML/연결 오류는 화면에 표시합니다.
백엔드의 CORS 설정에는 프런트 주소와 해당 헤더가 허용되어야 합니다.

## 표시 데이터

| 경로                | 내용                                               |
| ------------------- | -------------------------------------------------- |
| `/dashboard`        | DB에 등록된 교량, 센서, 최신 측정값                |
| `/bridges`          | 구성요소/센서 관계와 3D 개념 모델                  |
| `/sensors`          | 단일 센서 측정 이력, 품질, 기간 필터, CSV          |
| `/experiments`      | DB에 저장된 실험 목록과 상세                       |
| `/history`          | 실험 조회, 비교용 API 계약 대기                    |
| `/ai`               | DB의 분석 구간·이상 탐지·위험도 결과·알림 기록     |
| `/alerts`           | 별도 발생 알림·처리 이력 조회, 상단 종 아이콘 연결 |
| `/settings`         | 연결 상태 API 연동 대기                            |
| `/login`, `/signup` | 로그인·회원가입 POST 요청 및 서버 검증 오류 표시   |

서버가 빈 배열을 반환하면 등록된 결과 없음으로 표시합니다. AI 점수나 정상 등급을 생성하지 않습니다.
연결 상태는 실제 센서 응답의 connection_status가 없으면 UNKNOWN이며 is_active를 온라인 상태로 해석하지 않습니다.
API에서 조회한 DB 기록이 실제 HW 계측인지 테스트 기록인지는 별도로 확인해야 합니다.
null 센서 좌표는 임의 위치로 대체하지 않습니다. 3D 모델은 실제 CAD/BIM이 아닌 개념 모델입니다.

## 로그인·회원가입

회원가입은 `POST /api/v1/auth/register/`에 `name`, `email`, `password`, `password_confirm`을 전송합니다.
로그인은 `POST /api/v1/auth/login/`에 `email`, `password`를 전송합니다.
두 경로는 OPTIONS와 필수값 없는 POST로 확인했습니다. 실서버 테스트 계정은 생성하지 않았습니다.
서버가 필드 오류를 HTTP 200으로 반환하는 경우에도 실패로 표시합니다.
가입 성공 응답 후 로그인으로 이동할 수 있고, 로그인은 인증 토큰을 받은 경우에만 대시보드로 이동합니다.
access/access_token은 Bearer, token/key는 Token 방식이며 서버 token_type이 있으면 우선합니다.
다른 성공 응답/세션 인증 방식이면 명세에 맞춰 매핑을 추가해야 합니다.
비밀번호와 토큰을 localStorage에 저장하지 않으며, 토큰은 메모리에만 유지됩니다.

## 조회 API

`src/API.js`에서 다음 경로를 관리합니다.

- `/api/v1/bridges/`
- `/api/v1/components/`
- `/api/v1/sensors/`
- `/api/v1/measurements/` — bridge_id, sensor_id, from, to
- `/api/v1/experiments/`
- `/api/v1/analysis-windows/`
- `/api/v1/anomaly-results/`
- `/api/v1/risk-results/`
- `/api/v1/alerts/`
- `/api/v1/alert-histories/`

AI 경로는 실제 서버 API Root에서 확인한 조회 경로입니다. 현재 결과가 없어 레코드 표로 연결하며,
결과가 등록되면 서버 필드를 그대로 표시합니다. 개별 AI 점수 의미·임계값이나 교량별 판정 매핑은 추측하지 않습니다.
AI 조회 실패와 빈 배열은 구분합니다. 실험 등록·상태 변경·ESP32 제어는 호출하지 않습니다.

목록은 JSON 배열을 기대합니다. PK는 관계 매핑에 사용하고 화면은 공개 식별자를 표시합니다.
최신값은 measured_at/sequence 내림차순, 그래프는 오름차순입니다.
기간 입력은 KST이며 서버에는 UTC ISO 시각을 전달합니다.
INVALID/null 측정값은 그래프 선을 끊어 표시하고 원본 표/CSV에 보존합니다.
그래프는 최근 최대 600개 항목, 표는 최대 100행, CSV는 조회 전체를 저장합니다.
10초 간격 재조회와 조회 취소를 지원합니다. 오류 시 로컬 데이터로 전환하지 않습니다.

## 파일 구조

## 도안 기반 디지털트윈과 디자인

- 최신 하드웨어팀 센서 배치도를 기준으로 표시 경간 600 mm, 폭 150 mm로 모델을 맞췄습니다. 높이(BOX 120 mm, TRUSS 150 mm), 재료와 공통 목재 지지대(60 × 60 × 150 mm)는 이전 제작 도안을 유지합니다. 최신 그림은 측면 투영 설계 초안이며 실측 전입니다.
- BOX는 3 mm 판과 내부 격판 2개를 표시하며, 내부 보기에서는 앞쪽 측판을 숨깁니다. TRUSS는 양쪽 평판 부재와 삼각 보강을 유지하고 상부 가로 보강재를 제거한 개방형으로 표시합니다. 제조/CAD 또는 구조 해석 모델은 아닙니다.
- BOX/TRUSS 버튼은 도안 미리보기만 바꿉니다. 실제 DB 교량 선택이나 측정 데이터는 변경하지 않습니다. 다른 도안 미리보기에는 현재 교량의 센서 목록을 표시하지 않습니다.
- 입체·정면·상단 시점, 확대·축소·초기화와 치수 표시 전환을 지원합니다.
- 센서 배치 확인을 위해 기본 시점과 초기화 시점은 상단입니다. BOX/TRUSS 전환 시 상단으로 돌아갑니다. 3D에는 폭 중앙선과 150/300 mm 설치 위치선을 표시하며, 아래 2D 배치도는 상단(중앙선 Z=0)과 측면(거리)으로 전환할 수 있습니다. BOX는 조립 상태가 기본이며 내부 보기는 별도 버튼으로 켭니다.
- 최신 `INFRIUM_sensor_spec.docx` v0.1(2026-11-25)을 반영했습니다. 1 scene unit = 100 mm이며 좌표는 미터 기준입니다. BOX A1 (0.15, 0.12, 0), A2 (0.30, 0.12, 0), T1 (0.30, 0.12, 0.06), TRUSS A3/A4/T2도 각각 동일 좌표를 사용합니다. X는 경간 시작점, Y는 높이, Z는 폭 중앙입니다. Y와 온도 위치는 임시값이며 API 실측 좌표에 쓰지 않습니다. 화면에서는 지지대 높이를 더해 모형에 표시합니다.
- `src/data/sensorPlacement.ts`에서 배치를 관리합니다. 교량 식별자는 BRIDGE_BOX_01 / BRIDGE_TRUSS_01, 센서는 A1~A4와 T1~T2, 종류는 ACCELEROMETER / TEMPERATURE입니다. 구형 ACC_BOX_01 등과의 자동 별칭 매핑을 제거했습니다. 센서 ID·종류가 모두 맞고 유일한 경우에만 현재 교량의 DB 센서에 연결합니다. 이전 센서는 기존 목록에서 조회할 수 있지만 새 배치도의 센서로 취급하지 않습니다.
- 가속도 SEN0405(LIS2DW12) 4개, 온도 DS18B20 2개, ESP32-WROOM-32D 2개의 설계 정보와 초기 제안(가속도 ±2 g·100 Hz, 온도 1 Hz)을 안내합니다. 실제 수집률·배선은 검증 전이고 화면 폴링은 기존 10초를 유지합니다. 센서 축과 모델 축의 대응은 미확정이며 온도는 설치부 주변 온도입니다.
- API 경로와 전체 제안 응답 구조는 확정되지 않았으므로 기존 REST 조회를 유지합니다. 기존 측정 레코드에 accel_x/accel_y/accel_z 또는 temperature가 실제 제공되면 그래프·표·CSV에 표시합니다. timestamp는 measured_at이 없을 때만 대응하며 null 측정 시각은 표에 보존하고 그래프에서는 제외합니다. 필수 관계 PK 등이 없는 제안 형식 전체의 연결은 백엔드 최종 계약이 필요합니다.
- 3축 값을 단일 value로부터 생성하지 않습니다. null/INVALID는 그래프 선을 끊으며 최근 최대 600개 항목을 표시합니다. connection_status가 실제 센서 응답에 있으면 ONLINE/OFFLINE/ERROR를 표시하고 미제공은 UNKNOWN입니다. is_active·품질로 연결 여부를 추정하지 않으며 AI 등급을 센서에 임의 배분하지 않습니다.
- 배치도·3D 마커 클릭 시 대응 DB 센서가 있으면 기존 선택 센서 상세로 연결합니다. DB에 없는 센서는 연결 대기로 표시하며 측정값이나 온라인 상태를 생성하지 않습니다. STRAIN/DISP 등 배치도에 없는 기존 DB 센서도 목록에서 그대로 조회할 수 있습니다.
- `src/components/bridgeModel.ts`에서 도안 형상을, `src/design.css`에서 사용자 제공 차콜·회색 UI 팔레트와 반응형 스타일을 관리합니다. 기본 배경은 #F1F4F6, 카드 #FDFDFD, 본문 #434343, 헤더 #3D494F, 강조 #53616B입니다. 정상 #4BA758, 주의 #FFD233, 경고 #FA8215, 위험 #DA2D31은 상태 색상으로 구분합니다.
- 디자인 참고: [AnimateIcons](https://animateicons.in/)의 아이콘 모션, [SHI UI](https://shi-ui.vercel.app/)의 선과 제한된 색상, [Tween UI](https://tween-ui.vercel.app/)의 짧은 전환, [Minimal Gallery](https://minimal.gallery/)의 여백과 시각적 위계. 외부 컴포넌트 코드를 복제하거나 패키지를 설치하지 않고 기존 React/CSS로 구현했습니다. 모션 감소 설정을 지원합니다.

## 새 알림 표시와 이동

- 기존 10초 조회에서 새 alert ID를 감지하면 화면 오른쪽 위에 클릭 가능한 알림 팝업을 표시합니다.
- 최초 조회의 기존 기록은 팝업으로 쏟아내지 않으며, 같은 ID는 재조회/정렬 변경으로 다시 알리지 않습니다.
- 종 아이콘은 미확인 개수와 최근 알림 목록을 표시합니다. 팝업/목록 항목은 `/#/alerts?alert=ID` 상세로 이동합니다.
- 알림 화면은 날짜별 목록, 전체/미확인 필터, 모두 읽음, 상세 및 처리 이력을 제공합니다.
- 읽음 상태는 이 브라우저의 localStorage에 저장하며 백엔드 확인/점검/해결 상태와 구분합니다.
- 종 아이콘 목록 또는 알림 화면의 '브라우저 알림 켜기'를 누르면 사용자 권한을 요청합니다. 허용 전에는 OS 알림을 띄우지 않습니다.
- 권한과 환경이 지원되면 서비스 워커의 시스템 알림을 표시하고, 클릭하면 열린 탭을 활성화하거나 상세 주소를 새로 엽니다.
- 현재 수신은 페이지가 열린 상태의 폴링입니다. 탭/브라우저를 닫은 상태에서 새 알림을 전달하는 Web Push는 백엔드 구독 API/VAPID 및 발송 연동이 별도로 필요합니다.
- 임의 DB 알림을 생성하거나 푸시 구독을 서버에 저장하지 않습니다. 현재 실제 알림 목록이 비어 있으면 팝업도 발생하지 않습니다.

## 관련 파일

- `src/API.js`: 서버 origin, 경로, 요청 헤더/오류/제한 시간
- `src/services/workspace.ts`: 실제 서버 조회만 수행
- `src/services/normalize.ts`: DTO 매핑, 정렬, 시간 변환
- `src/hooks/useWorkspace.ts`: 로딩/오류/갱신 상태
- `src/components/RecordsTable.tsx`: 실제 DB 분석 레코드 표
- `src/hooks/useAlertNotifications.ts`: 새 알림 감지, 미확인 상태, 팝업/OS 알림
- `src/services/alertPresentation.ts`: 알림 표시 데이터와 상세 주소 매핑
- `src/services/browserNotifications.ts`, `public/notifications-sw.js`: 권한 요청과 OS 알림 클릭 처리
- `src/components/NotificationCenter.tsx`, `src/components/AlertFeed.tsx`: 종 아이콘 목록과 알림 UI
- `tests/fixtures/backend.ts`: 자동 검증 전용 fixture. 앱에서 import하지 않음

## 검사

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run verify
npm.cmd run format:check
```

verify는 외부 서버를 호출하지 않습니다. 테스트 fixture 응답으로 API 전용 화면, 관계 매핑,
기간 필터, 정렬, 빈 결과/오류, 임의 인증 제거, 네트워크 실패 시 fallback 없는 동작을 검증합니다.
브라우저의 실제 CORS/화면 상호작용은 서버가 실행 중일 때 별도로 확인해야 합니다.
