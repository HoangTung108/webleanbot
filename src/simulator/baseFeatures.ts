export const BASE_FEATURES = ['BASE_USE_IOT', 'BASE_USE_COLOR'] as const;
/** Resolve the small, explicit feature switches shared by Arduino and the simulator.
 * Preserve line numbers. Other preprocessor directives are left for the existing parser.
 */
export function preprocessBaseFeatures(source:string):string {
 const flags=new Map<string,boolean>();
 const frames:{parent:boolean;condition:boolean;seenElse:boolean}[]=[];
 let active=true;
 const result=source.split('\n').map(line=>{
  const define=/^\s*#define\s+(BASE_USE_\w+)\s+([01])\s*(?:\/\/.*)?$/.exec(line);
  if(!define&&/^\s*#define\s+BASE_USE_/.test(line))throw new Error('Base feature phải có giá trị 0 hoặc 1.');
  if(define){if(active)flags.set(define[1],define[2]==='1');return '';}
  const start=/^\s*#if\s+(BASE_USE_\w+)\s*(?:\/\/.*)?$/.exec(line);
  if(start){const condition=flags.get(start[1])??false;frames.push({parent:active,condition,seenElse:false});active=active&&condition;return '';}
  if(frames.length&&/^\s*#else\b/.test(line)){
   const frame=frames.at(-1)!;if(frame.seenElse)throw new Error('Duplicate base feature #else');frame.seenElse=true;active=frame.parent&&!frame.condition;return '';
  }
  if(frames.length&&/^\s*#endif\b/.test(line)){active=frames.pop()!.parent;return '';}
  return active?line:'';
 }).join('\n');
 if(frames.length)throw new Error('Unclosed base feature #if');
 return result;
}
export function configureBaseFeatures(source:string, enabled:readonly typeof BASE_FEATURES[number][]):string {
 return source.replace(/^(\s*#define\s+)(BASE_USE_(?:IOT|COLOR))(\s+)[01]/gm,(_all,a,name,b)=>`${a}${name}${b}${enabled.includes(name)?1:0}`);
}
