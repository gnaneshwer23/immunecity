/** Product-owned trust and runtime source acceptance. Never transfers a role or scientific approval. */
import artifact from "@/data/hsi/ra-anti-tnf/transfer.json";
import policy from "./researchArtifact.trust.json";
import {acceptResearchCorpusArtifact} from "./vendor/researchArtifactAcceptance";
import {RA_RELEASE_ID} from "./vendor/raEvidenceRelease";
export function acceptedRaCorpusArtifact(){return acceptResearchCorpusArtifact(artifact,policy,"isi")}
export function loadPinnedRaCorpus(){return acceptedRaCorpusArtifact().bundle}
export function raCorpusArtifactListing(){
 try{const a=acceptedRaCorpusArtifact();return {id:RA_RELEASE_ID,title:"RA / anti-TNF evidence (rights-verified)",description:"Pinned source passages and original graph anchors. Serology-response is related context only; scientific support remains unreviewed. No role, scientific approval or clinical applicability is transferred.",readiness:{available:true,sources:a.bundle.sources.length,passages:a.bundle.passages.length,version:a.releaseVersion,scientificReview:"unreviewed" as const,reason:null}}}
 catch{return {id:RA_RELEASE_ID,title:"RA / anti-TNF evidence (unavailable)",description:"The product-owned artifact pin could not be verified. Other local corpora remain separate.",readiness:{available:false,sources:0,passages:0,version:null,scientificReview:"unreviewed" as const,reason:"Research artifact failed product-local verification."}}}
}
