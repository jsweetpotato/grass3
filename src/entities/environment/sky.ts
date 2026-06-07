import { BackSide, CylinderGeometry, Mesh, MeshBasicMaterial, MeshBasicNodeMaterial, RepeatWrapping, Scene } from "three/webgpu";
import { texture, time, uv, vec2 } from "three/tsl";

// managers
import { Assets } from "@/core/resources";

export class Sky {
  constructor(scene: Scene) {
    const { background } = Assets.get();

    // 3. 지오메트리 생성 (위반지름, 아래반지름, 높이, 원둘레분할수)
    const geometry = new CylinderGeometry(500, 500, 500, 32);

    // 4. 메쉬를 만들 때 방금 만든 '배열'을 그대로 전달
    background.wrapS = RepeatWrapping;
    background.wrapT = RepeatWrapping;

    const circlemat = new MeshBasicMaterial();
    const skyMat = new MeshBasicNodeMaterial({ side: BackSide });

    const materials = [skyMat, circlemat, circlemat];

    const timer = time.mul(0.0005);

    const remapedUV = vec2(uv().x.mul(2).add(timer), uv().y.mul(1.3)).toVar();
    const skyMap = texture(background, remapedUV);
    skyMat.colorNode = skyMap;

    const cylinder = new Mesh(geometry, materials);

    cylinder.position.set(0, 140, 0);
    // background.mapping = THREE.EquirectangularRefractionMapping;
    scene.add(cylinder);
  }
}
