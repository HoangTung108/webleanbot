import {it,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import base from './baseFeatures.fixture';
it('connects directly with literal credentials and AssetID in SDK order',()=>{
 const section=base.slice(base.indexOf('bool iotConfigured'),base.indexOf('void set_line'));
 const dir=mkdtempSync(join(tmpdir(),'leanbot-wifi-direct-'));
 try{
 const source=`#include <string>
#include <cassert>
#include <vector>
#define F(x) x
std::vector<std::string> calls;
struct {struct {void begin(const char*s,const char*p){assert(std::string(s)=="test");assert(std::string(p)=="pass");calls.push_back("wifi");}} Wifi;
struct {void begin(const char*s){assert(std::string(s)=="ROOM");calls.push_back("asset");}} Asset;} LbIoT;
${section}
int main(){assert(!iotConfigured);set_wifi();set_wifi();assert(iotConfigured);assert((calls==std::vector<std::string>{"wifi","asset","wifi","asset"}));}`;
 const input=join(dir,'wifi.cpp'),binary=join(dir,'wifi');writeFileSync(input,source);
 execFileSync('c++',['-std=c++11',input,'-o',binary]);execFileSync(binary,[]);
 }finally{rmSync(dir,{recursive:true,force:true});}
 expect(base).not.toContain('declare_wifi');expect(base).not.toContain('String wifiSsid');expect(base).not.toContain('wifiPassword');
});
