/** Node-only atomic product-local snapshot import. One file; no database or credentials. */
import {openSync,closeSync,readFileSync,renameSync,unlinkSync,fsyncSync,lstatSync,writeFileSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {randomUUID} from "node:crypto";
import {acceptResearchCorpusArtifact,buildResearchCorpusArtifact,artifactCanonical,artifactDigest,type ProductConsumer,type InstalledResearchArtifact} from "./researchArtifactAcceptance";
function regular(path:string,max:number){const s=lstatSync(path);if(!s.isFile()||s.isSymbolicLink()||s.size>max)throw Error("Bounded regular artifact file required");return readFileSync(path,"utf8")}
export function importResearchCorpusArtifact(inputPath:string,destinationPath:string,policy:unknown,product:ProductConsumer){
 const source=resolve(inputPath),destination=resolve(destinationPath);
 if(source===destination)throw Error("Separate incoming and installed artifacts required");
 const lock=destination+".lock",temporary=destination+"."+randomUUID()+".tmp";
 const fd=openSync(lock,"wx",0o600);let created=false;
 try{
  const incoming=JSON.parse(regular(source,1_000_000));let installed:InstalledResearchArtifact|undefined;
  try{
   const old=JSON.parse(regular(destination,1_000_000));
   // Inspect integrity of installed monotonic state without trusting it as an incoming authority/policy.
   const reconstructed=buildResearchCorpusArtifact({release:old.payload.release,graphContext:old.payload.graphContext,producerCommit:old.producer.commit,sequence:old.sequence});
   const {artifactHash,signature,...storedBody}=old;
   if(artifactDigest(artifactCanonical(storedBody))!==artifactHash||reconstructed.artifactHash!==old.artifactHash)throw Error("Installed artifact integrity mismatch");
   installed={artifactHash:old.artifactHash,sequence:old.sequence};
  }catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw Error("Installed artifact is invalid; preserve it for operator recovery")}
  const accepted=acceptResearchCorpusArtifact(incoming,policy,product,{installed});
  if(!accepted.changed)return {changed:false,artifactHash:accepted.artifactHash,sequence:accepted.sequence};
  const out=openSync(temporary,"wx",0o600);created=true;
  try{writeFileSync(out,JSON.stringify(incoming,null,2)+"\n");fsyncSync(out)}finally{closeSync(out)}
  renameSync(temporary,destination);created=false;
  const directory=openSync(dirname(destination),"r");try{fsyncSync(directory)}finally{closeSync(directory)}
  return {changed:true,artifactHash:accepted.artifactHash,sequence:accepted.sequence};
 }finally{closeSync(fd);if(created)unlinkSync(temporary);unlinkSync(lock)}
}
