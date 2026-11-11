import { it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import base from '../../docs/baseCode.cpp?raw'
it('reads color with no caller variables, reuses the result and clears stale colors on uncertain/failed reads', () => {
 const dir=mkdtempSync(join(tmpdir(),'leanbot-simple-color-'))
 try {
  const color=base.slice(base.indexOf('const int COLOR_SAMPLE_COUNT'),base.indexOf('// Tín hiệu màu IoT'))
  const source=`#include <algorithm>
#include <array>
#include <vector>
#include <cmath>
#include <cassert>
using std::min;using std::max;
#define F(x) x
${base.match(/enum ObjectColor \{[^}]*\};/)![0]}
${base.match(/enum ErrorCode \{[\s\S]*?\};/)![0]}
ObjectColor lastMeasuredColor=UNKNOWN;
bool colorSensorReady=true;
unsigned long clockMs=0;unsigned long millis(){return clockMs;}
void robot_delay(unsigned long ms){clockMs+=ms;}
int error=0;void failMission(ErrorCode e){error=e;}
struct {template<class T>void print(T){}template<class T>void println(T){}} Serial;
struct CRGB{int r,g,b;CRGB(int r,int g,int b):r(r),g(g),b(b){}};
struct {int changes=0;void fillColor(CRGB){++changes;}void show(){}} LbRGB;
struct {int reads=0,failAt=-1;std::vector<std::array<int,3>> frames;bool colorAvailable(){return true;}bool readColor(int&r,int&g,int&b){int i=reads++;if(i==failAt)return false;auto sample=frames.at(i);r=sample[0];g=sample[1];b=sample[2];return true;}} APDS;
${color}
void frame(int r,int g,int b){APDS.reads=0;APDS.failAt=-1;APDS.frames.assign(5,{r,g,b});}
int main(){
assert(get_color()==UNKNOWN&&!is_color(UNKNOWN));
frame(10,15,100);read_color();assert(APDS.reads==5);assert(get_color()==BLUE);assert(is_color(BLUE));assert(!is_color(RED));assert(APDS.reads==5);assert(LbRGB.changes==1);
frame(100,100,100);read_color();assert(get_color()==UNKNOWN);assert(!is_color(BLUE));assert(LbRGB.changes==1);
frame(100,15,10);read_color();assert(is_color(RED));assert(LbRGB.changes==2);
frame(10,15,100);APDS.failAt=2;read_color();assert(get_color()==UNKNOWN);assert(!is_color(RED));assert(error==ERR_COLOR_SENSOR);assert(LbRGB.changes==2);
frame(10,15,100);colorSensorReady=false;read_color();assert(get_color()==UNKNOWN&&APDS.reads==0);
colorSensorReady=true;frame(10,15,100);bool valid=false;assert(readObjectColor(valid)==BLUE&&valid);assert(get_color()==BLUE);
frame(100,100,100);assert(Obj_detectColor()==UNKNOWN);assert(!is_color(BLUE));
}
`
  writeFileSync(join(dir,'test.cpp'),source)
  execFileSync('c++',['-std=c++14',join(dir,'test.cpp'),'-o',join(dir,'test')],{timeout:20000})
  execFileSync(join(dir,'test'),[],{timeout:5000})
 } finally {rmSync(dir,{recursive:true,force:true})}
},25000)
