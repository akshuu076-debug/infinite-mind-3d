import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const loading=document.querySelector('#loading'), menu=document.querySelector('#menu'), hud=document.querySelector('#hud');
const renderer=new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.1; document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x090f1b); scene.fog=new THREE.Fog(0x090f1b,13,34);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,100); camera.position.set(0,1.65,5);
scene.add(new THREE.HemisphereLight(0x9bcfff,0x18202c,1.5));
const key=new THREE.DirectionalLight(0xc5f4ff,2.4); key.position.set(-4,8,5); key.castShadow=true; key.shadow.mapSize.set(1024,1024); scene.add(key);
const ambient=new THREE.PointLight(0x29cdb8,22,16); ambient.position.set(0,3,-3); scene.add(ambient);
const mat=(c,em=0)=>new THREE.MeshStandardMaterial({color:c,roughness:.55,metalness:.12,emissive:c,emissiveIntensity:em});
const floorMat=mat(0x1b2b3c), wallMat=mat(0x26394b), trimMat=mat(0x4b7488), cubeMat=mat(0x75e7d6,.18), padMat=mat(0x26cdb0,.8), doorMat=mat(0x23394c,.25);
let room=[], interactables=[], held=null, pad, door, level=1, mode='endless', solved=false, paused=false, move={x:0,y:0}, yaw=0,pitch=0,velY=0,onGround=true, lastToast=0;
const ray=new THREE.Raycaster(), center=new THREE.Vector2(0,0);
function addBox(w,h,d,x,y,z,material,shadow=true){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;scene.add(m);room.push(m);return m}
function clearRoom(){for(const o of room){scene.remove(o);o.geometry?.dispose()} room=[];interactables=[];held=null;solved=false}
function toast(t){const el=document.querySelector('#toast');el.textContent=t;lastToast=performance.now()+1900}
function buildRoom(n=1){
 clearRoom(); scene.background=new THREE.Color(n%3===0?0x111027:0x090f1b);scene.fog.color.copy(scene.background);
 const width=10,height=5,depth=13;
 addBox(width,.4,depth,0,-.25,-1,floorMat);
 addBox(width,.35,depth,0,height,-1,wallMat);
 addBox(.35,height,depth,-5.1,2.3,-1,wallMat);addBox(.35,height,depth,5.1,2.3,-1,wallMat);
 addBox(width,height,.35,0,2.3,-7.45,wallMat);
 // entrance frame and exit doorway
 addBox(1.8,5,.35,-4.1,2.3,5.4,wallMat);addBox(1.8,5,.35,4.1,2.3,5.4,wallMat);
 for(let i=0;i<8;i++){addBox(.025,4.8,.03,-4.9+i*1.4,2.25,-7.22,trimMat,false)}
 // decorative ceiling strips
 for(let i=-2;i<=2;i++)addBox(.035,.035,10,i*1.8,4.75,-1,trimMat,false);
 // pad and cube locations change but solution remains reachable
 const padX=(n%2?2.5:-2.5), cubeX=-padX;
 pad=addBox(1.35,.13,1.35,padX,.08,-4.8,padMat);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.045,8,40),new THREE.MeshBasicMaterial({color:0x64ffe4}));ring.rotation.x=Math.PI/2;ring.position.set(padX,.17,-4.8);scene.add(ring);room.push(ring);
 const cube=addBox(.8,.8,.8,cubeX,.45,-1.2,cubeMat);cube.userData.pickable=true;cube.userData.baseScale=1;interactables.push(cube);
 // exit door, starts closed
 door=addBox(1.7,3.5,.35,0,1.75,-7.2,doorMat);
 // visual marker
 const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.22,1),new THREE.MeshStandardMaterial({color:0x80fff0,emissive:0x2affdf,emissiveIntensity:2}));orb.position.set(padX,1,-4.8);scene.add(orb);room.push(orb);
 // scattered columns create navigation
 for(let i=0;i<3;i++){const x=(i-1)*2.4;addBox(.55,1.3,.55,x,.65,-2.8-(i%2)*1.3,trimMat)}
 camera.position.set(0,1.65,5.2);yaw=0;pitch=0;camera.rotation.set(0,0,0);
 document.querySelector('#levelLabel').textContent=(mode==='story'?'CHAPTER ':mode==='challenge'?'TRIAL ':'ROOM ')+n;
 document.querySelector('#objective').textContent='Pick up the prism and place it on the glowing pad.';
}
function start(m){mode=m;level= m==='story'?1:Number(localStorage.getItem('idm_best')||0)+1;menu.classList.add('hidden');hud.classList.remove('hidden');document.querySelector('#modeLabel').textContent=m.toUpperCase();buildRoom(level);paused=false}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>start(b.dataset.mode));
function direction(){camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch}
function getTarget(){ray.setFromCamera(center,camera);return ray.intersectObjects(interactables,false)[0]}
function grab(){if(held){held.position.copy(camera.position).add(new THREE.Vector3(0,-.15,-2).applyQuaternion(camera.quaternion));held=null;toast('Prism released');return}
 const hit=getTarget();if(hit&&hit.distance<5){held=hit.object;toast('Prism picked up. Move closer or farther to resize.')}else toast('Look at the prism to pick it up.')}
