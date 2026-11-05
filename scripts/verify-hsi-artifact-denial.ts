/** Isolated tampered-artifact runtime check; no file changes or database calls. */
// @ts-ignore Bun-only local verification harness.
import {mock} from "bun:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
mock.module("server-only",()=>({}));
const path=fileURLToPath(new URL("../src/data/hsi/ra-anti-tnf/transfer.json",import.meta.url));
const tampered=JSON.parse(readFileSync(path,"utf8"));tampered.artifactHash="f".repeat(64);
mock.module(path,()=>({default:tampered}));
const {loadIsiInvestigationRelease,isiInvestigationReleases}=await import("../src/lib/hsi/investigation-corpus.server");
const listing=isiInvestigationReleases.find(r=>r.id==="ra-anti-tnf-evidence");if(listing?.readiness?.available!==false)throw Error("Tampered corpus must be listed unavailable");
let denied=false;try{await loadIsiInvestigationRelease("ra-anti-tnf-evidence",null)}catch(e){denied=(e as {code?:string}).code==="research_artifact_not_ready"}
if(!denied)throw Error("Tampered corpus must fail closed without a fallback");
const separate=await loadIsiInvestigationRelease("isi-core-graph",null);if(!separate.entities.length)throw Error("Unrelated local corpus must remain usable");
console.log(JSON.stringify({product:"isi",tamperedCorpusUnavailable:true,tamperedLoadDenied:true,separateLocalCorpusUsable:true,databaseTested:false}));
