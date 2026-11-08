import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SYNAPSE_CITY } from './boardConfigs';

const svg = readFileSync('public/simulator/synapse-city.svg', 'utf8');
describe('competition markers from the supplied diagram', () => {
  it('includes four correctly numbered sites for each of eight cities and matches the image markers', () => {
    expect(SYNAPSE_CITY.cityZones?.map(z => z.id).sort()).toEqual(['A','B','C','D','E','F','G','H']);
    const ids = new Set<string>();
    for (const zone of SYNAPSE_CITY.cityZones!) {
      expect(zone.sites.map(s => s.number)).toEqual([1,2,3,4]);
      for (const site of zone.sites) {
        ids.add(site.id);
        expect(Math.sign(site.x-zone.center.x)).toBe([1,2].includes(site.number) ? -1 : 1);
        expect(Math.sign(site.y-zone.center.y)).toBe([1,3].includes(site.number) ? -1 : 1);
        expect(svg).toContain(`id="site-${site.id}"`);
        expect(site.rotation).toBe([1,4].includes(site.number) ? 45 : -45);
        const originalX=Math.round((609.6+(site.x-609.6)*350/325)*1e6)/1e6;
        const originalY=Math.round((609.6+(site.y-609.6)*350/325)*1e6)/1e6;
        expect(svg).toContain(`rotate(${site.rotation} ${originalX} ${originalY})`);
      }
    }
    expect(ids.size).toBe(32);
  });
  it('places odd storage sites below and even sites to the right, and starts in CRL', () => {
    expect(SYNAPSE_CITY.storageSites).toHaveLength(6);
    expect(svg).toContain('scale(0.9285714285714286)');
    for (const site of SYNAPSE_CITY.storageSites!) {
      expect(svg).toContain(`id="storage-${site.id}"`);
      if (Number(site.id.slice(1)) % 2) { expect(site.y).toBeCloseTo(1139.257143,5); expect(site.rotation).toBe(0); }
      else { expect(site.x).toBeCloseTo(1139.257143,5); expect(site.rotation).toBe(90); }
    }
    expect(SYNAPSE_CITY.initialPose).toEqual({ x: 934.6, y: 934.6, heading: 270 });
    expect(SYNAPSE_CITY.obstacles).toHaveLength(0);
  });
});
