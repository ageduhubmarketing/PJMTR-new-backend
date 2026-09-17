// backend/Controllers/paperController.js
const Paper = require("../Models/Paper");
const Certificate = require("../Models/Certificate");
const TrendingPaper = require("../Models/TrendingPaper");
const Volume = require("../Models/Volume");
const Payment = require("../Models/Payment");
const { syncPaperToOJS, updatePublication, assignPublicationToIssue, publishPublication, getPublicationDoi, isPublicationPublished } = require("../Services/ojsService");
const generateCertificate = require("../utils/certificateGenerator");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;
const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();
const getRecipientDetails = (paper) => {
 
  const correspondingAuthor =
    paper?.correspondingAuthor || {};

  const firstAuthor =
    paper?.authors?.[0] || {};

  const recipientEmail =
    correspondingAuthor?.email?.trim()
      ? correspondingAuthor.email.trim()
      : firstAuthor?.email?.trim() || null;

  const recipientName =
    correspondingAuthor?.email?.trim()
      ? `${correspondingAuthor.firstName || ""} ${correspondingAuthor.lastName || ""}`.trim()
      : `${firstAuthor.firstName || ""} ${firstAuthor.lastName || ""}`.trim();

  return {
    recipientEmail,
    recipientName,
  };

};
const fs = require("fs");
const path = require("path");

