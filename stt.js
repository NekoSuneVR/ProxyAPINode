const fs = require('fs');
const vosk = require("vosk");
const { Readable } = require('stream');
const { config } = require("./config");

const MODEL_PATH = `./model/${config.vaskmodel}`

let model = null;

async function voskLoader() {
  // Only load model if not already loaded
  if (model !== null) return model;

  if (!fs.existsSync(MODEL_PATH)) {
    console.error(
      "❌ Vosk model still not found after attempted download:",
      MODEL_PATH
    );
    process.exit(1);
  }

  vosk.setLogLevel(0);
  model = new vosk.Model(MODEL_PATH);
  console.log("✅ Vosk model loaded.");
  return model;
}

function transcribeWithVosk(filePath) {
  return new Promise(async (resolve, reject) => {
    const wfReader = fs.createReadStream(filePath, { highWaterMark: 4096 });

    const model = await voskLoader();

    const rec = new vosk.Recognizer({ model, sampleRate: 16000 });
    rec.setMaxAlternatives(1);
    rec.setWords(true);

    wfReader.on("data", chunk => {
      rec.acceptWaveform(chunk);
    });

    const resultText = await new Promise((resolve, reject) => {
      wfReader.on("end", () => {
        const finalResult = rec.finalResult();
        rec.free();
        resolve(finalResult);
      });

      wfReader.on("error", err => {
        rec.free();
        reject(err);
      });
    });

    console.log(resultText)

    if (resultText.alternatives && resultText.alternatives[0].text) {
        resolve(resultText.alternatives[0].text)
    }
  });
}

module.exports = { transcribeWithVosk, voskLoader };
