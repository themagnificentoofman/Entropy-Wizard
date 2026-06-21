import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AlgoDef, GenCategory, LfsrPreset, TestResult } from '../types';
import { GeneratorParams, generateInternalSequence, performChiSquared, performDieharder } from '../utils/generatorUtils';

const categories: GenCategory[] = ['LCG & MLCG', 'Shift Register', 'Modern & Quality', 'Chaotic', 'Classical'];

const algorithms: AlgoDef[] = [
    { 
        id: 'lcg', 
        name: 'Custom LCG', 
        category: 'LCG & MLCG', 
        desc: 'The Linear Congruential Generator is the "Hello World" of PRNGs. Defined by the recurrence X = (aX + c) mod m.', 
        wiki: 'https://en.wikipedia.org/wiki/Linear_congruential_generator',
        characteristics: ['Fast arithmetic operations', 'Low memory usage', 'Period length up to m'],
        limitations: ['Serious serial correlation', 'Fails spectral tests', 'Low-order bits often non-random']
    },
    { 
        id: 'randu', 
        name: 'RANDU', 
        category: 'LCG & MLCG', 
        desc: 'Infamous LCG from the 1960s. Points fall onto only 15 planes in 3D space.', 
        wiki: 'https://en.wikipedia.org/wiki/RANDU',
        characteristics: ['Historically significant', 'Simple parameters (a=65539, c=0)'],
        limitations: ['Extremely poor spectral properties', 'Fails almost all statistical tests', 'Used as a cautionary tale']
    },
    { 
        id: 'zx81', 
        name: 'ZX81 LCG', 
        category: 'LCG & MLCG', 
        desc: 'Generator used in the Sinclair ZX81 (1981).', 
        wiki: 'https://en.wikipedia.org/wiki/Linear_congruential_generator',
        characteristics: ['Historical usage in early computing', 'Compact implementation'],
        limitations: ['Short period for modern standards', 'Typical LCG artifacts']
    },
    { 
        id: 'nr', 
        name: 'Numerical Recipes', 
        category: 'LCG & MLCG', 
        desc: 'Standard "ranqd1" generator recommended in "Numerical Recipes".', 
        wiki: 'https://en.wikipedia.org/wiki/Numerical_Recipes',
        characteristics: ['Widely used in scientific computing historically', 'Better constants than RANDU'],
        limitations: ['Not suitable for cryptography', 'Still exhibits LCG lattice structure']
    },
    { 
        id: 'minstd', 
        name: 'MINSTD (MLCG)', 
        category: 'LCG & MLCG', 
        desc: 'Park & Miller (1988) "Minimum Standard".', 
        wiki: 'https://en.wikipedia.org/wiki/Lehmer_random_number_generator',
        characteristics: ['Multiplicative LCG (c=0)', 'Period m-1 (if prime m)'],
        limitations: ['Avoids 0 as state', 'Requires careful implementation to avoid overflow']
    },
    { 
        id: 'carbon', 
        name: 'Apple CarbonLib', 
        category: 'LCG & MLCG', 
        desc: 'Historical generator used in Apple\'s CarbonLib.', 
        wiki: 'https://en.wikipedia.org/wiki/Linear_congruential_generator',
        characteristics: ['Legacy Apple system generator'],
        limitations: ['Obsolete', 'Standard LCG weaknesses']
    },
    { 
        id: 'ggn', 
        name: 'GGN', 
        category: 'LCG & MLCG', 
        desc: 'Glushkov-Gustavson-Naur (GGL).', 
        wiki: 'https://en.wikipedia.org/wiki/Linear_congruential_generator',
        characteristics: ['Parametrized LCG'],
        limitations: ['Standard LCG weaknesses']
    },
    { 
        id: 'mwc64x', 
        name: 'MWC64X', 
        category: 'LCG & MLCG', 
        desc: 'Multiply-With-Carry 64-bit. High-performance, low register usage.', 
        wiki: 'https://en.wikipedia.org/wiki/Multiply-with-carry_pseudorandom_number_generator',
        characteristics: ['Very fast on GPU', 'Good statistical properties for size'],
        limitations: ['Not cryptographically secure', 'State size limited to 64 bits']
    },
    {
        id: 'wichmann-hill',
        name: 'Wichmann-Hill',
        category: 'LCG & MLCG',
        desc: 'Combined Linear Congruential Generator summing 3 results.',
        wiki: 'https://en.wikipedia.org/wiki/Wichmann%E2%80%93Hill',
        characteristics: ['Longer period than simple LCGs', 'Produces floats in [0,1)'],
        limitations: ['Obsolete by modern standards', 'Fails Diehard tests']
    },
    { 
        id: 'xorshift', 
        name: 'Xorshift32', 
        category: 'Shift Register', 
        desc: 'Uses only XOR and bit-shift operations. Fast but fails some tests.', 
        wiki: 'https://en.wikipedia.org/wiki/Xorshift',
        characteristics: ['Extremely fast', 'No integer multiplication required'],
        limitations: ['Fails BigCrush linearity tests', 'Zero state is a fixed point']
    },
    { 
        id: 'xoroshiro128plus', 
        name: 'Xoroshiro128+', 
        category: 'Shift Register', 
        desc: 'Successor to Xorshift+. Fast and reliable 128-bit generator.', 
        wiki: 'https://en.wikipedia.org/wiki/Xoroshiro128%2B',
        characteristics: ['State-of-the-art for non-crypto', '128-bit state'],
        limitations: ['Mild failure in Hamming weight dependencies (rarely relevant)']
    },
    { 
        id: 'xorshift1024', 
        name: 'Xorshift1024*', 
        category: 'Shift Register', 
        desc: 'High-quality with 1024-bit state.', 
        wiki: 'https://en.wikipedia.org/wiki/Xorshift',
        characteristics: ['Massive period (2^1024 - 1)', 'Passes BigCrush'],
        limitations: ['Large state size', 'Slower initialization']
    },
    { 
        id: 'tausworthe', 
        name: 'Tausworthe', 
        category: 'Shift Register', 
        desc: 'Combined Tausworthe generator (taus88).', 
        wiki: 'https://en.wikipedia.org/wiki/Linear-feedback_shift_register',
        characteristics: ['Hardware friendly', 'Good equidistribution'],
        limitations: ['Complex initialization', 'Sensitive to bad seeds']
    },
    { 
        id: 'lfsr8', 
        name: 'LFSR (8-bit)', 
        category: 'Shift Register', 
        desc: 'Simple 8-bit Linear Feedback Shift Register.', 
        wiki: 'https://en.wikipedia.org/wiki/Linear-feedback_shift_register',
        characteristics: ['Hardware primitive', 'Max period 255'],
        limitations: ['Extremely short period', 'Linearly predictable (Berlekamp-Massey)']
    },
    { 
        id: 'lfsr', 
        name: 'LFSR (16-bit)', 
        category: 'Shift Register', 
        desc: '16-bit LFSR using Galois configuration.', 
        wiki: 'https://en.wikipedia.org/wiki/Linear-feedback_shift_register',
        characteristics: ['Common in legacy hardware', 'Max period 65535'],
        limitations: ['Predictable', 'Small state space']
    },
    { 
        id: 'lfsr32', 
        name: 'LFSR (32-bit)', 
        category: 'Shift Register', 
        desc: '32-bit maximal-length LFSR.', 
        wiki: 'https://en.wikipedia.org/wiki/Linear-feedback_shift_register',
        characteristics: ['Used in CRCs and whitening', 'Period ~4 billion'],
        limitations: ['Linear complexity is low', 'Not secure']
    },
    { 
        id: 'lfsr64', 
        name: 'LFSR (64-bit)', 
        category: 'Shift Register', 
        desc: '64-bit LFSR. Massive period.', 
        wiki: 'https://en.wikipedia.org/wiki/Linear-feedback_shift_register',
        characteristics: ['Huge period', 'Efficient on 64-bit CPUs'],
        limitations: ['Linearly predictable']
    },
    { 
        id: 'mt19937', 
        name: 'Mersenne Twister', 
        category: 'Modern & Quality', 
        desc: 'The most widely used PRNG (MT19937). Massive period of 2^19937-1.', 
        wiki: 'https://en.wikipedia.org/wiki/Mersenne_Twister',
        characteristics: ['Colossal period (2^19937-1)', 'Passes almost all statistical tests', 'Standard in Python, Ruby, R'],
        limitations: ['Large state (2.5KB)', 'Slow to initialize', 'Not cryptographically secure (predictable)']
    },
    { 
        id: 'pcg32', 
        name: 'PCG32', 
        category: 'Modern & Quality', 
        desc: 'Permuted Congruential Generator. Fast, statistically good, and small state.', 
        wiki: 'https://www.pcg-random.org/',
        characteristics: ['Excellent statistical properties', 'Fast and compact'],
        limitations: ['Not suitable for strong cryptography without large state']
    },
    { 
        id: 'sfc32', 
        name: 'SFC32', 
        category: 'Modern & Quality', 
        desc: 'Small Fast Chaotic PRNG. Very fast and passes BigCrush.', 
        wiki: 'http://practice.dafe.pts.org.tw/Rng/Prng.html',
        characteristics: ['Extremely fast', 'Passes PractRand and BigCrush'],
        limitations: ['32-bit output only (SFC64 exists)']
    },
    { 
        id: 'wyrand', 
        name: 'WyRand', 
        category: 'Modern & Quality', 
        desc: 'Extremely fast generator based on WyHash. Stateless-ish portable PRNG.', 
        wiki: 'https://github.com/wangyi-fudan/wyhash',
        characteristics: ['One of the fastest PRNGs', 'Good statistical quality'],
        limitations: ['Short period compared to MT19937 (but sufficient: 2^64)']
    },
    { 
        id: 'splitmix', 
        name: 'SplitMix64', 
        category: 'Modern & Quality', 
        desc: 'Fast, splittable 64-bit generator.', 
        wiki: 'https://en.wikipedia.org/wiki/SplitMix',
        characteristics: ['Splittable state (good for parallel)', 'Passes BigCrush'],
        limitations: ['64-bit period only']
    },
    { 
        id: 'mulberry', 
        name: 'Mulberry32', 
        category: 'Modern & Quality', 
        desc: 'Fast, high-quality 32-bit generator.', 
        wiki: 'https://github.com/skeeto/hash-prospector',
        characteristics: ['Excellent avalanche properties', 'Fast mixing'],
        limitations: ['Short period (2^32)']
    },
    { 
        id: 'kiss', 
        name: 'KISS (99)', 
        category: 'Modern & Quality', 
        desc: 'Keep It Simple Stupid by George Marsaglia. Combines LCG, Shift, MWC.', 
        wiki: 'https://en.wikipedia.org/wiki/KISS_(algorithm)',
        characteristics: ['Composite generator', 'Very long period (~2^123)'],
        limitations: ['Complex initialization (4 seeds)']
    },
    { 
        id: 'logistic', 
        name: 'Logistic Map', 
        category: 'Chaotic', 
        desc: 'Classic chaos example: r*x*(1-x).', 
        wiki: 'https://en.wikipedia.org/wiki/Logistic_map',
        characteristics: ['Bifurcation diagram visualization', 'Sensitive to initial conditions'],
        limitations: ['Using floats introduces precision errors over time', 'Not uniform distribution']
    },
    { 
        id: 'tent', 
        name: 'Tent Map', 
        category: 'Chaotic', 
        desc: 'Piecewise linear map on [0,1].', 
        wiki: 'https://en.wikipedia.org/wiki/Tent_map',
        characteristics: ['Simple chaotic map', 'Uniform invariant density'],
        limitations: ['Fixed precision issues']
    },
    { 
        id: 'henon', 
        name: 'Hénon Map', 
        category: 'Chaotic', 
        desc: 'Discrete-time dynamical system with strange attractors.', 
        wiki: 'https://en.wikipedia.org/wiki/H%C3%A9non_map',
        characteristics: ['2D chaotic map', 'Strange attractor fractal'],
        limitations: ['Bounded region', 'Not a standard RNG']
    },
    { 
        id: 'ikeda', 
        name: 'Ikeda Map', 
        category: 'Chaotic', 
        desc: 'Model of light circulating in a ring cavity.', 
        wiki: 'https://en.wikipedia.org/wiki/Ikeda_map',
        characteristics: ['Complex dynamics', 'Spiral structure'],
        limitations: ['Computationally more expensive']
    },
    { 
        id: 'lorenz', 
        name: 'Lorenz Attractor', 
        category: 'Chaotic', 
        desc: 'Atmospheric convection model (Butterfly effect).', 
        wiki: 'https://en.wikipedia.org/wiki/Lorenz_system',
        characteristics: ['First example of strange attractor', 'Continuous time system'],
        limitations: ['Requires discretization (Euler/Runge-Kutta)']
    },
    { 
        id: 'rossler', 
        name: 'Rössler Attractor', 
        category: 'Chaotic', 
        desc: 'Similar to Lorenz but simpler equations.', 
        wiki: 'https://en.wikipedia.org/wiki/R%C3%B6ssler_attractor',
        characteristics: ['Simpler topology than Lorenz', 'Single manifold'],
        limitations: ['Requires discretization']
    },
    { 
        id: 'fib', 
        name: 'Fibonacci', 
        category: 'Classical', 
        desc: 'Predictable sequence: F(n) = F(n-1) + F(n-2).', 
        wiki: 'https://en.wikipedia.org/wiki/Fibonacci_number',
        characteristics: ['Golden ratio convergence', 'Exponential growth'],
        limitations: ['Not random', 'Quickly overflows standard integers']
    },
    {
        id: 'middle-square',
        name: 'Middle-Square',
        category: 'Classical',
        desc: 'Von Neumann\'s first method. Squaring a number and taking the middle digits.',
        wiki: 'https://en.wikipedia.org/wiki/Middle-square_method',
        characteristics: ['First computer PRNG', 'Historical curiosity'],
        limitations: ['Extremely short periods', 'Converges to zero quickly']
    },
    {
        id: 'lagged-fib',
        name: 'Lagged Fibonacci',
        category: 'Classical',
        desc: 'Additive: X(n) = (X(n-j) + X(n-k)) mod m.',
        wiki: 'https://en.wikipedia.org/wiki/Lagged_Fibonacci_generator',
        characteristics: ['Long periods', 'Based on Fibonacci sequence'],
        limitations: ['Requires initialization of a buffer']
    },
    {
        id: 'blum-blum-shub',
        name: 'Blum Blum Shub',
        category: 'Classical',
        desc: 'Cryptographically secure X(n+1) = X(n)^2 mod M where M=p*q.',
        wiki: 'https://en.wikipedia.org/wiki/Blum_Blum_Shub',
        characteristics: ['Provably secure if factoring is hard', 'Slow'],
        limitations: ['Computationally expensive for general use']
    }
];