// Submit Paper by Author
exports.submitAuthorPaper = async (req, res) => {
  try {
    const {
      manuscriptType,
      title,
      abstract,
      keywords,
      researchArea,
      authors,
      correspondingAuthor,
      country,
      state,
      city,
      postalCode,
      address,
      message,
      ethicalApproval,
      ethicalApprovalNumber,
      conflictOfInterest,
      conflictDetails,
      fundingSupport,
      fundingAmount,
      fundingInstitution,
      reviewers,
      nonPreferredReviewer,
      agreement,
      generativeAIUsageDeclaration,
      apcPaymentDeclaration
    } = req.body;

    // Handle Uploaded Files
    const manuscriptFile = req.files?.manuscriptFile?.[0];
    const coverLetter = req.files?.coverLetter?.[0];
    const supplementaryFile = req.files?.supplementaryFile?.[0];

    // Parse Authors
    let authorsArray = [];

    if (authors) {
      if (typeof authors === "string") {
        try {
          authorsArray = JSON.parse(authors);
        } catch {
          authorsArray = [];
        }
      } else if (Array.isArray(authors)) {
        authorsArray = authors;
      }
    }

    // Parse Corresponding Author
    let formattedCorrespondingAuthor = {};

    if (correspondingAuthor) {
      try {
        const parsedCorrespondingAuthor =
          typeof correspondingAuthor === "string"
            ? JSON.parse(correspondingAuthor)
            : correspondingAuthor;

        formattedCorrespondingAuthor = {
          sameAsAuthor: parsedCorrespondingAuthor.sameAsAuthor || false,
          salutation: parsedCorrespondingAuthor.salutation || "",
          firstName: parsedCorrespondingAuthor.firstName || "",
          middleName: parsedCorrespondingAuthor.middleName || "",
          lastName: parsedCorrespondingAuthor.lastName || "",
          designation: parsedCorrespondingAuthor.designation || "",
          department: parsedCorrespondingAuthor.department || "",
          organization: parsedCorrespondingAuthor.organization || "",
          email: parsedCorrespondingAuthor.email || "",
          mobile: parsedCorrespondingAuthor.mobile || "",
          country: parsedCorrespondingAuthor.country || "",
          address: parsedCorrespondingAuthor.address || "",
          orcid: parsedCorrespondingAuthor.orcid || ""
        };
      } catch {
        formattedCorrespondingAuthor = {};
      }
    }

    // Format Authors
    const formattedAuthors = authorsArray.map((a) => ({
      salutation: a.salutation || "",
      firstName: a.firstName || "",
      middleName: a.middleName || "",
      lastName: a.lastName || "",
      designation: a.designation || "",
      department: a.department || "",
      organization: a.organization || "",
      email: a.email || "",
      mobile: a.mobile || "",
      country: a.country || "",
      address: a.address || "",
      orcid: a.orcid || ""
    }));

    // Parse Reviewers
    let reviewersArray = [];

    if (reviewers) {
      if (typeof reviewers === "string") {
        try {
          reviewersArray = JSON.parse(reviewers);
        } catch {
          reviewersArray = [];
        }
      } else if (Array.isArray(reviewers)) {
        reviewersArray = reviewers;
      }
    }

    const formattedReviewers = reviewersArray.map((r) => ({
      name: r.name || "",
      email: r.email || "",
      institution: r.institution || ""
    }));

    // Create Author Paper
    const newPaper = new Paper({
      authorId: req.author.id,
      manuscriptType,
      title,
      abstract,
      keywords,
      researchArea,
      authors: formattedAuthors,
      correspondingAuthor: formattedCorrespondingAuthor,
      country,
      state,
      city,
      postalCode,
      address,
      message,
      ethicalApproval,
      ethicalApprovalNumber,
      conflictOfInterest,
      conflictDetails,
      fundingSupport,
      fundingAmount,
      fundingInstitution,
      reviewers: formattedReviewers,
      nonPreferredReviewer,
      agreement: agreement === "true" || agreement === true,
     agreement: agreement === "true" || agreement === true,

     generativeAIUsageDeclaration:
       generativeAIUsageDeclaration === "true" ||
       generativeAIUsageDeclaration === true,
     
     apcPaymentDeclaration:
       apcPaymentDeclaration === "true" ||
       apcPaymentDeclaration === true,

      file: manuscriptFile
        ? {
            filename: manuscriptFile.originalname,
            contentType: manuscriptFile.mimetype,
            data: manuscriptFile.buffer
          }
        : undefined,

      coverLetter: coverLetter
        ? {
            filename: coverLetter.originalname,
            contentType: coverLetter.mimetype,
            data: coverLetter.buffer
          }
        : undefined,

      supplementaryFile: supplementaryFile
        ? {
            filename: supplementaryFile.originalname,
            contentType: supplementaryFile.mimetype,
            data: supplementaryFile.buffer
          }
        : undefined
    });

    await newPaper.save();

    // ==============================
    // AUTO SYNC PAPER TO OJS
    // ==============================
    try {
      const ojsResult = await syncPaperToOJS(newPaper);

      console.log(
        "OJS AUTO SYNC SUCCESS:",
        newPaper.applicationId,
        ojsResult.submissionId
      );
    } catch (ojsError) {
      console.error(
        "OJS AUTO SYNC FAILED:",
        newPaper.applicationId,
        ojsError.response?.data || ojsError.message
      );
    }

    // ==============================
    // SEND CONFIRMATION EMAIL
    // ==============================
    try {
      const recipientEmail =
        formattedCorrespondingAuthor?.email?.trim()
          ? formattedCorrespondingAuthor.email.trim()
          : formattedAuthors?.[0]?.email?.trim() || null;

      const recipientName =
        formattedCorrespondingAuthor?.email?.trim()
          ? `${formattedCorrespondingAuthor.firstName || ""} ${formattedCorrespondingAuthor.lastName || ""}`.trim()
          : `${formattedAuthors?.[0]?.firstName || ""} ${formattedAuthors?.[0]?.lastName || ""}`.trim();

      if (recipientEmail) {
        await tranEmailApi.sendTransacEmail({
          sender: {
            email: "editor@pjmtr.in",
            name: "PACIFIC JOURNAL OF MODERN THEORIES AND RESEARCH",
          },
          to: [{ email: recipientEmail, name: recipientName }],
          templateId: 2,
          params: {
            author_name: recipientName,
            title,
            applicationId: newPaper.applicationId,
            trackingLink: `https://pjmtr.in/track-paper/${newPaper.applicationId}`,
          },
        });

        console.log("Confirmation email sent successfully");
      }
    } catch (mailError) {
      console.log("Brevo Mail Error:", mailError);
    }

    res.status(201).json({
      message: "Paper submitted successfully",
      id: newPaper._id,
      applicationId: newPaper.applicationId
    });
  } catch (error) {
    console.error("Author Paper Submission Error:", error);

    res.status(500).json({
      error: "Server error while submitting paper"
    });
  }
};

