import { expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import base from '../../docs/baseCode.cpp?raw'
import defaults from '../../public/leanbot-ide/LB-blockly/blocklyduino/arduino/addon/myblocks.js?raw'
const between = (source:string, start:string, end:string) => source.slice(source.indexOf(start), source.indexOf(end))
it('uses the exact MyBlock sensing, profile and PID core', () => {
 for (const [start,end] of [
  ['inline int32_t lbmbAbs32','// -----------------------------------------------------------------------------\n// Move core'],
  ['inline void lbmbFollowCoreInit','// -----------------------------------------------------------------------------\n// Leanbot wrappers'],
 ]) expect(base).toContain(between(defaults,start,end).trim())
 const tuning = [...defaults.matchAll(/const [^;\n]+ (LBMB_FLL_\w+)\s*=.*?;/g)]
 for(const setting of tuning)expect(base).toContain(setting[0])
})
it('executes MyBlock analog steering, marker/time/distance modes, loss and stall handling in native C++', () => {
 const dir=mkdtempSync(join(tmpdir(),'leanbot-myblock-line-'))
 try {
  const types=between(base,'// BEGIN MYBLOCKS LINE TYPES','// END MYBLOCKS LINE TYPES')
  const core=between(base,'// BEGIN MYBLOCKS LINE CORE','// END MYBLOCKS LINE CORE')
  const adapter=between(base,'// BEGIN MYBLOCKS LINE ADAPTER','// END MYBLOCKS LINE ADAPTER')
  const source=`#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cassert>
#include <functional>
using byte=uint8_t;
using std::min;using std::max;using std::isfinite;using std::isnan;
${types}
${base.match(/enum ErrorCode \{[\s\S]*?\};/)![0]}
${base.match(/const float DISTANCE_SCALE\s*=.*?;/)![0]}
${base.match(/const int LINE_SPEED\s*=.*?;/)![0]}
${base.match(/const int LINE_STEERING_SIGN\s*=.*?;/)![0]}
${base.match(/const float JUNCTION_CENTER_MM\s*=.*?;/)![0]}
unsigned long clockMs=0,lastLineControlTime=0,lastLineSeenTime=0;
unsigned long millis(){return clockMs;}
float lastLineError=0,filteredLineError=0,physicalDistance=0;
int lastLineCmdL=0,lastLineCmdR=0,peak=0,services=0,error=0;
bool lineControlReady=false,junctionPending=false,stalled=false;
struct {int left=0,right=0;void runLR(int l,int r){assert(abs(l)<=2000&&abs(r)<=2000);left=l;right=r;peak=max(peak,max(abs(l),abs(r)));}void stopAndWait(){left=right=0;}float getDistanceMm(){return physicalDistance*DISTANCE_SCALE;}float getRotationDeg(){return 0;}} LbMotion;
int bits=6;int raw[4]={10,100,100,10};
const int ir2L=0,ir0L=1,ir1R=2,ir3R=3;
struct {int read(int sensor){return raw[sensor];}} LbIRArray;
int measure_line(){return bits;}
void robot_delay(unsigned long ms){clockMs+=ms;++services;if(!stalled)physicalDistance+=(LbMotion.left+LbMotion.right)*0.5f*65/2000*ms/1000;}
void resetMotionState(){lastLineError=filteredLineError=0;lastLineCmdL=lastLineCmdR=0;lastLineControlTime=clockMs;lineControlReady=false;}
void failMission(ErrorCode e){error=e;LbMotion.stopAndWait();}
void move_tank(int,int,float cm){physicalDistance+=cm*10;}
${core}
${adapter}
void reset(){clockMs=0;physicalDistance=0;error=0;peak=0;services=0;stalled=false;bits=6;raw[0]=raw[3]=10;raw[1]=raw[2]=100;LbMotion.stopAndWait();resetMotionState();junctionPending=false;}
int main(){
reset();physicalDistance=10.75f;followLineDistance(325);assert(error==0&&lineOperationCompleted);assert(fabsf(physicalDistance-335.75f)<1.1f);assert(peak==2000);assert(LbMotion.left==0&&LbMotion.right==0);assert(services>0);
reset();followLineCm(100);assert(error==0&&fabsf(physicalDistance-1000)<1.1f);
reset();lbmbFollowDistance(50,10);assert(error==0&&fabsf(physicalDistance-100)<1.1f);assert(peak<=1000);
reset();followLineSeconds(.255f);assert(error==0&&clockMs>=255&&clockMs<=265);assert(LbMotion.left==0&&LbMotion.right==0);
reset();bits=8;raw[0]=150;raw[1]=80;raw[2]=raw[3]=10;for(int i=0;i<30;++i){runFollowLine();robot_delay(10);}assert(LbMotion.left<LbMotion.right);assert(lastLineError<0);
reset();bits=1;raw[3]=150;raw[2]=80;raw[0]=raw[1]=10;for(int i=0;i<30;++i){runFollowLine();robot_delay(10);}assert(LbMotion.left>LbMotion.right);assert(lastLineError>0);
bits=0;for(int i=0;i<20;++i){runFollowLine();robot_delay(10);}assert(LbMotion.left>0&&LbMotion.right<0);while(clockMs<1300){runFollowLine();robot_delay(10);}assert(error==ERR_LINE_LOST);assert(LbMotion.left==0&&LbMotion.right==0);
reset();stalled=true;followLineCm(20);assert(error==ERR_MOVE_STALL&&!lineOperationCompleted);assert(LbMotion.left==0&&LbMotion.right==0);
reset();bits=0;followLineCm(20);assert(error==ERR_LINE_LOST&&!lineOperationCompleted);
reset();bits=15;lbmbFollowMarker(100,3);assert(error==0&&junctionPending&&lineOperationCompleted);assert(clockMs==20);
reset();bits=12;lbmbFollowMarker(100,1);assert(error==0&&junctionPending);
reset();bits=3;lbmbFollowMarker(100,2);assert(error==0&&junctionPending);
reset();followLineCm(-1);assert(error==ERR_INVALID_MOVE);reset();followLineSeconds(NAN);assert(error==ERR_INVALID_MOVE);reset();followLineCm(0);assert(error==0&&clockMs==0);
}
`
  writeFileSync(join(dir,'test.cpp'),source)
  execFileSync('c++',['-std=c++14',join(dir,'test.cpp'),'-o',join(dir,'test')],{timeout:20000})
  execFileSync(join(dir,'test'),[],{timeout:5000})
 } finally {rmSync(dir,{recursive:true,force:true})}
},25000)
