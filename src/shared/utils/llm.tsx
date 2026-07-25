import { LiteRtLlm } from 'react-native-litert-lm';
import { Image } from 'react-native';

// Path to your model
const modelAsset = require('../../assets/mobile-actions_q8_ekv1024.litertlm');

export const testGemma = async () => {
  try {
    console.log("Starting Gemma...");
    
    // Resolve asset to a URI
    const asset = Image.resolveAssetSource(modelAsset);
    
    // The library uses 'loadModel' directly on LiteRtLlm
    const model = await LiteRtLlm.loadModel(asset.uri);

    // Simple prompt for Function Gemma
    const prompt = `<start_of_turn>user\n[AVAILABLE_TOOLS] [{"name": "get_weather"}] [END_OF_TOOLS] check weather in London<end_of_turn>\n<start_of_turn>model\n`;

    console.log("Generating...");
    const result = await model.generate(prompt);
    
    console.log("OUTPUT:", result);
    alert("Gemma says: " + result);
    
  } catch (error) {
    console.error("Gemma Error:", error);
    alert("Error: " + error);
  }
};