// ==============================
// Get All Papers (Admin Dashboard)
// ==============================
exports.getAllPapers = async (req, res) => {
  try {
    const papers = await Paper.find().sort({ createdAt: -1 });
    res.json(papers);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch papers", error: err.message });
  }
};
// Get Logged-in Author's Submissions
exports.getAuthorSubmissions = async (req, res) => {
  try {
    const papers = await Paper.find({
      authorId: req.author.id,
    })
      .select(
        "-file.data -coverLetter.data -supplementaryFile.data"
      )
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(papers);
  } catch (error) {
    console.error("Get Author Submissions Error:", error);

    res.status(500).json({
      message: "Failed to fetch author submissions",
      error: error.message,
    });
  }
};
exports.getCoverLetter = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);

    if (!paper || !paper.coverLetter) {
      return res.status(404).json({ message: "Cover letter not found" });
    }

    res.set({
      "Content-Type": paper.coverLetter.contentType,
      "Content-Disposition": `attachment; filename="${paper.coverLetter.filename}"`,
    });

    res.send(paper.coverLetter.data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getSupplementaryFile = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);

    if (!paper || !paper.supplementaryFile) {
      return res.status(404).json({ message: "Supplementary file not found" });
    }

    res.set({
      "Content-Type": paper.supplementaryFile.contentType,
      "Content-Disposition": `attachment; filename="${paper.supplementaryFile.filename}"`,
    });

    res.send(paper.supplementaryFile.data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// Get Status of a Paper
// ==============================
exports.getStatus = async (req, res) => {
  try {
    const paper = await Paper.findOne({ applicationId: req.params.id });
    const payment = await Payment.findOne({ applicationId: paper.applicationId, });

    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }

    res.json({

  title: paper.title,
  applicationId: paper.applicationId,
  status: paper.status,
  createdAt: paper.createdAt,
  payment: payment || null,

});
  } catch (err) {
    res.status(500).json({
      message: "Failed to get status",
      error: err.message,
    });
  }
};

// ==============================
// Get File by ID (Download Manuscript)
// ==============================
exports.getFileById = async (req, res) => {
  try {

    const paper = await Paper.findById(req.params.id);

    if (!paper) {
      return res
        .status(404)
        .json({ message: "Paper not found" });
    }

    const type = req.query.type || "manuscript";

    let selectedFile;

    if (type === "coverLetter") {
      selectedFile = paper.coverLetter;
    } else if (type === "supplementaryFile") {
      selectedFile = paper.supplementaryFile;
    } else {
      selectedFile = paper.file;
    }

    if (!selectedFile) {
      return res
        .status(404)
        .json({ message: "File not found" });
    }

    res.set({
      "Content-Type": selectedFile.contentType,
      "Content-Disposition":
        `attachment; filename="${selectedFile.filename}"`,
    });

    res.send(selectedFile.data);

  } catch (err) {

    res.status(500).json({
      message: "Failed to download file",
      error: err.message,
    });

  }
};

// ==============================
// Approve Paper
// ==============================
exports.approvePaper = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: "Paper not found" });

    paper.status = "Approved";
paper.approvedAt = new Date();

await paper.save();

    const emails = paper.authors.map((a) => a.email);
    res.json({ message: "Paper approved", emails, title: paper.title });
  } catch (err) {
    res.status(500).json({ message: "Approval failed", error: err.message });
  }
};

// ==============================
// Reject Paper
// ==============================
exports.rejectPaper = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: "Paper not found" });

    paper.status = "Rejected";
    await paper.save();

    const emails = paper.authors.map((a) => a.email);
    res.json({ message: "Paper rejected", emails, title: paper.title });
  } catch (err) {
    res.status(500).json({ message: "Rejection failed", error: err.message });
  }
};
// ==============================
// Revision Paper
// ==============================
exports.markRevision = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: "Paper not found" });

   paper.status = "Revision";
paper.revisionAt = new Date();

await paper.save();

    const emails = paper.authors.map((a) => a.email);
    res.json({ message: "Paper sent for revision", emails, title: paper.title });

  } catch (err) {
    res.status(500).json({ message: "Revision failed", error: err.message });
  }
};

