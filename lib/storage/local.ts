import "server-only";
import { mkdir,readFile,writeFile } from "node:fs/promises";
import { join,resolve,sep } from "node:path";

function root(){return join(process.cwd(),"storage","private")}
function safePath(key:string){const base=root(),target=resolve(base,key);if(target!==base&&!target.startsWith(base+sep))throw new Error("Invalid storage key");return target}
export async function putPrivateObject(key:string,bytes:Uint8Array){const path=safePath(key);await mkdir(resolve(path,".."),{recursive:true});await writeFile(path,bytes)}
export async function getPrivateObject(key:string){return readFile(safePath(key))}
