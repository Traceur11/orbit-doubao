import * as THREE from "three";
const worldVertex = `
 varying vec2 vUv; varying vec3 vWorldNormal; varying vec3 vWorldPosition;
 #include <common>
 #include <logdepthbuf_pars_vertex>
 void main(){vUv=uv;vWorldNormal=normalize(mat3(modelMatrix)*normal);vec4 world=modelMatrix*vec4(position,1.0);vWorldPosition=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;
 #include <logdepthbuf_vertex>
 }`;
function earthMaterial(textures) {
  const empty = () => new THREE.Texture();
  return new THREE.ShaderMaterial({
    uniforms: {
      uDay: { value: textures["earth-day"] },
      uNight: { value: textures["earth-night"] },
      /* Earth Evolution — historical surface (set via app.js applyEarthVisual) */
      uHistoryMapA: { value: textures["paleo-540"] || empty() },
      uHistoryMapB: { value: textures["paleo-540"] || empty() },
      uHistoryBlend: { value: 0 },
      uHistoryStrength: { value: 0 },
      uLandTint: { value: new THREE.Color(0xffffff) },
      uOceanTint: { value: new THREE.Color(0xffffff) },
      uNightFactor: { value: 1 },
      uIceFactor: { value: 0.35 },
      uLavaFactor: { value: 0 },
      uSurfaceBrightness: { value: 1 },
    },
    vertexShader: worldVertex,
    fragmentShader: `
 uniform sampler2D uDay;uniform sampler2D uNight;
 uniform sampler2D uHistoryMapA;uniform sampler2D uHistoryMapB;
 uniform float uHistoryBlend;uniform float uHistoryStrength;
 uniform vec3 uLandTint;uniform vec3 uOceanTint;
 uniform float uNightFactor;uniform float uIceFactor;
 uniform float uLavaFactor;uniform float uSurfaceBrightness;
 varying vec2 vUv;varying vec3 vWorldNormal;varying vec3 vWorldPosition;
 #include <common>
 #include <logdepthbuf_pars_fragment>
 float hash21(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}
 float vnoise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash21(i),hash21(i+vec2(1.0,0.0)),f.x),mix(hash21(i+vec2(0.0,1.0)),hash21(i+vec2(1.0,1.0)),f.x),f.y);}
 void main(){
 vec3 n=normalize(vWorldNormal);vec3 l=normalize(-vWorldPosition);float ndl=dot(n,l);vec3 viewDir=normalize(cameraPosition-vWorldPosition);
 vec3 day=texture2D(uDay,vUv).rgb;vec3 night=texture2D(uNight,vUv).rgb;
 /* Earth Evolution: crossfade modern day texture into the historical maps. */
 vec3 histA=texture2D(uHistoryMapA,vUv).rgb;vec3 histB=texture2D(uHistoryMapB,vUv).rgb;
 vec3 hist=mix(histA,histB,uHistoryBlend);
 vec3 base=mix(day,hist,uHistoryStrength);
 /* Land/ocean separation follows the current base (modern day or paleo map). */
 float ocean=smoothstep(.02,.12,base.b-base.r);
 base*=mix(uLandTint,uOceanTint,ocean);
 float daylight=smoothstep(-.13,.23,ndl);vec3 color=base*(.025+1.65*max(ndl,0.0))*uSurfaceBrightness;
 float nightMask=1.0-smoothstep(-.13,.18,ndl);color+=night*nightMask*3.1*uNightFactor;
 /* Polar ice caps: mask by latitude, strongest at the poles. */
 float polar=smoothstep(.16,.34,abs(vUv.y-.5));
 vec3 ice=vec3(.86,.94,1.0);
 color=mix(color,ice,polar*uIceFactor);
 /* Hadean magma ocean: procedural, static per-UV pattern (no per-frame texture). */
 if(uLavaFactor>.001){
   float n1=vnoise(vUv*vec2(7.0,3.5));
   float n2=vnoise(vUv*vec2(14.0,7.0)+7.3);
   float hot=smoothstep(.58,.95,n1+.35*n2);
   float glow=smoothstep(.8,1.0,n2);
   vec3 magma=mix(vec3(.08,.03,.02),vec3(.55,.12,.05),n1);
   magma=mix(magma,vec3(.93,.42,.10),hot);
   magma=mix(magma,vec3(1.0,.86,.48),hot*glow);
   magma+=vec3(1.0,.45,.12)*.08*daylight;
   color=mix(color,magma,clamp(uLavaFactor,.0,1.0));
 }
 float spec=pow(max(dot(reflect(-l,n),viewDir),0.0),65.0)*ocean*daylight;
 color+=vec3(.45,.65,.8)*spec*.5;
 float rim=pow(1.0-max(dot(n,viewDir),0.0),3.7);color+=vec3(.05,.24,.64)*rim*(.2+.8*daylight);
 gl_FragColor=vec4(color,1.0);
 #include <logdepthbuf_fragment>
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }` });
}
function addSunlight(scene) {
  scene.add(new THREE.AmbientLight(10271205, 0.19));
  scene.add(new THREE.PointLight(16774110, 3.4, 0, 0));
}
export {
  addSunlight,
  earthMaterial,
  worldVertex
};