// ==============================
// Publish Paper
// ==============================
exports.publishPaper = async (req, res) => {

  try {

    // =========================
    // FIND PAPER
    // =========================

    const paper =
      await Paper.findById(req.params.id);

    if (!paper) {

      return res.status(404).json({

        message: "Paper not found",

      });

    }
 // =========================
// PREPARE OJS PUBLISH
// =========================

const OJS_PUBLISH_LOCK_MS = 10 * 60 * 1000; // 10 minutes
const now = new Date();

if (paper.ojsPublishStatus === "publishing") {

  const startedAt =
    paper.ojsPublishingStartedAt
      ? new Date(paper.ojsPublishingStartedAt).getTime()
      : 0;

  const lockIsFresh =
    startedAt &&
    (now.getTime() - startedAt) < OJS_PUBLISH_LOCK_MS;

  if (lockIsFresh) {
    return res.status(409).json({
      message: "OJS publication is already in progress"
    });
  }

  // Previous request/server stopped before completion.
  // Allow safe retry after stale lock.
  console.log(
    "RECOVERING STALE OJS PUBLISH LOCK:",
    paper.applicationId
  );
}

const alreadyOjsPublished =
  paper.ojsPublishStatus === "published";

if (!alreadyOjsPublished) {
  paper.ojsPublishStatus = "publishing";
  paper.ojsPublishingStartedAt = now;
}

paper.ojsPublishError = "";

await paper.save();

   

    // =========================
    // FIND VOLUME + ISSUE
    // =========================

    const volumes =
      await Volume.find();

    let volumeNumber = "";

    let issueNumber = "";
  
// ======================================
// PREPARE LINKED VOLUME / ISSUE FOR OJS
// ======================================

let linkedVolume = null;
let linkedIssue = null;
let linkedVolumePaper = null;

// First preference: sourcePaperId
for (const volume of volumes) {
  for (const issue of volume.issues) {

    const matchedPaper = issue.papers.find((p) => {
      return (
        p.sourcePaperId &&
        String(p.sourcePaperId) === String(paper._id)
      );
    });

    if (matchedPaper) {
      linkedVolume = volume;
      linkedIssue = issue;
      linkedVolumePaper = matchedPaper;
      break;
    }
  }

  if (linkedVolumePaper) break;
}


// Legacy fallback: title matching
if (!linkedVolumePaper) {
  for (const volume of volumes) {
    for (const issue of volume.issues) {

      const matchedPaper = issue.papers.find((p) =>
        p.title?.trim().toLowerCase() ===
        paper.title?.trim().toLowerCase()
      );

      if (matchedPaper) {
        linkedVolume = volume;
        linkedIssue = issue;
        linkedVolumePaper = matchedPaper;
        break;
      }
    }

    if (linkedVolumePaper) break;
  }
}


// Volume/Issue is mandatory for publication
if (!linkedVolume || !linkedIssue || !linkedVolumePaper) {

  paper.ojsPublishStatus = "failed";
 paper.ojsPublishingStartedAt = null;
  paper.ojsPublishError =
    "Paper is not linked with any Volume/Issue";

  await paper.save();

  return res.status(400).json({
    message:
      "Paper is not linked with any Volume/Issue"
  });
}


// Keep existing values compatible
volumeNumber = linkedVolume.volumeNumber;
issueNumber = linkedIssue.issueNumber;

   // ======================================
// PUBLISH SAME PAPER IN OJS
// ======================================

try {

  const ojsSubmissionId =
    paper.ojsSubmissionId ||
    linkedVolumePaper.ojsSubmissionId;

  const ojsPublicationId =
    paper.ojsPublicationId ||
    linkedVolumePaper.ojsPublicationId;

  const ojsIssueId =
    linkedIssue.ojsIssueId;


  // OJS IDs are required
  if (!ojsSubmissionId || !ojsPublicationId) {
    throw new Error(
      "OJS submission/publication ID missing"
    );
  }

  // PJMTR issue must be connected with OJS issue
  if (!ojsIssueId) {
    throw new Error(
      "OJS Issue ID missing for this Volume/Issue"
    );
  }


  // ======================================
  // UPDATE FINAL ARTICLE METADATA
  // ======================================

  await updatePublication(
    ojsSubmissionId,
    ojsPublicationId,
    {
      title:
        linkedVolumePaper.title ||
        paper.title,

      abstract:
        linkedVolumePaper.abstract ||
        paper.abstract,

      keywords:
        linkedVolumePaper.keywords ||
        paper.keywords
    }
  );


  // ======================================
  // CHECK CURRENT OJS PUBLICATION STATE
  // ======================================

  const ojsState =
    await isPublicationPublished(
      ojsSubmissionId,
      ojsPublicationId
    );


  // ======================================
  // NOT PUBLISHED YET
  // ======================================

  if (!ojsState.published) {

    // Assign same publication to correct issue
    await assignPublicationToIssue(
      ojsSubmissionId,
      ojsPublicationId,
      ojsIssueId
    );

    // Publish it
    await publishPublication(
      ojsSubmissionId,
      ojsPublicationId
    );

  } else {

    console.log(
      "OJS PUBLICATION ALREADY PUBLISHED:",
      ojsSubmissionId
    );

  }


  // ======================================
  // GET DOI FROM OJS
  // ======================================

  const generatedDoi =
    await getPublicationDoi(
      ojsSubmissionId,
      ojsPublicationId
    );


  // ======================================
  // SAVE OJS IDs
  // ======================================

  paper.ojsSubmissionId =
    ojsSubmissionId;

  paper.ojsPublicationId =
    ojsPublicationId;

  linkedVolumePaper.ojsSubmissionId =
    ojsSubmissionId;

  linkedVolumePaper.ojsPublicationId =
    ojsPublicationId;


  // ======================================
// SAVE / TRACK DOI
// ======================================

if (generatedDoi) {

  const cleanDoi = String(generatedDoi)
    .replace(
      /^https?:\/\/(dx\.)?doi\.org\//i,
      ""
    )
    .trim();

  const doiLink =
    `https://doi.org/${cleanDoi}`;

  // Save same DOI in main Paper
  paper.doi = doiLink;

  // Save same DOI in Volume paper
  linkedVolumePaper.doi = doiLink;

  // DOI sync completed
  paper.ojsDoiSyncStatus = "synced";
  paper.ojsDoiSyncedAt = new Date();
  paper.ojsDoiSyncError = "";

  console.log(
    "OJS DOI SYNCED:",
    paper.applicationId,
    doiLink
  );

} else {

  // OJS publication succeeded,
  // but DOI is not available from OJS yet.
  paper.ojsDoiSyncStatus = "pending";
  paper.ojsDoiSyncError = "";

  console.log(
    "OJS DOI PENDING:",
    paper.applicationId,
    ojsSubmissionId
  );

}
  // ======================================
// OJS + PJMTR PUBLISH SUCCESS
// ======================================

const publicationTime = new Date();

paper.ojsPublishStatus = "published";
paper.ojsPublishingStartedAt = null;
paper.ojsPublishedAt =
  paper.ojsPublishedAt || publicationTime;

paper.ojsPublishError = "";

paper.status = "Published";

paper.publishedAt =
  paper.publishedAt || publicationTime;

paper.publishedIn =
  `Volume ${volumeNumber}, Issue ${issueNumber}`;


  await linkedVolume.save();
  await paper.save();


  console.log(
    "OJS PUBLISH SYNC COMPLETED:",
    paper.applicationId,
    ojsSubmissionId
  );


} catch (ojsPublishError) {

  console.error(
    "OJS PUBLISH FAILED:",
    ojsPublishError.response?.data ||
    ojsPublishError.message
  );

  paper.ojsPublishStatus = "failed";
paper.ojsPublishingStartedAt = null;
  paper.ojsPublishError =
    ojsPublishError.response?.data
      ? JSON.stringify(
          ojsPublishError.response.data
        )
      : ojsPublishError.message;

  await paper.save();

  return res.status(502).json({
    message:
      "PJMTR paper was not fully published because OJS publication failed",

    error:
      ojsPublishError.message
  });

}
    // =========================
    // GENERATE CERTIFICATE
    // =========================
 const allAuthors = [];
const seenAuthors = new Set();

const addAuthor = (author) => {
  if (!author) return;

  const email = (author.email || "").trim().toLowerCase();

  if (email) {
    if (seenAuthors.has(email)) return;
    seenAuthors.add(email);
  }

  allAuthors.push(author);
};

// Corresponding Author
addAuthor(paper.correspondingAuthor);

// All Authors
if (paper.authors && paper.authors.length > 0) {
  paper.authors.forEach(addAuthor);
}

    const certificate =
      await generateCertificate(

        paper,

        volumeNumber,

        issueNumber

      );

    // =========================
    // CERTIFICATE LINK
    // =========================
   const { recipientName, } = getRecipientDetails(paper);
   const savedCertificates = [];
    for (const author of allAuthors) {

  const authorName =
    `${author.firstName || ""} ${author.lastName || ""}`.trim();

  const certificate = await generateCertificate(
    paper,
    author,
    volumeNumber,
    issueNumber
  );

  let existingCertificate = await Certificate.findOne({
    paperId: paper._id,
    authorName,
  });

  let savedCertificate;

if (existingCertificate) {

  existingCertificate.applicationId = paper.applicationId;

  existingCertificate.paperTitle = paper.title;

  existingCertificate.authorName = authorName;

  existingCertificate.doi = paper.doi || "";

  existingCertificate.certificateFile = {
    filename: certificate.fileName,
    contentType: "application/pdf",
    data: certificate.pdfBuffer,
  };

  await existingCertificate.save();

  savedCertificate = existingCertificate;

} else {

  savedCertificate = await Certificate.create({

    paperId: paper._id,

    applicationId: paper.applicationId,

    paperTitle: paper.title,

    authorName: authorName,

    certificateLink: "temp",

    doi: paper.doi || "",

    certificateFile: {
      filename: certificate.fileName,
      contentType: "application/pdf",
      data: certificate.pdfBuffer,
    },

  });

}
   savedCertificate.certificateLink =
  `https://pjmtr-backend-0fo3.onrender.com/api/papers/certificate/${savedCertificate._id}`;

     await savedCertificate.save();
     savedCertificates.push(savedCertificate);
     } 
   const certificateLinks = savedCertificates.map((cert) => ({
  authorName: cert.authorName,
  certificateLink: cert.certificateLink,
}));
   const certificateLinksText = certificateLinks
  .map(
    (cert, index) =>
`${index + 1}. ${cert.authorName}
${cert.certificateLink}`
  )
  .join("\n\n");
 const attachments = savedCertificates.map((cert) => ({
  name: cert.certificateFile.filename,
  content: Buffer.from(cert.certificateFile.data).toString("base64"),
}));
    // =========================
    // SEND EMAIL
    // =========================

    try {

     const {
  recipientEmail,
  recipientName,
} = getRecipientDetails(paper);

if (recipientEmail) {

  console.log("DOI DATA =>", paper.doi);
console.log(attachments);
  await tranEmailApi.sendTransacEmail({

    sender: {

      email:
        "editor@pjmtr.in",

      name:
        "PACIFIC JOURNAL OF MODERN THEORIES AND RESEARCH",

    },

    to: [

      {

        email:
          recipientEmail,

        name:
          recipientName,

      },

    ],

    templateId: 6,

    params: {

      author_name:
        recipientName,

      title:
        paper.title,

      applicationId:
        paper.applicationId,
      doi_link:
        paper.doi || "Not Available",

    },
attachment: attachments,
  });

  console.log(
    "Publication email sent successfully"
  );

}

    } catch (mailError) {

      console.log(
        "Brevo publish mail error:",
        mailError
      );

    }

 res.json({

  message: "Paper published successfully",

  certificates: savedCertificates,

  paper,

});

  } catch (error) {

    console.log(
  "PUBLISH ERROR =>",
  error
);

res.status(500).json({

  message:
    "Publication failed",

  error:
    error.message,

});

  }

};

