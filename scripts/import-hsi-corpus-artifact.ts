/** Import only an independently pinned source artifact into this product's local snapshot. */
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import policy from "../src/lib/hsi/researchArtifact.trust.json";
import {importResearchCorpusArtifact} from "../src/lib/hsi/vendor/researchArtifactStore";
const input=process.argv[2];if(!input||process.argv.length!==3)throw Error("Pass one research source artifact; never a patient export. Trust policy changes require a separate reviewed deployment.");
console.log(JSON.stringify(importResearchCorpusArtifact(resolve(input),fileURLToPath(new URL("../src/data/hsi/ra-anti-tnf/transfer.json",import.meta.url)),policy,"isi")));
