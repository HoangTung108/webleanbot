import { expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import base from './baseFeatures.fixture'
import { SYNAPSE_CITY } from './boardConfigs'
import defaults from '../../public/leanbot-ide/LB-blockly/blocklyduino/arduino/addon/myblocks.js?raw'
const between = (source:string, start:string, end:string) => {
 const a=source.indexOf(start),b=source.indexOf(end,a);
 if(a<0||b<a)throw new Error(`Missing C++ section: ${start}`);
 return source.slice(a,b);
}
// Compare C++ tokens rather than layout, allowing comment/format cleanup only.
const cppTokens = (source:string) => (source.match(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[A-Za-z_]\w*|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[uUlLfF]*|::|->|\+\+|--|<<=?|>>=?|&&|\|\||[+*\/%&|^!=<>-]=|[^\s]/g) ?? []).filter(token => !token.startsWith('//') && !token.startsWith('/*')).join(' ')
it('preserves MyBlock sensing, profile and PID tokens independently of layout', () => {
 for (const [start,end] of [
  ['inline int32_t lbmbAbs32','// -----------------------------------------------------------------------------\n// Move core'],
  ['inline void lbmbFollowCoreInit','// -----------------------------------------------------------------------------\n// Leanbot wrappers'],
 ]) expect(cppTokens(base)).toContain(cppTokens(between(defaults,start,end)))
 const tuning = [...defaults.matchAll(/const [^;\n]+ (LBMB_FLL_\w+)\s*=.*?;/g)]
 for(const setting of tuning)expect(base).toContain(setting[0])
})
it('executes MyBlock analog steering, marker/time/distance modes, loss and stall handling in native C++', () => {
 const dir=mkdtempSync(join(tmpdir(),'leanbot-myblock-line-'))
 try {
  const types=between(base,'struct LbmbState {','enum ObjectColor')
  const core=between(base,'const uint16_t LBMB_TICK_MS','bool junctionPending')+between(base,'inline int32_t lbmbAbs32','LbmbFollowCtx defaultLineContext')
  const adapter=between(base,'LbmbFollowCtx defaultLineContext','static bool readAPDSColor')
  const outer=SYNAPSE_CITY.lines[0];
  const arc=outer.points.slice(0,17), origin=arc[0], end=arc[16];
  const track=[{x:origin.x,y:origin.y+150},...arc,{x:end.x+300,y:end.y}].map(p=>[origin.y+150-p.y,p.x-origin.x]);
  const source=`#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cassert>
#include <functional>
using byte=uint8_t;
using std::min;using std::max;using std::isfinite;using std::isnan;
${types}
${base.match(/const float DISTANCE_SCALE\s*=.*?;/)![0]}
${base.match(/const int LINE_SPEED\s*=.*?;/)![0]}
${base.match(/const int LINE_STEERING_SIGN\s*=.*?;/)![0]}
${base.match(/const float JUNCTION_CENTER_MM\s*=.*?;/)![0]}
unsigned long clockMs=0,lastLineControlTime=0;
unsigned long millis(){return clockMs;}
float lastLineError=0,physicalDistance=0;
int peak=0,services=0,error=0;
bool lineControlReady=false,junctionPending=false,stalled=false;
struct {int left=0,right=0;void runLR(int l,int r){assert(abs(l)<=2000&&abs(r)<=2000);left=l;right=r;peak=max(peak,max(abs(l),abs(r)));}void stopAndWait(){left=right=0;}float getDistanceMm(){return physicalDistance*DISTANCE_SCALE;}float getRotationDeg(){return 0;}} LbMotion;
int bits=6;int raw[4]={10,100,100,10};
const int ir2L=0,ir0L=1,ir1R=2,ir3R=3;
struct {int read(int sensor){return raw[sensor];}} LbIRArray;
int measure_line(){return bits;}
bool check_mission_reset(){return false;}
void robot_delay(unsigned long ms){clockMs+=ms;++services;if(!stalled)physicalDistance+=(LbMotion.left+LbMotion.right)*0.5f*65/2000*ms/1000;}
void resetMotionState(){lastLineError=0;lastLineControlTime=clockMs;lineControlReady=false;}
void move_tank(int,int,float cm){physicalDistance+=cm*10;}
${core}
${adapter}
// Closed-loop geometry: four sensors 50 mm ahead, 100 mm wheel track.
void checkTrack(float initialDegrees, float radius) {
 const float pi=3.14159265f,dt=.01f;
 float x=0,y=0,heading=initialDegrees*pi/180,distance=0;
 LbmbFollowCtx ctx={};bool done=false;
 for(int tick=0;tick<6000;++tick){
  LbmbState state={};state.timeMs=tick*10;state.distanceMm=(int32_t)round(distance);
  int16_t values[4];float offsets[4]={-24,-6,6,24};
  for(int i=0;i<4;++i){
   float sx=x+50*cosf(heading)-offsets[i]*sinf(heading);
   float sy=y+50*sinf(heading)+offsets[i]*cosf(heading);
   float gap=radius==0?sy:sqrtf(sx*sx+(sy-radius)*(sy-radius))-fabsf(radius);
   values[i]=(int16_t)round(10+200*expf(-gap*gap/50));
   if(fabsf(gap)<9)state.lineState|=1<<(3-i);
  }
  state.ir2L=values[0];state.ir0L=values[1];state.ir1R=values[2];state.ir3R=values[3];
  if(tick==0)lbmbFollowCoreInit(&ctx,&state);
  LbmbCommand cmd=lbmbFollowCoreStep(&ctx,&state,100,4,30);
  if(cmd.isDone){done=true;break;}
  float left=cmd.leftSpeed*65.0f/2000,right=cmd.rightSpeed*65.0f/2000;
  float omega=(left-right)/100,ds=(left+right)*.5f*dt;
  x+=ds*cosf(heading+omega*dt*.5f);y+=ds*sinf(heading+omega*dt*.5f);heading+=omega*dt;distance+=ds;
 }
 assert(done&&distance>=299);
 float offset=radius==0?fabsf(y):fabsf(sqrtf(x*x+(y-radius)*(y-radius))-fabsf(radius));
 assert(offset<25);
}
float segmentDistance(float x,float y,float ax,float ay,float bx,float by){float dx=bx-ax,dy=by-ay;float t=((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy);t=std::max(0.0f,std::min(1.0f,t));return hypotf(x-ax-t*dx,y-ay-t*dy);}
void checkSynapseCorner(int side) {
 const float track[][2]=${JSON.stringify(track).replace(/\[/g,'{').replace(/\]/g,'}')};
 const float width=${outer.width}f;
 const int n=sizeof(track)/sizeof(track[0]);
 const float dt=.01f,pi=3.14159265f;
 float x=0,y=0,heading=0,distance=0;int peak=0;bool done=false;
 LbmbFollowCtx ctx={};
 for(int tick=0;tick<6000;++tick){
  LbmbState state={};state.timeMs=tick*10;state.distanceMm=(int32_t)round(distance);
  int16_t values[4];float offsets[4]={-24,-6,6,24};
  for(int i=0;i<4;++i){
   float sx=x+50*cosf(heading)-offsets[i]*sinf(heading),sy=y+50*sinf(heading)+offsets[i]*cosf(heading),gap=10000;
   for(int j=1;j<n;++j)gap=std::min(gap,segmentDistance(sx,sy,track[j-1][0],side*track[j-1][1],track[j][0],side*track[j][1]));
   values[i]=gap<=width/2?4095:0; // Same black/white model as RobotSimulator.
   if(values[i])state.lineState|=1<<(3-i);
  }
  state.ir2L=values[0];state.ir0L=values[1];state.ir1R=values[2];state.ir3R=values[3];
  if(tick==0)lbmbFollowCoreInit(&ctx,&state);
  LbmbCommand cmd=lbmbFollowCoreStep(&ctx,&state,100,4,50);
  if(cmd.isDone){done=true;break;}
  peak=std::max(peak,std::max(abs(cmd.leftSpeed),abs(cmd.rightSpeed)));
  float left=cmd.leftSpeed*65.0f/2000,right=cmd.rightSpeed*65.0f/2000,omega=(left-right)/100,ds=(left+right)*.5f*dt;
  x+=ds*cosf(heading+omega*dt*.5f);y+=ds*sinf(heading+omega*dt*.5f);heading+=omega*dt;distance+=ds;
 }
 assert(done&&distance>=499&&peak==2000);
 float gap=10000;for(int j=1;j<n;++j)gap=std::min(gap,segmentDistance(x,y,track[j-1][0],side*track[j-1][1],track[j][0],side*track[j][1]));
 assert(gap<25);assert(fabsf(heading-side*pi/2)<.35f);
}
void reset(){clockMs=0;physicalDistance=0;error=0;peak=0;services=0;stalled=false;bits=6;raw[0]=raw[3]=10;raw[1]=raw[2]=100;LbMotion.stopAndWait();resetMotionState();junctionPending=false;}
int main(){
checkSynapseCorner(1);checkSynapseCorner(-1);
LbmbState asymmetric={};asymmetric.lineState=8;asymmetric.ir2L=100;asymmetric.ir0L=200;asymmetric.ir1R=500;asymmetric.ir3R=700;assert(lbmbLinePosition1000(&asymmetric,0)<0);
asymmetric.lineState=1;asymmetric.ir2L=700;asymmetric.ir0L=500;asymmetric.ir1R=200;asymmetric.ir3R=100;assert(lbmbLinePosition1000(&asymmetric,0)>0);
for(float angle:{-45.0f,-25.0f,0.0f,25.0f,45.0f})checkTrack(angle,0);
for(float radius:{-140.0f,-100.0f,100.0f,140.0f})checkTrack(0,radius);
reset();physicalDistance=10.75f;followLineDistance(325);assert(error==0&&lineOperationCompleted);assert(fabsf(physicalDistance-335.75f)<1.1f);assert(peak==2000);assert(LbMotion.left==0&&LbMotion.right==0);assert(services>0);
reset();followLineCm(100);assert(error==0&&fabsf(physicalDistance-1000)<1.1f);
reset();followLineCm(10,50);assert(error==0&&fabsf(physicalDistance-100)<1.1f);assert(peak<=1000);
reset();followLineSeconds(.255f);assert(error==0&&clockMs>=255&&clockMs<=265);assert(LbMotion.left==0&&LbMotion.right==0);
reset();bits=8;raw[0]=150;raw[1]=80;raw[2]=raw[3]=10;for(int i=0;i<30;++i){runFollowLine();robot_delay(10);}assert(LbMotion.left<LbMotion.right);assert(lastLineError<0);
reset();bits=1;raw[3]=150;raw[2]=80;raw[0]=raw[1]=10;for(int i=0;i<30;++i){runFollowLine();robot_delay(10);}assert(LbMotion.left>LbMotion.right);assert(lastLineError>0);
bits=0;for(int i=0;i<20;++i){runFollowLine();robot_delay(10);}assert(LbMotion.left>0&&LbMotion.right<0);while(clockMs<3500){runFollowLine();robot_delay(10);}assert(LbMotion.left==0&&LbMotion.right==0);assert(LbMotion.left==0&&LbMotion.right==0);
reset();stalled=true;followLineCm(20);assert(LbMotion.left==0&&LbMotion.right==0&&!lineOperationCompleted);assert(LbMotion.left==0&&LbMotion.right==0);
reset();bits=0;followLineCm(20);assert(LbMotion.left==0&&LbMotion.right==0&&!lineOperationCompleted);
reset();followLineUntilJunction(3,100);assert(clockMs>=60000&&!lineOperationCompleted&&!junctionPending);assert(LbMotion.left==0&&LbMotion.right==0);
reset();bits=15;followLineUntilJunction(3,100);assert(error==0&&junctionPending&&lineOperationCompleted);assert(clockMs==20);
reset();bits=12;followLineUntilJunction(1,100);assert(error==0&&junctionPending);
reset();bits=3;followLineUntilJunction(2,100);assert(error==0&&junctionPending);
reset();followLineCm(-1);assert(LbMotion.left==0&&LbMotion.right==0);reset();followLineSeconds(NAN);assert(LbMotion.left==0&&LbMotion.right==0);reset();followLineCm(0);assert(error==0&&clockMs==0);
}
`
  writeFileSync(join(dir,'test.cpp'),source)
  execFileSync('c++',['-std=c++14',join(dir,'test.cpp'),'-o',join(dir,'test')],{timeout:20000})
  execFileSync(join(dir,'test'),[],{timeout:5000})
 } finally {rmSync(dir,{recursive:true,force:true})}
},25000)
