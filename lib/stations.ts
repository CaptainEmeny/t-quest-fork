// MBTA station ids ("place-xxxx") are the parent-station ids used by the MBTA v3 API.
export type Station = { id: string; name: string; lines: string[]; routes: string[] };

export const STATIONS: Station[] = [
  { id: "place-bucen", name: "BU Central", lines: ["Green B"], routes: ["Green-B"] },
  { id: "place-buest", name: "BU East", lines: ["Green B"], routes: ["Green-B"] },
  { id: "place-brico", name: "Packard's Corner", lines: ["Green B"], routes: ["Green-B"] },
  { id: "place-harvd", name: "Harvard Ave", lines: ["Green B"], routes: ["Green-B"] },
  { id: "place-kencl", name: "Kenmore", lines: ["Green B", "Green C", "Green D"], routes: ["Green-B", "Green-C", "Green-D"] },
  { id: "place-hymnl", name: "Hynes Convention Center", lines: ["Green B", "Green C", "Green D"], routes: ["Green-B", "Green-C", "Green-D"] },
  { id: "place-coecl", name: "Copley", lines: ["Green"], routes: ["Green-B", "Green-C", "Green-D", "Green-E"] },
  { id: "place-armnl", name: "Arlington", lines: ["Green"], routes: ["Green-B", "Green-C", "Green-D", "Green-E"] },
  { id: "place-boyls", name: "Boylston", lines: ["Green"], routes: ["Green-B", "Green-C", "Green-D", "Green-E"] },
  { id: "place-pktrm", name: "Park Street", lines: ["Green", "Red"], routes: ["Green-B", "Green-C", "Green-D", "Green-E", "Red"] },
  { id: "place-gover", name: "Government Center", lines: ["Green", "Blue"], routes: ["Green-D", "Green-E", "Blue"] },
  { id: "place-haecl", name: "Haymarket", lines: ["Green", "Orange"], routes: ["Green-D", "Green-E", "Orange"] },
  { id: "place-north", name: "North Station", lines: ["Green", "Orange"], routes: ["Green-D", "Green-E", "Orange"] },
  { id: "place-fenwy", name: "Fenway", lines: ["Green D"], routes: ["Green-D"] },
  { id: "place-prmnl", name: "Prudential", lines: ["Green E"], routes: ["Green-E"] },
  { id: "place-symcl", name: "Symphony", lines: ["Green E"], routes: ["Green-E"] },
  { id: "place-mfa", name: "Museum of Fine Arts", lines: ["Green E"], routes: ["Green-E"] },
  { id: "place-harsq", name: "Harvard", lines: ["Red"], routes: ["Red"] },
  { id: "place-cntsq", name: "Central", lines: ["Red"], routes: ["Red"] },
  { id: "place-knncl", name: "Kendall/MIT", lines: ["Red"], routes: ["Red"] },
  { id: "place-portr", name: "Porter", lines: ["Red"], routes: ["Red"] },
  { id: "place-davis", name: "Davis", lines: ["Red"], routes: ["Red"] },
  { id: "place-sstat", name: "South Station", lines: ["Red"], routes: ["Red"] },
  { id: "place-dwnxg", name: "Downtown Crossing", lines: ["Red", "Orange"], routes: ["Red", "Orange"] },
  { id: "place-chncl", name: "Chinatown", lines: ["Orange"], routes: ["Orange"] },
  { id: "place-bbsta", name: "Back Bay", lines: ["Orange"], routes: ["Orange"] },
  { id: "place-aqucl", name: "Aquarium", lines: ["Blue"], routes: ["Blue"] },
  { id: "place-mvbcl", name: "Maverick", lines: ["Blue"], routes: ["Blue"] },
];

export const stationById = (id: string) => STATIONS.find((s) => s.id === id);

export const LINE_COLORS: Record<string, string> = {
  Green: "#00843D",
  Red: "#DA291C",
  Orange: "#ED8B00",
  Blue: "#003DA5",
};

export const lineColor = (line?: string) => {
  if (!line) return "#555";
  const key = Object.keys(LINE_COLORS).find((k) => line.startsWith(k));
  return key ? LINE_COLORS[key] : "#555";
};
