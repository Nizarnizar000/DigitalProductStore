import "server-only";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";
const scrypt=(password:string,salt:Buffer,length:number,options:ScryptOptions)=>new Promise<Buffer>((resolve,reject)=>scryptCallback(password,salt,length,options,(error,key)=>error?reject(error):resolve(key)));
const KEY_LENGTH = 64;

export async function hashPassword(password:string) {
  if (password.length < 12 || password.length > 128) throw new Error("Password must contain 12 to 128 characters.");
  const salt=randomBytes(16);
  const derived=await scrypt(password,salt,KEY_LENGTH,{N:32768,r:8,p:1,maxmem:64*1024*1024});
  return `scrypt$32768$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password:string,stored:string) {
  const [algorithm,n,r,p,saltText,keyText]=stored.split("$");
  if(algorithm!=="scrypt"||!n||!r||!p||!saltText||!keyText)return false;
  const expected=Buffer.from(keyText,"base64url");
  const derived=await scrypt(password,Buffer.from(saltText,"base64url"),expected.length,{N:Number(n),r:Number(r),p:Number(p),maxmem:64*1024*1024});
  return expected.length===derived.length&&timingSafeEqual(expected,derived);
}
