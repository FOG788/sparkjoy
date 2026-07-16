import * as THREE from './vendor/three.module.min.js';

const MathModel=globalThis.SparkJoyHourglassMath;
if(!MathModel) throw new Error('SparkJoyHourglassMath is required');

const DEG=Math.PI/180;

function makeWoodTexture(renderer){
  const canvas=document.createElement('canvas');
  canvas.width=256;canvas.height=256;
  const context=canvas.getContext('2d');
  const gradient=context.createLinearGradient(0,0,256,0);
  gradient.addColorStop(0,'#2b0906');gradient.addColorStop(.35,'#75291a');gradient.addColorStop(.62,'#3c0e0a');gradient.addColorStop(1,'#8c3620');
  context.fillStyle=gradient;context.fillRect(0,0,256,256);
  context.globalCompositeOperation='screen';
  for(let index=0;index<70;index++){
    const y=(index*37)%256;
    context.strokeStyle=`rgba(255,174,95,${0.025+(index%5)*0.012})`;
    context.lineWidth=1+(index%3)*.35;
    context.beginPath();context.moveTo(0,y);
    for(let x=0;x<=256;x+=12) context.lineTo(x,y+Math.sin(x*.045+index)*3+Math.sin(x*.13+index*.7));
    context.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function latheSolid(points,segments,material){
  const geometry=new THREE.LatheGeometry(points,segments,0,Math.PI*2);
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);
  mesh.castShadow=true;mesh.receiveShadow=true;
  return mesh;
}

function addRing(group,y,radius,tube,material,segments){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,10,segments),material);
  ring.rotation.x=Math.PI/2;ring.position.y=y;ring.castShadow=true;
  group.add(ring);return ring;
}

function makeParticleCloud(count,material){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(count*3),3));
  const points=new THREE.Points(geometry,material);
  points.frustumCulled=false;
  return points;
}

