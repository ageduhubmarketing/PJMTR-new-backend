const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const paperRoutes = require('./routes/paperRoutes.js');
const adminRoutes = require('./routes/adminRoutes.js');
const newsRoutes = require('./routes/News.js'); // ✅ This is your route handler, not the model
const topBarRoutes = require("./routes/topBarroutes");

const subscriberRoutes = require('./routes/subscriberRoutes');
const path = require("path");
const paymentRoutes = require("./routes/paymentRoutes");
const reviewerRoutes = require("./routes/reviewerRoutes");
const { migrateAllPapers } = require("./migratePapersToOJS");
const { migratePublishedToOJS } = require("./migratePublishedToOJS");

const app = express();

app.use("/uploads", express.static("uploads") );
const PORT = process.env.PORT || 5000;

// ✅ CORS Middleware - should be before routes
app.use(cors({
  origin: [
    'http://localhost:5173',        
    'https://pjmtr.in' ,
    'https://www.pjmtr.in',
     'https://red-tiger-134490.hostingersite.com/'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

//  JSON parsing
app.use(express.json());


app.use("/invoices", express.static( path.join(__dirname, "uploads/invoices"))
);
app.use("/api/reviewers", reviewerRoutes);

//  API routes
app.use('/api/news', newsRoutes);      
app.use('/api/papers', paperRoutes);

app.use('/api/admin', adminRoutes);

app.use("/api/payment", paymentRoutes);
app.use("/api/topbar", topBarRoutes);

app.use('/api/subscribers', subscriberRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Routes

app.use("/api/volumes", require("./routes/VolumeRoutes"));
const Volume = require("./Models/Volume");
//temp
    app.get("/api/migrate-ojs-one", async (req, res) => {
  try {
    const result = await migrateAllPapers();
    res.json(result);
  } catch (error) {
    console.error(
      "OJS MIGRATION ERROR:",
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});
// TEMP - MIGRATE PUBLISHED ARCHIVE PAPERS TO OJS
app.get("/api/migrate-published-ojs", async (req, res) => {
  try {
    const result = await migratePublishedToOJS();
    res.json(result);
  } catch (error) {
    console.error(
      "PUBLISHED OJS MIGRATION ERROR:",
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});
// VIEW PDF
app.get("/paper/view/:id", async (req, res) => {
  try {
    const volume = await Volume.findOne({
      "issues.papers._id": req.params.id
    });

    if (!volume) {
      return res.status(404).send("Paper not found");
    }

    let paper = null;
    let issueIndex = -1;
    let paperIndex = -1;

    volume.issues.forEach((issue, i) => {
  issue.papers.forEach((p, j) => {
    if (p._id.toString() === req.params.id) {
      paper = p;
      issueIndex = i;
      paperIndex = j;
    }
  });
});

    if (!paper || !paper.pdf) {
      return res.status(404).send("PDF not found");
    }
// 🔥 VIEW COUNT
if (issueIndex !== -1 && paperIndex !== -1) {
  await Volume.updateOne(
    { _id: volume._id },
    {
      $inc: {
        [`issues.${issueIndex}.papers.${paperIndex}.views`]: 1
      }
    }
  );
}
   const pdfField = paper.pdf;

let finalBuffer;

// 🔥 CASE 1: Base64 string (YOUR CURRENT CASE)
if (typeof pdfField === "string" && pdfField.startsWith("JVBER")) {
  finalBuffer = Buffer.from(pdfField, "base64");
}

// 🔥 CASE 2: Mongo Binary object
else if (pdfField?._bsontype === "Binary") {
  finalBuffer = Buffer.from(pdfField.buffer);
}

// 🔥 CASE 3: { data: Binary }
else if (pdfField?.data?._bsontype === "Binary") {
  finalBuffer = Buffer.from(pdfField.data.buffer);
}

// 🔥 CASE 4: direct Buffer
else if (Buffer.isBuffer(pdfField)) {
  finalBuffer = pdfField;
}

// 🔥 CASE 5: nested buffer
else if (pdfField?.data && Buffer.isBuffer(pdfField.data)) {
  finalBuffer = pdfField.data;
}

// ❌ UNKNOWN FORMAT
else {
  console.log("❌ UNKNOWN STRUCTURE:", pdfField);
  return res.status(500).send("Invalid PDF format");
}
    res.set({
  "Content-Type": "application/pdf",
  "Content-Disposition": "inline; filename=paper.pdf",
});
   res.end(finalBuffer);

  } catch (error) {
    console.error("VIEW ERROR:", error);
    res.status(500).send("Server error");
  }
});

// DOWNLOAD PDF
app.get("/paper/download/:id", async (req, res) => {
  try {
    const volume = await Volume.findOne({
      "issues.papers._id": req.params.id
    });

    if (!volume) {
      return res.status(404).send("Paper not found");
    }

    let paper = null;
    let issueIndex = -1;
    let paperIndex = -1;

    volume.issues.forEach((issue, i) => {
  issue.papers.forEach((p, j) => {
    if (p._id.toString() === req.params.id) {
      paper = p;
      issueIndex = i;
      paperIndex = j;
    }
  });
});

    if (!paper || !paper.pdf) {
      return res.status(404).send("PDF not found");
    }
// 🔥 DOWNLOAD COUNT
if (issueIndex !== -1 && paperIndex !== -1) {
  await Volume.updateOne(
    { _id: volume._id },
    {
      $inc: {
        [`issues.${issueIndex}.papers.${paperIndex}.downloads`]: 1
      }
    }
  );
}
    
    // 🔥 SAME AS DEMO (IMPORTANT)
   const pdfField = paper.pdf;

let finalBuffer;

// 🔥 CASE 1: Base64 string (YOUR CURRENT CASE)
if (typeof pdfField === "string" && pdfField.startsWith("JVBER")) {
  finalBuffer = Buffer.from(pdfField, "base64");
}

// 🔥 CASE 2: Mongo Binary object
else if (pdfField?._bsontype === "Binary") {
  finalBuffer = Buffer.from(pdfField.buffer);
}

// 🔥 CASE 3: { data: Binary }
else if (pdfField?.data?._bsontype === "Binary") {
  finalBuffer = Buffer.from(pdfField.data.buffer);
}

// 🔥 CASE 4: direct Buffer
else if (Buffer.isBuffer(pdfField)) {
  finalBuffer = pdfField;
}

// 🔥 CASE 5: nested buffer
else if (pdfField?.data && Buffer.isBuffer(pdfField.data)) {
  finalBuffer = pdfField.data;
}

// ❌ UNKNOWN FORMAT
else {
  console.log("❌ UNKNOWN STRUCTURE:", pdfField);
  return res.status(500).send("Invalid PDF format");
}
res.set({
  "Content-Type": "application/pdf",
  "Content-Disposition": "attachment; filename=paper.pdf",
});
   res.end(finalBuffer);

  } catch (error) {
    console.error("DOWNLOAD ERROR:", error);
    res.status(500).send("Server error");
  }
});
// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
