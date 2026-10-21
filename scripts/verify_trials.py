# Re-verify NCT IDs in src/data/trialRegistry.ts against ClinicalTrials.gov API v2 (acronym, intervention, condition).
# Usage: python3 -I scripts/verify_trials.py /tmp/trials_verified.json
import json, sys, urllib.request
C = {"TR002":["NCT01327846"],"TR003":["NCT01866319"],"TR004":["NCT01365455"],"TR005":["NCT02277743","NCT02277769"],
"TR006":["NCT00104299"],"TR007":["NCT01194570"],"TR008":["NCT01030861"],"TR009":["NCT04381936"],"TR010":["NCT04181827"],
"TR011":["NCT02414854"],"TR012":["NCT02551094"],"TR014":["NCT01009281"],"TR016":["NCT01691521"],"TR017":["NCT02013167"],
"TR018":["NCT02200770"],"TR019":["NCT00783718"],"TR020":["NCT01844505"],"TR021":["NCT02446899"],"TR022":["NCT00424476"],
"TR023":["NCT03347279"],"TR024":["NCT03624127"],"TR025":["NCT00122330"]}
out = {}
for node, ids in C.items():
    for nct in ids:
        req = urllib.request.Request(f"https://clinicaltrials.gov/api/v2/studies/{nct}?fields=NCTId,Acronym,BriefTitle,Condition,InterventionName,Phase,OverallStatus", headers={"User-Agent":"isi-trial-check/1.0"})
        try:
            p = json.load(urllib.request.urlopen(req, timeout=30))["protocolSection"]
        except Exception as e:
            print(node, nct, "ERROR", e); continue
        im = p["identificationModule"]
        row = {"nct": im["nctId"], "acronym": im.get("acronym"), "title": im["briefTitle"],
               "conditions": p.get("conditionsModule", {}).get("conditions", []),
               "interventions": [i["name"] for i in p.get("armsInterventionsModule", {}).get("interventions", [])],
               "phases": p.get("designModule", {}).get("phases", [])}
        out.setdefault(node, []).append(row)
        print(node, row["nct"], row["acronym"], "|", row["title"][:80], "|", row["conditions"][:2], "|", row["interventions"][:3], row["phases"])
json.dump(out, open(sys.argv[1], "w"), indent=1)
