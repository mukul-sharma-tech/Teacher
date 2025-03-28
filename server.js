import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import pdfParse from "pdf-parse"; // Extracts text from PDFs
import { v2 as cloudinary } from 'cloudinary';


const app = express();

// Middleware Configuration
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mukul:1010@nodecluster0.hurza.mongodb.net/interviewDB?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
    dbName: "AiInterview",
})
    .then(() => console.log("MongoDB connected successfully"))
    .catch(err => console.error("MongoDB connection error:", err));

// Interview Schema
// const interviewSchema = new mongoose.Schema({
//   hrQuestion: { type: String, required: true },
//   candidateAnswer: { type: String, required: true },
//   interviewField: { type: String, required: true, enum: ['SDE', 'Business', 'Manager', 'HR'] },
//   timestamp: { type: Date, default: Date.now }
// });

// Modify the Interview Schema
const interviewSchema = new mongoose.Schema({
    interviewField: {
        type: String,
        required: true,
        enum: ['Mathematics', 'Physics', 'Chemistry', 'Biology','Science','SST','Hindi']
    },
    qaPairs: [{
        hrQuestion: String,
        candidateAnswer: String
    }],
    timestamp: { type: Date, default: Date.now }
});


const Interview = mongoose.model("Interview", interviewSchema);


//download
// app.get('/download-pdf', async (req, res) => {
//     try {
//         const interviews = await Interview.find();
//         if (!interviews.length) {
//             return res.status(404).send("No interview data found.");
//         }

//         const doc = new PDFDocument();
//         const filename = 'Interview_QA.pdf';
//         const filePath = `./${filename}`;

//         doc.pipe(fs.createWriteStream(filePath));

//         doc.fontSize(20).text('Mock Interview Questions & Answers', { align: 'center' });
//         doc.moveDown();

//         interviews.forEach((interview, index) => {
//             doc.fontSize(16).text(`Interview Field: ${interview.interviewField}`, { underline: true });
//             doc.moveDown(0.5);
            
//             interview.qaPairs.forEach((pair, idx) => {
//                 doc.fontSize(14).text(`Q${idx + 1}: ${pair.hrQuestion}`);
//                 doc.fontSize(12).text(`A: ${pair.candidateAnswer}`);
//                 doc.moveDown(0.5);
//             });

//             doc.moveDown(1);
//         });

//         doc.end();

//         setTimeout(() => {
//             res.download(filePath, filename, () => {
//                 fs.unlinkSync(filePath); // Delete file after download
//             });
//         }, 1000);
//     } catch (error) {
//         res.status(500).send('Error generating PDF');
//     }
// });


app.get("/download-pdf", async (req, res) => {
    try {
        console.log("Fetching data from MongoDB...");
        const interviews = await Interview.find();

        if (!interviews.length) {
            console.log("No interview data found.");
            return res.status(404).send("No interview data found.");
        }

        console.log("Data fetched successfully, generating PDF...");
        const doc = new PDFDocument();
        const filename = "Interview_QA.pdf";
        const filePath = `./${filename}`;

        doc.pipe(fs.createWriteStream(filePath));

        doc.fontSize(20).text("Mock Interview Questions & Answers", { align: "center" });
        doc.moveDown(1);

        interviews.forEach((interview, index) => {
            doc.fontSize(16).text(`Interview Field: ${interview.interviewField}`, { underline: true });
            doc.moveDown(0.5);

            interview.qaPairs.forEach((pair, idx) => {
                doc.fontSize(14).text(`Q${idx + 1}: ${pair.hrQuestion}`);
                doc.fontSize(12).text(`A: ${pair.candidateAnswer}`);
                doc.moveDown(0.5);
            });

            doc.moveDown(1);
        });

        doc.end();

        setTimeout(() => {
            console.log("Attempting to send the PDF file...");
            res.download(filePath, filename, (err) => {
                if (err) {
                    console.error("Error sending PDF:", err);
                    res.status(500).send("Error sending PDF");
                } else {
                    console.log("PDF sent successfully, deleting file...");
                    fs.unlinkSync(filePath); // Delete after download
                }
            });
        }, 1000);
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Error generating PDF");
    }
});


// File Upload Configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed'));
        }
        cb(null, true);
    }
});

// API Routes (MUST come before static files)
app.post("/api/upload-pdf", upload.single("pdf"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No PDF file uploaded" });
        }

        const pdfData = await pdfParse(req.file.buffer);

        const questions = pdfData.text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map((line, index) => `${index + 1}. ${line.replace(/^\d+\.\s*/, '')}`);

        res.json({
            success: true,
            questions
        });

    } catch (error) {
        console.error("PDF processing error:", error);
        res.status(500).json({
            error: "Failed to process PDF file",
            details: error.message
        });
    }
});

