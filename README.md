## 최적화

- [x] atlas texture map UV 계산 코드 ->[ DataArrayTexture](https://threejs.org/docs/#DataArrayTexture)로 변경해서 최적화 하기

```glsl
uniform sampler2DArray atlas;
//...
gl_FragColor = texture(atlas, vec3(vUv, vTextureId));
```

- [x] grass chunk 단위로 분리
- [x] LOD 적용

## 그래픽

- [ ] 물 glsl 코드 좀더 예쁘게 변경(마스크 먼저 변경 후 작업)
- [ ] 전체 환경 맵에 디테일한 오브젝트를 넣어서 꽉 차 보이게 만들기

## 궁금한거

ground에서 trimesh로 생성한 collider가 heightfield보다 더 캐릭터 조작감이 좋을까? -> 개구림 걍 heightfield쓰는게 맞음

# bug fix

- [x] 공중 부양 조개 수정
- [x] 공중 부양 나무 수정
- [ ] ground mask 수정
- [x] 캐릭터 물에 들어갔을때 위로 뜨기
- collier 추가
  - [x] 돌
  - [x] 나무
  - [x] 집
  - [x] 다리
    - [x] 다리 기둥 위치 데이터 가져와서 기둥 심기
    - [x] 상판

  - [ ] 이동 범위 제한 박스

오늘 할일

1. 캐릭터 변경
2. 수영하는 애니메이션 추가

- [x] 수영하는 애니메이션 오른쪽 다리 수정

오늘 할일 2

1. 사운드 이팩트 구현