document.querySelector('#grab').onclick=grab;
document.querySelector('#hintBtn').onclick=()=>toast('Hint: carry the glowing prism onto the floor pad.');
document.querySelector('#jump').onclick=()=>{if(onGround){velY=5.2;onGround=false}};
document.querySelector('#pause').onclick=()=>{paused=true;document.querySelector('#pausePanel').classList.remove('hidden')};
document.querySelector('#resume').onclick=()=>{paused=false;document.querySelector('#pausePanel').classList.add('hidden')};
document.querySelector('#restart').onclick=()=>{document.querySelector('#pausePanel').classList.add('hidden');paused=false;buildRoom(level)};
document.querySelector('#home').onclick=()=>{paused=false;document.querySelector('#pausePanel').classList.add('hidden');hud.classList.add('hidden');menu.classList.remove('hidden')};
document.querySelector('#winHome').onclick=()=>{document.querySelector('#winPanel').classList.add('hidden');hud.classList.add('hidden');menu.classList.remove('hidden')};
document.querySelector('#next').onclick=()=>{document.querySelector('#winPanel').classList.add('hidden');level++;buildRoom(level)};
function complete(){if(solved)return;solved=true;door.position.y=7;localStorage.setItem('idm_best',String(Math.max(level,Number(localStorage.getItem('idm_best')||0))));document.querySelector('#winText').textContent=`Room ${level} cleared. Your next dimension is ready.`;document.querySelector('#winPanel').classList.remove('hidden');paused=true}
const stick=document.querySelector('#stick'),knob=document.querySelector('#knob');let stickId=null;
stick.addEventListener('pointerdown',e=>{stickId=e.pointerId;stick.setPointerCapture(stickId);updateStick(e)});
stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)updateStick(e)});
function updateStick(e){const r=stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),len=Math.hypot(dx,dy),k=Math.min(34,len),a=Math.atan2(dy,dx);move.x=Math.cos(a)*k/34;move.y=-Math.sin(a)*k/34;knob.style.transform=`translate(${Math.cos(a)*k}px,${Math.sin(a)*k}px)`}
function resetStick(){stickId=null;move={x:0,y:0};knob.style.transform=''}
stick.addEventListener('pointerup',resetStick);stick.addEventListener('pointercancel',resetStick);
let lookId=null,lastX=0,lastY=0;
renderer.domElement.addEventListener('pointerdown',e=>{if(e.clientX<innerWidth*.38&&e.clientY>innerHeight*.55)return;lookId=e.pointerId;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(lookId)});
renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId!==lookId||paused||!hud.classList.contains('hidden')===false)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;yaw-=dx*.004;pitch=Math.max(-1.35,Math.min(1.35,pitch-dy*.004));direction()});
renderer.domElement.addEventListener('pointerup',e=>{if(e.pointerId===lookId)lookId=null});
window.addEventListener('keydown',e=>{if(e.code==='KeyW')move.y=1;if(e.code==='KeyS')move.y=-1;if(e.code==='KeyA')move.x=-1;if(e.code==='KeyD')move.x=1;if(e.code==='KeyE')grab();if(e.code==='Space')document.querySelector('#jump').click()});
window.addEventListener('keyup',e=>{if(['KeyW','KeyS'].includes(e.code))move.y=0;if(['KeyA','KeyD'].includes(e.code))move.x=0});
let last=performance.now();
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.04);last=now;if(!paused&&!hud.classList.contains('hidden')){
 const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
 const step=forward.multiplyScalar(move.y).add(right.multiplyScalar(move.x));if(step.length()>1)step.normalize();camera.position.addScaledVector(step,4*dt);
 velY-=12*dt;camera.position.y+=velY*dt;if(camera.position.y<1.65){camera.position.y=1.65;velY=0;onGround=true}
 camera.position.x=THREE.MathUtils.clamp(camera.position.x,-4.5,4.5);camera.position.z=THREE.MathUtils.clamp(camera.position.z,-6.7,5.8);
 if(held){const dist=THREE.MathUtils.clamp(2.1+(move.y*.5),1.2,3.3);const p=camera.position.clone().add(new THREE.Vector3(0,0,-dist).applyQuaternion(camera.quaternion));held.position.lerp(p,.3);const s=THREE.MathUtils.clamp(2.1/dist,.65,1.8);held.scale.setScalar(s)}
 if(pad&&interactables[0]){const c=interactables[0];const onPad=Math.abs(c.position.x-pad.position.x)<.72&&Math.abs(c.position.z-pad.position.z)<.72&&c.position.y<.9;if(onPad)complete()}
 }
 renderer.render(scene,camera)}
requestAnimationFrame(animate);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
loading.remove();
