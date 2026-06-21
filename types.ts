
export type GenCategory = 'LCG & MLCG' | 'Shift Register' | 'Modern & Quality' | 'Chaotic' | 'Classical';

export interface AlgoDef {
  id: string;
  name: string;
  category: GenCategory;
  desc: string;
  wiki: string;
  characteristics?: string[];
  limitations?: string[];
}

export interface LfsrPreset {
  name: string;
  tap: string;
  desc: string;
}

export interface TestResult {
  name: string;
  score: number;
  displayValue?: string;
  status: 'PASS' | 'FAIL' | 'SUSPECT';
  desc: string;
}

export interface Candidate {
  algorithm: string;
  confidence: number;
  parameters: string;
  explanation: string;
}

export interface AnalysisResult {
  candidates: Candidate[];
  nextValues: number[];
}
