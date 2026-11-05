/** Actual product-loader acceptance; no account, database or source publication writes. */
// @ts-ignore Bun-only local verification harness; not a product runtime import.
import {mock} from "bun:test";
mock.module("server-only",()=>({}));
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {artifactCanonical,artifactDigest,acceptResearchCorpusArtifact} from "../src/lib/hsi/vendor/researchArtifactAcceptance";
import artifact from "../src/data/hsi/ra-anti-tnf/transfer.json";
import policy from "../src/lib/hsi/researchArtifact.trust.json";
const {loadIsiInvestigationRelease}=await import("../src/lib/hsi/investigation-corpus.server");
const b=await loadIsiInvestigationRelease("ra-anti-tnf-evidence",null);
const accepted=acceptResearchCorpusArtifact(artifact,policy,"isi");
if(artifactDigest(artifactCanonical(b))!==artifactDigest(artifactCanonical(accepted.bundle))||b.sources.length!==2||b.passages.length!==8||b.claims.length||b.runs.length)throw Error("Actual product source corpus diverged");
for(const [name,entry] of Object.entries({release:b.sources.map(s=>s.id),passages:b.passages.map(p=>p.id),relationships:b.relationships.map(r=>r.id)}))if(new Set(entry).size!==entry.length)throw Error("Duplicate "+name);
let refusals=0;
for(const mutate of [(a:any)=>a.artifactHash="f".repeat(64),(a:any)=>a.schemaVersion="future-schema",(a:any)=>a.producer.workingTree="dirty",(a:any)=>a.sequence=0,(a:any)=>a.kgWrite=true,(a:any)=>a.scientificReview="approved",(a:any)=>a.roles=["reviewer"]]){
 const a=structuredClone(artifact);mutate(a);try{acceptResearchCorpusArtifact(a,policy,"isi")}catch{refusals++;continue}throw Error("Unsafe product artifact accepted");
}
for(const name of ["researchArtifactAcceptance","researchArtifactStore","raEvidenceRelease","researchContracts"]){
 const path=fileURLToPath(new URL("../src/lib/hsi/vendor/"+name+".ts",import.meta.url)),provenance=JSON.parse(readFileSync(path.replace(/\.ts$/,".provenance.json"),"utf8"));
 if(artifactDigest(readFileSync(path,"utf8"))!==provenance.sha256||provenance.repository!=="gnaneshwer23/hsi-core"||provenance.includesProductData!==false)throw Error("Source provenance drift");
}
console.log(JSON.stringify({product:"isi",artifactHash:accepted.artifactHash,bundleHash:artifactDigest(artifactCanonical(b)),releaseVersion:accepted.releaseVersion,sequence:accepted.sequence,sources:b.sources.length,passages:b.passages.length,claims:b.claims.length,sourceIds:b.sources.map(s=>s.id),passageIds:b.passages.map(p=>p.id),relationshipIds:b.relationships.map(r=>r.id),refusedUnsafeCases:refusals,scientificReview:"unreviewed",rolesTransferred:false,scientificApprovalTransferred:false,graphPublicationApproved:false,trustMode:accepted.trustMode,signatureVerified:accepted.signatureVerified}));
