import {it,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import baseCode from '../../docs/baseCode.cpp?raw';
import {generateRouteCode} from './routePlanner';
it('stores Wi-Fi configuration and invokes the existing IoT API with correct parameters',()=>{
 const section=baseCode.slice(baseCode.indexOf('String wifiSsid;'),baseCode.indexOf('void set_line'));expect(section).toBeTruthy();
 const dir=mkdtempSync(join(tmpdir(),'leanbot-wifi-test-'));
 try{
  const source=`#include <string>
#include <cassert>
#include <vector>
using String=std::string;
std::vector<String> events;
struct __FlashStringHelper {};
#define F(x) reinterpret_cast<const __FlashStringHelper*>(x)
const int ERR_WIFI_CONFIG=11;
int failures=0;
void failMission(int code){assert(code==ERR_WIFI_CONFIG);++failures;}
struct WifiApi{int calls=0;String ssid,password;void begin(const char*s,const char*p){++calls;events.push_back("wifi");ssid=s;password=p;}};
struct AssetApi{int calls=0;String id;void begin(const __FlashStringHelper*s){++calls;events.push_back("asset");id=reinterpret_cast<const char*>(s);}};
struct IoTApi{WifiApi Wifi;AssetApi Asset;} LbIoT;
${section}
int main(){
 set_wifi();assert(failures==1);assert(LbIoT.Wifi.calls==0);
 String ssid="Test SSID",password="test-password";
 declare_wifi(ssid,password,F("asset-test"));ssid="changed";password="changed";
 assert(LbIoT.Wifi.calls==0);set_wifi();
 assert(LbIoT.Wifi.ssid=="Test SSID");assert(LbIoT.Wifi.password=="test-password");assert(LbIoT.Asset.id=="asset-test");assert(iotConfigured);assert(events[0]=="wifi"&&events[1]=="asset");
 set_wifi("Open Network", "", F("open-asset"));assert(LbIoT.Wifi.calls==2);assert(LbIoT.Wifi.password.empty());assert(LbIoT.Asset.calls==2);assert(iotConfigured);
 set_wifi("Second Network","second-password",F("second-asset"));assert(LbIoT.Wifi.calls==3);assert(LbIoT.Asset.calls==3);assert(LbIoT.Asset.id=="second-asset");
 set_wifi("","password",F("asset"));assert(failures==2);assert(LbIoT.Wifi.calls==3);assert(!iotConfigured);
 set_wifi("No asset", "");assert(failures==3);assert(LbIoT.Wifi.calls==3);assert(!iotConfigured);
 declare_wifi("Deferred", "", F("deferred-asset"));
 assert(!iotConfigured&&LbIoT.Asset.calls==3);set_wifi();
 assert(iotConfigured&&LbIoT.Asset.id=="deferred-asset");
 assert(events[events.size()-2]=="wifi"&&events.back()=="asset");
}
`;
  const input=join(dir,'wifi.cpp'),binary=join(dir,'wifi');writeFileSync(input,source);
  execFileSync(process.env.CXX||'c++',['-std=c++11',input,'-o',binary],{timeout:15000});execFileSync(binary,[],{timeout:5000});
 }finally{rmSync(dir,{recursive:true,force:true});}
},20000);
it('keeps current Wi-Fi helpers in generated routes with virtual runtime handling',()=>{
 expect(baseCode).toContain('void declare_wifi(');
 expect(baseCode).toContain('void set_wifi()');
 expect(baseCode).not.toContain('void set_wifi(string )');
 const route=generateRouteCode({x:400,y:600,heading:0},[]);
 expect(route).toContain('LbIoT.Wifi.begin');expect(route).toContain('wifiPassword');
 expect(route.slice(route.indexOf('void setup()'))).not.toContain('set_wifi(');
});
