export interface Zone {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  label: string;
  severityScore: number;
  colorCode: string;
  action: string;
}

export interface Mark {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  label: string;
  colorCode: string;
}

export interface PathPoint {
  y: number;
  x: number;
}

export interface AnalysisResult {
  overallHealth: string;
  isHealthy: boolean;
  zones: Zone[];
  marks: Mark[];
  plantCount: number;
  yieldEstimate: string;
  weedPath: PathPoint[];
  irrigationLeaks: Zone[];
  farmContext: string;
}

export interface GeoTag {
  lat: number;
  lng: number;
}

export interface HistoryItem {
  id: string;
  imageUrl: string;
  imageAspectRatio?: number;
  result: AnalysisResult;
  geoTag: GeoTag;
  date: Date;
}