export function createHourglassRenderer(canvas,options={}){
  const mobile=options.mobile??matchMedia('(max-width: 720px)').matches;
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:!mobile,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.24;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=mobile?THREE.BasicShadowMap:THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000,0);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(31,1,.1,100);
  const baseCamera=new THREE.Vector3(7.2,4.7,9.6);
  camera.position.copy(baseCamera);camera.lookAt(0,.05,0);
  const world=new THREE.Group();world.rotation.y=-9*DEG;scene.add(world);
  const segments=mobile?28:52;

  const woodTexture=makeWoodTexture(renderer);
  const wood=new THREE.MeshPhysicalMaterial({map:woodTexture,color:0x6f2416,roughness:.29,metalness:.06,clearcoat:1,clearcoatRoughness:.14});
  const woodDark=new THREE.MeshStandardMaterial({map:woodTexture,color:0x3a0c08,roughness:.4,metalness:.08});
  const brass=new THREE.MeshPhysicalMaterial({color:0xd6a63c,metalness:.93,roughness:.2,clearcoat:.45,clearcoatRoughness:.16});
  const brassDark=new THREE.MeshStandardMaterial({color:0x7c4c13,metalness:.9,roughness:.3});
  const glass=new THREE.MeshPhysicalMaterial({color:0xdbeeff,transparent:true,opacity:.24,roughness:.08,metalness:0,transmission:.86,thickness:.42,ior:1.47,clearcoat:1,clearcoatRoughness:.04,side:THREE.DoubleSide,depthWrite:false});
  const sand=new THREE.MeshPhysicalMaterial({color:0xf3b72f,emissive:0x6d2500,emissiveIntensity:.22,metalness:.18,roughness:.32,clearcoat:.25});
  const sandBright=new THREE.PointsMaterial({color:0xffd86b,size:mobile?.055:.045,transparent:true,opacity:.88,depthWrite:false,blending:THREE.AdditiveBlending});

  const baseProfile=[new THREE.Vector2(0,-.34),new THREE.Vector2(2.18,-.34),new THREE.Vector2(2.32,-.22),new THREE.Vector2(2.36,.02),new THREE.Vector2(2.18,.22),new THREE.Vector2(1.9,.32),new THREE.Vector2(0,.32)];
  const lowerBase=latheSolid(baseProfile,segments,wood);lowerBase.position.y=-3.05;world.add(lowerBase);
  const upperBase=latheSolid(baseProfile,segments,wood);upperBase.rotation.z=Math.PI;upperBase.position.y=3.05;world.add(upperBase);
  for(const y of [-2.72,2.72]){
    addRing(world,y,1.86,.085,brass,segments);
    addRing(world,y+(y<0?-.23:.23),2.18,.045,brassDark,segments);
  }

  const postGeometry=new THREE.CylinderGeometry(.105,.14,5.62,18);
  for(const angle of [42,138,222,318]){
    const rad=angle*DEG;
    const post=new THREE.Mesh(postGeometry,brass);
    post.position.set(Math.cos(rad)*1.82,0,Math.sin(rad)*1.82);post.castShadow=true;world.add(post);
    for(const y of [-2.68,2.68]){
      const collar=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.24,18),brassDark);
      collar.position.set(post.position.x,y,post.position.z);collar.castShadow=true;world.add(collar);
    }
  }

  const glassPoints=[];
  const halfHeight=2.45;
  for(let index=0;index<=48;index++){
    const y=-halfHeight+halfHeight*2*(index/48);
    const normalized=Math.abs(y)/halfHeight;
    const radius=.17+1.34*Math.pow(MathModel.chamberRadius(normalized),.98);
    glassPoints.push(new THREE.Vector2(radius,y));
  }
  const glassMesh=latheSolid(glassPoints,segments,glass);glassMesh.castShadow=false;world.add(glassMesh);
  for(const y of [-2.42,2.42]) addRing(world,y,1.5,.07,brass,segments);

  const ground=new THREE.Mesh(new THREE.CircleGeometry(3.6,48),new THREE.ShadowMaterial({color:0x000000,opacity:.34}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-3.42;ground.receiveShadow=true;scene.add(ground);
  const halo=new THREE.Mesh(new THREE.RingGeometry(1.35,2.45,64),new THREE.MeshBasicMaterial({color:0xffc94b,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));
  halo.rotation.x=-Math.PI/2;halo.position.y=-2.67;world.add(halo);

  scene.add(new THREE.HemisphereLight(0xaccdff,0x210704,.82));
  const key=new THREE.DirectionalLight(0xffbd79,4.2);key.position.set(-4,7,6);key.castShadow=true;key.shadow.mapSize.set(mobile?512:1024,mobile?512:1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;scene.add(key);
  const rim=new THREE.DirectionalLight(0x73b9ff,3.1);rim.position.set(5,2,-5);scene.add(rim);
  const glow=new THREE.PointLight(0xffb52e,0,9,2);glow.position.set(0,-1.9,0);world.add(glow);

  let upperSand=null;
  let lowerSand=null;
  let lastRatio=-1;
  function sandRadius(position){return .92*MathModel.chamberRadius(position);}
  function replaceSand(state){
    if(upperSand){world.remove(upperSand);upperSand.geometry.dispose();}
    if(lowerSand){world.remove(lowerSand);lowerSand.geometry.dispose();}
    upperSand=lowerSand=null;
    if(state.upperVolume>.00001){
      const points=[new THREE.Vector2(0,.06),new THREE.Vector2(sandRadius(0),.06)];
      const rings=18;
      for(let i=1;i<=rings;i++){const p=state.upperBoundary*i/rings;points.push(new THREE.Vector2(sandRadius(p),.06+p*2.27));}
      points.push(new THREE.Vector2(0,.06+state.upperBoundary*2.27));
      upperSand=latheSolid(points,segments,sand);world.add(upperSand);
    }
    if(state.lowerVolume>.00001){
      const points=[new THREE.Vector2(0,-.06-state.lowerBoundary*2.27),new THREE.Vector2(sandRadius(state.lowerBoundary),-.06-state.lowerBoundary*2.27)];
      const rings=18;
      for(let i=1;i<=rings;i++){const p=state.lowerBoundary+(1-state.lowerBoundary)*i/rings;points.push(new THREE.Vector2(sandRadius(p),-.06-p*2.27));}
      points.push(new THREE.Vector2(0,-2.33));
      lowerSand=latheSolid(points,segments,sand);world.add(lowerSand);
    }
  }

  const streamCount=mobile?18:34;
  const stream=makeParticleCloud(streamCount,sandBright);world.add(stream);
  const burstCount=mobile?38:90;
  const burst=makeParticleCloud(burstCount,new THREE.PointsMaterial({color:0xffd45c,size:mobile?.075:.06,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));world.add(burst);
  const burstVelocity=Array.from({length:burstCount},(_,index)=>{
    const angle=index*2.399963;
    const speed=.8+(index%11)*.085;
    return new THREE.Vector3(Math.cos(angle)*speed,.45+(index%7)*.13,Math.sin(angle)*speed);
  });

  const completionGate=MathModel.createCompletionGate();
  let completionStarted=-Infinity;
  let currentTime=0;
  let flowActive=false;
  let effectsEnabled=true;
  let reducedMotion=false;
  let disposed=false;
  let kick=new THREE.Vector3();
  let velocity=new THREE.Vector3();

  function updateStream(time){
    const positions=stream.geometry.attributes.position.array;
    for(let index=0;index<streamCount;index++){
      const phase=(time*(1.15+(index%5)*.08)+index/streamCount)%1;
      positions[index*3]=Math.sin(index*17.3+time*4)*.025*(1-phase);
      positions[index*3+1]=.04-phase*1.66;
      positions[index*3+2]=Math.cos(index*11.7+time*3.2)*.025*(1-phase);
    }
    stream.geometry.attributes.position.needsUpdate=true;
    stream.visible=flowActive;
  }

  function updateCompletion(time){
    const age=time-completionStarted;
    const active=age>=0&&age<1.65&&effectsEnabled&&!reducedMotion;
    burst.visible=active;halo.visible=active;
    if(!active){burst.material.opacity=0;halo.material.opacity=0;glow.intensity=0;return;}
    const fade=Math.pow(1-age/1.65,1.6);
    const positions=burst.geometry.attributes.position.array;
    for(let index=0;index<burstCount;index++){
      positions[index*3]=burstVelocity[index].x*age;
      positions[index*3+1]=-2.15+burstVelocity[index].y*age-1.35*age*age;
      positions[index*3+2]=burstVelocity[index].z*age;
    }
    burst.geometry.attributes.position.needsUpdate=true;
    burst.material.opacity=fade;
    halo.scale.setScalar(1+age*.65);halo.material.opacity=.65*fade;
    glow.intensity=18*fade;
  }

  function resize(){
    if(disposed) return;
    const rect=canvas.getBoundingClientRect();
    const width=Math.max(1,Math.round(rect.width));
    const height=Math.max(1,Math.round(rect.height));
    const dpr=Math.min(window.devicePixelRatio||1,mobile?1.35:2);
    renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);
    camera.aspect=width/height;camera.updateProjectionMatrix();
  }

  function impulse(strength=1){
    if(!effectsEnabled||reducedMotion||disposed) return;
    const amount=Math.max(0,Math.min(1,Number(strength)||0));
    velocity.x+=((Math.random()-.5)*2)*amount*.055;
    velocity.y+=(Math.random()-.38)*amount*.032;
    velocity.z+=((Math.random()-.5)*2)*amount*2.2*DEG;
  }

  function render({ratio=0,flowEnabled=true,timeSec=0,effects=true,reduced=false}={}){
    if(disposed) return;
    currentTime=Number(timeSec)||0;
    effectsEnabled=effects!==false;
    reducedMotion=!!reduced;
    const state=MathModel.computeSandState(ratio);
    if(Math.abs(state.ratio-lastRatio)>1e-5){replaceSand(state);lastRatio=state.ratio;}
    flowActive=!!flowEnabled&&effectsEnabled&&!reducedMotion&&state.ratio>0&&state.ratio<1;
    if(completionGate.update(state.ratio)&&effectsEnabled&&!reducedMotion) completionStarted=currentTime;
    updateStream(currentTime);
    updateCompletion(currentTime);

    if(effectsEnabled&&!reducedMotion){
      velocity.addScaledVector(kick,-.16);velocity.multiplyScalar(.78);kick.add(velocity);
      kick.x=THREE.MathUtils.clamp(kick.x,-.02,.02);
      kick.y=THREE.MathUtils.clamp(kick.y,-.02,.02);
      kick.z=THREE.MathUtils.clamp(kick.z,-4*DEG,4*DEG);
    }else{kick.set(0,0,0);velocity.set(0,0,0);}
    camera.position.set(baseCamera.x+kick.x*10,baseCamera.y+kick.y*10,baseCamera.z);
    camera.up.set(Math.sin(kick.z),Math.cos(kick.z),0);camera.lookAt(0,.05,0);
    key.intensity=4.2+(flowActive?Math.sin(currentTime*7)*.12:0);
    renderer.render(scene,camera);
  }

  function needsAnimation(){
    const completionActive=effectsEnabled&&!reducedMotion&&currentTime-completionStarted<1.65;
    return flowActive||completionActive||kick.lengthSq()>1e-7||velocity.lengthSq()>1e-7;
  }

  function dispose(){
    if(disposed) return;disposed=true;
    scene.traverse((object)=>{if(object.geometry)object.geometry.dispose();if(object.material){const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach((material)=>material.dispose());}});
    woodTexture.dispose();renderer.dispose();
  }

  resize();
  return Object.freeze({render,impulse,resize,needsAnimation,dispose});
}
