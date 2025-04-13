const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const app = express();
const PORT = 3001;

// Config
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const upload = multer({ storage: multer.memoryStorage() });

// Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function generateQuizFromText(text) {
    const prompt = `
Generate 5 MCQs from the following content:

"${text}"

Return ONLY the array in JSON format like:
[
  {
    "question": "What is ...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option A"
  }
]
`;

    const chat = model.startChat({ history: [] });
    const result = await chat.sendMessage(prompt);
    const responseText = result.response.text();
    const jsonRegex = /\[\s*{[\s\S]*?}\s*\]/;
    const match = responseText.match(jsonRegex);

    if (!match) throw new Error("Quiz format issue");
    return JSON.parse(match[0]);
}

// GET home page
app.get("/", (req, res) => {
    res.render("index", { quiz: null, error: null });
});

// POST: from textarea
app.post("/generate-text", async (req, res) => {
    try {
        const quiz = await generateQuizFromText(req.body.textarea);
        res.render("index", { quiz, error: null });
    } catch (error) {
        res.render("index", { quiz: null, error: "Failed to generate quiz from text" });
    }
});

// POST: PDF Upload
app.post("/generate-pdf", upload.single("pdf"), async (req, res) => {
    try {
        const data = await pdfParse(req.file.buffer);
        const quiz = await generateQuizFromText(data.text);
        res.render("index", { quiz, error: null });
    } catch (error) {
        res.render("index", { quiz: null, error: "Failed to generate quiz from PDF" });
    }
});

app.listen(PORT, () => console.log(`Server started at http://localhost:${PORT}`));