// ==============================
// Delete Paper
// ==============================
exports.deletePaper = async (req, res) => {
  try {
    const paper = await Paper.findByIdAndDelete(req.params.id);
    if (!paper) return res.status(404).json({ message: "Paper not found" });

    const emails = paper.authors.map((a) => a.email);
    res.json({ message: "Paper deleted", emails, title: paper.title });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete paper", error: err.message });
  }
};
// ==============================
// Save Trending Papers
// ==============================
exports.saveTrendingPapers = async (req, res) => {
  try {
    const { papers } = req.body;

    let existing = await TrendingPaper.findOne();

    if (existing) {
      existing.papers = papers;
      await existing.save();
    } else {
      await TrendingPaper.create({ papers });
    }

    res.json({
      success: true,
      message: "Trending papers updated",
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to save trending papers",
      error: err.message,
    });
  }
};

// ==============================
// Get Trending Papers
// ==============================
exports.getTrendingPapers = async (req, res) => {
  try {

    const trending = await TrendingPaper.findOne()
  .populate({
    path: "papers",
    select: `
      title
      authors
      country
    `,
  })
  .lean();

    if (!trending) {
      return res.json([]);
    }

    res.json(trending.papers);

  } catch (err) {

    res.status(500).json({
      message: "Failed to fetch trending papers",
      error: err.message,
    });

  }
};

