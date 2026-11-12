import {readFileSync,writeFileSync} from 'node:fs';
import {SYNAPSE_CITY as board} from '../src/simulator/boardConfigs';
const n=(v:number)=>Number(v.toFixed(6));
const points=(line:typeof board.lines[number])=>line.points.map(p=>`${n(p.x)},${n(p.y)}`).join(' ');
const scale=board.metadata!.randomizerReference.scaleMmPerDrawingUnit;
const size=board.width,center=size/2,pitch=325;
const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
 '<title>Synapse City — AIROC proportions, calibrated 325 mm city pitch</title>',
 '<desc>Sheet 1219.2 mm square; drawing scale 0.975 mm/unit; black lines 16.25 mm. SVG and sensor paths share synapseGeometry.ts.</desc>',
 `<rect width="${size}" height="${size}" fill="#bbb"/>`,
 `<rect x="${n(center-600*scale)}" y="${n(center-600*scale)}" width="${1200*scale}" height="${1200*scale}" fill="none" stroke="#000" stroke-width="${2*scale}"/>`];
for(const line of board.lines.slice(0,5))parts.push(`<polyline points="${points(line)}" fill="none" stroke="#fff" stroke-width="${50*scale}" stroke-linecap="butt"/>`);
const crl=board.analysisArea!;
const check=(pitch-board.lines[0].width)/7/Math.sqrt(2);
parts.push(`<rect x="${crl.x-pitch/2}" y="${crl.y-pitch/2}" width="${pitch}" height="${pitch}" fill="#efe"/>`,
 `<defs><pattern id="crl-grid" width="${n(2*check)}" height="${n(2*check)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${n(check)}" height="${n(check)}" fill="#beb"/><rect x="${n(check)}" y="${n(check)}" width="${n(check)}" height="${n(check)}" fill="#beb"/></pattern></defs>`,
 `<rect x="${crl.x-pitch/2}" y="${crl.y-pitch/2}" width="${pitch}" height="${pitch}" fill="url(#crl-grid)"/>`);
for(const line of board.lines)parts.push(`<polyline id="${line.id}" points="${points(line)}" fill="none" stroke="#000" stroke-width="${line.width}" stroke-linecap="butt"/>`);
for(const zone of board.cityZones??[]){
 const {x,y,side}=zone.containment;
 parts.push(`<rect x="${n(x-side/2)}" y="${n(y-side/2)}" width="${n(side)}" height="${n(side)}" rx="${10*scale}" transform="rotate(45 ${x} ${y})" fill="#8ee" stroke="#444" stroke-width="${1.5*scale}"/>`,
 `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="Helvetica,Arial,sans-serif" font-weight="bold" font-size="${36*scale}">${zone.id}</text>`);
 for(const site of zone.sites)parts.push(`<g id="site-${site.id}"><rect x="${n(site.x-site.width/2)}" y="${n(site.y-site.height/2)}" width="${n(site.width)}" height="${n(site.height)}" transform="rotate(${site.rotation} ${site.x} ${site.y})" fill="none" stroke="#fa0" stroke-width="${3*scale}"/><text x="${n(site.x+(site.x<x?16:-16))}" y="${n(site.y+(site.y<y?16:-16))}" text-anchor="middle" dominant-baseline="middle" font-family="Helvetica,Arial,sans-serif" font-weight="bold" font-size="${21*scale}" fill="#c88">${site.number}</text></g>`);
}
for(const site of board.storageSites??[])parts.push(`<g id="storage-${site.id}"><rect x="${n(site.x-site.width/2)}" y="${n(site.y-site.height/2)}" width="${n(site.width)}" height="${n(site.height)}" transform="rotate(${site.rotation} ${site.x} ${site.y})" fill="none" stroke="#3f3" stroke-width="${3*scale}"/><text x="${n(site.x+(site.rotation?23:0))}" y="${n(site.y+(site.rotation?0:27))}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="${16*scale}" fill="#179517">${site.id}</text></g>`);
parts.push(`<text x="${crl.x}" y="${crl.y}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-45 ${crl.x} ${crl.y})" font-family="Helvetica,Arial,sans-serif" font-weight="bold" font-size="${36*scale}">CRL</text>`, '</svg>');
writeFileSync('public/simulator/synapse-city.svg',parts.join('\n'));

// The static HTML simulator embeds its own board; generate it from the same model.
const legacyPath='public/leanbot-ide/simulator-ui.js';
const legacy=readFileSync(legacyPath,'utf8');
if(!/^  synapse: .*$/m.test(legacy))throw new Error('Missing static Synapse board configuration');
writeFileSync(legacyPath,legacy.replace(/^  synapse: .*$/m,()=>`  synapse: ${JSON.stringify(board)}`));
