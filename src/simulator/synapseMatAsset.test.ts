import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {SYNAPSE_CITY} from './boardConfigs';
it('renders the exact same road points and widths that the sensors use',()=>{
 const svg=readFileSync('public/simulator/synapse-city.svg','utf8');
 expect(svg).toContain('viewBox="0 0 1219.2 1219.2"');
 for(const line of SYNAPSE_CITY.lines){
  const tag=svg.match(new RegExp(`<polyline id="${line.id}"[^>]+>`))?.[0];expect(tag).toBeDefined();
  const points=tag!.match(/points="([^"]+)"/)![1].split(' ').map(pair=>pair.split(',').map(Number));
  expect(points).toHaveLength(line.points.length);
  line.points.forEach((p,i)=>{expect(points[i][0]).toBeCloseTo(p.x,5);expect(points[i][1]).toBeCloseTo(p.y,5)});
  expect(tag).toContain(`stroke-width="${line.width}"`);
 }
 const legacy=readFileSync('public/leanbot-ide/simulator-ui.js','utf8');
 expect(JSON.parse(legacy.match(/^  synapse: (.*)$/m)![1])).toEqual(SYNAPSE_CITY);
});