//certificates fetch
exports.getCertificates =
  async (req, res) => {

  try {

    const certificates =
      await Certificate.find()
        .sort({ createdAt: -1 });

    res.json(certificates);

  } catch (error) {

    res.status(500).json({

      message:
        "Failed to fetch certificates",

      error:
        error.message,

    });

  }

};
// ==============================
// Download Certificate from MongoDB
// ==============================
exports.downloadCertificate = async (req, res) => {

  try {

    const certificate = await Certificate.findById(req.params.id);

    if (!certificate || !certificate.certificateFile?.data) {

      return res.status(404).json({
        message: "Certificate not found",
      });

    }

    res.set({

      "Content-Type":
        certificate.certificateFile.contentType,

      "Content-Disposition":
        `attachment; filename="${certificate.certificateFile.filename}"`,

    });

    res.send(certificate.certificateFile.data);

  } catch (error) {

    res.status(500).json({

      message: "Failed to download certificate",

      error: error.message,

    });
  }
};
// Get Author Revisions
exports.getAuthorRevisions = async (req, res) => {
  try {
    const papers = await Paper.find({
      authorId: req.author.id,
      revisionHistory: {
        $exists: true,
        $ne: [],
      },
    })
      .select(`-file.data -coverLetter.data -supplementaryFile.data -revisionHistory.revisedFile.data`)
      .sort({ revisionAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      papers,
    });
  } catch (error) {
    console.error("Get Author Revisions Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch revisions",
    });
  }
};
// Submit Author Revision
exports.submitAuthorRevision = async (req, res) => {
  try {
    const { paperId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload revised PDF",
      });
    }

    const paper = await Paper.findOne({
      _id: paperId,
      authorId: req.author.id,
      status: "Revision",
    });

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: "Revision paper not found",
      });
    }

    if (!paper.revisionHistory || paper.revisionHistory.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Revision history not found",
      });
    }

    const latestRevision =
      paper.revisionHistory[paper.revisionHistory.length - 1];

    latestRevision.revisedFile = {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      data: req.file.buffer,
    };

    latestRevision.submittedAt = new Date();
    latestRevision.status = "Submitted";

    await paper.save();

    res.status(200).json({
      success: true,
      message: "Revision submitted successfully",
    });
  } catch (error) {
    console.error("Submit Author Revision Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to submit revision",
    });
  }
};
// Download Revision Files
exports.downloadRevisionFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, revisionNumber } = req.query;

    const paper = await Paper.findOne({
      _id: id,
      authorId: req.author.id,
    });

    if (!paper) {
      return res.status(404).json({
        message: "Paper not found",
      });
    }

    const revision = revisionNumber
      ? paper.revisionHistory?.find(
          (item) =>
            item.revisionNumber === Number(revisionNumber)
        )
      : paper.revisionHistory?.[
          paper.revisionHistory.length - 1
        ];

    if (!revision) {
      return res.status(404).json({
        message: "Revision not found",
      });
    }

    // Admin Attached PDF
    if (type === "admin") {
      const filePath = revision.adminAttachment?.fileUrl;

      if (!filePath) {
        return res.status(404).json({
          message: "Admin attachment not found",
        });
      }

      const absolutePath = path.resolve(filePath);

      if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({
          message: "Attachment file not found",
        });
      }

      return res.download(
        absolutePath,
        revision.adminAttachment.fileName || "revision-file.pdf"
      );
    }

    // Author Revised PDF
    if (type === "revised") {
      const revisedFile = revision.revisedFile;

      if (!revisedFile?.data) {
        return res.status(404).json({
          message: "Revised file not found",
        });
      }

      res.setHeader(
        "Content-Type",
        revisedFile.contentType || "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${revisedFile.filename || "revised-paper.pdf"}"`
      );

      return res.send(revisedFile.data);
    }

    return res.status(400).json({
      message: "Invalid file type",
    });
  } catch (error) {
    console.error("Download Revision File Error:", error);

    res.status(500).json({
      message: "Failed to download revision file",
    });
  }
};
