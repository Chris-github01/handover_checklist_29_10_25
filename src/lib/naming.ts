type RegionLetter = "A" | "W" | "C" | "T" | "H" | "D";

const PHRASE_MAP: Array<[RegExp, string]> = [
  [/domestic processor/i, "DP"],
  [/international terminal/i, "IT"],
  [/eastern terminal/i, "ET"],
  [/western terminal/i, "WT"],
  [/seismic upgrade/i, "SU"],
  [/retirement village/i, "RV"],
  [/multi[-\s]?storey car park|car park|mscp/i, "CP"],
  [/distribution centre|distribution center/i, "DC"],
  [/data centre|data center/i, "DC"],
  [/fire station/i, "FS"],
  [/refurbishment/i, "Refurb"],
  [/expansion/i, "Exp"],
  [/apartments?/i, "Apt"],
  [/building/i, "Bldg"],
];

const STOP_WORDS = new Set(["the","and","of","for","project","stage","phase","lot","block","area","works","wp","wp1","wp2","wp3"]);

const CLIENT_MAP: Array<[RegExp, string]> = [
  [/^naylor love/i, "Naylor"],
  [/^lt\s*mcguinness/i, "LTMcG"],
  [/^h(i|aw)w?kins/i, "Hawkins"],
  [/^southbase/i, "Southbase"],
  [/^cassidy/i, "Cassidy"],
  [/^method/i, "Method"],
  [/^cmp/i, "CMP"],
  [/^accent/i, "Accent"],
  [/^built/i, "Built"],
  [/^q$/i, "Q"],
];

function safe(s: string) {
  return s.replace(/[\\\/:\*\?"<>\|]/g, " ").replace(/\s+/g, " ").trim().replace(/[\. ]+$/, "");
}

function shortenProject(name: string) {
  let s = name;
  for (const [rx, code] of PHRASE_MAP) s = s.replace(rx, code);
  s = s.replace(/\bwp[-\s]?\d+\b/gi, " ").replace(/\(.*?\)/g, " ");
  s = safe(s);
  const tokens = s.split(" ").filter(w => w && !STOP_WORDS.has(w.toLowerCase()));
  return safe(tokens.slice(0, 3).join(" "));
}

function shortenClient(name: string) {
  for (const [rx, code] of CLIENT_MAP) if (rx.test(name)) return code;
  let c = name.replace(/\b(construction|contractors?|builders?|group|holdings?|limited|ltd|nz|co|company)\b/gi, " ");
  c = safe(c);
  if (c.includes(" ")) c = c.split(" ")[0];
  return c || "Client";
}

function clamp(str: string, max = 60) {
  return str.length <= max ? str : str.slice(0, max);
}

export function buildFolderName(projectName: string, clientName: string, projectCode: string) {
  if (!projectName || !clientName || !projectCode) {
    return "";
  }

  const proj = shortenProject(projectName);
  const client = shortenClient(clientName);
  const folder = `${proj} - ${client}_${projectCode}`;
  return clamp(safe(folder));
}
