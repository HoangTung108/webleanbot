import { it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import base from './baseFeatures.fixture'
it('reads color with no caller variables, reuses the result and clears stale colors on uncertain/failed reads', () => {
 const dir=mkdtempSync(join(tmpdir(),'leanbot-simple-color-'))
 try {
  const color=base.slice(base.indexOf('// Đọc và hiệu chuẩn màu'),base.indexOf('// Hiệu chỉnh thông số'))+base.slice(base.indexOf('static bool readAPDSColor'),base.indexOf('// Chỉ chuyển đổi giao thức'))
  const source=`#include <algorithm>
#include <array>
#include <vector>
#include <cmath>
#include <cassert>
using std::min;using std::max;
#define F(x) x
${base.match(/enum ObjectColor \{[^}]*\};/)![0]}
ObjectColor lastMeasuredColor=UNKNOWN;
bool colorSensorReady=true;
unsigned long clockMs=0;unsigned long millis(){return clockMs;}
bool check_mission_reset(){return false;}
void robot_delay(unsigned long ms){clockMs+=ms;}
struct {int stops=0;void stopAndWait(){++stops;}} LbMotion;
struct {template<class T>void print(T){}template<class T>void println(T){}} Serial;
struct CRGB{int r,g,b;CRGB(int r,int g,int b):r(r),g(g),b(b){}};
struct {int changes=0,brightness=37;CRGB rgb{0,0,0};int getBrightness(){return brightness;}void setBrightness(int v){brightness=v;}void fillColor(CRGB c){rgb=c;++changes;}void show(){}} LbRGB;
struct {bool beginOk=true;bool begin(){return beginOk;}int reads=0,failAt=-1;std::vector<std::array<int,3>> frames;bool colorAvailable(){return true;}bool readColor(int&r,int&g,int&b){int i=reads++;if(i==failAt)return false;auto sample=frames.at(i/4);r=800+sample[0]*LbRGB.rgb.r/255;g=100+sample[1]*LbRGB.rgb.g/255;b=50+sample[2]*LbRGB.rgb.b/255;return true;}} APDS;
${color}
void frame(int r,int g,int b){APDS.reads=0;APDS.failAt=-1;APDS.frames.assign(5,{r,g,b});}
int main(){
assert(lastMeasuredColor==UNKNOWN&&!(lastMeasuredColor == UNKNOWN && UNKNOWN != UNKNOWN));
frame(10,15,100);read_color();assert(APDS.reads==16);assert(lastMeasuredColor==BLUE);assert(LbRGB.rgb.b==255);assert(LbRGB.brightness==37);
frame(100,100,100);read_color();assert(lastMeasuredColor==UNKNOWN);assert(APDS.reads==8);assert(LbRGB.rgb.r==0&&LbRGB.rgb.g==0&&LbRGB.rgb.b==0);assert(LbRGB.brightness==37);
frame(100,15,10);read_color();assert(lastMeasuredColor==RED);assert(LbRGB.rgb.r==255);
frame(10,15,100);APDS.failAt=2;assert(!read_color());assert(lastMeasuredColor==UNKNOWN);assert(LbMotion.stops==1);assert(LbRGB.rgb.r==0&&LbRGB.rgb.g==0&&LbRGB.rgb.b==0);assert(LbRGB.brightness==37);
frame(10,15,100);colorSensorReady=false;APDS.beginOk=false;assert(!read_color());assert(lastMeasuredColor==UNKNOWN&&APDS.reads==0);
colorSensorReady=true;frame(10,15,100);assert(read_color());assert(lastMeasuredColor==BLUE);
frame(100,100,100);assert(read_color()==UNKNOWN);assert(lastMeasuredColor==UNKNOWN);assert(!(lastMeasuredColor == BLUE && BLUE != UNKNOWN));
}
`
  writeFileSync(join(dir,'test.cpp'),source)
  execFileSync('c++',['-std=c++14',join(dir,'test.cpp'),'-o',join(dir,'test')],{timeout:20000})
  execFileSync(join(dir,'test'),[],{timeout:5000})
 } finally {rmSync(dir,{recursive:true,force:true})}
},25000)
