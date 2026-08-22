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

export interface ModelCatalogEntry {
  id: string;
  displayName: string;
  fileName: string;
  downloadUrl: string;
}

// NOTE: llama.rn is picky about model file names (lowercase + underscores only),
// so `fileName` is the SANITIZED name we save/rename to right after download,
// not necessarily the original HuggingFace file name in `downloadUrl`.
export const AVAILABLE_MODELS: ModelCatalogEntry[] = [
  {
    id: 'gemma-3-1b-it',
    displayName: 'Gemma 3 1B Instruct',
    fileName: 'gemma_3_1b_it_q4_k_m.gguf',
    downloadUrl:
      'https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf?download=true',
  },
  {
    id: 'smollm2-1-7b-instruct',
    displayName: 'SmolLM2 1.7B Instruct',
    fileName: 'smollm2_1_7b_instruct_q4_k_m.gguf',
    downloadUrl:
      'https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF/resolve/main/smollm2-1.7b-instruct-q4_k_m.gguf?download=true',
  },
  {
    id: 'qwen2-5-1-5b-instruct',
    displayName: 'Qwen2.5 1.5B Instruct',
    fileName: 'qwen2_5_1_5b_instruct_q4_0.gguf',
    downloadUrl:
      'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_0.gguf?download=true',
  },
  {
    id: 'llama-3-2-1b-instruct',
    displayName: 'Llama 3.2 1B Instruct',
    fileName: 'llama_3_2_1b_instruct_q5_k_l.gguf',
    downloadUrl:
      'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q5_K_L.gguf?download=true',
  },
];

export const MODELS_DIR = `${RNFS.ExternalDirectoryPath}/gguf`;

const DEFAULT_MODEL_FILE_NAME = 'gemma_3_1b_it_q4_k_m.gguf';
let activeModelFileName = DEFAULT_MODEL_FILE_NAME;
let activeModelStateLoaded = false;

const ACTIVE_MODEL_SETTINGS_PATH = `${MODELS_DIR}/active_model.json`;

const STOP_WORDS = ['</s>', '<|eot_id|>', '<|end_of_turn|>', '<|endoftext|>'];

type LlamaContext = Awaited<ReturnType<typeof initLlama>>;

let localContext: LlamaContext | null = null;
let localContextPromise: ReturnType<typeof initLlama> | null = null;
let localModelLoaded = false;

const getConfiguredProviderName = (): LLMProviderName => {
  const configuredValue = Constants.expoConfig?.extra?.llmProvider;

  return configuredValue === 'existing' ? 'existing' : 'local';
};

export const getModelPath = (fileName: string): string =>
  `${MODELS_DIR}/${fileName}`;

const loadActiveModel = async (): Promise<void> => {
  if (activeModelStateLoaded) return;
  activeModelStateLoaded = true;

  try {
    const content = await RNFS.readFile(ACTIVE_MODEL_SETTINGS_PATH, 'utf8');
    const parsed = JSON.parse(content) as { fileName?: string };

    if (
      parsed?.fileName &&
      (await RNFS.exists(getModelPath(parsed.fileName)))
    ) {
      activeModelFileName = parsed.fileName;
      console.log('[LLM] Restored active model:', parsed.fileName);
    }
  } catch {
    console.log('[LLM] No saved active model; using default.');
  }
};

const saveActiveModel = async (fileName: string): Promise<void> => {
  try {
    await RNFS.writeFile(
      ACTIVE_MODEL_SETTINGS_PATH,
      JSON.stringify({ fileName }),
      'utf8',
    );
  } catch (error) {
    console.warn('[LLM] Failed to persist active model:', error);
  }
};

export const getActiveModel = (): string => activeModelFileName;

export const initActiveModel = (): Promise<void> => loadActiveModel();

export const findCatalogEntry = (
  fileName: string,
): ModelCatalogEntry | undefined =>
  AVAILABLE_MODELS.find(entry => entry.fileName === fileName);

const resetLocalContext = (): void => {
  localContext = null;
  localContextPromise = null;
  localModelLoaded = false;
};

export const setActiveModel = async (fileName: string): Promise<void> => {
  if (fileName === activeModelFileName) return;

  const exists = await RNFS.exists(getModelPath(fileName));

  if (!exists) {
    throw new Error(
      `Cannot select ${fileName}: it is not downloaded yet.`,
    );
  }

  activeModelFileName = fileName;
  resetLocalContext();

  console.log('[LLM] Active model set to:', fileName);

  await saveActiveModel(fileName);
};

async function getLocalModelPath(): Promise<string> {
  await loadActiveModel();

  const activeModelPath = getModelPath(activeModelFileName);
  const exists = await RNFS.exists(activeModelPath);

  if (exists) {
    console.log('GGUF already exists at:', activeModelPath);
    return activeModelPath;
  }

  throw new Error(
    `GGUF model not found at ${activeModelPath}. ` +
      `Download it from the model picker, or copy it to that path manually.`,
  );
}

export const isModelDownloaded = (fileName: string): Promise<boolean> =>
  RNFS.exists(getModelPath(fileName));

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

    console.log('[LLM] testGemma sending to Gemma:', JSON.stringify([{ role: 'user', content: prompt }], null, 2));

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
    resetLocalContext();
  }
}

class LocalProvider implements LLMProvider {
  name: LLMProviderName = 'local';

  async generate(prompt: string): Promise<string> {
    const context = await ensureLocalContext();

    console.log('sending to Gemma:', JSON.stringify([{ role: 'user', content: prompt }], null, 2));

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
    resetLocalContext();
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

