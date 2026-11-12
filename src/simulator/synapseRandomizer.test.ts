import {expect,it} from 'vitest';
import {drawRandomizerSites,RANDOMIZER_COLORS,RANDOMIZER_INTERSECTIONS,RANDOMIZER_GEOMETRY} from './synapseRandomizer';
import {seededRandom} from './missionWorld';
it('matches category colours and duplicated yellow from the public script',()=>{
 expect(RANDOMIZER_COLORS).toEqual(['red','yellow','green','blue','purple','yellow','mystery']);
 expect(RANDOMIZER_GEOMETRY.cityPitch/RANDOMIZER_GEOMETRY.side*1219.2).toBeCloseTo(338.6666667);
});
it('enforces coverage, unique cities and the two-of-each subsite bag for all categories',()=>{
 for(const count of [4,5,6,7])for(let seed=0;seed<200;seed++){
  const sites=drawRandomizerSites(count,seededRandom(seed));
  expect(sites).toHaveLength(count);expect(new Set(sites.map(s=>s[0])).size).toBe(count);
  for(const n of ['1','2','3','4'])expect(sites.filter(s=>s[1]===n).length).toBeLessThanOrEqual(2);
  for(const [minimum,letters] of RANDOMIZER_INTERSECTIONS)expect(sites.filter(s=>letters.includes(s[0])).length).toBeGreaterThanOrEqual(minimum);
  expect(drawRandomizerSites(count,seededRandom(seed))).toEqual(sites);
 }
});
it('keeps an explicitly supplied organizer site while satisfying coverage',()=>{
 expect(drawRandomizerSites(7,seededRandom(42),'H3')[0]).toBe('H3');
 expect(()=>drawRandomizerSites(3,seededRandom(1))).toThrow();
});
