import {it} from 'vitest';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import base from '../../docs/baseCode.cpp?raw';
// Legacy float classifier, retained only as the regression oracle.
const legacy = "const int OLD_COLOR_MIN_CHANNEL = 4;\nconst float OLD_COLOR_MIN_SATURATION = 0.20f;\nconst float OLD_COLOR_RED_YELLOW_HUE = 25.0f;\nconst float OLD_COLOR_YELLOW_GREEN_HUE = 80.0f;\nconst float OLD_COLOR_GREEN_BLUE_HUE = 170.0f;\nconst float OLD_COLOR_BLUE_PURPLE_HUE = 250.0f;\nconst float OLD_COLOR_PURPLE_RED_HUE = 345.0f;\nconst float colorRedGain = 1.0f;\nconst float colorGreenGain = 1.0f;\nconst float colorBlueGain = 1.0f;\n\nstatic float referenceHue(float red, float green, float blue) {\n  const float top = max(red, max(green, blue));\n  const float bottom = min(red, min(green, blue));\n  const float span = top - bottom;\n  if (span <= 0.0f) return -1.0f;\n  float hue;\n  if (top == red) hue = 60.0f * (green - blue) / span;\n  else if (top == green) hue = 120.0f + 60.0f * (blue - red) / span;\n  else hue = 240.0f + 60.0f * (red - green) / span;\n  if (hue < 0.0f) hue += 360.0f;\n  return hue;\n}\n\nstatic ObjectColor referenceColor(int red, int green, int blue) {\n  const float r = max(0, red) * colorRedGain;\n  const float g = max(0, green) * colorGreenGain;\n  const float b = max(0, blue) * colorBlueGain;\n  const float top = max(r, max(g, b));\n  const float bottom = min(r, min(g, b));\n  if (top < OLD_COLOR_MIN_CHANNEL || (top - bottom) / top < OLD_COLOR_MIN_SATURATION)\n    return UNKNOWN;\n  const float hue = referenceHue(r, g, b);\n  if (hue < OLD_COLOR_RED_YELLOW_HUE || hue >= OLD_COLOR_PURPLE_RED_HUE) return RED;\n  if (hue < OLD_COLOR_YELLOW_GREEN_HUE) return YELLOW;\n  if (hue < OLD_COLOR_GREEN_BLUE_HUE) return GREEN;\n  if (hue < OLD_COLOR_BLUE_PURPLE_HUE) return BLUE;\n  return PURPLE;\n}\n\n";
it('matches legacy color thresholds for every 8-bit RGB tuple and sampled APDS values',()=>{
 const dir=mkdtempSync(join(tmpdir(),'leanbot-integer-color-'));
 try{
  const constants=base.slice(base.indexOf('const int COLOR_MIN_CHANNEL'),base.indexOf('#endif',base.indexOf('const int COLOR_MIN_CHANNEL')));
  const a=base.indexOf('static ObjectColor classifyColor(int red, int green, int blue) {');
  const classifier=base.slice(a,base.indexOf('// Tối đa 5 mẫu',a));
  const source=`#include <algorithm>
#include <cassert>
#include <cstdint>
using std::min;using std::max;
${base.match(/enum ObjectColor \{[^}]*\};/)![0]}
${legacy}
${constants}
${classifier}
int main(){
 for(int r=0;r<256;r++)for(int g=0;g<256;g++)for(int b=0;b<256;b++)assert(referenceColor(r,g,b)==classifyColor(r,g,b));
 uint32_t state=1;
 for(int i=0;i<2000000;i++){
  state=1664525u*state+1013904223u;int r=state%32768;
  state=1664525u*state+1013904223u;int g=state%32768;
  state=1664525u*state+1013904223u;int b=state%32768;
  assert(referenceColor(r,g,b)==classifyColor(r,g,b));
 }
 assert(classifyColor(-1,-1,-1)==UNKNOWN);
 assert(classifyColor(32767,32767,32767)==UNKNOWN);
}
`;
  const input=join(dir,'color.cpp'),binary=join(dir,'color');writeFileSync(input,source);
  execFileSync('c++',['-std=c++14','-O2',input,'-o',binary],{timeout:15000});execFileSync(binary,[],{timeout:15000});
 }finally{rmSync(dir,{recursive:true,force:true});}
},30000);
