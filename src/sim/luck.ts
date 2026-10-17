// Favorable rolls change real projectiles and damage, never bypass collision or range.
export function centeredRoll(random:()=>number,fortune:number) {
 let roll=random()*2-1;
 if(fortune<=0||random()>=fortune)return roll;
 for(let i=0;i<2;i++){const next=random()*2-1;if(Math.abs(next)<Math.abs(roll))roll=next;}
 return roll;
}
export const fortuneLabel=(value:number)=>value>=.85?"RUTHLESS":value>=.55?"STRONG":value>=.25?"RISING":"SLIGHT";
