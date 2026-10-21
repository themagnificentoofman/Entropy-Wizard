export function buildAnalysisRequest(sequence) {
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
    type: "OBJECT",
    properties: {
      candidates: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            algorithm: { type: "STRING", description: "Specific name of the algorithm (e.g., 'LCG (Numerical Recipes)')" },
            confidence: { type: "INTEGER", description: "Confidence score (0-100)" },
            parameters: { type: "STRING", description: "Exact recovered parameters (e.g., 'a=1664525, c=1013904223, m=2^32')" },
            explanation: { type: "STRING", description: "Mathematical derivation or reasoning for the match" }
          },
          required: ["algorithm", "confidence", "parameters", "explanation"]
        },
        description: "Top 3 potential algorithm matches with recovered parameters"
      },
      nextValues: { 
        type: "ARRAY", 
        items: { type: "NUMBER" },
        description: "The next 3 predicted numbers"
      }
    },
    required: ["candidates", "nextValues"]
  };

return { contents: [{role: "user", parts: [{text: prompt}]}], generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.1, maxOutputTokens: 4096 } };
}