// Update the save endpoint
app.post("/api/save-interview", async (req, res) => {
    try {
        const { interviewField, qaPairs } = req.body;

        if (!interviewField || !qaPairs || !Array.isArray(qaPairs)) {
            return res.status(400).json({
                error: "Missing required fields",
                required: ["interviewField", "qaPairs"]
            });
        }

        const newInterview = new Interview({
            interviewField,
            qaPairs
        });

        const savedInterview = await newInterview.save();
        res.status(201).json(savedInterview);

    } catch (error) {
        console.error("Save error:", error);
        res.status(500).json({
            error: "Failed to save interview data",
            details: error.message
        });
    }
});


// Static Files (AFTER API routes)
app.use(express.static(path.join("views")));

app.get('/', (req, res) => {
    res.render('home.ejs', { url: null });
})
// Catch-all Route (MUST be last)
app.get("/MockInterview", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "MockInterview.html"));
});


app.get('/about', (req, res) => {
    res.render('about.ejs', { url: null });
})

app.get('/contact', (req, res) => {
    res.render('contact.ejs', { url: null });
})

app.get('/EduAI', (req, res) => {
    res.render('AIFarm.ejs', { url: null });
})

app.get('/MockInterview', (req, res) => {
    res.render('MockInterview.ejs', { url: null });
})

app.get('/login', (req, res) => {
    res.render('login.ejs', { url: null });
})

app.get('/register', (req, res) => {
    res.render('register.ejs', { url: null });
})

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("Server error:", err.stack);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message
    });
});


//gemini
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// app.use(cors());
// app.use(express.json());
// app.use(express.static("public")); // Serve static files from public folder

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Configure multer for file uploads
const upload2 = multer({ dest: "uploads/" });

// Handle chatbot messages
app.post("/chat", async (req, res) => {
    const { message } = req.body;

    try {
        const chat = model.startChat({ history: [] });
        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        res.json({ response: responseText });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Something went wrong!" });
    }
});

// Handle PDF Upload and Extraction
app.post("/upload-pdf", upload2.single("pdf"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const pdfPath = req.file.path;

    try {
        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({ error: "File not found" });
        }

        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfData = await pdfParse(dataBuffer);
        fs.unlinkSync(pdfPath); // Delete the file after processing

        res.json({ text: pdfData.text });
    } catch (error) {
        console.error("Error processing PDF:", error);
        res.status(500).json({ error: "Failed to process PDF" });
    }
});



// Configuration
cloudinary.config({
    cloud_name: 'dggulw4uq',
    api_key: '383773851561917',
    api_secret: '77dSFXvQJVuoXgk2uH3m1zvAUTo' // Click 'View API Keys' above to copy your API secret
});



//rendering login file
app.get('/login', (req, res) => {
    res.render('login.ejs', { url: null });
});

//rendering register file
app.get('/register', (req, res) => {
    res.render('register.ejs', { url: null });
});

const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix);
    },
});

const uploadPic = multer({ storage: storage });

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    fileName: String,
    public_id: String,
    imgurl: String
});

const User = mongoose.model('Auth', userSchema);


// Image Upload Configuration (for profile pictures)
const imageUpload = multer({
    storage: multer.diskStorage({
        destination: './public/uploads/',
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + path.extname(file.originalname);
            cb(null, file.fieldname + '-' + uniqueSuffix);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/image\/(jpeg|jpg|png|gif)$/)) {
            return cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed'));
        }
        cb(null, true);
    }
});


//file upload   -> jo file me upload me name likha h whi name .single("file") me likhna h
// For profile picture uploads
app.post("/register", imageUpload.single("file"), async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: "No profile picture uploaded" });
        }

        const cloudinaryRes = await cloudinary.uploader.upload(req.file.path, {
            folder: 'user-profiles'
        });

        // Delete the temporary file after upload
        fs.unlinkSync(req.file.path);

        const db = await User.create({
            name,
            email,
            password,
            filename: req.file.filename,
            public_id: cloudinaryRes.public_id,
            imgurl: cloudinaryRes.secure_url
        });

        res.redirect('/login');
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).render('register.ejs', {
            error: "Registration failed",
            details: error.message
        });
    }
});


app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // 1. First find the user by email only
        const user = await User.findOne({ email });
        
        // 2. If user doesn't exist
        if (!user) {
            return res.render('login.ejs', { 
                error: "Invalid email or password",
                email: req.body.email // Preserve the entered email
            });
        }
        
        // 3. Compare passwords (plain text comparison - not recommended for production)
        if (user.password !== password) {
            return res.render('login.ejs', { 
                error: "Invalid email or password",
                email: req.body.email // Preserve the entered email
            });
        }
        
        // 4. Successful login
        res.render('profile.ejs', { user });
        
    } catch (error) {
        console.error("Login error:", error);
        res.render('login.ejs', { 
            error: "An error occurred during login",
            email: req.body.email // Preserve the entered email
        });
    }
});

// Server Startup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Server running on http://localhost:${PORT}`);
});