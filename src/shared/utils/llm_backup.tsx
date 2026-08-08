import { initLlama } from 'llama.rn';
import Constants from 'expo-constants';
// import { Asset } from 'expo-asset';

export type LLMProviderName = 'existing' | 'local';

export interface LLMProvider {
  name: LLMProviderName;
  generate(prompt: string): Promise<string>;
  generateStructured<T = Record<string, unknown>>(prompt: string): Promise<T>;
  loadModel(): Promise<void>;
  unloadModel(): Promise<void>;
}

const defaultPrompt = 'Hello, introduce yourself briefly.';
//const modelPath = '/storage/emulated/0/Android/data/com.tamim2276.pico/files/gguf/gemma-3-1b-it-q4_k_m.gguf';
// const modelAsset = require('../../../assets/gemma_3_1b_it_q4_k_m.gguf');

let localContext: Awaited<ReturnType<typeof initLlama>> | null = null;
let localContextPromise: ReturnType<typeof initLlama> | null = null;
let localModelLoaded = false;

const getConfiguredProviderName = (): LLMProviderName => {
  const configuredValue = Constants.expoConfig?.extra?.llmProvider;
  return configuredValue === 'existing' ? 'existing' : 'local';
};

// async function ensureLocalContext(): Promise<Awaited<ReturnType<typeof initLlama>>> {
//   if (localContext && localModelLoaded) {
//     return localContext;
//   }

//   if (localContextPromise) {
//     return await localContextPromise;
//   }

//   localContextPromise = (async () => {
//     const exists = await RNFS.exists(modelPath);

//     if (!exists) {
//       throw new Error(
//         `GGUF model not found at ${modelPath}. Place the model file there before running the app.`,
//       );
//     }

//     const context = await initLlama({
//       model: modelPath,
//       use_mlock: true,
//       n_ctx: 2048,
//       n_gpu_layers: 0,
//     });

//     localContext = context;
//     localModelLoaded = true;

//     return context;
//   })();

//   try {
//     return await localContextPromise;
//   } catch (error) {
//     console.error('Local LLM Error:', error);
//     localContext = null;
//     localModelLoaded = false;
//     throw error;
//   } finally {
//     localContextPromise = null;
//   }
// }

async function ensureLocalContext() {
  if (localContext && localModelLoaded) {
    return localContext;
  }

  if (localContextPromise) {
    return localContextPromise;
  }

  localContextPromise = (async () => {
    // const asset = Asset.fromModule(modelAsset);

    console.log('Loading bundled GGUF asset...');

    // await asset.downloadAsync();

    // const modelPath = asset.localUri;

    if (!modelPath) {
      throw new Error('Could not resolve bundled GGUF model to a local file.');
    }

    console.log('GGUF model available at:', modelPath);

    localContext = await initLlama({
      model: modelPath,
      use_mlock: true,
      n_ctx: 2048,
      n_gpu_layers: 0,
    });

    localModelLoaded = true;

    return localContext;
  })();

  try {
    return await localContextPromise;
  } catch (error) {
    console.error('Local LLM Error:', error);
    localContext = null;
    localModelLoaded = false;
    throw error;
  } finally {
    localContextPromise = null;
  }
}

export const testGemma = async (prompt: string = defaultPrompt) => {
  try {
    const context = await ensureLocalContext();
    const result = await context.completion({
      messages: [{ role: 'user', content: prompt }],
      n_predict: 160,
      temperature: 0.7,
      stop: ['</s>', '<|eot_id|>', '<|end_of_turn|>'],
    });
    return result.text;
  } catch (error) {
    console.error('Gemma Error:', error);
    throw error;
  }
};

class ExistingProvider implements LLMProvider {
  name: LLMProviderName = 'existing';

  async generate(prompt: string): Promise<string> {
    return testGemma(prompt);
  }

  async generateStructured<T = Record<string, unknown>>(prompt: string): Promise<T> {
    const raw = await this.generate(prompt);
    try {
      return JSON.parse(raw) as T;
    } catch {
      return { raw } as T;
    }
  }

  async loadModel(): Promise<void> {
    await testGemma(defaultPrompt);
  }

  async unloadModel(): Promise<void> {
    localContext = null;
    localModelLoaded = false;
    localContextPromise = null;
  }
}

class LocalProvider implements LLMProvider {
  name: LLMProviderName = 'local';

  async generate(prompt: string): Promise<string> {
    const context = await ensureLocalContext();
    const result = await context.completion({
      messages: [{ role: 'user', content: prompt }],
      n_predict: 160,
      temperature: 0.7,
      stop: ['</s>', '<|eot_id|>', '<|end_of_turn|>'],
    });
    return result.text;
  }

  async generateStructured<T = Record<string, unknown>>(prompt: string): Promise<T> {
    const raw = await this.generate(prompt);
    try {
      return JSON.parse(raw) as T;
    } catch {
      return { raw } as T;
    }
  }

  async loadModel(): Promise<void> {
    await ensureLocalContext();
  }

  async unloadModel(): Promise<void> {
    localContext = null;
    localModelLoaded = false;
    localContextPromise = null;
  }
}

export const createLLMProvider = (): LLMProvider => {
  const providerName = getConfiguredProviderName();
  return providerName === 'existing' ? new ExistingProvider() : new LocalProvider();
};

export const getSelectedLLMProviderName = (): LLMProviderName => getConfiguredProviderName();

export const runLocalLLMSmokeTest = async () => {
  const provider = createLLMProvider();
  await provider.loadModel();
  const result = await provider.generate('Reply with exactly: LOCAL_LLM_WORKS');
  console.log('LOCAL LLM RESULT:', result);
  await provider.unloadModel();
  return result;
};