import { TestResult } from '../types';

export interface GeneratorParams {
  a?: number;
  c?: number;
  m?: number;
  seed?: number;
  seed2?: number;
  seed3?: number;
  seed4?: number;
  stringSeed?: string;
  hexTap?: string;
  fibSeed1?: number;
  fibSeed2?: number;
  floatSeed?: number;
  paramR?: number; // r or mu
  paramA?: number;
  paramB?: number;
  paramC?: number;
  paramDt?: number;
}

export function generateInternalSequence(mode: string, params: GeneratorParams, limit: number): number[] {
  const result: number[] = [];
  
  // Destructure with defaults to avoid null checks everywhere
  const {
    a: aVal = 0, c: cVal = 0, m: mVal = 1,
    seed: seedVal = 0, seed2: seedVal2 = 0, seed3: seedVal3 = 0, seed4: seedVal4 = 0,
    hexTap = '', stringSeed = '',
    fibSeed1: f1Val = 0, fibSeed2: f2Val = 0,
    floatSeed: floatSeedVal = 0.5,
    paramR: pR = 0, paramA: pA = 0, paramB: pB = 0, paramC: pC = 0, paramDt: pDt = 0
  } = params;

  try {
    if (['lcg', 'randu', 'zx81', 'nr', 'minstd', 'carbon', 'ggn'].includes(mode)) {
        let current = seedVal;
        for (let i = 0; i < limit; i++) {
          result.push(current);
          const safeM = mVal === 0 ? 1 : mVal;
          const next = (BigInt(aVal) * BigInt(current) + BigInt(cVal)) % BigInt(safeM);
          current = Number(next);
        }
    }
    else if (mode === 'middle-square') {
        let current = seedVal;
        for(let i=0; i<limit; i++) {
            result.push(current);
            const sq = BigInt(current) * BigInt(current);
            const s = sq.toString().padStart(8, '0');
            // Take middle 4 digits of 8 digit string (indices 2,3,4,5)
            // If length > 8, take from middle. Simplified for standard 4-digit input.
            const len = s.length;
            const mid = Math.floor(len / 2);
            // Attempt to take 4 digits
            let start = mid - 2;
            if (start < 0) start = 0;
            const sub = s.substr(start, 4);
            current = parseInt(sub || '0', 10);
        }
    }
    else if (mode === 'wichmann-hill') {
        let s1 = seedVal || 1;
        let s2 = seedVal2 || 1;
        let s3 = seedVal3 || 1;
        if(s1===0) s1=1; if(s2===0) s2=1; if(s3===0) s3=1;

        for(let i=0; i<limit; i++) {
            s1 = (171 * s1) % 30269;
            s2 = (172 * s2) % 30307;
            s3 = (170 * s3) % 30323;
            // Result in [0,1)
            const r = (s1/30269.0 + s2/30307.0 + s3/30323.0) % 1.0;
            result.push(Number(r.toFixed(6)));
        }
    }
    else if (mode === 'pcg32') {
        let state = BigInt(seedVal >>> 0);
        let inc = BigInt(seedVal2 >>> 0);
        inc = (inc << 1n) | 1n; // Make odd

        for (let i = 0; i < limit; i++) {
            const oldState = state;
            state = (oldState * 6364136223846793005n + inc) & 0xFFFFFFFFFFFFFFFFn;
            const xorshifted = Number(((oldState >> 18n) ^ oldState) >> 27n) >>> 0;
            const rot = Number(oldState >> 59n);
            const ans = (xorshifted >>> rot) | (xorshifted << ((32 - rot) & 31));
            result.push(ans >>> 0);
        }
    }
    else if (mode === 'sfc32') {
        let a = seedVal >>> 0, b = seedVal2 >>> 0, c = seedVal3 >>> 0, d = seedVal4 >>> 0;
        for (let i = 0; i < limit; i++) {
            const tmp = (a + b + d) >>> 0;
            d = (d + 1) >>> 0;
            a = b ^ (b >>> 9);
            b = (c + (c << 3)) >>> 0;
            c = ((c << 21) | (c >>> 11)); 
            c = (c + tmp) >>> 0;
            result.push(tmp);
        }
    }
    else if (mode === 'wyrand') {
        let seed = BigInt(seedVal) || 0n;
        for (let i = 0; i < limit; i++) {
            seed = (seed + 0xa0761d6478bd642fn) & 0xFFFFFFFFFFFFFFFFn;
            let t = seed * (seed ^ 0xe7037ed1a0b428dbn);
            t &= 0xFFFFFFFFFFFFFFFFn; // Enforce 64-bit
            const res = (t >> 64n) ^ t;
            result.push(Number(res & 0xFFFFFFFFn));
        }
    }
    else if (mode === 'kiss') {
        // KISS 99 implementation
        let x = seedVal || 12345;
        let y = seedVal2 || 34221;
        let z = seedVal3 || 4321;
        let w = seedVal4 || 6969;
        let c = 0; // carry for MWC part if needed, simpler version assumes z,w as MWC parts

        for (let i = 0; i < limit; i++) {
            // LCG
            x = (69069 * x + 12345) >>> 0;
            
            // Xorshift
            y ^= (y << 13);
            y ^= (y >>> 17);
            y ^= (y << 5);
            y >>>= 0;

            // MWC parts
            // z = 36969 * (z & 65535) + (z >> 16)
            z = (36969 * (z & 0xFFFF) + (z >>> 16)) >>> 0;
            // w = 18000 * (w & 65535) + (w >> 16)
            w = (18000 * (w & 0xFFFF) + (w >>> 16)) >>> 0;

            const res = (x + y + ((z << 16) >>> 0) + w) >>> 0;
            result.push(res);
        }
    }
    else if (mode === 'blum-blum-shub') {
        let x = BigInt(seedVal || 3);
        const M = BigInt(mVal || 209);
        for(let i=0; i<limit; i++) {
            x = (x * x) % M;
            result.push(Number(x));
        }
    }
    else if (mode === 'lagged-fib') {
        // Simple Additive Lagged Fibonacci: S[n] = (S[n-j] + S[n-k]) mod m
        // reusing 'a' as j, 'c' as k, 'm' as m. 'seed' is initial seed for a simple LCG to fill buffer.
        const j = aVal || 7;
        const k = cVal || 10;
        const maxLag = Math.max(j, k);
        const mod = mVal || 2147483647;
        
        // Fill buffer
        let buffer: number[] = [];
        let s = seedVal;
        for(let i=0; i<=maxLag; i++) {
            s = (1664525 * s + 1013904223) >>> 0;
            buffer.push(s % mod);
        }
        
        for(let i=0; i<limit; i++) {
            const out = (buffer[buffer.length - j] + buffer[buffer.length - k]) % mod;
            buffer.push(out);
            buffer.shift(); // keep size manageable? Or just index.
            // keeping buffer size small:
            if(buffer.length > maxLag + 100) buffer = buffer.slice(buffer.length - maxLag - 1);
            result.push(out);
        }
    }
    else if (mode === 'tausworthe') {
        let s1 = seedVal, s2 = seedVal2, s3 = seedVal3;
        for(let i=0; i<limit; i++) {
           const b1 = (((s1 << 13) ^ s1) >>> 19);
           s1 = (((s1 & 0xFFFFFFFE) << 12) ^ b1);
           const b2 = (((s2 << 2) ^ s2) >>> 25);
           s2 = (((s2 & 0xFFFFFFF8) << 4) ^ b2);
           const b3 = (((s3 << 3) ^ s3) >>> 11);
           s3 = (((s3 & 0xFFFFFFF0) << 17) ^ b3);
           result.push((s1 ^ s2 ^ s3) >>> 0);
        }
    }
    else if (mode === 'mt19937') {
        // Mersenne Twister implementation
        const n = 624;
        const m = 397;
        const matrixA = 0x9908b0df;
        const upperMask = 0x80000000;
        const lowerMask = 0x7fffffff;
        const mt = new Array(n);
        let mti = n + 1;

        let s = seedVal >>> 0;
        mt[0] = s;
        for (mti = 1; mti < n; mti++) {
            s = mt[mti - 1] ^ (mt[mti - 1] >>> 30);
            mt[mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253) + mti;
            mt[mti] >>>= 0;
        }

        for (let k = 0; k < limit; k++) {
            if (mti >= n) {
                let kk;
                for (kk = 0; kk < n - m; kk++) {
                    const y = (mt[kk] & upperMask) | (mt[kk + 1] & lowerMask);
                    mt[kk] = mt[kk + m] ^ (y >>> 1) ^ ((y & 1) ? matrixA : 0);
                }
                for (; kk < n - 1; kk++) {
                    const y = (mt[kk] & upperMask) | (mt[kk + 1] & lowerMask);
                    mt[kk] = mt[kk + (m - n)] ^ (y >>> 1) ^ ((y & 1) ? matrixA : 0);
                }
                const y = (mt[n - 1] & upperMask) | (mt[0] & lowerMask);
                mt[n - 1] = mt[m - 1] ^ (y >>> 1) ^ ((y & 1) ? matrixA : 0);
                mti = 0;
            }

            let y = mt[mti++];
            y ^= (y >>> 11);
            y ^= (y << 7) & 0x9d2c5680;
            y ^= (y << 15) & 0xefc60000;
            y ^= (y >>> 18);
            result.push(y >>> 0);
        }
    }
    else if (mode === 'lfsr8') {
       let lfsr = seedVal & 0xFF;
       const tap = parseInt(hexTap || '1D', 16);
       for(let i=0; i<limit; i++) {
          result.push(lfsr);
          const lsb = lfsr & 1;
          lfsr >>= 1;
          if (lsb) lfsr ^= tap;
       }
    }
    else if (mode === 'lfsr' || mode === 'lfsr32') {
       let lfsr = seedVal;
       const tapStr = hexTap || (mode === 'lfsr' ? 'B400' : '80200003');
       const tap = parseInt(tapStr, 16);
       for(let i=0; i<limit; i++) {
          result.push(lfsr >>> 0);
          const lsb = lfsr & 1;
          lfsr >>>= 1;
          if (lsb) lfsr ^= tap;
       }
    }
    else if (mode === 'lfsr64') {
       let lfsr = BigInt(stringSeed || "12345");
       const tapStr = hexTap || "D800000000000000";
       const tap = BigInt("0x" + tapStr);
       for(let i=0; i<limit; i++) {
          result.push(Number(lfsr & 0xFFFFFFFFn));
          const lsb = lfsr & 1n;
          lfsr >>= 1n;
          if (lsb) lfsr ^= tap;
       }
    }
    else if (mode === 'xorshift') {
        let x = seedVal || 123456789;
        for(let i=0; i<limit; i++) {
           x ^= x << 13;
           x ^= x >> 17;
           x ^= x << 5;
           result.push(x >>> 0);
        }
    }
    else if (mode === 'xoroshiro128plus') {
        let s0 = BigInt(seedVal || 123456789);
        let s1 = BigInt(seedVal2 || 987654321);
        // Ensure non-zero state
        if (s0 === 0n && s1 === 0n) s1 = 1n;
        
        for(let i=0; i<limit; i++) {
           const r = (s0 + s1) & 0xFFFFFFFFFFFFFFFFn;
           result.push(Number(r & 0xFFFFFFFFn)); // Lower 32 bits

           s1 ^= s0;
           // rotl(s0, 24) ^ s1 ^ (s1 << 16)
           s0 = ((s0 << 24n) & 0xFFFFFFFFFFFFFFFFn | (s0 >> 40n)) ^ s1 ^ ((s1 << 16n) & 0xFFFFFFFFFFFFFFFFn);
           // rotl(s1, 37)
           s1 = ((s1 << 37n) & 0xFFFFFFFFFFFFFFFFn | (s1 >> 27n));
        }
    }
    else if (mode === 'xorshift1024') {
        let z = BigInt(seedVal || 123456789);
        const s = new BigUint64Array(16);
        for(let i=0; i<16; i++) {
           z = (z + 0x9e3779b97f4a7c15n) & 0xFFFFFFFFFFFFFFFFn;
           let x = z;
           x = ((x ^ (x >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xFFFFFFFFFFFFFFFFn;
           x = ((x ^ (x >> 27n)) * 0x94d049bb133111ebn) & 0xFFFFFFFFFFFFFFFFn;
           s[i] = (x ^ (x >> 31n)) & 0xFFFFFFFFFFFFFFFFn;
        }
        let p = 0;
        for(let i=0; i<limit; i++) {
           const s0 = s[p];
           p = (p + 1) & 15;
           let s1 = s[p];
           s1 ^= (s1 << 31n) & 0xFFFFFFFFFFFFFFFFn; 
           s[p] = (s1 ^ s0 ^ (s1 >> 11n) ^ (s0 >> 30n)) & 0xFFFFFFFFFFFFFFFFn;
           const val = (s[p] * 1181783497276652981n) & 0xFFFFFFFFFFFFFFFFn;
           result.push(Number(val & 0xFFFFFFFFn));
        }
    }
    else if (mode === 'splitmix') {
        let x = BigInt(seedVal || 123456789);
        for(let i=0; i<limit; i++) {
           x = (x + BigInt("0x9E3779B97F4A7C15")) & 0xFFFFFFFFFFFFFFFFn;
           let z = x;
           z = (z ^ (z >> 30n)) * BigInt("0xBF58476D1CE4E5B9");
           z = (z ^ (z >> 27n)) * BigInt("0x94D049BB133111EB");
           z = z ^ (z >> 31n);
           result.push(Number(z & 0xFFFFFFFFn));
        }
    }
    else if (mode === 'mulberry') {
        let state = seedVal || 12345;
        for(let i=0; i<limit; i++) {
           state = (state + 0x6D2B79F5) | 0;
           let t = Math.imul(state ^ (state >>> 15), 1 | state);
           t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
           result.push((t ^ (t >>> 14)) >>> 0);
        }
    }
    else if (mode === 'henon') {
        let x = floatSeedVal;
        let y = 0.1; 
        const a = pA || 1.4;
        const b = pB || 0.3;
        for(let i=0; i<limit; i++) {
            result.push(Number(x.toFixed(5)));
            const nextX = 1 - a * x * x + y;
            const nextY = b * x;
            x = nextX;
            y = nextY;
        }
    }
    else if (mode === 'ikeda') {
        let x = floatSeedVal;
        let y = 0.1;
        const u = pA || 0.9;
        for(let i=0; i<limit; i++) {
            result.push(Number(x.toFixed(5)));
            const t = 0.4 - 6 / (1 + x*x + y*y);
            const nextX = 1 + u * (x * Math.cos(t) - y * Math.sin(t));
            const nextY = u * (x * Math.sin(t) + y * Math.cos(t));
            x = nextX;
            y = nextY;
        }
    }
    else if (mode === 'lorenz') {
        let x = floatSeedVal;
        let y = 1.0, z = 1.0;
        const sigma = pA || 10.0;
        const rho = pB || 28.0;
        const beta = pC || 2.666;
        const dt = pDt || 0.01;
        
        for(let i=0; i<limit; i++) {
            result.push(Number(x.toFixed(4)));
            const dx = sigma * (y - x);
            const dy = x * (rho - z) - y;
            const dz = x * y - beta * z;
            x += dx * dt;
            y += dy * dt;
            z += dz * dt;
        }
    }
    else if (mode === 'rossler') {
        let x = floatSeedVal;
        let y = 1.0, z = 1.0;
        const a = pA || 0.2;
        const b = pB || 0.2;
        const c = pC || 5.7;
        const dt = pDt || 0.05;
        
        for(let i=0; i<limit; i++) {
            result.push(Number(x.toFixed(4)));
            const dx = -y - z;
            const dy = x + a * y;
            const dz = b + z * (x - c);
            x += dx * dt;
            y += dy * dt;
            z += dz * dt;
        }
    }
    else if (['logistic', 'tent'].includes(mode)) {
        let x = floatSeedVal;
        const param = pR || (mode === 'logistic' ? 3.99 : 1.99);
        for(let i=0; i<limit; i++) {
           result.push(Number(x.toFixed(5)));
           if (mode === 'logistic') x = param * x * (1 - x);
           else x = (x < 0.5) ? param * x : param * (1 - x);
        }
    }
    else if (mode === 'fib') {
        let f1 = f1Val;
        let f2 = f2Val;
        result.push(f1);
        if (limit > 1) result.push(f2);
        for(let i=2; i<limit; i++) {
           const next = f1 + f2;
           result.push(next);
           f1 = f2;
           f2 = next;
        }
    }
    else {
        // Fallback
        for(let i=0; i<limit; i++) {
           result.push(Math.floor(Math.random() * 100));
        }
    }
  } catch (e) {
    console.error(e);
  }
  
  return result;
}

export function performChiSquared(seq: number[]) {
  if (!seq.length) return null;
  
  const bins = 10;
  const observed = new Array(bins).fill(0);
  const isFloat = seq.some(n => !Number.isInteger(n));
  
  for (const val of seq) {
      let binIndex = 0;
      if (isFloat) {
          binIndex = Math.floor((Math.abs(val) % 1) * bins);
      } else {
          binIndex = Math.abs(val) % 10;
      }
      if (binIndex < 0) binIndex = 0;
      if (binIndex >= bins) binIndex = bins - 1;
      observed[binIndex]++;
  }
  
  const expected = seq.length / bins;
  let chiSq = 0;
  for (let i = 0; i < bins; i++) {
      chiSq += Math.pow(observed[i] - expected, 2) / expected;
  }
  
  return {
      score: chiSq,
      passed: chiSq < 16.92
  };
}

export function performDieharder(seq: number[]) {
  const n = seq.length;
  if (n < 10) return [];
  
  const results: TestResult[] = [];
  const min = Math.min(...seq);
  const max = Math.max(...seq);
  const range = (max - min) || 1;
  const normalized = seq.map(x => (x - min) / range);

  // 1. Monobit
  let ones = 0;
  for(const val of normalized) {
      if (val >= 0.5) ones++;
  }
  const prop = ones / n;
  const monobitScore = Math.abs((prop - 0.5) / (0.5 / Math.sqrt(n)));
  results.push({
      name: 'Monobit (Balance)',
      score: monobitScore,
      status: monobitScore < 1.96 ? 'PASS' : (monobitScore < 2.576 ? 'SUSPECT' : 'FAIL'),
      desc: 'Checks 0/1 balance. Z-score < 1.96 passes.'
  });
  
  // 2. Runs Test
  let runs = 1;
  for(let i=1; i<n; i++) {
      if ((seq[i] > seq[i-1]) !== (seq[i-1] > seq[i-2])) runs++;
  }
  const expectedRuns = (2 * n - 1) / 3;
  const runsVar = (16 * n - 29) / 90;
  const runsScore = Math.abs(runs - expectedRuns) / Math.sqrt(runsVar);
  results.push({
      name: 'Runs (Up/Down)',
      score: runsScore,
      status: runsScore < 2 ? 'PASS' : (runsScore < 3 ? 'SUSPECT' : 'FAIL'),
      desc: 'Checks sequential patterns. Z-score < 2 passes.'
  });

  // 3. Monte Carlo Pi
  let insideCircle = 0;
  const pairs = Math.floor(n / 2);
  for(let i=0; i<pairs; i++) {
      const x = normalized[2*i];
      const y = normalized[2*i+1];
      if (x*x + y*y <= 1) insideCircle++;
  }
  const piEst = 4 * (insideCircle / pairs);
  const piError = Math.abs(Math.PI - piEst);
  const piScore = (piError / Math.PI) * 100;
  results.push({
      name: 'Monte Carlo Pi',
      score: piScore,
      displayValue: `π ≈ ${piEst.toFixed(4)}`,
      status: piScore < 2.0 ? 'PASS' : (piScore < 5.0 ? 'SUSPECT' : 'FAIL'),
      desc: `Geometric test. Est: ${piEst.toFixed(4)}. Err: ${piScore.toFixed(2)}%`
  });

  // 4. Autocorrelation
  const mean = normalized.reduce((a,b) => a+b, 0) / n;
  let num = 0;
  let den = 0;
  for(let i=0; i<n-1; i++) {
      num += (normalized[i] - mean) * (normalized[i+1] - mean);
      den += Math.pow(normalized[i] - mean, 2);
  }
  const correlation = den === 0 ? 1 : num / den;
  const confInterval = 1.96 / Math.sqrt(n);
  const absCorr = Math.abs(correlation);
  results.push({
      name: 'Autocorrelation',
      score: absCorr,
      status: absCorr < confInterval ? 'PASS' : (absCorr < confInterval * 1.5 ? 'SUSPECT' : 'FAIL'),
      desc: `Lag-1 correlation: ${correlation.toFixed(4)}. Ideal: 0.`
  });
  
  return results;
}