const lfsr8Presets: LfsrPreset[] = [
    { name: 'Max Length (1D)', tap: '1D', desc: 'Maximal length (x^8 + x^4 + x^3 + x^2 + 1)' }, 
    { name: 'Standard (B8)', tap: 'B8', desc: 'Maximal length (x^8 + x^6 + x^5 + x^4 + 1)' },
    { name: 'Poly 0x71', tap: '71', desc: 'Alternative maximal configuration' },
    { name: 'Poly 0xA6', tap: 'A6', desc: 'Common variant' },
    { name: 'Poly 0x8E', tap: '8E', desc: 'Common variant' },
];
const lfsr16Presets: LfsrPreset[] = [
    { name: 'Standard (B400)', tap: 'B400', desc: 'Maximal length (x^16 + x^14 + x^13 + x^11 + 1)' },
    { name: 'CCITT (1021)', tap: '1021', desc: 'Used in CRC-CCITT / X.25' },
    { name: 'Poly 0x002D', tap: '002D', desc: 'Maximal length (x^16 + x^15 + x^13 + x^4 + 1)' },
    { name: 'CRC-16 (8005)', tap: '8005', desc: 'Standard CRC-16' },
    { name: 'Maximal (A001)', tap: 'A001', desc: 'Commonly used reversed' },
];
const lfsr32Presets: LfsrPreset[] = [
    { name: 'Xilinx Standard', tap: '80200003', desc: 'Xilinx App Note 052' },
    { name: 'CRC-32 (04C11DB7)', tap: '04C11DB7', desc: 'Ethernet, ZIP, PNG checksum' },
    { name: 'Castagnoli (1EDC6F41)', tap: '1EDC6F41', desc: 'CRC32C (iSCSI, Btrfs, Ext4)' },
    { name: 'Koopman (EB31D82E)', tap: 'EB31D82E', desc: 'Optimal Hamming Distance' },
    { name: 'Reversed CRC (EDB8)', tap: 'EDB88320', desc: 'Reversed CRC-32' },
];
const lfsr64Presets: LfsrPreset[] = [
    { name: 'ISO 3309 (D8...)', tap: 'D800000000000000', desc: 'Standard primitive polynomial for 64-bit' },
    { name: 'ECMA-182 (C9...)', tap: 'C96C5795D7870F42', desc: 'Polynomial from ECMA-182 standard' },
    { name: 'Jones (95...)', tap: '95AC9329AC4BC9B5', desc: 'Found via search for low weight' },
    { name: 'Random Primitive (FB...)', tap: 'FB5D193072382417', desc: 'Example primitive polynomial' },
];

