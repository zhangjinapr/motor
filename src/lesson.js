'use strict';
const $=id=>document.getElementById(id), V=(x,y,z)=>new THREE.Vector3(x,y,z);
const scene=new THREE.Scene();scene.background=new THREE.Color('#000000');scene.fog=new THREE.Fog('#000000',24,65);
const canvas=$('view'), renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
const camera=new THREE.PerspectiveCamera(36,1,.1,100);scene.add(new THREE.HemisphereLight(0xffffff,0x829aa4,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(5,10,8);scene.add(light);
const model=new THREE.Group();scene.add(model);
const GROUND_Y=-2.35;
const mat=(color,metalness=.1)=>new THREE.MeshStandardMaterial({color,metalness,roughness:.4});
const copper=mat('#c3c6c9',.55), metal=mat('#969da7',.35);
function box(w,h,d,material,pos,parent=model){let m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.copy(pos);parent.add(m);return m;}
function pipe(points,r,material,parent=model,curved=false){const curve=curved?new THREE.CatmullRomCurve3(points):new THREE.CurvePath();if(!curved)for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(points[i-1],points[i]));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,curved?48:80,r,10,false),material);parent.add(mesh);return mesh;}
function texture(text,color='#153743',bg=null){let c=document.createElement('canvas');c.width=/^[a-zA-Z+−]$/.test(text)?128:Math.max(128,text.length*76+30);c.height=128;let x=c.getContext('2d');if(bg){x.fillStyle=bg;x.fillRect(0,0,c.width,128);}x.font='bold 70px "Microsoft YaHei", sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle=color;x.fillText(text,c.width/2,64);let t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function label(text,pos,color='#153743',scale=1,parent=model){let t=texture(text,color),s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false}));s.position.copy(pos);s.scale.set(scale,scale*128/t.image.width,1);parent.add(s);return s;}
function surfaceLabel(text,pos,w,h,parent=model){let p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture(text,'#ffffff'),transparent:true,depthWrite:false}));p.position.copy(pos);parent.add(p);return p;}
// Follow the supplied textbook model: concave pole faces, a silver strip coil,
// a dashed axis and flexible leads. No shaft bearings or extra stands.
function pole(sign,color){const s=new THREE.Shape(),mirror=sign===1?-1:1,bottom=GROUND_Y-.05+.025;s.moveTo(mirror*-.68,bottom);s.lineTo(mirror*.68,bottom);s.lineTo(mirror*.68,-1.62);s.quadraticCurveTo(mirror*-.45,0,mirror*.68,1.62);s.lineTo(mirror*-.68,1.62);s.closePath();
const g=new THREE.ExtrudeGeometry(s,{depth:2.0,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,curveSegments:32});g.translate(0,0,-1.0);g.computeBoundingBox();const material=mat(color);material.transparent=true;material.opacity=.72;material.depthWrite=false;const m=new THREE.Mesh(g,material);m.position.set(sign*2.62,GROUND_Y-g.boundingBox.min.y,0);const outline=new THREE.LineSegments(new THREE.EdgesGeometry(g,25),new THREE.LineBasicMaterial({color,transparent:true,opacity:.85}));m.add(outline);model.add(m);return m;}
const sm=pole(-1,'#197fa8'),nm=pole(1,'#d85840');
surfaceLabel('S',V(-.22,.10,1.03),.65,.50,sm);surfaceLabel('N',V(.22,.10,1.03),.65,.50,nm);
surfaceLabel('张专注物理',V(-.02,-1.72,1.032),1.22,.38,sm);surfaceLabel('张专注物理',V(.02,-1.72,1.032),1.22,.38,nm);
const statorLabels=[sm,nm].map(magnet=>label('定子',V(0,1.12,1.08),'#ffffff',.65,magnet));
const floor=new THREE.GridHelper(200,200,0x294047,0x122329);floor.position.y=GROUND_Y;scene.add(floor);
// The neutral plane is fixed in the yz plane: its normal is parallel to B.
// It follows whole-model panning but does not turn with the coil.
const neutralPlane=new THREE.Mesh(new THREE.PlaneGeometry(4.8,3.5),new THREE.MeshBasicMaterial({color:0x808080,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}));
neutralPlane.rotation.y=Math.PI/2;model.add(neutralPlane);neutralPlane.visible=false;
const rotor=new THREE.Group();model.add(rotor);const R=1.35,Z=1.0,ZF=Z+.85,NECK=.24;
const COIL_WIDTH=.075,COIL_DEPTH=.045,COIL_BEVEL=.006,COIL_FACE=COIL_DEPTH/2+COIL_BEVEL+.0005;
// Reference shape: the front arms first converge toward the axis, then
// bend outward into two parallel silver connecting tabs.
function roundedStrip(route,width){const points=roundedCenterline(route),left=[],right=[];
for(let i=0;i<points.length;i++){const before=points[i].clone().sub(points[Math.max(0,i-1)]),after=points[Math.min(i+1,points.length-1)].clone().sub(points[i]);if(before.lengthSq()<1e-12)before.copy(after);if(after.lengthSq()<1e-12)after.copy(before);before.normalize();after.normalize();const n0=new THREE.Vector2(-before.y,before.x),n1=new THREE.Vector2(-after.y,after.x),n=n0.clone().add(n1).normalize(),offset=n.multiplyScalar(width/2/Math.max(.1,n.dot(n0)));left.push(points[i].clone().add(offset));right.push(points[i].clone().sub(offset));}
const shape=new THREE.Shape(),outline=[...left,...right.reverse()];shape.moveTo(-outline[0].x,outline[0].y);for(let i=1;i<outline.length;i++)shape.lineTo(-outline[i].x,outline[i].y);shape.closePath();return shape;}
function roundedCenterline(route){const points=[route[0].clone()];
for(let i=1;i<route.length-1;i++){const p=route[i],back=route[i-1].clone().sub(p),forward=route[i+1].clone().sub(p),d=Math.min(.12,back.length()*.35,forward.length()*.35);const a=p.clone().add(back.normalize().multiplyScalar(d)),b=p.clone().add(forward.normalize().multiplyScalar(d));points.push(a);for(let j=1;j<=8;j++){const t=j/8;points.push(a.clone().multiplyScalar((1-t)**2).add(p.clone().multiplyScalar(2*(1-t)*t)).add(b.clone().multiplyScalar(t*t)));}}
points.push(route[route.length-1].clone());return points;
}
function coilRoute(front=ZF,contact=NECK){const entry=contact===NECK?NECK:.105,tip=contact===NECK?[[front,entry]]:[[front,contact],[front-.08,contact],[ZF+.015,entry]],route=[...tip,[Z+.32,entry],[Z,entry+.32],[Z,R],[-Z,R],[-Z,-R],[Z,-R],[Z,-entry-.32],[Z+.32,-entry],...tip.map(([z,y])=>[z,-y]).reverse()];return route.map(([z,y])=>new THREE.Vector2(z,y));}
function coilBandGeometry(front=ZF,contact=NECK){const band=roundedStrip(coilRoute(front,contact),COIL_WIDTH),geometry=new THREE.ExtrudeGeometry(band,{depth:COIL_DEPTH,bevelEnabled:true,bevelThickness:COIL_BEVEL,bevelSize:COIL_BEVEL,bevelSegments:2,curveSegments:10});geometry.translate(0,0,-COIL_DEPTH/2);geometry.rotateY(Math.PI/2);return geometry;}
const bandGeometry=coilBandGeometry(),coilMesh=new THREE.Mesh(bandGeometry,copper);rotor.add(coilMesh);
const rotorLabel=label('转子',V(0,R+.60,-.55),'#eef4ff',.68,rotor);const rotorGuide=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,R+.40,-.55),V(0,R,-.55)]),new THREE.LineBasicMaterial({color:0xeef4ff,transparent:true,opacity:.85,depthTest:false}));rotor.add(rotorGuide);
const axisGeometry=new THREE.BufferGeometry().setFromPoints([V(0,0,-2.45),V(0,0,2.55)]);const axis=new THREE.Line(axisGeometry,new THREE.LineDashedMaterial({color:0x8e9da8,dashSize:.16,gapSize:.13}));axis.computeLineDistances();model.add(axis);
[['a',R,Z],['b',R,-Z],['c',-R,-Z],['d',-R,Z]].forEach(([t,y,z])=>label(t,V(0,y+(y>0?.25:-.25),z),'#edf3f7',.45,rotor));
const currentGroup=new THREE.Group(),currentForward=new THREE.Group(),currentReverse=new THREE.Group();currentGroup.add(currentForward,currentReverse);rotor.add(currentGroup);const forces=new THREE.Group();model.add(forces);const field=new THREE.Group();model.add(field);
function arrow(dir,pos,length,color,parent){const a=new THREE.ArrowHelper(dir,pos,length,color,.22,.12);parent.add(a);return a;}
// Flat markings on BOTH broad faces of the silver conductor. These are
// attached to the rotor, not floating cones or camera-facing sprites.
function surfaceCurrent(dy,dz,y,z,length){const shape=new THREE.Shape(),tail=.035,head=.068,tip=.15;shape.moveTo(0,-tail/2);shape.lineTo(length-tip,-tail/2);shape.lineTo(length-tip,-head/2);shape.lineTo(length,0);shape.lineTo(length-tip,head/2);shape.lineTo(length-tip,tail/2);shape.lineTo(0,tail/2);shape.closePath();
const material=new THREE.MeshBasicMaterial({color:0xffdc35,side:THREE.DoubleSide,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
for(const polarity of [1,-1]){const geometry=new THREE.ShapeGeometry(shape);geometry.applyMatrix4(new THREE.Matrix4().makeBasis(V(0,dy*polarity,dz*polarity),V(0,-dz*polarity,dy*polarity),V(1,0,0)));for(const side of [-1,1]){const decal=new THREE.Mesh(geometry,material);decal.renderOrder=3;decal.userData.faceNormal=V(side,0,0);decal.position.set(side*COIL_FACE,y+(polarity<0?dy*length:0),z+(polarity<0?dz*length:0));(polarity>0?currentForward:currentReverse).add(decal);}const edgeShape=shape.clone();for(const edge of [-1,1]){const edgeGeometry=new THREE.ShapeGeometry(edgeShape);edgeGeometry.scale(1,COIL_DEPTH/.075,1);edgeGeometry.applyMatrix4(new THREE.Matrix4().makeBasis(V(0,dy*polarity,dz*polarity),V(1,0,0),V(0,dz,-dy)));const decal=new THREE.Mesh(edgeGeometry,material);decal.renderOrder=3;decal.userData.faceNormal=V(0,edge*dz,-edge*dy);decal.position.set(0,y+(polarity<0?dy*length:0)+edge*dz*(COIL_WIDTH/2+COIL_BEVEL+.0005),z+(polarity<0?dz*length:0)-edge*dy*(COIL_WIDTH/2+COIL_BEVEL+.0005));(polarity>0?currentForward:currentReverse).add(decal);}}} 
surfaceCurrent(0,-1,R,.35,.70);surfaceCurrent(0,1,-R,-.35,.70);
surfaceCurrent(-1,0,.35,-Z,.70);
surfaceCurrent(1,0,-1.14,Z,.48);surfaceCurrent(1,0,.66,Z,.43);
// Choose exactly one outward-facing decal per conductor segment.
function selectCurrentFace(normals,view,previous=-1){const scores=normals.map(n=>n.dot(view));let best=0;for(let i=1;i<scores.length;i++)if(scores[i]>scores[best])best=i;if(previous>=0&&scores[previous]>0&&scores[best]-scores[previous]<.06)return previous;return best;}
function updateCurrentFaces(){rotor.updateWorldMatrix(true,false);const eye=rotor.worldToLocal(camera.position.clone());for(const group of [currentForward,currentReverse])for(let i=0;i<group.children.length;i+=4){const faces=group.children.slice(i,i+4),center=faces.reduce((v,m)=>v.add(m.position),V(0,0,0)).multiplyScalar(.25),view=eye.clone().sub(center).normalize(),chosen=selectCurrentFace(faces.map(m=>m.userData.faceNormal),view,faces[0].userData.selectedFace);faces[0].userData.selectedFace=chosen;faces.forEach((m,j)=>m.visible=j===chosen);}}
// Moving yellow markers stay on the conductor's rounded centreline.
function currentPath(front=ZF,contact=NECK){const pts=roundedCenterline(coilRoute(front,contact)),path=new THREE.CurvePath();for(let i=1;i<pts.length;i++)path.add(new THREE.LineCurve3(V(0,pts[i-1].y,pts[i-1].x),V(0,pts[i].y,pts[i].x)));return path;}
const flowingCurrent=new THREE.Group();rotor.add(flowingCurrent);
function positiveChargeTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffe34b';ctx.beginPath();ctx.arc(64,64,54,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff4a0';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#352900';ctx.lineWidth=12;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(38,64);ctx.lineTo(90,64);ctx.moveTo(64,38);ctx.lineTo(64,90);ctx.stroke();const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;}
const flowMaterial=new THREE.SpriteMaterial({map:positiveChargeTexture(),transparent:true,depthTest:false,depthWrite:false});for(let i=0;i<14;i++){const charge=new THREE.Sprite(flowMaterial);charge.scale.set(.16,.16,1);charge.renderOrder=4;flowingCurrent.add(charge);}

let flowDistance=0,flowLastTime=0,flowMode=null,flowPath=null;
function updateCurrentFlow(sign,visible){if(flowMode!==state.commutator){flowMode=state.commutator;flowPath=flowMode?currentPath(COMM_Z-.03,COMM_INNER):currentPath();}const dt=state.time-flowLastTime;if(dt<0)flowDistance=0;else flowDistance+=sign*dt*.9;flowLastTime=state.time;updateExternalFlow(Math.max(0,dt),sign,visible,dt<0);flowingCurrent.visible=visible;const length=flowPath.getLength();flowingCurrent.children.forEach((dot,i)=>{const u=((i/14+flowDistance/length)%1+1)%1;dot.position.copy(flowPath.getPoint(u));});}
const fa=arrow(V(0,1,0),V(0,R,0),1.05,0xff70ad,forces),fc=arrow(V(0,-1,0),V(0,-R,0),1.05,0xff70ad,forces);
const fla=label('F',V(0,2.5,0),'#ff70ad',.38,forces),flc=label('F',V(0,-2.5,0),'#ff70ad',.38,forces);
for(const y of [-.75,0,.75])for(const z of [-.75,.75])arrow(V(-1,0,0),V(2.3,y,z),4.6,0x2599b0,field);
const battery=box(1.35,.74,.75,mat('#9ca8bb'),V(3.15,-2.0,3.35));
const batteryLabel=new THREE.Mesh(new THREE.PlaneGeometry(1.30,.30),new THREE.MeshBasicMaterial({map:texture('−  电 源  +','#397bbe','#ffffff')}));batteryLabel.position.set(0,.18,.381);battery.add(batteryLabel);
const plus=V(3.6,-1.68,3.35),minus=V(2.7,-1.68,3.35);box(.12,.14,.14,mat('#d76146'),plus);box(.12,.14,.14,metal,minus);label('+',plus.clone().add(V(0,.2,0)),'#ff927c',.36);label('−',minus.clone().add(V(0,.2,0)),'#68c8ff',.36);
const switchAssembly=new THREE.Group();model.add(switchAssembly);
box(1.52,.23,.78,mat('#9ca8bb'),V(-2.0,-2.22,3.5),switchAssembly);
box(1.42,.055,.69,mat('#e1e4e7'),V(-2.0,-2.08,3.5),switchAssembly);
const switchA=V(-2.43,-1.87,3.5),switchB=V(-1.57,-1.87,3.5),contactMetal=mat('#cdb071',.65);
box(.20,.20,.34,contactMetal,V(switchA.x,-1.96,3.5),switchAssembly);
box(.22,.065,.34,contactMetal,V(switchB.x,-2.015,3.5),switchAssembly);
// Twin contact jaws straddle the moving flat knife.
for(const z of [3.40,3.60])box(.22,.21,.055,contactMetal,V(switchB.x,-1.90,z),switchAssembly);
const hinge=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.37,16),metal);hinge.rotation.x=Math.PI/2;hinge.position.copy(switchA);switchAssembly.add(hinge);
const lever=new THREE.Group();lever.position.copy(switchA);switchAssembly.add(lever);
box(1.12,.065,.105,contactMetal,V(.56,0,0),lever);
box(.30,.16,.24,mat('#232a31'),V(1.14,0,0),lever);
label('点击开关',V(-2.0,-2.47,3.85),'#c7d5df',.70,switchAssembly);
// Connect each lead to the OUTER face of its own fixed terminal.
// The battery lead loops below/in front of the base and approaches the
// hinge from the left, never crossing the visible gap between contacts.
const switchWireA=V(switchA.x-.10,-1.96,3.5),switchWireB=V(switchB.x+.11,-2.015,3.5);
const wireMat=mat('#b89455',.2),supplyLead=pipe([plus,V(3.95,-2.06,4.15),V(1.1,-2.27,4.55),V(-2.75,-2.27,4.35),V(-3.05,-2.05,3.5),switchWireA],.033,wireMat,model,true);
// A split ring, not two slip rings. Its two insulating gaps meet the brushes
// exactly when the coil crosses the neutral plane (theta = n*pi).
const commutatorRotor=new THREE.Group(),brushes=new THREE.Group();rotor.add(commutatorRotor);model.add(brushes);
const COMM_RADIUS=.39,COMM_INNER=.335,COMM_Z=ZF+.20,COMM_DEPTH=.40,COMM_GAP=.18,BRUSH_WIDTH=.03;
const COMM_DEAD=COMM_GAP/2-Math.asin(BRUSH_WIDTH/(2*COMM_RADIUS));
// Hollow split-ring: the conductor enters its bore and touches the inner
// wall. Small insulating gap pieces hold the two conducting halves apart.
function ringPart(start,end,material){const inner=COMM_INNER,s=new THREE.Shape();s.absarc(0,0,COMM_RADIUS,start,end,false);s.lineTo(inner*Math.cos(end),inner*Math.sin(end));s.absarc(0,0,inner,end,start,true);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:COMM_DEPTH,bevelEnabled:false,curveSegments:48});g.translate(0,0,COMM_Z-COMM_DEPTH/2);const m=new THREE.Mesh(g,material);commutatorRotor.add(m);return m;}
function halfRing(start,color){return ringPart(start,start+Math.PI-COMM_GAP,mat(color,.72));}
halfRing(COMM_GAP/2,'#f29b38');halfRing(Math.PI+COMM_GAP/2,'#9872e8');
const ringInsulator=mat('#252b34');ringPart(-COMM_GAP/2,COMM_GAP/2,ringInsulator);ringPart(Math.PI-COMM_GAP/2,Math.PI+COMM_GAP/2,ringInsulator);
const commutatorCoilGeometry=coilBandGeometry(COMM_Z-.03,COMM_INNER);
// Thin silver leads first enter the bore near the axis, then bend outward
// inside the ring to meet their own upper/lower inner wall, behind its front lip.
// This is one continuous conductor with the coil, without an intermediate cable.
// Brushes remain fixed on +/-x and meet the insulating gaps at theta=n*pi.
const brushPositive=V(-COMM_RADIUS-.18,0,COMM_Z),brushNegative=V(COMM_RADIUS+.18,0,COMM_Z);
for(const side of [-1,1]){box(.13,BRUSH_WIDTH,.20,mat('#31363e'),V(side*(COMM_RADIUS+.06),0,COMM_Z),brushes);box(.085,.08,.24,contactMetal,V(side*(COMM_RADIUS+.155),0,COMM_Z),brushes);}
for(const side of [-1,1]){label('电刷',V(side*(COMM_RADIUS+.65),-.24,COMM_Z+.10),'#f4d49c',.55,brushes);const guide=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(side*(COMM_RADIUS+.07),0,COMM_Z),V(side*(COMM_RADIUS+.36),-.18,COMM_Z+.10)]),new THREE.LineBasicMaterial({color:0xb6c5d0,transparent:true,opacity:.85,depthTest:false}));brushes.add(guide);}
let leads=[];
// External conventional current always goes from battery + to battery −,
// even when the commutator reverses the current inside the rotating coil.
const externalCurrent=new THREE.Group();model.add(externalCurrent);for(let i=0;i<4;i++)externalCurrent.add(new THREE.Group());let externalDistance=0;
// Mark conventional current on the lower battery-positive supply wire.
const supplyCurrentIndicator=new THREE.Group();model.add(supplyCurrentIndicator);const supplyCurve=supplyLead.geometry.parameters.path,supplyMid=supplyCurve.getPointAt(.48),supplyDirection=supplyCurve.getTangentAt(.48).normalize();
const supplyArrow=arrow(supplyDirection,supplyMid.clone().add(V(0,.13,0)).addScaledVector(supplyDirection,-.38),.76,0xffdc35,supplyCurrentIndicator);label('i',supplyMid.clone().add(V(0,.35,0)),'#ffdc35',.32,supplyCurrentIndicator);supplyCurrentIndicator.visible=false;
function externalFlowPaths(){const switchPath=new THREE.CurvePath();const points=[switchWireA,switchA,switchB,switchWireB];for(let i=1;i<points.length;i++)switchPath.add(new THREE.LineCurve3(points[i-1],points[i]));return [{path:supplyLead.geometry.parameters.path,direction:1},{path:switchPath,direction:1},{path:leads[0]?.geometry.parameters.path,direction:1,flexible:true},{path:leads[1]?.geometry.parameters.path,direction:-1,flexible:true}];}
function updateExternalFlow(dt,sign,visible,reset=false){if(reset)externalDistance=0;else if(sign)externalDistance+=dt*.9;externalCurrent.visible=visible;supplyCurrentIndicator.visible=visible;if(!visible)return;externalFlowPaths().forEach(({path,direction,flexible},index)=>{const group=externalCurrent.children[index];if(!path){group.visible=false;return;}group.visible=true;const length=path.getLength(),count=Math.max(2,Math.ceil(length/.65));while(group.children.length<count){const charge=new THREE.Sprite(flowMaterial);charge.scale.set(.16,.16,1);charge.renderOrder=4;group.add(charge);}while(group.children.length>count)group.remove(group.children[group.children.length-1]);const twisting=flexible&&!state.commutator&&Math.abs(state.theta-state.wireReference)>.05;group.children.forEach((charge,i)=>{const u=((i/count+direction*externalDistance/length)%1+1)%1;charge.position.copy(path.getPointAt(u));charge.visible=!(twisting&&charge.position.z<2.94);});});}
const WIRE_BREAK_SECONDS=13,breakMarkers=new THREE.Group();model.add(breakMarkers);breakMarkers.visible=false;const breakTipMaterial=mat('#ffb071',.65),breakTips=[-1,1].map(()=>{const tip=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),breakTipMaterial);breakMarkers.add(tip);return tip;});const breakLabel=label('导线断裂',V(-.65,-.45,2.35),'#ff8879',.85,breakMarkers);
const state={theta:-65*Math.PI/180,omega:0,running:false,hasStarted:false,closed:false,time:0,commutator:false,halfPower:false,wireBroken:false,breakTheta:null,breakAt:null,twistTime:0,wireReference:-65*Math.PI/180};
function endpoint(y,z=ZF){return V(y*Math.sin(state.theta),y*Math.cos(state.theta),z);}
// The two insulated leads twist around their SHARED centre line like a rope.
// At rest each lead extends straight along its silver tab with full spacing.
// Accumulated rotation gradually draws the pair together; once tightly twisted
// their centre separation is just above the wire diameter. Fan-outs keep contact.
function windingPoints(side,theta=state.theta){const turn=theta-state.wireReference,phase=Math.PI/2-state.wireReference+(side<0?Math.PI:0),count=Math.min(1600,Math.max(48,Math.ceil(Math.abs(turn)*28))),points=[],smooth=t=>t*t*(3-2*t),tighten=smooth(THREE.MathUtils.clamp(Math.abs(turn)/(1.5*Math.PI),0,1));for(let i=0;i<=count;i++){const t=i/count,u=THREE.MathUtils.clamp((t-.18)/.64,0,1),a=phase-turn*smooth(u),fan=smooth(THREE.MathUtils.clamp((Math.abs(t-.5)-.32)/.18,0,1)),radius=NECK-(NECK-.0345)*tighten*(1-fan);points.push(V(radius*Math.cos(a),radius*Math.sin(a),2.92+(ZF-2.92)*t));}return points;}
function woundLead(start,via,side){const winding=windingPoints(side),entry=new THREE.CatmullRomCurve3([start,...via,winding[0]]).getPoints(32);const curve=new THREE.CatmullRomCurve3([...entry.slice(0,-1),...winding]);const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(96,winding.length*2),.032,8,false),wireMat);model.add(mesh);return mesh;}
// After failure BOTH supply leads release from the silver coil tabs.
// The detached wire bundle stays in world space; no stub follows the rotor.
function brokenLead(start,via,side){const fixed=windingPoints(side,state.breakTheta),cut=Math.floor(fixed.length*.60),age=Number.isFinite(state.breakAt)?Math.max(0,state.time-state.breakAt):1,q=THREE.MathUtils.clamp(age/.9,0,1),drop=q*q*(3-2*q),swing=.07*Math.sin(age*8)*Math.exp(-age*3)*q,points=[];
// Released bundle bends down under gravity. Its lowest free segment is
// vertical in world space; the ends settle above the ground, not in midair.
for(let i=0;i<cut;i++){const u=i/(cut-1),p=fixed[i],hanging=V(p.x+swing,-.85-1.18*Math.pow(u,1.3)+p.y,2.92-.45*(1-(1-u)**2));points.push(p.clone().lerp(hanging,drop));}
const released=fixed[cut-1].clone().add(V(side*.18,-.35,.16));let tipIndex=0;for(const [x,y] of [[side*.10,-2.04],[side*.10,-2.10],[side*.10,-2.18]]){const target=V(x+swing,y,2.47);points.push(fixed[cut-1].clone().lerp(released,++tipIndex/3).lerp(target,drop));}
const entry=new THREE.CatmullRomCurve3([start,...via,points[0]]).getPoints(32),path=[...entry.slice(0,-1),...points],mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path),Math.max(96,path.length*2),.032,8,false),wireMat);model.add(mesh);breakTips[side>0?0:1].position.copy(points[points.length-1]);return mesh;}
function updateWires(){coilMesh.geometry=state.commutator?commutatorCoilGeometry:bandGeometry;for(const p of leads){model.remove(p);p.geometry.dispose();}commutatorRotor.visible=brushes.visible=state.commutator;breakMarkers.visible=state.wireBroken&&!state.commutator;
const positiveVia=[V(-1.06,-1.96,3.5),V(-.8,-.9,3.1)],negativeVia=[V(2.3,-1.9,3.7),V(1.1,-1.4,3.15)];
leads=state.commutator?[pipe([switchWireB,V(-1.06,-1.96,3.5),V(-.7,-1.0,2.65),brushPositive],.032,wireMat,model,true),pipe([minus,V(2.3,-1.9,3.7),V(.9,-.2,2.7),brushNegative],.032,wireMat,model,true)]:state.wireBroken?[brokenLead(switchWireB,positiveVia,1),brokenLead(minus,negativeVia,-1)]:[woundLead(switchWireB,positiveVia,1),woundLead(minus,negativeVia,-1)];
if(breakMarkers.visible){const top=Math.max(...leads.map(p=>{p.geometry.computeBoundingBox();return p.geometry.boundingBox.max.y;}));breakLabel.position.copy(breakTips[0].position).add(breakTips[1].position).multiplyScalar(.5);breakLabel.position.y=top+.30;breakLabel.position.z+=.10;}}
let yaw=.35,pitch=.42,distance=16.5,pan=V(0,-.2,.3);
function setCamera(type){if(type==='front'){yaw=0;pitch=0;distance=15.5;}else if(type==='top'){yaw=0;pitch=1.48;distance=16.5;}else{yaw=.35;pitch=.42;distance=16.5;}document.querySelectorAll('[data-camera]').forEach(b=>b.classList.toggle('active',b.dataset.camera===type));}
function fit(){let w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(fit).observe($('scene'));
function updateCamera(){const extra=camera.aspect<1?1/camera.aspect:1;const d=distance*extra;camera.position.set(pan.x+d*Math.sin(yaw)*Math.cos(pitch),pan.y+d*Math.sin(pitch),pan.z+d*Math.cos(yaw)*Math.cos(pitch));camera.lookAt(pan);}
const pointers=new Map();let gesture=null,switchPress=null;const switchRay=new THREE.Raycaster();
function hitSwitch(e){const b=canvas.getBoundingClientRect();switchRay.setFromCamera(new THREE.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);model.updateMatrixWorld(true);return switchRay.intersectObject(switchAssembly,true).length>0;}
function baseline(){const p=[...pointers.values()];gesture=p.length===1?{x:p[0].x,y:p[0].y,button:p[0].button}:p.length>=2?{gap:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}:null;}
canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',e=>{if(e.button===0&&pointers.size===0&&hitSwitch(e))switchPress={id:e.pointerId,x:e.clientX,y:e.clientY};else switchPress=null;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button});canvas.setPointerCapture(e.pointerId);baseline();});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)){canvas.style.cursor=hitSwitch(e)?'pointer':'grab';return;}if(switchPress&&Math.hypot(e.clientX-switchPress.x,e.clientY-switchPress.y)>5)switchPress=null;const held=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:held.button});let p=[...pointers.values()];if(p.length>=2&&gesture?.gap){switchPress=null;let gap=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(gap>2)distance=THREE.MathUtils.clamp(distance*gesture.gap/gap,9,27);}else if(p.length===1&&gesture&&'x'in gesture){let dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(gesture.button===2){camera.updateMatrixWorld();const right=V(0,0,0).setFromMatrixColumn(camera.matrixWorld,0),up=V(0,0,0).setFromMatrixColumn(camera.matrixWorld,1),scale=2*camera.position.distanceTo(pan)*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)/canvas.clientHeight;pan.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);canvas.style.cursor='grabbing';}else if(!switchPress){yaw-=dx*.006;pitch=THREE.MathUtils.clamp(pitch+dy*.006,-1.48,1.48);}}baseline();});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,e=>{if(ev==='pointerup'&&switchPress?.id===e.pointerId&&hitSwitch(e))toggleSwitch();switchPress=null;pointers.delete(e.pointerId);baseline();canvas.style.cursor="grab";});
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance*Math.exp(e.deltaY*.001),9,27);},{passive:false});
// Sign follows the actual brush/half-ring contact. In the insulating gap
// current and Ampere force vanish; inertia, not an artificial push, crosses it.
function checkWireBreak(){if(!state.commutator&&!state.wireBroken&&(state.twistTime||0)>=WIRE_BREAK_SECONDS-1e-9){state.wireBroken=true;state.breakTheta=state.theta;state.breakAt=state.time;}}
function currentSign(){if(!state.closed||(state.wireBroken&&!state.commutator))return 0;if(!state.commutator)return state.halfPower?(Math.sin(state.theta)<-1e-10?1:0):1;const s=Math.sin(state.theta);return Math.abs(s)<Math.sin(COMM_DEAD)?0:(s<0?1:-1);}
function updateTwistTimer(dt){if(state.commutator||state.wireBroken||!Number.isFinite(state.wireReference))return;const turn=state.theta-state.wireReference;if((state.halfPower||Math.abs(turn)>Math.PI)&&Math.abs(state.omega)>1e-6&&turn*state.omega>0){state.twistTime=(state.twistTime||0)+dt;}checkWireBreak();}
function integrate(dt){checkWireBreak();const k=3.2*currentSign(),c=($('resistance').checked?.38:0)+(state.wireBroken&&!state.commutator?1.15:0);state.omega+=(-k*Math.sin(state.theta)-c*state.omega)*dt;if(state.wireBroken&&!state.commutator&&Math.abs(state.omega)<.018){state.omega=0;state.running=false;}state.theta+=state.omega*dt;state.time+=dt;updateTwistTimer(dt);}
function tick(dt){let remaining=dt;while(remaining>0){let d=Math.min(1/240,.012/Math.max(1,Math.abs(state.omega)),remaining);integrate(d);remaining-=d;}}
function sync(){checkWireBreak();leverUpdate();rotor.rotation.z=-state.theta;const sign=currentSign(),p=endpoint(R,.25),q=endpoint(-R,.25);fa.position.copy(p);fc.position.copy(q);fa.setDirection(V(0,sign||1,0));fc.setDirection(V(0,-(sign||1),0));fla.position.copy(p).add(V(.22,(sign||1)*.65,0));flc.position.copy(q).add(V(.22,-(sign||1)*.65,0));forces.visible=!!sign&&$('forces').checked;
currentGroup.visible=!!sign&&$('current').checked;updateCurrentFlow(sign,currentGroup.visible);currentForward.visible=sign>0;currentReverse.visible=sign<0;field.visible=$('field').checked;floor.visible=true;neutralPlane.visible=$('neutral').checked;const partsVisible=$('parts').checked;statorLabels.forEach(label=>label.visible=partsVisible);rotorLabel.visible=rotorGuide.visible=partsVisible;
let deg=((state.theta*180/Math.PI+180)%360+360)%360-180;if(Math.abs(deg+180)<1e-8&&state.theta>0)deg=180;$('angle').value=deg;$('angleText').textContent=(Math.abs(deg)<.05?'0':deg.toFixed(0))+'°';$('switchLabel').textContent=state.halfPower&&!state.commutator?'自动开关':'开关';$('switch').textContent=state.wireBroken&&!state.commutator?(state.closed?'闭合 · 导线断裂':'断开 · 导线断裂'):state.closed?(sign?(state.halfPower&&!state.commutator?'自动闭合 · 有电流':'闭合 · 有电流'):(state.commutator?'闭合 · 换向间隙':'自动断开 · 无电流')):'断开 · 无电流';$('switch').classList.toggle('active',state.closed);$('play').textContent=state.running?'暂停演示':(state.hasStarted?'继续演示':'开始演示');
$('supplyMode').textContent=state.commutator?'两半铜环＋电刷 · 每半圈换向':(state.halfPower?'柔性引线 · 半圈通电，半圈断电':'柔性引线供电 · 无换向器');$('modeBadge').textContent=state.commutator?'换向器演示 · 每半圈改变电流方向':(state.halfPower?'图示方案 · 断电半圈后再通电':'教材演示 · 不改变线圈电流方向');$('windingStatus').textContent=state.commutator?(!state.closed||sign?'换向器已接入 · 引线不随线圈缠绕':'换向器已接入 · 绝缘缝处短暂断电'):'柔性导线缠绕：'+((state.theta-state.wireReference)/(2*Math.PI)).toFixed(2)+' 圈'+(state.twistTime>0?' · 绞合 '+Math.min(state.twistTime,WIRE_BREAK_SECONDS).toFixed(1)+'/'+WIRE_BREAK_SECONDS+'秒':'');
const moving=Math.abs(state.omega)>.025;$('motion').textContent=moving?(state.omega>0?'顺时针运动':'逆时针运动'):'静止';
let txt,desc;if(state.wireBroken&&!state.commutator){txt=moving?'导线断裂 · 正在减速':'导线断裂 · 已停止';desc='引线过度绞合后断裂，电路断开。线圈先因惯性继续转动，再在转轴处的残余阻力下逐渐停止。点击复位可修复导线。';}else if(!state.closed){txt='开关断开 · 无磁场力';desc=moving?($('resistance').checked?'断电后线圈仍可因惯性运动；摩擦和空气阻力使它逐渐减速。':'断电后线圈因惯性继续运动；此时忽略摩擦和空气阻力。'):'选择一个关键位置，再闭合开关观察。开始演示会自动闭合开关。';}else if(state.commutator){txt=sign?'换向器供电 · 顺时针转动作用':'换向间隙 · 暂时无电流';desc=sign?'每经过中性面，电流方向改变，两边的磁场力也反向，继续推动线圈顺时针转动。':(moving?'电刷经过绝缘缝，短暂断电。线圈靠惯性越过，随后重新通电。':'线圈静止在换向间隙，不能自行启动。可选择初始位置，再开始演示。');}else if(state.halfPower){txt=sign?'通电半圈 · 顺时针转动作用':'断电半圈 · 靠惯性越过';desc=sign?'电流保持原方向，磁场力推动线圈顺时针转动。到达中性面后自动断电。':(moving?'此时无电流、无磁场力。线圈靠惯性继续转过半圈，随后自动重新通电。':'处于断电半圈，从静止状态不能自行启动。选择初始位置再开始演示。');}else if(Math.abs(Math.sin(state.theta))<.026){txt='平衡位置 · 转动作用为零';desc=moving?'两边仍然受力。线圈保持原来的运动方向，因惯性越过平衡位置。':'两边仍然受力，但不能使线圈绕轴转动。从静止状态通电，线圈保持静止。';}else if(Math.sin(state.theta)<0){txt='顺时针受力';desc=state.omega<-.025?'线圈正逆时针运动，磁场力的转动作用使它减速，随后返回平衡位置。':'两边的磁场力使线圈顺时针转动，趋向平衡位置。';}else{txt='逆时针受力';desc=state.omega>.025?'线圈仍顺时针运动，但磁场力的转动作用已反向：先减速，再逆时针返回。':'两边的磁场力使线圈逆时针转动，返回平衡位置。';}if($('state').textContent!==txt)$('state').textContent=txt;if($('desc').textContent!==desc)$('desc').textContent=desc;
$('halfPower').checked=state.halfPower;$('commutator').checked=state.commutator;$('returnTitle').textContent=state.commutator||state.halfPower?'越过后为什么继续转动？':'越过后为什么返回？';$('returnDesc').textContent=state.commutator?'换向器使电流每半圈反向，ab、cd两边的力随之反向，转动作用继续沿顺时针方向。固定电刷供电，外部引线不缠绕。':(state.halfPower?'越过中性面后自动断电，线圈靠惯性转过半圈，再接通原方向电流。转动作用继续同向；柔性引线会逐渐缠绕。':'电流没有换向，两边受力方向保持不变，但转动作用反向。线圈先减速，再反向返回。');$('modelNotice').textContent='模型说明：均匀磁场、理想转轴；通电时电流大小恒定。引线缠绕只作结构演示，不计算其弹力和受力；未模拟反电动势。'+(state.commutator||state.halfPower?'持续转动中，开启摩擦和空气阻力可观察阻力对转速的影响。':'开启摩擦和空气阻力时，线圈摆动逐渐减弱；关闭时，观察忽略这些阻力的理想运动。');$('neutralTitle').textContent=state.commutator||state.halfPower?'中性面处靠惯性越过':'平衡不等于没有力';$('neutralDesc').textContent=state.commutator?'电刷经过绝缘缝时短暂断电，线圈靠惯性越过中性面。若恰好静止在该位置，则不能自行启动。':(state.halfPower?'到达中性面后开始断电，电流与磁场力消失。线圈靠惯性越过，断电半圈后再通电。':'此时两边仍然受力，但力的作用线通过转轴，不能使线圈转动。已有的运动不会瞬间停止。');$('forceNote').textContent=state.commutator?'粉色：ab、cd 的磁场力。通电时大小恒定，换向时方向反转；绝缘缝处暂时为零。':(state.halfPower?'粉色：ab、cd 的磁场力。通电时等长反向，断电半圈时为零。':'粉色：ab、cd 的磁场力，大小保持不变。');
if(state.wireBroken&&!state.commutator){$('returnTitle').textContent='导线断裂后为什么停止？';$('returnDesc').textContent='导线断裂使电路断开，线圈不再受到推动转动的磁场力。它先靠惯性继续转动，再受到转轴处的残余阻力，逐渐停止。';$('windingStatus').textContent='导线已断裂 · 点击复位修复';$('forceNote').textContent='电路已断开：无电流、无磁场力、无高亮。';$('modelNotice').textContent='断裂为教学示意：导线持续绞合13秒后触发，播放倍率影响演示计时；实际断裂限度与线材有关。断裂演示中保留转轴阻力，近似演示缓慢停止。';}
$('modelNotice').textContent+=' 黄色＋表示按电流方向移动的正电荷示意。';drawProjection();}
function drawProjection(){let c=$('projection'),w=c.clientWidth,h=c.clientHeight,d=devicePixelRatio;c.width=w*d;c.height=h*d;let x=c.getContext('2d'),uiScale=h/150;x.scale(d*uiScale,d*uiScale);w/=uiScale;h=150;const cx=w/2,cy=h/2,r=42;
x.font='12px Microsoft YaHei';x.textAlign='center';x.fillStyle='#216e98';x.fillRect(12,38,30,75);x.fillStyle='#fff';x.fillText('S',27,80);x.fillStyle='#d76146';x.fillRect(w-42,38,30,75);x.fillStyle='#fff';x.fillText('N',w-27,80);
function arr(ax,ay,bx,by,color){x.strokeStyle=color;x.fillStyle=color;x.lineWidth=2;x.beginPath();x.moveTo(ax,ay);x.lineTo(bx,by);x.stroke();const t=Math.atan2(by-ay,bx-ax);x.beginPath();x.moveTo(bx,by);x.lineTo(bx-7*Math.cos(t-.5),by-7*Math.sin(t-.5));x.lineTo(bx-7*Math.cos(t+.5),by-7*Math.sin(t+.5));x.closePath();x.fill();}
if($('field').checked)arr(w-49,22,49,22,'#2599b0');x.setLineDash([4,4]);x.strokeStyle='#adc5ca';x.beginPath();x.moveTo(cx,10);x.lineTo(cx,h-10);x.stroke();x.setLineDash([]);
const dx=r*Math.sin(state.theta),dy=-r*Math.cos(state.theta);x.strokeStyle='#949aa3';x.lineWidth=5;x.beginPath();x.moveTo(cx+dx,cy+dy);x.lineTo(cx-dx,cy-dy);x.stroke();
const sign=currentSign();for(const s of [1,-1]){let px=cx+s*dx,py=cy+s*dy;x.beginPath();x.arc(px,py,6,0,Math.PI*2);x.fillStyle='#172027';x.fill();x.strokeStyle='#bac6cf';x.lineWidth=2;x.stroke();if(sign&&$('forces').checked)arr(px,py,px,py-s*sign*25,'#ff70ad');x.fillStyle='#d6e1e9';x.font='11px sans-serif';x.fillText(s===1?'ab':'cd',px+(s===1?17:-17),py+4);}
x.beginPath();x.arc(cx,cy,4,0,Math.PI*2);x.fillStyle='#d6e1e9';x.fill();}
function leverUpdate(){lever.rotation.z=state.closed&&(!state.halfPower||state.commutator||currentSign()!==0)?0:Math.PI/3;}
function toggleSwitch(){state.closed=!state.closed;leverUpdate();sync();}
function stop(){state.running=false;state.omega=0;}
function selectPresetButton(degrees){document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('active',Number(b.dataset.preset)===degrees));}
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{selectPresetButton(Number(b.dataset.preset));stop();state.theta=Number(b.dataset.preset)*Math.PI/180;if(!state.wireBroken){state.wireReference=state.theta;state.twistTime=0;}updateWires();sync();});
$('angle').oninput=()=>{selectPresetButton(null);stop();state.theta=Number($('angle').value)*Math.PI/180;updateWires();sync();};
function coilSpeedFactor(){return Number($('speed').value)*.5;}
$('speed').oninput=()=>{$('speedText').textContent=Number($('speed').value).toFixed(1)+'×';};
$('switch').onclick=toggleSwitch;
function resetExperiment(){Object.assign(state,{theta:-65*Math.PI/180,omega:0,running:false,hasStarted:false,closed:false,time:0,wireBroken:false,breakTheta:null,breakAt:null,twistTime:0,wireReference:-65*Math.PI/180});selectPresetButton(null);model.position.set(0,0,0);pan.set(0,-.2,.3);setCamera('oblique');leverUpdate();updateWires();sync();}
$('play').onclick=()=>{if(state.running){state.running=false;sync();return;}if(!state.hasStarted||state.wireBroken){resetExperiment();state.closed=true;state.hasStarted=true;leverUpdate();}selectPresetButton(null);state.running=true;sync();};
$('reset').onclick=resetExperiment;
$('step').onclick=()=>{selectPresetButton(null);state.running=false;state.hasStarted=true;state.closed=true;leverUpdate();tick(.08*coilSpeedFactor());updateWires();sync();};
for(const id of ['forces','current','field','neutral','resistance','parts'])$(id).onchange=sync;
function selectContinuousMode(mode){const hadCommutator=state.commutator;state.halfPower=mode==='half';if(state.halfPower){$('speed').value='0.5';$('speed').oninput();}state.commutator=mode==='commutator';if(state.commutator)$('current').checked=true;if(hadCommutator!==state.commutator){state.wireReference=state.theta;state.wireBroken=false;state.breakTheta=null;state.breakAt=null;state.twistTime=0;}updateWires();sync();}
$('halfPower').onchange=()=>selectContinuousMode($('halfPower').checked?'half':'none');
$('commutator').onchange=()=>selectContinuousMode($('commutator').checked?'commutator':'none');
document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>setCamera(b.dataset.camera));
$('full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else $('scene').requestFullscreen();};
document.querySelectorAll('[data-qr]').forEach(button=>button.onclick=()=>{$('qrDialog').showModal();});
$('closeQr').onclick=()=>$('qrDialog').close();
$('qrDialog').addEventListener('click',e=>{if(e.target!==$('qrDialog'))return;const r=$('qrDialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('qrDialog').close();});
let last=performance.now(),wireTime=0;
function frame(now){let dt=Math.min((now-last)/1000,.05);last=now;if(state.running){tick(dt*coilSpeedFactor());wireTime+=dt;if(wireTime>.035){if(!state.commutator)updateWires();wireTime=0;}sync();}if($('autorotate').checked)yaw+=dt*.15;updateCamera();updateCurrentFaces();renderer.render(scene,camera);requestAnimationFrame(frame);}
leverUpdate();updateWires();fit();sync();requestAnimationFrame(frame);
// Read-only diagnostics for browser QA; physics uses the same integrator as the animation.
window.lesson={state,tick,sync,renderer,camera,model,pointers,currentSign,commutatorRotor,brushes,leads:()=>leads,get gesture(){return gesture;},get distance(){return distance;},get yaw(){return yaw;}};
