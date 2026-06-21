import React, { useState } from 'react';
import MatrixRain from './components/MatrixRain';
import Analyzer from './components/Analyzer';
import Playground from './components/Playground';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analyzer' | 'playground'>('analyzer');

  return (
    <>
      <MatrixRain />
      
      <div className="relative z-10 min-h-screen flex flex-col items-center py-10 px-4">
        <header className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2 tracking-tight">
            ENTROPY WIZARD
          </h1>
          <p className="text-slate-400 font-mono text-sm md:text-base">
            Sequence Prediction & PRNG Analysis System
          </p>
        </header>

        <nav className="flex space-x-2 bg-slate-900/80 p-1 rounded-lg border border-slate-700 mb-8 backdrop-blur-sm">
          <button 
            onClick={() => setActiveTab('analyzer')}
            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all duration-200 focus:outline-none ${
              activeTab === 'analyzer' 
                ? 'bg-cyan-600 text-white' 
                : 'text-slate-400 hover:text-white'
            }`}>
            Analyzer
          </button>
          <button 
            onClick={() => setActiveTab('playground')}
            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all duration-200 focus:outline-none ${
              activeTab === 'playground' 
                ? 'bg-purple-600 text-white' 
                : 'text-slate-400 hover:text-white'
            }`}>
            Generator Lab
          </button>
        </nav>

        <main className="w-full max-w-4xl transition-all duration-300">
          {activeTab === 'analyzer' && <Analyzer />}
          {activeTab === 'playground' && <Playground />}
        </main>
        
        <footer className="mt-20 text-slate-600 text-xs text-center font-mono pb-4">
          <p>CAUTION: Pseudorandomness != Randomness</p>
          <p className="mt-2 opacity-50">Powered by Gemini 3.1 Pro</p>
        </footer>
      </div>
    </>
  );
};

export default App;