const xorshiftPresets: LfsrPreset[] = [
    { name: 'Standard (32)', tap: '', desc: 'Shifts: 13, 17, 5 (Period 2^32-1)' },
    { name: 'Variant A', tap: '', desc: 'Shifts: 1, 3, 10' },
    { name: 'Variant B', tap: '', desc: 'Shifts: 6, 21, 7' },
];

const henonPresets = [
    { name: 'Classical', a: '1.4', b: '0.3', desc: 'Standard chaotic map' },
    { name: 'Lozi-like', a: '1.2', b: '0.3', desc: 'Simpler dynamics' },
];

const ikedaPresets = [
    { name: 'Classical', u: '0.9', desc: 'Standard chaotic attractor' },
    { name: 'Limit Cycle', u: '0.7', desc: 'Stable limit cycle behavior' },
];

type FormParams = {
    [K in keyof GeneratorParams]: string;
};

const defaultFormParams: FormParams = {
    a: '1664525', c: '1013904223', m: '4294967296', seed: '12345',
    seed2: '54321', seed3: '9999', seed4: '10101',
    stringSeed: 'EntropyWizard', hexTap: 'B400',
    fibSeed1: '0', fibSeed2: '1',
    floatSeed: '0.5', paramR: '3.99', paramA: '1.4', paramB: '0.3', paramC: '2.66', paramDt: '0.01'
};

const getRandomInt = (min: number, max: number) => {
    const range = max - min + 1;
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return min + (array[0] % range);
};

const getRandomFloat = (min: number, max: number, decimals: number = 5) => {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const random01 = array[0] / 0xFFFFFFFF;
    const val = min + random01 * (max - min);
    return parseFloat(val.toFixed(decimals));
};

const getRandomHex = (length: number) => {
    const chars = '0123456789ABCDEF';
    let result = '';
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
        result += chars[array[i] % 16];
    }
    return result;
};

const getActiveKeys = (mode: string): (keyof FormParams)[] => {
    if (['lcg', 'randu', 'zx81', 'nr', 'minstd', 'carbon', 'ggn'].includes(mode)) return ['a', 'c', 'm', 'seed'];
    if (mode === 'middle-square') return ['seed'];
    if (mode === 'blum-blum-shub') return ['seed', 'm'];
    if (mode === 'lagged-fib') return ['seed', 'a', 'c']; // Reusing a/c as j/k offsets
    if (mode === 'lfsr8') return ['seed', 'hexTap'];
    if (mode === 'lfsr' || mode === 'lfsr32') return ['seed', 'hexTap'];
    if (mode === 'lfsr64') return ['stringSeed', 'hexTap'];
    if (['xorshift', 'splitmix', 'mulberry', 'mt19937', 'wyrand'].includes(mode)) return ['seed'];
    if (['pcg32'].includes(mode)) return ['seed', 'seed2']; // state, stream/inc
    if (['xoroshiro128plus', 'xorshift1024'].includes(mode)) return ['seed', 'seed2'];
    if (['wichmann-hill'].includes(mode)) return ['seed', 'seed2', 'seed3'];
    if (['sfc32', 'kiss'].includes(mode)) return ['seed', 'seed2', 'seed3', 'seed4'];
    
    if (mode === 'logistic' || mode === 'tent') return ['floatSeed', 'paramR'];
    if (mode === 'henon') return ['floatSeed', 'paramA', 'paramB'];
    if (mode === 'ikeda') return ['floatSeed', 'paramA'];
    if (mode === 'lorenz' || mode === 'rossler') return ['floatSeed', 'paramDt', 'paramA', 'paramB', 'paramC'];
    return ['seed'];
};

