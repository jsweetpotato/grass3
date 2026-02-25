## 최적화

- [ ] atlas texture map UV 계산 코드 ->[ DataArrayTexture](https://threejs.org/docs/#DataArrayTexture)로 변경해서 최적화 하기

```glsl
uniform sampler2DArray atlas;
//...
gl_FragColor = texture(atlas, vec3(vUv, vTextureId));
```

- [ ] grass chunk 단위로 분리
- [ ] LOD 적용

## 그래픽

- [ ] 물 glsl 코드 좀더 예쁘게 변경
- [ ] 전체 환경 맵에 디테일한 오브젝트를 넣어서 꽉 차 보이게 만들기

## 궁금한거

ground에서 trimesh로 생성한 collider가 heightfield보다 더 캐릭터 조작감이 좋을까? -> 개구림 걍 heightfield쓰는게 맞음

empty mesh를 블렌더에서 하나 생성해서 거기에 instancedMesh를 위한 vertex position 더미들을 여러개 저장해서 compression export하면 cpu연산없이 해당 값만 참조후 인스턴스를 만들 수 있지 않을까?
-> 그러면 지형 height에 맞춰서 어떻게..? 지형 height도 같이 position에 포함해서 저장하면 되는거 아닌가?
-> 그러면 noise는 어떻게..? position wold사용해서 uv scale 재 조정하고 noise를 모델 uv가 아니라 iPos에 적용...?
-> 나무로 테스트 해보자.
