import type {BoardConfig,Line} from './types';
import {SYNAPSE_MAT_SIDE_MM} from './boardUnits';
import {RANDOMIZER_GEOMETRY,SYNAPSE_RANDOMIZER_SOURCE} from './synapseRandomizer';

/** Source drawing normalized to the user's measured city pitch, not stretched to the sheet. */
export function createSynapseBoard():BoardConfig {
 const pitch=325,scale=pitch/RANDOMIZER_GEOMETRY.cityPitch,center=SYNAPSE_MAT_SIDE_MM/2;
 const mm=(n:number)=>Math.round(n*scale*1e6)/1e6;
 const point=(x:number,y:number)=>({x:center+mm(x),y:center+mm(y)});
 const h=1000/6,d=500,r=1000/9,corner=d-r,lineWidth=mm(50/3);
 const lines:Line[]=[];
 const add=(points:{x:number;y:number}[])=>lines.push({id:`synapse-${lines.length}`,points,width:lineWidth,color:'#000000'});
 const arc=(cx:number,cy:number,from:number,to:number)=>Array.from({length:25},(_,i)=>{const a=(from+(to-from)*i/24)*Math.PI/180;return point(cx+r*Math.cos(a),cy+r*Math.sin(a))});
 add([...arc(-corner,-corner,180,270),point(corner,-d),...arc(corner,-corner,270,360).slice(1),point(d,d),point(-corner,d),...arc(-corner,corner,90,180).slice(1),point(-d,-corner)]);
 for(const x of [-h,h])add([point(x,-525),point(x,525)]);
 for(const y of [-h,h])add([point(-525,y),point(525,y)]);
 for(const x of [-2*h,0,2*h])for(const y of [-2*h,0,2*h]){
  for(const sign of [-1,1]){
   add([point(x,y+sign*(h-25)),point(x,y+sign*(h+25))]);
   add([point(x+sign*(h-25),y),point(x+sign*(h+25),y)]);
  }
 }
 const zoneOffsets=[['A',-1,-1],['B',-1,0],['C',0,-1],['D',-1,1],['E',0,0],['F',1,-1],['G',0,1],['H',1,0]] as const;
 const objD=(2*h)/3/Math.sqrt(2),offset=objD/Math.sqrt(2),building=2*(objD-14.5);
 const cityZones=zoneOffsets.map(([id,x,y])=>({id,center:point(x*2*h,y*2*h),containment:{...point(x*2*h,y*2*h),side:mm(building),rotation:45},sites:[[-1,-1],[-1,1],[1,-1],[1,1]].map(([sx,sy],i)=>({id:`${id}${i+1}`,number:i+1,...point(x*2*h+sx*offset,y*2*h+sy*offset),width:mm(14.5),height:mm(24.5),rotation:i===0||i===3?45:135}))}));
 const storageSites=[1,2,3,4,5,6].map(n=>{
  const bottom=n%2===1;
  return {id:`S${n}`,...(bottom?point((n+1)*h/4,3*h+60):point(3*h+60,n*h/4)),width:mm(14.5),height:mm(24.5),rotation:bottom?0:90};
 });
 const crl=point(2*h,2*h);
 return {name:'Synapse City — 4 ft × 4 ft',width:SYNAPSE_MAT_SIDE_MM,height:SYNAPSE_MAT_SIDE_MM,backgroundImage:'/simulator/synapse-city.svg',initialPose:{...crl,heading:270},analysisArea:{...crl,width:pitch-lineWidth,height:pitch-lineWidth,rotation:0},walls:[],obstacles:[],lines,cityZones,storageSites,
 metadata:{description:'AIROC drawing with one shared calibrated geometry for SVG and sensors',citySideMm:pitch,fieldModel:{blockLengthMm:15,blockWidthMm:25,blockHeightMm:75},randomizerReference:{source:SYNAPSE_RANDOMIZER_SOURCE,drawing:RANDOMIZER_GEOMETRY,units:'drawing units',physicalMatSideMm:SYNAPSE_MAT_SIDE_MM,measuredCityPitchMm:pitch,scaleMmPerDrawingUnit:scale,frameInsetMm:center-mm(600)},layoutCalibration:{citySideMm:pitch,sourceCitySideUnits:1000/3,scale,centerMm:center,source:'AIROC proportions; city pitch measured by user'}}};
}
