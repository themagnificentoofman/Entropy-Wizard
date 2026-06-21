import { GoogleGenAI, Type } from '@google/genai';
import { AnalysisResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSequence = async (sequence: number[]): Promise<AnalysisResult> => {
  if (sequence.length < 3) {
    throw new Error("Provide at least 3 numbers for analysis.");
  }

  const prompt = `
    You are an expert Cryptanalyst and Mathematician specializing in PRNG reverse-engineering.
    
    INPUT SEQUENCE: [${sequence.join(', ')}]
    
    ### PRIMARY OBJECTIVE
    Identify the exact generator algorithm and RECOVER THE EXACT PARAMETERS (multipliers, moduli, seeds, taps, chaos rates) used.
    
    ### ANALYSIS INSTRUCTIONS
    1. **Parameter Solving (CRITICAL):**
       - **LCG (Linear Congruential):** Attempt to solve the system of linear equations $X_{n+1} = (a X_n + c) \\pmod m$. Determine 'a', 'c', and 'm'. Check if these match known standards (e.g., Numerical Recipes: a=1664525, c=1013904223; Borland: a=22695477; glibc: a=1103515245).
       - **Chaotic Maps:** For floats, solve for the control parameter (e.g., Logistic Map $r = X_{n+1} / (X_n(1-X_n))$). Check for precision artifacts.
       - **LFSR/Shift:** Analyze bitwise patterns. Check for common feedback polynomials.
       
    2. **Algorithm Classification:**
       Consider the following extensive knowledge base:
       
       **Linear & Modular:**
       - LCGs (Standard, Truncated), MLCGs (Lehmer), Combined LCGs (Wichmann-Hill).
       - Inverse Congruential, Hull-Dobell compliant params.
       
       **Bitwise & Shift Register:**
       - Xorshift (32, 64, 128, 1024), Xoroshiro (128+, 256+), XORShift*.
       - LFSR (Galois/Fibonacci), Tausworthe (Taus88), WELL.
       - Mersenne Twister (MT19937), SFMT.
       
       **Chaotic & Nonlinear:**
       - Logistic Map ($rx(1-x)$), Tent Map, Sine Map, Bernoulli Map.
       - Hénon Map, Ikeda Map, Lorenz/Rössler Attractors (sampled).
       
       **Modern & Fast:**
       - PCG Family (Permuted Congruential), SplitMix64.
       - SFC32, Mulberry32, WyRand.
       
       **Historical/Other:**
       - Middle Square, Lagged Fibonacci, Linear Feedback.
       - Digits of Pi/e/Phi, Prime sequences.

    3. **Output Requirements:**
       - Provide the top 3 candidates.
       - **Parameters Field:** MUST contain the recovered mathematical constants (e.g., "a=1664525, c=1013904223, m=2^32"). Do not just say "Standard LCG".
       - **Explanation:** Show the reasoning or mathematical check that confirmed the parameters.

    4. **Prediction:**
       - Calculate the NEXT 3 numbers in the sequence using the recovered parameters of the #1 candidate.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      candidates: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            algorithm: { type: Type.STRING, description: "Specific name of the algorithm (e.g., 'LCG (Numerical Recipes)')" },
            confidence: { type: Type.INTEGER, description: "Confidence score (0-100)" },
            parameters: { type: Type.STRING, description: "Exact recovered parameters (e.g., 'a=1664525, c=1013904223, m=2^32')" },
            explanation: { type: Type.STRING, description: "Mathematical derivation or reasoning for the match" }
          },
          required: ["algorithm", "confidence", "parameters", "explanation"]
        },
        description: "Top 3 potential algorithm matches with recovered parameters"
      },
      nextValues: { 
        type: Type.ARRAY, 
        items: { type: Type.NUMBER },
        description: "The next 3 predicted numbers"
      }
    },
    required: ["candidates", "nextValues"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.1
      }
    });

    return JSON.parse(response.text || '{}') as AnalysisResult;
  } catch (error: any) {
    console.error('Gemini Analysis Error:', error);
    
    let errorMessage = "An unexpected error occurred during analysis.";
    
    // Check for common error properties
    const status = error.status || error.response?.status;
    const msg = error.message || error.toString();

    if (status === 401 || msg.includes('API key')) {
        errorMessage = "Invalid API Key. Please ensure your environment is configured correctly.";
    } else if (status === 429) {
        errorMessage = "Quota exceeded. You are sending requests too quickly. Please wait a moment.";
    } else if (status === 503) {
        errorMessage = "The model is currently overloaded or undergoing maintenance. Try again later.";
    } else if (msg.includes('SAFETY') || msg.includes('blocked')) {
        errorMessage = "The analysis was blocked by safety filters. Please verify your input sequence.";
    } else if (status >= 500) {
        errorMessage = "Gemini service encountered an internal error.";
    } else if (msg.includes('fetch failed')) {
        errorMessage = "Network error. Please check your internet connection.";
    }

    throw new Error(errorMessage);
  }
};
