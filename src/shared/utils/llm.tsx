import { initLlama } from 'llama.rn';
import Constants from 'expo-constants';
import RNFS from 'react-native-fs';

export type LLMProviderName = 'existing' | 'local';

export interface LLMProvider {
  name: LLMProviderName;

  generate(prompt: string): Promise<string>;

  generateStructured<T = Record<string, unknown>>(
    prompt: string,
  ): Promise<T>;

  loadModel(): Promise<void>;

  unloadModel(): Promise<void>;
}

const defaultPrompt = 'Hello, introduce yourself briefly.';

const MODEL_ASSET_NAME = 'gemma_3_1b_it_q4_k_m.gguf';

const MODEL_LOCAL_DIR = `${RNFS.ExternalDirectoryPath}/gguf`;
const MODEL_LOCAL_PATH = `${MODEL_LOCAL_DIR}/${MODEL_ASSET_NAME}`;
const STOP_WORDS = ['</s>', '<|eot_id|>', '<|end_of_turn|>', '<|endoftext|>'];

type LlamaContext = Awaited<ReturnType<typeof initLlama>>;

let localContext: LlamaContext | null = null;
let localContextPromise: ReturnType<typeof initLlama> | null = null;
let localModelLoaded = false;

const getConfiguredProviderName = (): LLMProviderName => {
  const configuredValue = Constants.expoConfig?.extra?.llmProvider;

  return configuredValue === 'existing' ? 'existing' : 'local';
};

async function getLocalModelPath(): Promise<string> {
  const exists = await RNFS.exists(MODEL_LOCAL_PATH);

  if (exists) {
    console.log('GGUF already exists at:', MODEL_LOCAL_PATH);
    return MODEL_LOCAL_PATH;
  }

  throw new Error(
    `GGUF model not found at ${MODEL_LOCAL_PATH}. ` +
      `Copy the model to that path on the device before running Gemma.`,
  );
}

async function ensureLocalContext(): Promise<LlamaContext> {
  if (localContext && localModelLoaded) {
    return localContext;
  }

  if (localContextPromise) {
    return localContextPromise;
  }

  localContextPromise = (async () => {
    console.log('Loading local Gemma model...');

    const modelPath = await getLocalModelPath();

    console.log('Initializing llama.rn with:', modelPath);

    const context = await initLlama({
      model: modelPath,
      use_mlock: true,
      n_ctx: 2048,
      n_gpu_layers: 0,
    });

    localContext = context;
    localModelLoaded = true;

    console.log('Gemma model loaded successfully.');

    return context;
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

export const testGemma = async (
  prompt: string = defaultPrompt,
): Promise<string> => {
  try {
    const context = await ensureLocalContext();

    const result = await context.completion({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      n_predict: 160,
      temperature: 0.7,
      stop: STOP_WORDS,
    });

    console.log('Gemma result text:', result.text);

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

  async generateStructured<T = Record<string, unknown>>(
    prompt: string,
  ): Promise<T> {
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
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      n_predict: 160,
      temperature: 0.7,
      stop: STOP_WORDS,
    });

    console.log('Gemma result text:', result.text);

    return result.text;
  }

  async generateStructured<T = Record<string, unknown>>(
    prompt: string,
  ): Promise<T> {
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

  return providerName === 'existing'
    ? new ExistingProvider()
    : new LocalProvider();
};

export const getSelectedLLMProviderName =
  (): LLMProviderName => getConfiguredProviderName();

export const runLocalLLMSmokeTest = async (): Promise<string> => {
  const provider = createLLMProvider();

  await provider.loadModel();

  const result = await provider.generate(
    'Reply with exactly: LOCAL_LLM_WORKS',
  );

  console.log('LOCAL LLM RESULT:', result);

  await provider.unloadModel();

  return result;
};

