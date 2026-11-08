/** Product-local verification of HSI research source artifacts. No DB, roles, fetch or scientific approval. */
import {createHash,createPublicKey,verify} from "node:crypto";
import {parseResearchBundle,RESEARCH_CONTRACT_VERSION,type ResearchBundle} from "./researchContracts";
import {parseRaEvidenceRelease,buildRaEvidenceBundle,RA_EVIDENCE_RELEASE_VERSION,RA_RELEASE_ID,type RaEvidenceRelease} from "./raEvidenceRelease";
export const RESEARCH_ARTIFACT_VERSION="hsi-research-corpus-artifact-1" as const;
export const ARTIFACT_ACCEPTANCE_VERSION="hsi-research-artifact-acceptance-1" as const;
export type ProductConsumer="isi"|"aksh";
export type ResearchCorpusArtifact={
 schemaVersion:typeof RESEARCH_ARTIFACT_VERSION;releaseId:typeof RA_RELEASE_ID;sequence:number;
 producer:{repository:"gnaneshwer23/hsi-core";commit:string;workingTree:"clean"};
 contracts:{research:typeof RESEARCH_CONTRACT_VERSION;sourceRelease:typeof RA_EVIDENCE_RELEASE_VERSION};
 scope:"research_sources_only";scientificReview:"unreviewed";containsPhi:false;clinicalAdvice:false;kgWrite:false;
 payload:{release:RaEvidenceRelease;graphContext:ResearchBundle};artifactHash:string;
 signature:{algorithm:"Ed25519";keyId:string;value:string}|null;
};
/** Install independently of the artifact; never read policy/keys/roles from incoming payload. */
export type ResearchArtifactTrustPolicy={
 schemaVersion:"hsi-research-artifact-trust-1";product:ProductConsumer;artifactHash:string;producerCommit:string;minimumSequence:number;
 signaturePolicy:"pinned_digest"|"ed25519_required";signingKey:{keyId:string;publicKeyPem:string}|null;
};
export type InstalledResearchArtifact={artifactHash:string;sequence:number};
export const artifactCanonical=(value:unknown):string=>JSON.stringify(value,(_key,row:unknown)=>row&&typeof row==="object"&&!Array.isArray(row)?Object.fromEntries(Object.entries(row).sort(([a],[b])=>a<b?-1:a>b?1:0)):row);
export const artifactDigest=(value:string):string=>createHash("sha256").update(value).digest("hex");
const sha=/^[a-f0-9]{64}$/,commit=/^[a-f0-9]{40}$/;
function exact(value:unknown,keys:string[]){if(!value||typeof value!=="object"||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Object.keys(value).sort().join(",")!==[...keys].sort().join(","))throw Error("Invalid research artifact fields")}
function sequence(value:unknown):value is number{return typeof value==="number"&&Number.isSafeInteger(value)&&value>0}
function hash(value:unknown):value is string{return typeof value==="string"&&sha.test(value)}
export function parseResearchArtifactTrustPolicy(value:unknown,product:ProductConsumer):ResearchArtifactTrustPolicy{
 exact(value,["schemaVersion","product","artifactHash","producerCommit","minimumSequence","signaturePolicy","signingKey"]);const p=value as ResearchArtifactTrustPolicy;
 if(p.schemaVersion!=="hsi-research-artifact-trust-1"||!["isi","aksh"].includes(product)||p.product!==product||!hash(p.artifactHash)||typeof p.producerCommit!=="string"||!commit.test(p.producerCommit)||!sequence(p.minimumSequence)||!["pinned_digest","ed25519_required"].includes(p.signaturePolicy))throw Error("Invalid product-owned research artifact trust policy");
 if(p.signingKey!==null){exact(p.signingKey,["keyId","publicKeyPem"]);if(typeof p.signingKey.keyId!=="string"||!/^hsi-[a-zA-Z0-9-]{1,80}$/.test(p.signingKey.keyId)||typeof p.signingKey.publicKeyPem!=="string"||p.signingKey.publicKeyPem.length>4096||!p.signingKey.publicKeyPem.startsWith("-----BEGIN PUBLIC KEY-----")||createPublicKey(p.signingKey.publicKeyPem).asymmetricKeyType!=="ed25519")throw Error("Invalid independent Ed25519 verification key")}
 if(p.signaturePolicy==="ed25519_required"&&!p.signingKey)throw Error("Trusted signature key required");
 return p;
}
function artifactBody(a:ResearchCorpusArtifact){const {artifactHash,signature,...body}=a;return body}
export function buildResearchCorpusArtifact(input:{release:unknown;graphContext:unknown;producerCommit:string;sequence:number}):ResearchCorpusArtifact{
 const release=parseRaEvidenceRelease(input.release),graphContext=parseResearchBundle(input.graphContext);
 if(!commit.test(input.producerCommit)||!sequence(input.sequence)||graphContext.claims.length||graphContext.runs.length||graphContext.sources.length||graphContext.passages.length||graphContext.context.dataClass!=="public_real")throw Error("Clean pinned source-only graph required");
 buildRaEvidenceBundle(graphContext,release);
 const body:Omit<ResearchCorpusArtifact,"artifactHash"|"signature">={schemaVersion:RESEARCH_ARTIFACT_VERSION,releaseId:RA_RELEASE_ID,sequence:input.sequence,producer:{repository:"gnaneshwer23/hsi-core" as const,commit:input.producerCommit,workingTree:"clean" as const},contracts:{research:RESEARCH_CONTRACT_VERSION,sourceRelease:RA_EVIDENCE_RELEASE_VERSION},scope:"research_sources_only" as const,scientificReview:"unreviewed" as const,containsPhi:false as const,clinicalAdvice:false as const,kgWrite:false as const,payload:{release:structuredClone(release),graphContext:structuredClone(graphContext)}};
 return {...body,artifactHash:artifactDigest(artifactCanonical(body)),signature:null};
}
export function acceptResearchCorpusArtifact(value:unknown,policyValue:unknown,product:ProductConsumer,options:{installed?:InstalledResearchArtifact;revokedHashes?:readonly string[]}={}){
 const p=parseResearchArtifactTrustPolicy(policyValue,product);
 if(Buffer.byteLength(artifactCanonical(value)??"")>1_000_000)throw Error("Research artifact exceeds 1 MB budget");
 exact(value,["schemaVersion","releaseId","sequence","producer","contracts","scope","scientificReview","containsPhi","clinicalAdvice","kgWrite","payload","artifactHash","signature"]);const a=value as ResearchCorpusArtifact;
 exact(a.producer,["repository","commit","workingTree"]);exact(a.contracts,["research","sourceRelease"]);exact(a.payload,["release","graphContext"]);
 if(a.schemaVersion!==RESEARCH_ARTIFACT_VERSION||a.releaseId!==RA_RELEASE_ID||!sequence(a.sequence)||a.sequence<p.minimumSequence||a.producer.repository!=="gnaneshwer23/hsi-core"||a.producer.workingTree!=="clean"||a.producer.commit!==p.producerCommit||a.contracts.research!==RESEARCH_CONTRACT_VERSION||a.contracts.sourceRelease!==RA_EVIDENCE_RELEASE_VERSION||a.scope!=="research_sources_only"||a.scientificReview!=="unreviewed"||a.containsPhi!==false||a.clinicalAdvice!==false||a.kgWrite!==false)throw Error("Research artifact schema, scope, version or producer mismatch");
 if(!hash(a.artifactHash)||a.artifactHash!==p.artifactHash||artifactDigest(artifactCanonical(artifactBody(a)))!==a.artifactHash||options.revokedHashes?.includes(a.artifactHash))throw Error("Research artifact pin or integrity failure");
 const previous=options.installed;
 if(previous&&(!hash(previous.artifactHash)||!sequence(previous.sequence)||a.sequence<previous.sequence||(a.sequence===previous.sequence&&a.artifactHash!==previous.artifactHash)))throw Error("Stale or conflicting research artifact replacement");
 if(a.signature!==null){exact(a.signature,["algorithm","keyId","value"]);if(a.signature.algorithm!=="Ed25519"||!p.signingKey||a.signature.keyId!==p.signingKey.keyId||typeof a.signature.value!=="string"||!/^[A-Za-z0-9+/]{86}==$/.test(a.signature.value)||!verify(null,Buffer.from(a.artifactHash,"utf8"),p.signingKey.publicKeyPem,Buffer.from(a.signature.value,"base64")))throw Error("Invalid trusted artifact signature")}
 if(p.signaturePolicy==="ed25519_required"&&!a.signature)throw Error("Unsigned research artifact refused");
 // Revalidate nested source rights, exact passages and graph identity after pin verification.
 const rebuilt=buildResearchCorpusArtifact({release:a.payload.release,graphContext:a.payload.graphContext,producerCommit:a.producer.commit,sequence:a.sequence});
 if(rebuilt.artifactHash!==a.artifactHash)throw Error("Nested research artifact mismatch");
 const bundle=buildRaEvidenceBundle(a.payload.graphContext,a.payload.release);
 return {acceptanceVersion:ARTIFACT_ACCEPTANCE_VERSION,product,artifactHash:a.artifactHash,sequence:a.sequence,releaseId:a.releaseId,releaseVersion:a.payload.release.version,producerCommit:a.producer.commit,bundle,
  signatureVerified:a.signature!==null,trustMode:p.signaturePolicy,scientificReview:"unreviewed" as const,scientificApprovalTransferred:false as const,rolesTransferred:false as const,graphPublicationApproved:false as const,clinicalAdvice:false as const,
  changed:!previous||previous.artifactHash!==a.artifactHash};
}
