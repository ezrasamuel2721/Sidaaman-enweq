// ============================================================
// Sidaaman Enweq
// api/tts.js
//
// SERVER TEXT-TO-SPEECH
// - Amharic: am-ET
// - English: en-US
// - Sidaamu Afoo: reserved for a verified provider
//
// IMPORTANT:
// GOOGLE_TTS_API_KEY must be stored in Vercel Environment Variables.
// NEVER put the API key inside index.html.
// ============================================================

export default async function handler(req, res) {
  // ----------------------------------------------------------
  // CORS
  // ----------------------------------------------------------
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    // --------------------------------------------------------
    // CHECK API KEY
    // --------------------------------------------------------
    const apiKey = process.env.GOOGLE_TTS_API_KEY;

    if (!apiKey) {
      console.error("GOOGLE_TTS_API_KEY is missing");

      return res.status(500).json({
        error: "TTS server is not configured"
      });
    }

    // --------------------------------------------------------
    // READ REQUEST
    // --------------------------------------------------------
    const {
      text,
      language
    } = req.body || {};

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        error: "Text is required"
      });
    }

    // --------------------------------------------------------
    // LIMIT TEXT
    // --------------------------------------------------------
    const cleanText = text
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      return res.status(400).json({
        error: "Text is empty"
      });
    }

    if (cleanText.length > 4500) {
      return res.status(400).json({
        error:
          "Text is too long. Please read a shorter section."
      });
    }

    // --------------------------------------------------------
    // LANGUAGE MAP
    // --------------------------------------------------------
    let languageCode;
    let voiceName;

    if (language === "am") {
      languageCode = "am-ET";

      // Google Cloud TTS Amharic voice.
      // If this exact voice becomes unavailable,
      // remove the "name" field and let Google select
      // an available Amharic voice.
      voiceName = "am-ET-Standard-A";
    }

    else if (language === "en") {
      languageCode = "en-US";
      voiceName = "en-US-Neural2-C";
    }

    else if (language === "sid") {
      // ------------------------------------------------------
      // IMPORTANT:
      // Sidaamu Afoo is NOT assumed to be supported by
      // Google Cloud TTS.
      // Do not silently generate Amharic/English instead.
      // ------------------------------------------------------
      return res.status(400).json({
        error:
          "Sidaamu Afoo TTS provider is not configured yet."
      });
    }

    else {
      return res.status(400).json({
        error: "Unsupported language"
      });
    }

    // --------------------------------------------------------
    // GOOGLE CLOUD TEXT-TO-SPEECH
    // --------------------------------------------------------
    const endpoint =
      "https://texttospeech.googleapis.com/v1/text:synthesize" +
      "?key=" +
      encodeURIComponent(apiKey);

    const googleResponse = await fetch(endpoint, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        input: {
          text: cleanText
        },

        voice: {
          languageCode,
          name: voiceName
        },

        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: 0.9,
          pitch: 0
        }
      })
    });

    const data = await googleResponse.json();

    // --------------------------------------------------------
    // GOOGLE ERROR
    // --------------------------------------------------------
    if (!googleResponse.ok) {
      console.error(
        "GOOGLE TTS ERROR:",
        JSON.stringify(data)
      );

      return res.status(502).json({
        error:
          data?.error?.message ||
          "Google TTS request failed"
      });
    }

    // --------------------------------------------------------
    // AUDIO
    // --------------------------------------------------------
    if (!data.audioContent) {
      return res.status(502).json({
        error: "No audio was returned by TTS provider"
      });
    }

    // --------------------------------------------------------
    // BASE64 -> BINARY
    // --------------------------------------------------------
    const audioBuffer =
      Buffer.from(data.audioContent, "base64");

    res.setHeader(
      "Content-Type",
      "audio/mpeg"
    );

    res.setHeader(
      "Content-Length",
      audioBuffer.length
    );

    res.setHeader(
      "Cache-Control",
      "public, max-age=3600"
    );

    return res.status(200).send(audioBuffer);

  } catch (error) {
    console.error(
      "TTS SERVER ERROR:",
      error
    );

    return res.status(500).json({
      error:
        "Unable to generate speech"
    });
  }
}
