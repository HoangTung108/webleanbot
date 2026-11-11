import {it,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import baseCode from '../../docs/baseCode.cpp?raw';
import {generateRouteCode} from './routePlanner';
it('stores Wi-Fi configuration and invokes the existing IoT API with correct parameters',()=>{
 const section=baseCode.match(/\/\/ BEGIN WIFI HELPERS([\s\S]*?)\/\/ END WIFI HELPERS/)?.[1];expect(section).toBeTruthy();
 const dir=mkdtempSync(join(tmpdir(),'leanbot-wifi-test-'));
 try{
  const source=`#include <string>
#include <cassert>
using String=std::string;
const int ERR_WIFI_CONFIG=11;
int failures=0;
void failMission(int code){assert(code==ERR_WIFI_CONFIG);++failures;}
struct WifiApi{int calls=0;String ssid,password;void begin(const char*s,const char*p){++calls;ssid=s;password=p;}};
struct AssetApi{int calls=0;String id;void begin(const char*s){++calls;id=s;}};
struct IoTApi{WifiApi Wifi;AssetApi Asset;} LbIoT;
${section}
int main(){
 set_wifi();assert(failures==1);assert(LbIoT.Wifi.calls==0);
 String ssid="Test SSID",password="test-password",asset="asset-test";
 declare_wifi(ssid,password,asset);ssid="changed";password="changed";asset="changed";
 assert(LbIoT.Wifi.calls==0);set_wifi();
 assert(LbIoT.Wifi.ssid=="Test SSID");assert(LbIoT.Wifi.password=="test-password");assert(LbIoT.Asset.id=="asset-test");
 set_wifi("Open Network", "");assert(LbIoT.Wifi.calls==2);assert(LbIoT.Wifi.password.empty());assert(LbIoT.Asset.calls==1);
 set_wifi("Second Network","second-password","second-asset");assert(LbIoT.Wifi.calls==3);assert(LbIoT.Asset.calls==2);assert(LbIoT.Asset.id=="second-asset");
 set_wifi("","password","asset");assert(failures==2);assert(LbIoT.Wifi.calls==3);
}
`;
  const input=join(dir,'wifi.cpp'),binary=join(dir,'wifi');writeFileSync(input,source);
  execFileSync(process.env.CXX||'c++',['-std=c++11',input,'-o',binary],{timeout:15000});execFileSync(binary,[],{timeout:5000});
 }finally{rmSync(dir,{recursive:true,force:true});}
},20000);
it('wires the defaults through configuration and connection, excluding hardware networking from simulated routes',()=>{
 expect(baseCode).toContain('declare_wifi(WIFI_SSID, WIFI_PASSWORD, IOT_ASSET_ID);');
 expect(baseCode).not.toContain('void set_wifi(string )');
 const route=generateRouteCode({x:400,y:600,heading:0},[]);
 expect(route).not.toContain('LbIoT.');expect(route).not.toContain('wifiPassword');
});
