import { createLLM } from 'react-native-litert-lm'; // Import the factory function
import { Image } from 'react-native';
import { Asset } from 'expo-asset';

// Path to your model (project-level assets folder)
const modelAsset = require('../../../assets/mobile-actions_q8_ekv1024.litertlm');

export const testGemma = async () => {
  try {
    console.log("Starting Gemma...");
    
    // Resolve the bundle asset via Expo Asset so we get a local file URI
    const expoAsset = Asset.fromModule(modelAsset);
    // Ensure the asset is downloaded to device storage (avoids Metro HTTP URL)
    await expoAsset.downloadAsync();
    const localUri = expoAsset.localUri || Image.resolveAssetSource(modelAsset).uri;

    // 1. Instantiate the runtime engine value using the factory function
    const engine = createLLM(); 

    // 2. Load the local model path into the engine instance using the local file URI
    console.log("Loading model from:", localUri);
    await engine.loadModel(localUri);

    // Simple prompt for Function Gemma
    const prompt = `<start_of_turn>user\n[AVAILABLE_TOOLS] [{"name": "get_weather"}] [END_OF_TOOLS] check weather in London<end_of_turn>\n<start_of_turn>model\n`;

    console.log("Generating...");
    // 3. Generate response using the engine instance
    const result = await engine.sendMessage(prompt);
    
    console.log("OUTPUT:", result);
    return result;
  } catch (error) {
    console.error("Gemma Error:", error);
    throw error;
  }
};