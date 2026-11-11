import { it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import base from '../../docs/baseCode.cpp?raw'
it('steers across diagonal masks, reacquires lost line and bounds timed following in native C++', () => {
 const dir=mkdtempSync(join(tmpdir(),'leanbot-diagonal-'))
 try {
  const constants=base.match(/const (?:int|float|unsigned long) (?:LINE_\w+|JUNCTION_CENTER_MM)\s*=.*?;/g)!.join('\n')
  const line=base.slice(base.indexOf('static int lineErrorForMask'),base.indexOf('const int COLOR_SAMPLE_COUNT'))
  const source=`#include <algorithm>
#include <cmath>
#include <cassert>
#include <functional>
using std::min;using std::max;
using std::isfinite;
template<class T>T constrain(T v,T a,T b){return min(b,max(a,v));}
${constants}
${base.match(/enum ErrorCode \{[\s\S]*?\};/)![0]}
unsigned long clockMs=0;unsigned long millis(){return clockMs;}
int lastLineError=0,lastLineCmdL=0,lastLineCmdR=0;unsigned long lastLineSeenTime=0;bool junctionPending=false;
struct {int left=0,right=0;void runLR(int l,int r){left=l;right=r;}void stopAndWait(){left=right=0;}float getDistanceMm(){return 0;}} LbMotion;
std::function<int()> mask=[](){return 6;};struct {int read(){return mask();}} LbIRLine;
int error=0,services=0;void robot_delay(unsigned long ms){clockMs+=ms;++services;}
void resetMotionState(){lastLineError=lastLineCmdL=lastLineCmdR=0;lastLineSeenTime=millis();}
void failMission(ErrorCode e){error=e;LbMotion.stopAndWait();}
void move_tank(int,int,float){}
${line}
int main(){
resetMotionState();assert(lineErrorForMask(10)==-1);assert(lineErrorForMask(5)==1);
for(int i=0;i<15;++i)runFollowLine(8);assert(LbMotion.left<0&&LbMotion.right>0);
for(int i=0;i<15;++i)runFollowLine(1);assert(LbMotion.left>0&&LbMotion.right<0);
for(int i=0;i<15;++i)runFollowLine(0);assert(LbMotion.left>LbMotion.right);
resetMotionState();mask=[](){return clockMs%80<20?8:6;};unsigned long start=clockMs;followLineSeconds(.255f);assert(clockMs-start==255);assert(services>0);assert(error==0);assert(LbMotion.left==0&&LbMotion.right==0);
mask=[](){return 0;};start=clockMs;followLineSeconds(2);assert(clockMs-start>=320&&clockMs-start<340);assert(error==ERR_LINE_LOST);assert(LbMotion.left==0&&LbMotion.right==0);
error=0;followLineSeconds(-1);assert(error==ERR_INVALID_MOVE);error=0;followLineSeconds(NAN);assert(error==ERR_INVALID_MOVE);
error=0;start=clockMs;followLineSeconds(0);assert(clockMs==start&&error==0);
}
`
  writeFileSync(join(dir,'test.cpp'),source)
  execFileSync('c++',['-std=c++14',join(dir,'test.cpp'),'-o',join(dir,'test')],{timeout:20000})
  execFileSync(join(dir,'test'),[],{timeout:5000})
 }finally{rmSync(dir,{recursive:true,force:true})}
},25000)
