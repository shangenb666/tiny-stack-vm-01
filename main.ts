// Tiny stack VM for make.fun's tiny-stack-vm-01: runs one program.bin per
// instance and answers with its stdout bytes + exit code. Exit codes: 0 halt;
// traps 2 stack underflow, 3 stack overflow, 4 div/mod by zero,
// 5 unknown opcode, 6 bad memory address, 7 call-stack overflow,
// 8 return with empty call stack, 9 pc out of range or truncated immediate,
// 10 step limit (1,000,000), 11 output limit (65,536 bytes).
// T[opcode] = [immediate bytes, values popped, values pushed].
// Reference: kit program/generator/subject/vm.mjs; ISA: .../subject/ISA.md.
import {mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const T={0:[0,0,0],1:[1,0,1],2:[4,0,1],3:[0,1,0],4:[0,1,2],5:[0,2,2],6:[0,2,3],7:[0,3,3],16:[0,2,1],17:[0,2,1],18:[0,2,1],19:[0,2,1],20:[0,2,1],21:[0,2,1],22:[0,2,1],23:[0,1,1],24:[0,2,1],25:[0,2,1],26:[0,2,1],27:[0,1,1],28:[0,2,1],29:[0,2,1],30:[0,2,1],32:[0,2,1],33:[0,2,1],34:[0,2,1],48:[2,0,0],49:[2,1,0],50:[2,1,0],51:[2,0,0],52:[0,0,0],64:[0,1,1],65:[0,2,0],80:[0,1,0],81:[0,1,0],82:[0,0,1],83:[0,1,0]};
function run(p,inp){
 const n=p.length,D=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256),o=new Uint8Array(65536);
 let sp=0,cp=0,ol=0,ip=0,pc=0,st=0;
 const end=e=>({o:o.slice(0,ol),e});
 for(;;){
  if(st===1e6)return end(10);
  if(pc<0||pc>=n)return end(9);
  const op=p[pc],t=T[op];
  if(!t)return end(5);
  const im=t[0],po=t[1],pu=t[2];
  if(pc+im>=n)return end(9);
  st++;
  const nx=pc+1+im;
  if(sp<po)return end(2);
  if(sp-po+pu>256)return end(3);
  pc=nx;
  if(op===0)return end(0);
  else if(op===1)D[sp++]=(p[nx-1]<<24)>>24;
  else if(op===2)D[sp++]=p[nx-4]|p[nx-3]<<8|p[nx-2]<<16|p[nx-1]<<24;
  else if(op===3)sp--;
  else if(op===4){D[sp]=D[sp-1];sp++;}
  else if(op===5){const q=D[sp-1];D[sp-1]=D[sp-2];D[sp-2]=q;}
  else if(op===6){D[sp]=D[sp-2];sp++;}
  else if(op===7){const a=D[sp-3];D[sp-3]=D[sp-2];D[sp-2]=D[sp-1];D[sp-1]=a;}
  else if(op===23)D[sp-1]=-D[sp-1]|0;
  else if(op===27)D[sp-1]=~D[sp-1];
  else if(op>=16&&op<=34){
   const b=D[sp-1],a=D[sp-2];let r;
   if(op===16)r=a+b|0;
   else if(op===17)r=a-b|0;
   else if(op===18)r=Math.imul(a,b);
   else if(op===19){if(!b)return end(4);r=(a/b)|0;}
   else if(op===20){if(!b)return end(4);r=a%b|0;}
   else if(op===21){if(!b)return end(4);r=Math.floor((a>>>0)/(b>>>0))|0;}
   else if(op===22){if(!b)return end(4);r=(a>>>0)%(b>>>0)|0;}
   else if(op===24)r=a&b;
   else if(op===25)r=a|b;
   else if(op===26)r=a^b;
   else if(op===28)r=a<<(b&31);
   else if(op===29)r=a>>(b&31);
   else if(op===30)r=a>>>(b&31)|0;
   else if(op===32)r=a===b?1:0;
   else if(op===33)r=a<b?1:0;
   else r=(a>>>0)<(b>>>0)?1:0;
   sp-=2;D[sp++]=r;
  }
  else if(op>=48&&op<=50){
   const rel=((p[nx-2]|p[nx-1]<<8)<<16)>>16;
   let tk=1;
   if(op!==48){const v=D[--sp];tk=op===49?v===0:v!==0;}
   if(tk)pc=nx+rel;
  }
  else if(op===51){if(cp===64)return end(7);C[cp++]=nx;pc=p[nx-2]|p[nx-1]<<8;}
  else if(op===52){if(!cp)return end(8);pc=C[--cp];}
  else if(op===64){const a=D[sp-1];if(a<0||a>255)return end(6);D[sp-1]=M[a];}
  else if(op===65){const a=D[sp-1],v=D[sp-2];if(a<0||a>255)return end(6);sp-=2;M[a]=v;}
  else if(op===80){const b=Buffer.from(String(D[sp-1]));if(ol+b.length>65536)return end(11);sp--;o.set(b,ol);ol+=b.length;}
  else if(op===81){if(ol+1>65536)return end(11);o[ol++]=D[--sp]&255;}
  else if(op===82)D[sp++]=ip<inp.length?inp[ip++]:-1;
  else if(op===83)return end(D[--sp]&255);
 }
}
const I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const id of readdirSync(I).sort()){
 const r=run(new Uint8Array(readFileSync(join(I,id,'program.bin'))),new Uint8Array(readFileSync(join(I,id,'input.bin'))));
 mkdirSync(join(O,id),{recursive:true});
 writeFileSync(join(O,id,'stdout.bin'),r.o);
 writeFileSync(join(O,id,'exit.txt'),r.e+'\n');
}
