import type { AnalysisResult } from '../types';
export const analyzeSequence = async (sequence: number[]): Promise<AnalysisResult> => {
  if (sequence.length < 3 || sequence.length > 500 || sequence.some(n => !Number.isFinite(n))) {
    throw new Error('Provide 3 to 500 finite numbers.');
  }
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sequence}), signal: AbortSignal.timeout(65_000),
    });
    const body = await response.json() as AnalysisResult & {error?: string};
    if (!response.ok) throw new Error(body.error || 'Analysis failed. Please try again.');
    return body as AnalysisResult;
  } catch (error) {
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) {
      throw new Error('Analysis timed out. Please try a shorter sequence.');
    }
    if (error instanceof TypeError) throw new Error('Could not connect. Please check your connection and try again.');
    throw error;
  }
};
