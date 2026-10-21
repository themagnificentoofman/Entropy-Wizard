import React, { useState } from 'react';
import { analyzeSequence } from '../services/geminiService';
import { AnalysisResult } from '../types';

interface HistoryItem {
  input: string;
  result: AnalysisResult;
  timestamp: number;
}

const Analyzer: React.FC = () => {
  const [inputSequence, setInputSequence] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputSequence(val);
    
    // Strict validation: allow numbers, commas, dots, minus, spaces, plus, and scientific notation (e/E)
    const regex = /^[\d\s,.\-eE+]*$/;
    
    if (val && !regex.test(val)) {
        setValidationError("Invalid characters detected. Only numbers, commas, and scientific notation allowed.");
    } else {
        setValidationError(null);
        if (error) setError(null); // Clear main error if user starts typing valid input
    }
  };

  const handleAnalyze = async () => {
    if (validationError || isLoading) return;

    const rawInput = inputSequence.trim();
    if (!rawInput) return;

    const parts = rawInput.split(',').map(s => s.trim());
    const sequence = parts.map(Number);
    if (parts.some(s => !s) || sequence.some(n => !Number.isFinite(n))) {
      setError('Please separate finite numbers with commas.');
      return;
    }

    if (sequence.length < 3 || sequence.length > 500) {
      setError("Please enter 3 to 500 valid numbers.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysis = await analyzeSequence(sequence);
      setResult(analysis);
      setHistory(prev => [
        { input: rawInput, result: analysis, timestamp: Date.now() },
        ...prev.slice(0, 9) // Keep last 10
      ]);
    } catch (err: any) {
      setError(err.message || "Analysis failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setInputSequence(item.input);
    setResult(item.result);
    setValidationError(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadDemo = (type: 'lcg' | 'fib') => {
    setValidationError(null);
    setError(null);
    if (type === 'lcg') {
      setInputSequence("1, 8, 11, 10, 5, 12");
    } else if (type === 'fib') {
      setInputSequence("0, 1, 1, 2, 3, 5, 8, 13, 21");
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-xl border-l-4 border-cyan-500 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Sequence Input
        </h2>
        
        <p className="text-slate-400 mb-4 text-sm">
          Enter a sequence of numbers separated by commas. The AI will attempt to reverse-engineer the generator.
        </p>

        <div className="flex gap-2 mb-2 relative">
          <input 
            type="text" 
            maxLength={18000}
            value={inputSequence}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && !validationError && handleAnalyze()}
            placeholder="e.g., 3, 10, 31, 94..." 
            className={`flex-1 bg-slate-800 border ${validationError ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-cyan-500'} text-white px-4 py-3 rounded-lg focus:outline-none font-mono transition-colors`}
          />
          <button 
            onClick={handleAnalyze} 
            disabled={isLoading || !!validationError}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg shadow-cyan-900/20">
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cracking...
              </>
            ) : (
              'Analyze'
            )}
          </button>
        </div>
        
        {validationError && (
          <div className="text-red-400 text-xs font-bold mb-4 animate-pulse">
            {validationError}
          </div>
        )}

        <div className="flex gap-2">
           <button onClick={() => loadDemo('lcg')} className="text-xs bg-slate-700 hover:bg-slate-600 text-cyan-300 px-3 py-1 rounded transition-colors">
             Load LCG Demo
           </button>
           <button onClick={() => loadDemo('fib')} className="text-xs bg-slate-700 hover:bg-slate-600 text-cyan-300 px-3 py-1 rounded transition-colors">
             Load Fibonacci Demo
           </button>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-800 text-red-300 rounded text-sm flex items-start">
             <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
             {error}
          </div>
        )}
      </div>

      {result && (
        <div className="glass-panel p-6 rounded-xl border-t border-slate-700 animation-fade-in">
          
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-2xl font-bold text-white">Analysis Report</h3>
             <span className="text-xs text-slate-500 border border-slate-700 px-2 py-1 rounded">Model: Gemini 3.1 Pro</span>
          </div>

          <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Detected Algorithms</h4>
          <div className="grid grid-cols-1 gap-4 mb-6">
             {result.candidates.map((candidate, index) => (
                <div key={index} className={`bg-slate-800/50 p-4 rounded-lg border ${
                     candidate.confidence >= 80 ? 'border-emerald-500' :
                     candidate.confidence >= 50 ? 'border-yellow-500' :
                     'border-slate-600'
                   }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold text-white">{candidate.algorithm}</span>
                        {index === 0 && (
                          <span className="bg-emerald-900/50 text-emerald-400 text-xs px-2 py-0.5 rounded uppercase font-bold">Best Match</span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-slate-400 mt-1">{candidate.parameters || 'No parameters detected'}</p>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className={`text-2xl font-bold font-mono ${
                             candidate.confidence >= 80 ? 'text-emerald-400' :
                             candidate.confidence >= 50 ? 'text-yellow-400' :
                             'text-slate-400'
                           }`}>
                         {candidate.confidence}%
                       </span>
                       <span className="text-xs text-slate-500 uppercase">Confidence</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 border-t border-slate-700/50 pt-2 mt-2 leading-relaxed">
                    {candidate.explanation}
                  </p>
                </div>
             ))}
          </div>

          <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
            <h4 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
              Predicted Next Sequence
            </h4>
            <div className="flex gap-4">
              {result.nextValues.map((val, index) => (
                <div key={index} className="bg-slate-950 border border-cyan-900 text-cyan-300 font-mono text-2xl py-4 px-6 rounded-lg shadow-lg flex-1 text-center relative overflow-hidden group">
                    <span className="relative z-10">{val}</span>
                    <div className="absolute top-0 right-0 p-1">
                      <span className="text-[10px] text-slate-600">n+{index + 1}</span>
                    </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="glass-panel p-6 rounded-xl border border-slate-700/50 animation-fade-in mt-6">
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Recent Analyses</h4>
          <div className="space-y-2">
            {history.map((item, idx) => (
              <button
                key={idx}
                onClick={() => loadHistoryItem(item)}
                className="w-full text-left bg-slate-800/40 hover:bg-slate-800 p-3 rounded-lg border border-slate-700/50 transition-colors flex justify-between items-center group relative overflow-hidden"
              >
                 <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs font-bold text-cyan-400 truncate mr-2">{item.result.candidates[0].algorithm}</span>
                        <span className={`text-[10px] px-1.5 rounded font-mono font-bold ${
                            item.result.candidates[0].confidence >= 80 ? 'bg-emerald-900/50 text-emerald-400' : 
                            item.result.candidates[0].confidence >= 50 ? 'bg-yellow-900/50 text-yellow-400' : 
                            'bg-slate-700 text-slate-400'
                        }`}>
                            {item.result.candidates[0].confidence}%
                        </span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 truncate">{item.input}</p>
                 </div>
                 <div className="text-[10px] text-slate-600 group-hover:text-slate-400 self-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                 </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analyzer;