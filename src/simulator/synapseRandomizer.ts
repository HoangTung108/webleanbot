/** AIROC public script.js, retrieved 2026-11-12. Coordinates are drawing units, not verified mm. */
export const SYNAPSE_RANDOMIZER_SOURCE = 'https://www.airoc.space/labs/SynapseCity/synapse-city-randomizer/script.js';
export const RANDOMIZER_GEOMETRY = {
  side: 1200, cityPitch: 1000 / 3, blackLineWidth: 50 / 3, whiteStripeWidth: 50,
  siteOffset: 1000 / 9 / 2, // ObjD / sqrt(2)
} as const;
export const RANDOMIZER_COLORS = ['red','yellow','green','blue','purple','yellow','mystery'] as const;
export const RANDOMIZER_INTERSECTIONS = [
  [1,'ABC'],[1,'BDG'],[1,'CFH'],[1,'ABD'],[1,'ACF'],[1,'GEH'],[1,'DGHF'],[2,'ABCDF'],
] as const;
export function shuffleDraw<T>(items:readonly T[], random:()=>number):T[] {
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export function validRandomizerSites(sites:readonly string[]):boolean {
  return RANDOMIZER_INTERSECTIONS.every(([minimum,letters])=>sites.filter(s=>letters.includes(s[0])).length>=minimum);
}
/** Same rejection sampling and balanced subsite bag as the public randomizer; injectable seeded RNG. */
export function drawRandomizerSites(count:number, random:()=>number, fixedSiteId?:string):string[] {
  if(!Number.isInteger(count)||count<4||count>7)throw new Error('Randomizer supports 4–7 pollution blocks.');
  if(fixedSiteId&&!/^[A-H][1-4]$/.test(fixedSiteId))throw new Error('Invalid fixed pollution site.');
  for(let attempt=0;attempt<100000;attempt++){
    const zones=shuffleDraw(['A','B','C','D','E','F','G','H'],random);
    const subsites=shuffleDraw(['1','2','3','4','1','2','3','4'],random);
    const sites=zones.slice(0,count).map((zone,i)=>zone+subsites[i]);
    if(!validRandomizerSites(sites)||fixedSiteId&&!sites.includes(fixedSiteId))continue;
    const shuffled=shuffleDraw(sites,random);
    if(fixedSiteId)return [fixedSiteId,...shuffled.filter(site=>site!==fixedSiteId)];
    return shuffled;
  }
  throw new Error('Cannot draw a valid Synapse City layout.');
}