const Playground: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<GenCategory>('LCG & MLCG');
    const [mode, setMode] = useState<string>('lcg');
    const [countStr, setCountStr] = useState('10');
    const [testLimitStr, setTestLimitStr] = useState('1000');
    const [showDetails, setShowDetails] = useState(false);
    const [formParams, setFormParams] = useState<FormParams>(defaultFormParams);
    
    const [sequence, setSequence] = useState<number[]>([]);
    const [chiResult, setChiResult] = useState<{score: number, passed: boolean} | null>(null);
    const [dieharderResults, setDieharderResults] = useState<TestResult[]>([]);
    const [copyStatus, setCopyStatus] = useState('Copy');

    // Visualizer State
    const [view, setView] = useState({ centerX: 0, centerY: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const viewStart = useRef({ centerX: 0, centerY: 0 });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const viewRef = useRef(view);

    const currentAlgo = algorithms.find(a => a.id === mode);
    const filteredAlgorithms = algorithms.filter(a => a.category === activeCategory);

    // Sync ref with state for event listeners
    useEffect(() => {
        viewRef.current = view;
    }, [view]);

    const params = useMemo((): GeneratorParams => {
        return {
            a: parseInt(formParams.a) || 0,
            c: parseInt(formParams.c) || 0,
            m: parseInt(formParams.m) || 1,
            seed: parseInt(formParams.seed) || 0,
            seed2: parseInt(formParams.seed2) || 0,
            seed3: parseInt(formParams.seed3) || 0,
            seed4: parseInt(formParams.seed4) || 0,
            fibSeed1: parseInt(formParams.fibSeed1) || 0,
            fibSeed2: parseInt(formParams.fibSeed2) || 0,
            floatSeed: parseFloat(formParams.floatSeed) || 0,
            paramR: parseFloat(formParams.paramR) || 0,
            paramA: parseFloat(formParams.paramA) || 0,
            paramB: parseFloat(formParams.paramB) || 0,
            paramC: parseFloat(formParams.paramC) || 0,
            paramDt: parseFloat(formParams.paramDt) || 0,
            stringSeed: formParams.stringSeed,
            hexTap: formParams.hexTap,
        };
    }, [formParams]);

    const count = parseInt(countStr) || 10;
    const testLimit = parseInt(testLimitStr) || 1000;

    const currentErrors = useMemo(() => {
        const errs: Record<string, string> = {};
        if (count <= 0) errs['count'] = "Count must be > 0";
        if (count > 50000) errs['count'] = "Max limit 50,000";
        
        if (testLimit < 1000) errs['testLimit'] = "Min 1000 samples required for reliable stats";
        if (testLimit > 1000000) errs['testLimit'] = "Max 1,000,000 samples to prevent freeze";

        // Seed Validation
        if (['lcg', 'randu', 'zx81', 'nr', 'minstd', 'carbon', 'ggn'].includes(mode)) {
             if (formParams.seed === '' || isNaN(params.seed!)) {
                 errs['seed'] = "Valid integer seed required";
             }
             if (params.m! <= 0) errs['m'] = "Modulus must be > 0";
             if (params.a! < 0) errs['a'] = "Multiplier must be >= 0";
             if (params.m! > 0) {
                 if (params.seed! >= params.m!) errs['seed'] = `Seed must be < Modulus (${params.m})`;
                 if (params.a! >= params.m!) errs['a'] = `Multiplier should be < Modulus (${params.m})`;
                 if (params.c! >= params.m!) errs['c'] = `Increment should be < Modulus (${params.m})`;
             }
        }
        
        if (['xorshift', 'splitmix', 'mulberry', 'xoroshiro128plus', 'xorshift1024', 'mt19937', 'pcg32', 'wyrand', 'sfc32', 'kiss'].includes(mode)) {
             if (params.seed === 0 && mode !== 'pcg32' && mode !== 'wyrand') errs['seed'] = "Seed must be non-zero"; 
             if (params.seed2 === 0 && ['xoroshiro128plus', 'xorshift1024', 'sfc32', 'kiss', 'pcg32'].includes(mode)) errs['seed2'] = "Seed 2 must be non-zero";
             if (params.seed3 === 0 && ['sfc32', 'kiss'].includes(mode)) errs['seed3'] = "Seed 3 must be non-zero";
             if (params.seed4 === 0 && ['sfc32', 'kiss'].includes(mode)) errs['seed4'] = "Seed 4 must be non-zero";
        }
        
        if (mode === 'wichmann-hill') {
            if (params.seed === 0 || params.seed! >= 30269) errs['seed'] = "S1 must be in [1, 30268]";
            if (params.seed2 === 0 || params.seed2! >= 30307) errs['seed2'] = "S2 must be in [1, 30306]";
            if (params.seed3 === 0 || params.seed3! >= 30323) errs['seed3'] = "S3 must be in [1, 30322]";
        }

        if (mode === 'blum-blum-shub') {
            if (params.m! <= 1) errs['m'] = "Modulus M must be > 1";
            if (params.seed === 0 || params.seed! === 1) errs['seed'] = "Seed should be > 1";
        }

        if (mode === 'lagged-fib') {
            if (params.a! <= 0) errs['a'] = "Offset j must be > 0";
            if (params.c! <= 0) errs['c'] = "Offset k must be > 0";
            if (params.a === params.c) errs['a'] = "Offsets must be distinct";
            if (params.m! <= 0) errs['m'] = "Modulus must be > 0";
        }

        if (mode.includes('lfsr') && !/^[0-9A-Fa-f]+$/.test(formParams.hexTap)) {
            errs['hexTap'] = "Invalid Hexadecimal";
        }

        if (mode === 'logistic' || mode === 'tent') {
            if (params.paramR! > 4.0) errs['paramR'] = "r should be <= 4.0";
            if (params.paramR! < 0) errs['paramR'] = "r must be >= 0";
            if (params.floatSeed! < 0 || params.floatSeed! > 1) errs['floatSeed'] = "X0 must be in [0, 1]";
        }

        if (['lorenz', 'rossler', 'ikeda', 'henon'].includes(mode)) {
             if (params.paramDt! <= 0) errs['paramDt'] = "dt must be > 0";
             if (params.paramDt! > 0.5) errs['paramDt'] = "dt too large for stability";
        }

        return errs;
    }, [mode, params, formParams, count, testLimit]);

    const hasErrors = Object.keys(currentErrors).length > 0;

    const handleInputChange = (key: keyof FormParams, value: string, type: 'int' | 'float' | 'hex' | 'posInt' = 'int') => {
        let pattern;
        switch(type) {
            case 'int': pattern = /^-?\d*$/; break;
            case 'posInt': pattern = /^\d*$/; break;
            case 'float': pattern = /^-?\d*\.?\d*$/; break;
            case 'hex': pattern = /^[0-9a-fA-F]*$/; break;
            default: pattern = /.*/;
        }
        if (pattern.test(value)) {
            setFormParams(prev => ({ ...prev, [key]: value }));
        }
    };

    const handleRawSetParam = (key: keyof FormParams, val: string) => {
        setFormParams(prev => ({ ...prev, [key]: val }));
    };

    const generateRandomValue = (key: keyof FormParams): string => {
        if (['lcg', 'minstd', 'carbon', 'ggn'].includes(mode)) {
             const mStr = formParams.m || '2147483647';
             const mVal = parseInt(mStr);
             const safeM = (!isNaN(mVal) && mVal > 1) ? mVal : 2147483647;
             
             if (key === 'm') return getRandomInt(10000, 2147483647).toString();
             if (key === 'a' || key === 'c' || key === 'seed') return getRandomInt(1, safeM - 1).toString();
        }
        
        if (['xorshift', 'splitmix', 'mulberry', 'mt19937', 'xoroshiro128plus', 'xorshift1024', 'pcg32', 'wyrand', 'sfc32', 'kiss'].includes(mode)) {
             if (key.includes('seed')) return getRandomInt(1, 2147483647).toString();
        }
        
        if (mode === 'wichmann-hill') {
            if (key === 'seed') return getRandomInt(1, 30268).toString();
            if (key === 'seed2') return getRandomInt(1, 30306).toString();
            if (key === 'seed3') return getRandomInt(1, 30322).toString();
        }

        if (mode === 'blum-blum-shub') {
            if (key === 'm') return getRandomInt(1000, 50000).toString(); 
            if (key === 'seed') {
                const m = parseInt(formParams.m) || 209;
                return getRandomInt(2, Math.max(2, m-1)).toString();
            }
        }

        if (mode === 'lagged-fib') {
            if (key === 'seed') return getRandomInt(1, 99999).toString();
            if (key === 'a' || key === 'c') {
                const pairs = [[7,10], [5,17], [24,55], [65, 71], [127, 97]];
                const pair = pairs[Math.floor(Math.random() * pairs.length)];
                if (key === 'a') return pair[0].toString();
                if (key === 'c') return pair[1].toString();
            }
        }
        
        if (mode.includes('lfsr')) {
            if (key === 'seed') return getRandomInt(1, 65535).toString();
            if (key === 'stringSeed') {
                const arr = new Uint32Array(2);
                window.crypto.getRandomValues(arr);
                return (BigInt(arr[0]) + BigInt(arr[1])).toString();
            }
            if (key === 'hexTap') {
                if (mode === 'lfsr8') return getRandomHex(2);
                if (mode === 'lfsr') return getRandomHex(4);
                if (mode === 'lfsr32') return getRandomHex(8);
                if (mode === 'lfsr64') return getRandomHex(16);
            }
        }

        if (['logistic', 'tent', 'henon', 'lorenz', 'rossler', 'ikeda'].includes(mode)) {
             if (key === 'floatSeed') return getRandomFloat(0.05, 0.95).toString();
             if (mode === 'logistic' && key === 'paramR') return getRandomFloat(3.57, 4.0).toString();
             if (mode === 'tent' && key === 'paramR') return getRandomFloat(1.5, 1.99).toString();
             
             if (mode === 'henon') {
                 if (key === 'paramA') return getRandomFloat(1.2, 1.42).toString();
                 if (key === 'paramB') return getRandomFloat(0.2, 0.35).toString();
             }
             if (mode === 'ikeda') {
                 if (key === 'paramA') return getRandomFloat(0.8, 0.95).toString();
             }
             if (mode === 'lorenz') {
                 if (key === 'paramDt') return getRandomFloat(0.005, 0.02, 3).toString();
                 if (key === 'paramA') return getRandomFloat(8.0, 12.0).toString();
                 if (key === 'paramB') return getRandomFloat(20.0, 35.0).toString();
                 if (key === 'paramC') return getRandomFloat(2.0, 3.0).toString();
             }
             if (mode === 'rossler') {
                 if (key === 'paramDt') return getRandomFloat(0.01, 0.1, 3).toString();
                 if (key === 'paramA') return getRandomFloat(0.15, 0.25).toString();
                 if (key === 'paramB') return getRandomFloat(0.15, 0.25).toString();
                 if (key === 'paramC') return getRandomFloat(4.5, 7.0).toString();
             }
        }
        
        return getRandomInt(1, 99999).toString();
    };

    const handleSingleRandomize = (key: keyof FormParams) => {
        const val = generateRandomValue(key);
        handleRawSetParam(key, val);
    };

    const randomizeCurrent = () => {
        const activeKeys = getActiveKeys(mode);
        const newParams = { ...formParams };
        
        if (activeKeys.includes('m') && ['lcg', 'minstd', 'carbon', 'ggn'].includes(mode)) {
             newParams.m = generateRandomValue('m');
        }
        
        if (mode === 'lagged-fib') {
             const pairs = [[7,10], [5,17], [24,55], [65, 71]];
             const pair = pairs[Math.floor(Math.random() * pairs.length)];
             newParams.a = pair[0].toString();
             newParams.c = pair[1].toString();
             newParams.seed = generateRandomValue('seed');
        } else {
            activeKeys.forEach(key => {
                if (key !== 'm' && !(mode === 'lagged-fib' && (key === 'a' || key === 'c'))) { 
                    if (['a', 'c', 'seed'].includes(key) && ['lcg', 'minstd', 'carbon', 'ggn'].includes(mode)) {
                         const mVal = parseInt(newParams.m) || 2147483647;
                         const safeLimit = mVal > 1 ? mVal - 1 : 2147483647;
                         newParams[key] = getRandomInt(1, safeLimit).toString();
                    } else {
                         newParams[key] = generateRandomValue(key);
                    }
                }
            });
        }
        setFormParams(newParams);
    };

    const setDefaultParams = (id: string) => {
        let p: FormParams = { ...formParams };
        if (id === 'lcg') { p.a='1664525'; p.c='1013904223'; p.m='4294967296'; p.seed='12345'; }
        if (id === 'randu') { p.a='65539'; p.c='0'; p.m='2147483648'; p.seed='1'; }
        if (id === 'logistic') { p.floatSeed='0.5'; p.paramR='3.99'; }
        if (id === 'lorenz') { p.floatSeed='0.1'; p.paramA='10'; p.paramB='28'; p.paramC='2.66'; p.paramDt='0.01'; }
        if (id === 'rossler') { p.floatSeed='0.1'; p.paramA='0.2'; p.paramB='0.2'; p.paramC='5.7'; p.paramDt='0.05'; }
        if (id === 'henon') { p.floatSeed='0.1'; p.paramA='1.4'; p.paramB='0.3'; }
        if (id === 'ikeda') { p.floatSeed='0.1'; p.paramA='0.9'; }
        if (id === 'lfsr8') { p.seed='31'; p.hexTap='1D'; }
        if (id === 'xoroshiro128plus') { p.seed='123456'; p.seed2='987654'; }
        if (id === 'mt19937') { p.seed='5489'; }
        if (id === 'middle-square') { p.seed='1234'; }
        if (id === 'pcg32') { p.seed='42'; p.seed2='54'; }
        if (id === 'sfc32') { p.seed='123'; p.seed2='456'; p.seed3='789'; p.seed4='999'; }
        if (id === 'kiss') { p.seed='12345'; p.seed2='34221'; p.seed3='4321'; p.seed4='6969'; }
        if (id === 'wichmann-hill') { p.seed='100'; p.seed2='200'; p.seed3='300'; }
        if (id === 'wyrand') { p.seed='777'; }
        if (id === 'blum-blum-shub') { p.seed='3'; p.m='209'; }
        if (id === 'lagged-fib') { p.seed='12345'; p.a='7'; p.c='10'; }
        setFormParams(p);
    };

    const resetView = (id: string) => {
        if (id === 'logistic') setView({ centerX: 3.0, centerY: 0.5, scale: 200 }); // r=2-4, x=0-1
        else if (id === 'tent') setView({ centerX: 1.5, centerY: 0.5, scale: 400 });
        else if (id === 'henon') setView({ centerX: 0, centerY: 0, scale: 200 });
        else if (id === 'ikeda') setView({ centerX: 0, centerY: 0, scale: 150 });
        else if (id === 'lorenz') setView({ centerX: 0, centerY: 25, scale: 10 });
        else if (id === 'rossler') setView({ centerX: 0, centerY: 0, scale: 20 });
        else setView({ centerX: 0, centerY: 0, scale: 100 });
    };

    const handleModeChange = (id: string) => {
        setMode(id);
        setSequence([]);
        setChiResult(null);
        setDieharderResults([]);
        setShowDetails(false);
        setDefaultParams(id);
        resetView(id);
    };

    const handleCategoryChange = (cat: GenCategory) => {
        setActiveCategory(cat);
        const first = algorithms.find(a => a.category === cat);
        if (first) handleModeChange(first.id);
    };

    // Interaction Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        viewStart.current = { centerX: view.centerX, centerY: view.centerY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        // Pan logic: pixel delta / scale = world delta
        // Moving mouse right (positive dx) means we want to see more left world, so centerX decreases
        setView(prev => ({
            ...prev,
            centerX: viewStart.current.centerX - dx / prev.scale,
            centerY: viewStart.current.centerY + dy / prev.scale // Y axis flip
        }));
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        setIsDragging(false);
        const dist = Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
        // If click without drag, and in parameter mode, set parameter
        if (dist < 5 && (mode === 'logistic' || mode === 'tent')) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
                const mouseX = e.clientX - rect.left;
                const worldR = (mouseX - rect.width / 2) / view.scale + view.centerX;
                handleRawSetParam('paramR', worldR.toFixed(4));
            }
        }
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    // Native wheel handler to support non-passive event listener
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // --- Touch Handling ---
        let dragStart = { x: 0, y: 0 };
        let pinchStart = { dist: 0, center: { x: 0, y: 0 }, view: viewRef.current };
        let touchMode: 'none' | 'drag' | 'pinch' = 'none';

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                touchMode = 'drag';
                dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                pinchStart.view = viewRef.current; // Reuse field for start view snapshot
            } else if (e.touches.length === 2) {
                touchMode = 'pinch';
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const rect = canvas.getBoundingClientRect();
                pinchStart.dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                pinchStart.center = {
                    x: (t1.clientX + t2.clientX) / 2 - rect.left,
                    y: (t1.clientY + t2.clientY) / 2 - rect.top
                };
                pinchStart.view = viewRef.current;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (e.cancelable) e.preventDefault(); // Stop page scroll

            if (touchMode === 'drag' && e.touches.length === 1) {
                const dx = e.touches[0].clientX - dragStart.x;
                const dy = e.touches[0].clientY - dragStart.y;
                const v = pinchStart.view; // Initial view at start of drag
                
                setView({
                    ...v,
                    centerX: v.centerX - dx / v.scale,
                    centerY: v.centerY + dy / v.scale
                });
            } else if (touchMode === 'pinch' && e.touches.length === 2) {
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                const rect = canvas.getBoundingClientRect();
                const center = {
                    x: (t1.clientX + t2.clientX) / 2 - rect.left,
                    y: (t1.clientY + t2.clientY) / 2 - rect.top
                };

                const v = pinchStart.view;
                if (pinchStart.dist < 5) return; // Avoid noise

                const scaleFactor = dist / pinchStart.dist;
                const newScale = v.scale * scaleFactor;

                // Calculate world coordinates of the initial pinch center
                const worldX = (pinchStart.center.x - rect.width / 2) / v.scale + v.centerX;
                const worldY = v.centerY - (pinchStart.center.y - rect.height / 2) / v.scale;

                // Adjust center to keep world point under current pinch center
                const newCenterX = worldX - (center.x - rect.width / 2) / newScale;
                const newCenterY = worldY + (center.y - rect.height / 2) / newScale;

                setView({
                    scale: newScale,
                    centerX: newCenterX,
                    centerY: newCenterY
                });
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (e.touches.length === 0) {
                touchMode = 'none';
            } else if (e.touches.length === 1) {
                // Transition to drag to avoid jump? better to reset for now
                touchMode = 'drag';
                dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                pinchStart.view = viewRef.current;
            }
        };

        // Attach non-passive listener to prevent page scrolling
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd);
        canvas.addEventListener('touchcancel', onTouchEnd);
        
        return () => {
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
            canvas.removeEventListener('touchcancel', onTouchEnd);
        };
    }, []); // Empty dependency array as we use viewRef

    // Zoom Handlers
    const handleZoomIn = () => {
        setView(prev => ({ ...prev, scale: prev.scale * 1.5 }));
    };

    const handleZoomOut = () => {
        setView(prev => ({ ...prev, scale: prev.scale / 1.5 }));
    };

    const drawChaos = useCallback(() => {
        if (activeCategory !== 'Chaotic') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        ctx.fillStyle = '#050b14';
        ctx.fillRect(0, 0, width, height);
        
        // Coordinate helpers
        const toScreenX = (val: number) => (val - view.centerX) * view.scale + width / 2;
        const toScreenY = (val: number) => height / 2 - (val - view.centerY) * view.scale;

        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6; // heatmap effect

        if (mode === 'logistic' || mode === 'tent') {
            ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
            // Iterate over screen pixels for 'r'
            for (let px = 0; px < width; px += 1) { // Skip some for speed if needed
                const r = (px - width / 2) / view.scale + view.centerX;
                if (r < 0 || r > 4.0) continue; // Optimization

                let x = 0.5;
                // warmup
                for (let i = 0; i < 50; i++) {
                    if (mode === 'logistic') x = r * x * (1 - x);
                    else x = (x < 0.5) ? r * x : r * (1 - x);
                }
                // draw
                for (let i = 0; i < 50; i++) {
                    if (mode === 'logistic') x = r * x * (1 - x);
                    else x = (x < 0.5) ? r * x : r * (1 - x);
                    
                    const py = toScreenY(x);
                    if (py >= 0 && py < height) {
                        ctx.fillRect(px, py, 1, 1);
                    }
                }
            }
            // Param Line
            const currentR = params.paramR ?? 0;
            const lineX = toScreenX(currentR);
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.moveTo(lineX, 0);
            ctx.lineTo(lineX, height);
            ctx.stroke();

        } else if (mode === 'henon') {
            ctx.fillStyle = 'rgba(236, 72, 153, 0.5)';
            let x = params.floatSeed ?? 0.1, y = 0.1;
            const a = params.paramA ?? 1.4, b = params.paramB ?? 0.3;
            // Warmup
            for(let i=0; i<100; i++) {
                const nextX = 1 - a * x * x + y;
                y = b * x; x = nextX;
            }
            for(let i=0; i<20000; i++) {
                const nextX = 1 - a * x * x + y;
                y = b * x; x = nextX;
                ctx.fillRect(toScreenX(x), toScreenY(y), 1, 1);
            }

        } else if (mode === 'ikeda') {
            ctx.fillStyle = 'rgba(236, 72, 153, 0.5)';
            let x = params.floatSeed ?? 0.1, y = 0.1;
            const u = params.paramA ?? 0.9;
            for(let i=0; i<100; i++) {
                const t = 0.4 - 6 / (1 + x*x + y*y);
                const nextX = 1 + u * (x * Math.cos(t) - y * Math.sin(t));
                y = u * (x * Math.sin(t) + y * Math.cos(t)); x = nextX;
            }
            for(let i=0; i<20000; i++) {
                const t = 0.4 - 6 / (1 + x*x + y*y);
                const nextX = 1 + u * (x * Math.cos(t) - y * Math.sin(t));
                y = u * (x * Math.sin(t) + y * Math.cos(t)); x = nextX;
                ctx.fillRect(toScreenX(x), toScreenY(y), 1, 1);
            }

        } else if (mode === 'lorenz') {
             ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
             let x = params.floatSeed ?? 0.1, y = 1.0, z = 1.0;
             const dt = params.paramDt ?? 0.01;
             const a = params.paramA ?? 10, b = params.paramB ?? 28, c = params.paramC ?? 2.66;
             
             for(let i=0; i<100; i++) {
                let dx = a*(y-x), dy=x*(b-z)-y, dz=x*y-c*z;
                x+=dx*dt; y+=dy*dt; z+=dz*dt;
             }
             
             ctx.beginPath();
             ctx.moveTo(toScreenX(x), toScreenY(z)); // Plot X vs Z

             for(let i=0; i<5000; i++) {
                let dx = a*(y-x), dy=x*(b-z)-y, dz=x*y-c*z;
                x+=dx*dt; y+=dy*dt; z+=dz*dt;
                ctx.lineTo(toScreenX(x), toScreenY(z));
             }
             ctx.stroke();

        } else if (mode === 'rossler') {
             ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
             let x = params.floatSeed ?? 0.1, y = 1.0, z = 1.0;
             const dt = params.paramDt ?? 0.05;
             const a = params.paramA ?? 0.2, b = params.paramB ?? 0.2, c = params.paramC ?? 5.7;

             for(let i=0; i<100; i++) {
                 let dx = -y - z, dy = x + a*y, dz = b + z*(x-c);
                 x+=dx*dt; y+=dy*dt; z+=dz*dt;
             }

             ctx.beginPath();
             ctx.moveTo(toScreenX(x), toScreenY(y)); // Plot X vs Y

             for(let i=0; i<5000; i++) {
                 let dx = -y - z, dy = x + a*y, dz = b + z*(x-c);
                 x+=dx*dt; y+=dy*dt; z+=dz*dt;
                 ctx.lineTo(toScreenX(x), toScreenY(y));
             }
             ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
    }, [mode, activeCategory, params, view]);

    useEffect(() => {
        if (activeCategory === 'Chaotic') {
            requestAnimationFrame(drawChaos);
        }
    }, [drawChaos, activeCategory]);

    // Initial reset view on mode change handled by handleModeChange, but also need one on mount/category switch
    useEffect(() => {
        if(activeCategory === 'Chaotic') resetView(mode);
    }, [activeCategory, mode]);

    const handleGenerate = () => {
        if (hasErrors) return;
        const seq = generateInternalSequence(mode, params, count);
        setSequence(seq);
        setChiResult(null);
        setDieharderResults([]);
    };

    const handleStats = (type: 'chi' | 'full') => {
        if (hasErrors) return;
        const seq = generateInternalSequence(mode, params, Math.max(testLimit, 1000));
        if (type === 'chi') {
            setChiResult(performChiSquared(seq));
        } else {
            setDieharderResults(performDieharder(seq));
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(sequence.join(', '));
        setCopyStatus('Copied!');
        setTimeout(() => setCopyStatus('Copy'), 2000);
    };

    const renderChaosControls = () => {
        let presets: {name: string, [key: string]: string}[] = [];
        if (mode === 'henon') presets = henonPresets;
        else if (mode === 'ikeda') presets = ikedaPresets;
        
        if (presets.length === 0) return null;

        return (
             <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
                 <div className="pointer-events-auto flex gap-2">
                     {presets.map(p => (
                         <button 
                            key={p.name}
                            onClick={() => {
                                const newP = {...formParams};
                                Object.keys(p).forEach(k => {
                                    if(k !== 'name' && k !== 'desc') newP[k as keyof FormParams] = p[k];
                                });
                                setFormParams(newP);
                            }}
                            className="text-[10px] bg-purple-900/80 hover:bg-purple-800 text-white px-3 py-1.5 rounded border border-purple-500/30 backdrop-blur-md shadow-lg transition-all"
                            title={p.desc}
                         >
                            Load {p.name}
                         </button>
                     ))}
                 </div>
             </div>
        );
    };

    const renderInputsForMode = () => {
        const keys = getActiveKeys(mode);
        
        let presets: LfsrPreset[] = [];
        if (mode === 'lfsr8') presets = lfsr8Presets;
        else if (mode === 'lfsr') presets = lfsr16Presets;
        else if (mode === 'lfsr32') presets = lfsr32Presets;
        else if (mode === 'lfsr64') presets = lfsr64Presets;
        else if (mode === 'xorshift') presets = xorshiftPresets;

        return (
            <>
                {presets.length > 0 && (
                     <div className="col-span-1 sm:col-span-2 xl:col-span-4 mb-2">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 block">Quick Presets</label>
                        <div className="flex flex-wrap gap-2">
                            {presets.map(p => (
                                <button
                                    key={p.name}
                                    onClick={() => handleRawSetParam('hexTap', p.tap)}
                                    className="bg-slate-700/50 hover:bg-slate-600 text-xs text-slate-300 border border-slate-600 px-2 py-1 rounded transition-colors"
                                    title={p.desc}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                     </div>
                )}

                {keys.map(key => {
                    let label: string = key;
                    let type: 'int' | 'float' | 'hex' | 'posInt' = 'int';
                    let placeholder = '';
                    
                    if (key === 'a') { label = 'Multiplier (a)'; type = 'int'; }
                    else if (key === 'c') { label = 'Increment (c)'; type = 'int'; }
                    else if (key === 'm') { label = 'Modulus (m)'; type = 'posInt'; }
                    else if (key === 'seed') { label = 'Seed / Initial State'; type = 'int'; }
                    else if (key === 'seed2') { label = 'Seed 2 / Stream ID'; type = 'int'; }
                    else if (key === 'seed3') { label = 'Seed 3'; type = 'int'; }
                    else if (key === 'seed4') { label = 'Seed 4'; type = 'int'; }
                    else if (key === 'hexTap') { label = 'Tap / Polynomial (Hex)'; type = 'hex'; placeholder = 'e.g. B400'; }
                    else if (key === 'stringSeed') { label = 'String Seed'; type = 'int'; }
                    else if (key === 'floatSeed') { label = 'Initial X (0.0 - 1.0)'; type = 'float'; }
                    else if (key === 'paramR') { label = 'Control Parameter (r)'; type = 'float'; }
                    else if (key === 'paramA') { label = 'Parameter A'; type = 'float'; }
                    else if (key === 'paramB') { label = 'Parameter B'; type = 'float'; }
                    else if (key === 'paramC') { label = 'Parameter C'; type = 'float'; }
                    else if (key === 'paramDt') { label = 'Time Step (dt)'; type = 'float'; }
                    else if (key === 'fibSeed1') { label = 'F(n-2)'; type = 'int'; }
                    else if (key === 'fibSeed2') { label = 'F(n-1)'; type = 'int'; }

                    return (
                        <div key={key} className="relative group">
                            <div className="flex justify-between mb-1">
                                <label className="text-xs font-bold text-slate-400 group-focus-within:text-purple-400 transition-colors capitalize">{label}</label>
                                {['a', 'c', 'm', 'seed', 'seed2', 'seed3', 'seed4', 'hexTap', 'stringSeed', 'floatSeed', 'paramR', 'paramA', 'paramB', 'paramC', 'paramDt'].includes(key) && (
                                     <button onClick={() => handleSingleRandomize(key)} className="text-[10px] text-slate-600 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Randomize this field">🎲</button>
                                )}
                            </div>
                            <input
                                type="text"
                                value={formParams[key]}
                                onChange={(e) => {
                                    if (key === 'stringSeed') handleRawSetParam(key, e.target.value);
                                    else handleInputChange(key, e.target.value, type);
                                }}
                                placeholder={placeholder}
                                className={`w-full bg-slate-900 border ${currentErrors[key] ? 'border-red-500' : 'border-slate-700'} focus:border-purple-500 text-white px-3 py-2 rounded-lg outline-none font-mono transition-colors text-sm`}
                            />
                            {currentErrors[key] && <span className="absolute -bottom-4 left-0 text-[9px] text-red-400">{currentErrors[key]}</span>}
                        </div>
                    );
                })}
            </>
        );
    };

    return (
        <div className="glass-panel p-6 rounded-xl border-t border-b border-purple-500/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="relative z-10">
                <h2 className="text-2xl font-black text-white mb-6 flex items-center tracking-tight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">GENERATOR LAB</span>
                </h2>

                <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-700/50 pb-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => handleCategoryChange(cat)}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                                activeCategory === cat ? 'bg-slate-800 text-purple-400 border border-purple-500/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
                    {filteredAlgorithms.map(algo => (
                        <button
                            key={algo.id}
                            onClick={() => handleModeChange(algo.id)}
                            className={`px-3 py-3 rounded-lg text-xs font-bold transition-all text-left border relative overflow-hidden group shadow-sm flex flex-col justify-center min-h-[3.5rem] ${
                                mode === algo.id ? 'bg-purple-600 border-purple-400 text-white shadow-purple-900/50' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-purple-500/50 hover:text-slate-200'
                            }`}
                        >
                            <span className="relative z-10 truncate w-full">{algo.name}</span>
                            {mode === algo.id && <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-indigo-600 opacity-100 z-0"></div>}
                        </button>
                    ))}
                </div>

                {currentAlgo && (
                    <div className="bg-slate-900/60 border-l-4 border-cyan-500 p-5 rounded-r-lg mb-8 flex flex-col sm:flex-row justify-between items-start gap-4 shadow-inner relative">
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-lg mb-2 flex flex-wrap items-center gap-2">
                                {currentAlgo.name}
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-cyan-400 border border-slate-700 uppercase tracking-widest">{currentAlgo.category}</span>
                            </h3>
                            <p className="text-slate-300 text-sm leading-relaxed">{currentAlgo.desc}</p>
                            
                            <button 
                                onClick={() => setShowDetails(!showDetails)}
                                className="mt-3 text-[10px] font-bold uppercase tracking-widest text-purple-400 hover:text-purple-300 flex items-center"
                            >
                                {showDetails ? 'Hide Details' : 'Show Key Characteristics'}
                                <svg className={`w-3 h-3 ml-1 transform transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                        </div>
                        <a href={currentAlgo.wiki} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-cyan-500 hover:text-cyan-300 transition-colors text-xs font-mono border border-cyan-900/50 bg-cyan-950/30 px-3 py-2 rounded hover:border-cyan-500">
                            Wiki
                        </a>

                        {showDetails && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-700 p-4 rounded-lg shadow-xl z-20 animation-fade-in text-left">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h5 className="text-[10px] text-emerald-400 uppercase font-bold mb-2 border-b border-emerald-900/50 pb-1">Characteristics</h5>
                                        <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                                            {currentAlgo.characteristics?.map((c, i) => <li key={i}>{c}</li>) || <li className="italic text-slate-500">No data available</li>}
                                        </ul>
                                    </div>
                                    <div>
                                        <h5 className="text-[10px] text-red-400 uppercase font-bold mb-2 border-b border-red-900/50 pb-1">Limitations</h5>
                                        <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                                            {currentAlgo.limitations?.map((l, i) => <li key={i}>{l}</li>) || <li className="italic text-slate-500">No data available</li>}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeCategory === 'Chaotic' && (
                    <div className="mb-8 relative bg-slate-950 rounded-xl border border-slate-800 p-1 overflow-hidden h-72">
                         <div className="absolute top-3 left-4 z-10 pointer-events-none flex gap-2">
                            <label className="text-xs font-bold text-purple-300 bg-slate-900/80 px-2 py-1 rounded backdrop-blur-sm border border-purple-500/20">
                                {mode === 'lorenz' ? 'Phase Space (X vs Z)' : mode === 'rossler' ? 'Phase Space (X vs Y)' : 'Visualization'}
                            </label>
                         </div>
                         <div className="absolute top-3 right-4 z-10 flex gap-1 bg-slate-800/80 rounded-lg p-1 border border-slate-700 backdrop-blur-sm shadow-sm">
                            <button onClick={handleZoomOut} className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors" title="Zoom Out">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                            </button>
                            <button onClick={() => resetView(mode)} className="px-2 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors border-l border-r border-slate-700/50 mx-1">
                                Reset
                            </button>
                            <button onClick={handleZoomIn} className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors" title="Zoom In">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                            </button>
                         </div>
                         
                         {renderChaosControls()}

                        <canvas 
                            ref={canvasRef} 
                            width={800} 
                            height={288} 
                            className="w-full h-full rounded-lg bg-[#050b14] cursor-crosshair touch-none"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseLeave}
                        />
                        <div className="absolute bottom-1 right-2 text-[9px] text-slate-600 pointer-events-none">
                            Drag to Pan { (mode==='logistic' || mode==='tent') && "• Click to Set Parameter" }
                        </div>
                    </div>
                )}

                <div className="bg-slate-800/30 rounded-xl p-8 border border-slate-700/50 mb-6">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-700/50 pb-2">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configuration Variables</h4>
                        <div className="flex gap-3">
                            <button onClick={() => setDefaultParams(mode)} className="text-slate-400 hover:text-slate-200 text-[10px] uppercase font-bold border border-slate-600/30 px-3 py-1.5 rounded-full hover:bg-slate-700/50 transition-all flex items-center gap-1">
                                <span>↺</span> Defaults
                            </button>
                            <button onClick={randomizeCurrent} className="text-cyan-400 hover:text-cyan-200 text-[10px] uppercase font-bold border border-cyan-500/30 px-3 py-1.5 rounded-full hover:bg-cyan-900/20 transition-all flex items-center gap-1">
                                <span>⟳</span> Randomize All
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-6">
                        {renderInputsForMode()}

                        <div className="col-span-1 sm:col-span-2 xl:col-span-4 border-t border-slate-700/50 pt-8 mt-2">
                            <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-900/40 p-4 rounded-lg border border-slate-800">
                                <div className="w-full flex-1">
                                    <label className="block text-slate-400 text-xs font-bold mb-2">Display Length (3 - 500)</label>
                                    <input type="range" min="3" max="500" value={countStr} onChange={e => setCountStr(e.target.value)} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                                </div>
                                <div className="w-full sm:w-24">
                                    <input type="text" inputMode="numeric" value={countStr} onChange={e => {
                                        if (/^\d*$/.test(e.target.value)) setCountStr(e.target.value);
                                    }} className={`w-full bg-slate-900/50 border ${currentErrors['count'] ? 'border-red-500' : 'border-slate-700/50'} text-white px-3 py-2 rounded-lg text-center font-bold text-lg font-mono`} />
                                    {currentErrors['count'] && <span className="text-red-500 text-[10px] block mt-1 text-center">{currentErrors['count']}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                    <button onClick={handleGenerate} className="w-full sm:w-auto group relative bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-purple-900/30 overflow-hidden">
                        Generate Sequence
                    </button>
                </div>

                {sequence.length > 0 && (
                    <div className="bg-slate-900/80 p-5 rounded-lg border border-slate-700 shadow-xl relative group animation-fade-in">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 pb-2 border-b border-slate-800 gap-4">
                            <h3 className="text-xs text-purple-400 uppercase tracking-widest font-bold flex items-center">
                                <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                                Output Sequence ({sequence.length})
                            </h3>
                            <div className="flex flex-col sm:flex-row gap-4 items-center w-full xl:w-auto">
                                <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded border border-slate-700 relative">
                                    <label className="text-[10px] text-slate-400 uppercase font-bold pl-1">Test Samples:</label>
                                    <input type="text" inputMode="numeric" value={testLimitStr} onChange={e => {
                                         if (/^\d*$/.test(e.target.value)) setTestLimitStr(e.target.value);
                                    }} className={`bg-slate-900 text-white text-xs border ${currentErrors['testLimit'] ? 'border-red-500' : 'border-slate-600'} rounded px-2 py-1 w-20 text-center focus:outline-none font-mono`} />
                                    {currentErrors['testLimit'] && (
                                        <div className="absolute top-full left-0 mt-1 w-40 bg-red-900 text-white text-[10px] p-1 rounded z-50">
                                            {currentErrors['testLimit']}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                    <button onClick={() => handleStats('chi')} className="bg-indigo-900/50 border border-indigo-700/50 text-xs text-indigo-300 px-3 py-1.5 rounded hover:bg-indigo-800/50">Chi-Squared</button>
                                    <button onClick={() => handleStats('full')} className="bg-teal-900/50 border border-teal-700/50 text-xs text-teal-300 px-3 py-1.5 rounded hover:bg-teal-800/50">Extended Test</button>
                                    <button onClick={copyToClipboard} className="bg-slate-700 hover:bg-slate-600 text-xs text-white px-3 py-1.5 rounded min-w-[70px]">{copyStatus}</button>
                                </div>
                            </div>
                        </div>

                        {chiResult && (
                            <div className={`mb-4 px-4 py-3 rounded-md text-xs flex justify-between items-center font-mono border shadow-sm ${chiResult.passed ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300' : 'bg-red-950/50 border-red-500/50 text-red-300'}`}>
                                <span className="font-bold">{chiResult.passed ? 'PASSED Frequency Test' : 'FAILED Frequency Test'}</span>
                                <span className="opacity-75">χ² = {chiResult.score.toFixed(2)} (Crit: 16.92)</span>
                            </div>
                        )}
                        
                        {dieharderResults.length > 0 && (
                            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                {dieharderResults.map(res => (
                                    <div key={res.name} className={`p-3 rounded border bg-slate-800/50 flex flex-col justify-between h-full ${res.status === 'PASS' ? 'border-emerald-500/40' : res.status === 'FAIL' ? 'border-red-500/40' : 'border-yellow-500/40'}`}>
                                        <div>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-xs text-slate-300 truncate pr-1" title={res.name}>{res.name}</span>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold flex-shrink-0 ${res.status === 'PASS' ? 'bg-emerald-900 text-emerald-300' : res.status === 'FAIL' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>{res.status}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 leading-tight mb-2 min-h-[2.5em]">{res.desc}</p>
                                        </div>
                                        <div className="text-right text-[10px] font-mono opacity-80 border-t border-slate-700/50 pt-1">
                                            {res.displayValue || `Score: ${res.score.toFixed(4)}`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="font-mono text-purple-300 break-all text-sm leading-relaxed max-h-60 overflow-y-auto bg-slate-950/50 p-4 rounded border border-slate-800/50">
                            {sequence.join(', ')}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Playground;