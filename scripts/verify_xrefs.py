# Re-resolve the external identifiers in src/data/xrefs.ts against HGNC, UniProt, EBI OLS4, NLM MeSH and ChEMBL.
# Usage: python3 -I scripts/verify_xrefs.py /tmp/xrefs_verified.json  (then diff ids/labels against xrefs.ts)
import json, sys, urllib.request, urllib.parse
def get(url, accept="application/json"):
    req = urllib.request.Request(url, headers={"Accept": accept, "User-Agent": "isi-xref-check/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

GENES = {"M001":"TNF","M002":"IL1B","M003":"IL6","M006":"IFNG","M007":"IL4","M008":"IL5","M009":"IL13","M010":"IL17A","R011":"PDCD1"}
ONTO = {  # node: (ontology, obo_id)
 "C001":("cl","CL:0000775"),"C003":("cl","CL:0000235"),"C006":("cl","CL:0000623"),"C007":("cl","CL:0000097"),
 "C010":("cl","CL:0000895"),"C012":("cl","CL:0000546"),"C013":("cl","CL:0000899"),"C014":("cl","CL:0000815"),
 "C015":("cl","CL:0000794"),"C017":("cl","CL:0000236"),"C018":("cl","CL:0000786"),
 "D001":("mondo","MONDO:0008383"),"D002":("mondo","MONDO:0005301"),"D003":("mondo","MONDO:0005083"),
 "D004":("mondo","MONDO:0005265"),"D005":("mondo","MONDO:0004979"),"D006":("mondo","MONDO:0004980"),"D007":("mondo","MONDO:0007915"),
 "P001":("go","GO:0007249"),"P002":("go","GO:0007259"),"P003":("go","GO:0072559"),"P004":("go","GO:0060337"),
 "P007":("go","GO:0050852"),"P008":("go","GO:0002467"),
}
MESH = {"D001":"D001172","D002":"D009103","D003":"D011565","D004":"D015212","D005":"D001249","D006":"D003876","D007":"D008180"}
DRUGS = {"I001":"INFLIXIMAB","I002":"ADALIMUMAB","I003":"TOCILIZUMAB","I004":"SECUKINUMAB","I005":"USTEKINUMAB","I006":"DUPILUMAB","I008":"PEMBROLIZUMAB","I011":"RITUXIMAB","I012":"OCRELIZUMAB","I015":"ANIFROLUMAB","I018":"BELIMUMAB","I024":"ABATACEPT"}

out = {}
def add(node, src, id_, label):
    out.setdefault(node, []).append({"source": src, "id": id_, "label": label})
for node, sym in GENES.items():
    d = get(f"https://rest.genenames.org/fetch/symbol/{sym}")["response"]["docs"]
    if len(d) != 1: print("HGNC miss", node, sym); continue
    d = d[0]; add(node, "HGNC", d["hgnc_id"], f'{d["symbol"]} — {d["name"]}')
    ups = d.get("uniprot_ids") or []
    if len(ups) == 1:
        u = get(f"https://rest.uniprot.org/uniprotkb/{ups[0]}.json?fields=accession,gene_names,organism_name,protein_name,reviewed")
        gene = u["genes"][0]["geneName"]["value"]; org = u["organism"]["taxonId"]
        if gene == sym and org == 9606 and u["entryType"].startswith("UniProtKB reviewed"):
            add(node, "UniProt", ups[0], f'{u["proteinDescription"]["recommendedName"]["fullName"]["value"]} (human, Swiss-Prot)')
        else: print("UniProt mismatch", node, ups, gene, org, u["entryType"])
    else: print("UniProt ambiguous", node, ups)
for node, (ont, obo) in ONTO.items():
    iri = urllib.parse.quote(urllib.parse.quote(f"http://purl.obolibrary.org/obo/{obo.replace(':','_')}", safe=""), safe="")
    t = get(f"https://www.ebi.ac.uk/ols4/api/ontologies/{ont}/terms/{iri}")
    if t.get("is_obsolete"): print("OBSOLETE", node, obo); continue
    add(node, {"cl":"CL","mondo":"MONDO","go":"GO"}[ont], obo, t["label"])
for node, mid in MESH.items():
    t = get(f"https://id.nlm.nih.gov/mesh/{mid}.json")
    lab = t.get("label", {}); add(node, "MeSH", mid, lab.get("@value") if isinstance(lab, dict) else lab)
for node, name in DRUGS.items():
    r = get(f"https://www.ebi.ac.uk/chembl/api/data/molecule.json?pref_name__iexact={name}")["molecules"]
    if len(r) != 1: print("ChEMBL ambiguous", node, name, [m["molecule_chembl_id"] for m in r]); continue
    add(node, "ChEMBL", r[0]["molecule_chembl_id"], r[0]["pref_name"])
json.dump(out, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
for k, v in out.items(): print(k, [(x["source"], x["id"], x["label"]) for x in v])
