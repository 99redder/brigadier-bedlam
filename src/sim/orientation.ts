import type { Point } from "./geometry";
import type { Rect } from "./data";
export const NORTH_SOUTH_MAPS = new Set([2,4,8,9]);
export const northSouth = (mapId?:number) => mapId!==undefined && NORTH_SOUTH_MAPS.has(mapId);
// The world remains 1100×560: transpose authored terrain into the new front.
export function orientPoint(p:Point,mapId:number):Point {
  return northSouth(mapId)?{x:p.y*1100/560,y:p.x*560/1100}:{...p};
}
export function orientRect<T extends Rect>(r:T,mapId:number):T {
  return northSouth(mapId)?{...r,...orientPoint(r,mapId),w:r.h*1100/560,h:r.w*560/1100}:{...r};
}
