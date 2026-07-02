# assets — 캐릭터 이미지 폴더

이 폴더에 아래 파일명으로 PNG 이미지를 넣으면 **게임이 자동으로 해당 이미지를 사용**합니다.
파일이 없으면 내장 픽셀 아트 스프라이트로 표시됩니다. (별도 설정 불필요, 새로고침만 하면 됨)

| 파일명 | 용도 |
|---|---|
| `knight_idle.png` | 기사 대기 모습 (첨부한 기사 서있는 이미지) |
| `knight_attack.png` | 기사 공격 모습 (첨부한 기사 검 휘두르는 이미지) |
| `rogue_idle.png` | 도적 대기 모습 (첨부한 쌍단검 이미지) |
| `rogue_attack.png` | 도적 공격 모습 (첨부한 검 찌르기 이미지) |
| `merchant_idle.png` | 상인 대기 모습 |
| `merchant_attack.png` | 상인 공격 모습 (첨부한 주머니 던지기 이미지) |
| `mage_idle.png` / `mage_attack.png` | 마법사 |
| `gladiator_idle.png` / `gladiator_attack.png` | 검투사 |
| `slime_idle.png` | 몬스터 (슬라임) — 색상은 게임이 자동으로 변형 |

- 권장: 정사각형 투명 배경 PNG (예: 1024×1024)
- `_attack.png` 가 없으면 `_idle.png` 를 공격 모션에도 사용합니다.
- 캐릭터는 **오른쪽을 바라보는 그림**이어야 자연스럽습니다 (몬스터는 자동 반전).
