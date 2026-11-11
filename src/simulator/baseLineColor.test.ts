import {it,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import baseCode from '../../docs/baseCode.cpp?raw';
const line=baseCode.slice(baseCode.indexOf('static int lineErrorForMask'),baseCode.indexOf('enum ObjectColor'));
const color=baseCode.slice(baseCode.indexOf('enum ObjectColor'),baseCode.indexOf('// ----- SECONDARY'));
const constants=baseCode.match(/const (?:int|float|unsigned long) (?:LINE_\w+|JUNCTION_CENTER_MM)\s*=.*?;/g)!.join('\n');
const errorEnum=baseCode.match(/enum ErrorCode \{[\s\S]*?\};/)![0];
function compileRun(main:string,primary=false){
 const dir=mkdtempSync(join(tmpdir(),'leanbot-line-color-'));
 try{
  const source=`#include <algorithm>
#include <array>
#include <cassert>
#include <cmath>
#include <functional>
#include <vector>
using std::max;
#define DEBUG_SERIAL 0
#define BOARD_PRIMARY 0
#define BOARD_MODE ${primary?0:1}
${constants}
${errorEnum}
unsigned long clockMs=0;
unsigned long millis(){return clockMs;}
int constrain(int x,int a,int b){return std::max(a,std::min(b,x));}
struct Motor{int left=0,right=0,centers=0;float distance=0;void runLR(int l,int r){left=l;right=r;}void stopAndWait(){left=right=0;}float getDistanceMm(){return distance;}} LbMotion;
void LbDelay(unsigned long ms){clockMs+=ms;LbMotion.distance+=(LbMotion.left+LbMotion.right)*0.5f*65/2000*ms/1000;}
std::function<int()> mask=[](){return 6;};
struct Line{int read(){return mask();}} LbIRLine;
bool junctionPending=false,colorSensorReady=true;
int lastLineError=0,lastLineCmdL=0,lastLineCmdR=0;
unsigned long lastLineSeenTime=0;
std::vector<ErrorCode> errors;
void failMission(ErrorCode e){errors.push_back(e);LbMotion.stopAndWait();}
void resetMotionState(){lastLineCmdL=lastLineCmdR=lastLineError=0;lastLineSeenTime=millis();}
void move_tank(int,int,float cm){++LbMotion.centers;LbMotion.distance+=cm*10;}
struct CRGB{int r,g,b;CRGB(int r=0,int g=0,int b=0):r(r),g(g),b(b){}bool operator==(const CRGB&o)const{return r==o.r&&g==o.g&&b==o.b;}static const CRGB Red,Lime,Green,Blue,Black;};
const CRGB CRGB::Red(255,0,0),CRGB::Lime(0,255,0),CRGB::Green(0,128,0),CRGB::Blue(0,0,255),CRGB::Black(0,0,0);
struct RGB{int brightness=64;CRGB last;std::vector<CRGB> lights;void fillColor(CRGB c){last=c;lights.push_back(c);}void show(){}int getBrightness(){return brightness;}void setBrightness(int x){brightness=x;}} LbRGB;
struct Sensor{bool available=true,active=false;unsigned long enabledAt=0;int reads=0,failAt=-1;std::vector<std::array<int,3>> frames;int colorAvailable(){if(!active){active=true;enabledAt=millis();}return available;}bool readColor(int&r,int&g,int&b){assert(millis()-enabledAt>=35);int i=reads++;if(i==failAt)return false;auto v=frames.at(i);r=v[0];g=v[1];b=v[2];active=false;return true;}} APDS;
${line}
${color}
void reset(){clockMs=0;LbMotion=Motor();LbRGB=RGB();APDS=Sensor();errors.clear();junctionPending=false;colorSensorReady=true;resetMotionState();mask=[](){return 6;};}
void redFrames(){APDS.frames={{{22,0,0}},{{0,6,0}},{{0,0,7}},{{2,2,2}}};}
int main(){${main}}
`;
  const input=join(dir,'test.cpp'),binary=join(dir,'test');writeFileSync(input,source);
  execFileSync(process.env.CXX||'c++',['-std=c++14',input,'-o',binary],{timeout:20000});execFileSync(binary,[],{timeout:5000});
 }finally{rmSync(dir,{recursive:true,force:true});}
}
it('handles line distance, starting crossings, multiple junctions, lost-line and timeout behavior in native C++',()=>{
 compileRun(`
 reset();LbMotion.distance=.75f;followLineDistance(100);assert(LbMotion.distance>=100.75f&&LbMotion.distance<101.1f);assert(errors.empty());assert(LbMotion.left==0&&LbMotion.right==0);
 reset();for(int i=0;i<12;++i)runFollowLine(8);assert(LbMotion.left<LbMotion.right);
 reset();for(int i=0;i<12;++i)runFollowLine(1);assert(LbMotion.left>LbMotion.right);
 reset();mask=[](){return 0;};junctionPending=true;followLineUntilJunction();assert(errors.size()==1&&errors[0]==ERR_LINE_LOST);assert(!junctionPending);centerDetectedJunction();assert(LbMotion.centers==0);assert(clockMs>=320&&clockMs<400);
 reset();mask=[](){float d=LbMotion.distance;return (d<5||(d>=40&&d<50)||d>=100)?15:6;};followLineMultipleJunctions(2);assert(errors.empty());assert(junctionPending);assert(LbMotion.centers==1);assert(LbMotion.distance>=100&&LbMotion.distance<101);goToJunction();assert(!junctionPending);assert(LbMotion.centers==2);centerDetectedJunction();assert(LbMotion.centers==2);
 reset();followLineUntilJunction();assert(errors.size()==1&&errors[0]==ERR_JUNCTION_TIMEOUT);assert(!junctionPending);assert(clockMs>14000&&clockMs<14100);assert(LbMotion.left==0&&LbMotion.right==0);
 reset();followLineDistance(0);assert(errors.empty()&&LbMotion.distance==0);
 reset();followLineDistance(-1);assert(errors.size()==1&&errors[0]==ERR_INVALID_MOVE);
 `);
},25000);
it('classifies ambient-corrected colors and restores brightness on failed reads/timeouts',()=>{
 compileRun(`
 assert(classifyColor(4,2,2)==OBJECT_RED);assert(classifyColor(2,4,2)==OBJECT_GREEN);assert(classifyColor(2,2,4)==OBJECT_BLUE);
 assert(classifyColor(3,0,0)==OBJECT_UNKNOWN);assert(classifyColor(6,6,0)==OBJECT_UNKNOWN);assert(classifyColor(4,3,0)==OBJECT_UNKNOWN);assert(classifyColor(0,0,0)==OBJECT_UNKNOWN);
 reset();redFrames();bool valid=false;assert(readObjectColor(valid)==OBJECT_RED&&valid);assert(errors.empty());assert(LbRGB.brightness==64);assert(APDS.reads==4);assert(LbRGB.lights.size()==5);assert(LbRGB.lights[0]==CRGB::Red&&LbRGB.lights[1]==CRGB::Lime&&LbRGB.lights[2]==CRGB::Blue&&LbRGB.lights[3]==CRGB::Black);
 reset();APDS.frames={{{10,0,0}},{{0,10,0}},{{0,0,10}},{{10,10,10}}};valid=false;assert(readObjectColor(valid)==OBJECT_UNKNOWN&&valid);assert(errors.empty());
 reset();redFrames();APDS.failAt=1;valid=true;assert(readObjectColor(valid)==OBJECT_UNKNOWN&&!valid);assert(errors.size()==1&&errors[0]==ERR_COLOR_SENSOR);assert(LbRGB.brightness==64);
 reset();APDS.available=false;valid=true;assert(readObjectColor(valid)==OBJECT_UNKNOWN&&!valid);assert(errors.size()==1&&errors[0]==ERR_COLOR_SENSOR);assert(APDS.reads==0);assert(LbRGB.brightness==64);assert(clockMs>=885&&clockMs<1000);
 reset();redFrames();APDS.failAt=0;requireColor(OBJECT_BLUE);assert(errors.size()==1&&errors[0]==ERR_COLOR_SENSOR);
 reset();redFrames();requireColor(OBJECT_BLUE);assert(errors.size()==1&&errors[0]==ERR_COLOR_MISMATCH);
 reset();colorSensorReady=false;valid=true;assert(readObjectColor(valid)==OBJECT_UNKNOWN&&!valid);assert(APDS.reads==0&&errors.size()==1);
 `);
},25000);
it('keeps Primary color checks optional without reading the sensor',()=>{
 compileRun('reset();colorSensorReady=false;requireColor(OBJECT_BLUE);assert(APDS.reads==0&&errors.empty());',true);
},25000);
it('uses one shared line loop while retaining the public void helpers',()=>{
 expect(line.match(/while \(true\)/g)).toHaveLength(1);
 expect(line).toContain('void followLineDistance(');expect(line).toContain('void followLineUntilJunction(');
});
