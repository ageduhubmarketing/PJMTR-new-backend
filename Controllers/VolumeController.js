const Volume = require("../Models/Volume");
const Paper = require("../Models/Paper");
const { createSubmission, updatePublication, addContributor, uploadSubmissionFile, submitSubmission, getIssues, createIssue: createOjsIssue } = require("../Services/ojsService");
// Create Volume
exports.createVolume = async (req, res) => {
  try {
    const { volumeNumber } = req.body;
    if (!volumeNumber) return res.status(400).json({ message: "Volume number required" });

    let existing = await Volume.findOne({ volumeNumber });
    if (existing) return res.status(400).json({ message: "Volume already exists" });

    const volume = new Volume({ volumeNumber, issues: [] });
    await volume.save();
    res.status(201).json(volume);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Volume
exports.deleteVolume = async (req, res) => {
  try {
    const { id } = req.params;
    await Volume.findByIdAndDelete(id);
    res.json({ message: "Volume deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// Create Issue
// ==============================
exports.createIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { issueNumber, month, year } = req.body;

    // ==============================
    // FIND PJMTR VOLUME
    // ==============================
    const volume = await Volume.findById(id);

    if (!volume) {
      return res.status(404).json({
        message: "Volume not found"
      });
    }

    // ==============================
    // OJS ISSUE CREATE / FIND
    // ==============================
    let ojsIssueId = null;

    try {
      const ojsIssuesResponse = await getIssues();

      const ojsIssues = Array.isArray(ojsIssuesResponse?.items)
        ? ojsIssuesResponse.items
        : Array.isArray(ojsIssuesResponse)
          ? ojsIssuesResponse
          : [];

      // Same Volume + Issue already exists in OJS?
      const existingOjsIssue = ojsIssues.find((issue) => {
        return (
          String(issue.volume) === String(volume.volumeNumber) &&
          String(issue.number) === String(issueNumber)
        );
      });

      if (existingOjsIssue?.id) {
        // Existing OJS issue use karo
        ojsIssueId = existingOjsIssue.id;

        console.log(
          "OJS ISSUE ALREADY EXISTS:",
          `Volume ${volume.volumeNumber}, Issue ${issueNumber}`,
          ojsIssueId
        );
      } else {
        // New OJS issue create karo
        const createdOjsIssue = await createOjsIssue({
          volume: volume.volumeNumber,
          number: issueNumber,
          year: year || new Date().getFullYear(),
          title: `Volume ${volume.volumeNumber}, Issue ${issueNumber}`
        });

        ojsIssueId = createdOjsIssue?.id || null;

        console.log(
          "OJS ISSUE CREATED:",
          `Volume ${volume.volumeNumber}, Issue ${issueNumber}`,
          ojsIssueId
        );
      }

    } catch (ojsError) {
      // OJS fail hone par existing PJMTR flow nahi rukega
      console.error(
        "OJS ISSUE SYNC FAILED:",
        ojsError.response?.data || ojsError.message
      );
    }

    // ==============================
    // EXISTING PJMTR ISSUE CREATE
    // ==============================
    volume.issues.push({
      issueNumber,
      month,
      year,
      ojsIssueId,
      papers: []
    });

    await volume.save();

    res.json(volume);

  } catch (err) {
    console.error("CREATE ISSUE ERROR:", err);

    res.status(500).json({
      error: err.message
    });
  }
};

// Delete Issue
exports.deleteIssue = async (req, res) => {
  try {
    const { volumeId, issueId } = req.params;

    const updated = await Volume.findByIdAndUpdate(
      volumeId,
      { $pull: { issues: { _id: issueId } } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Volume not found" });
    }

    res.json({ message: "Issue deleted successfully", updated });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Add Paper
exports.addPaper = async (req, res) => {
  try {
    const { volumeId, issueId } = req.params;

const {
  title,
  abstract,
  keywords,
  authors,
  publishedOn,
  publishedIn,
  country,
  doi,
  timestampHistory,
  sourcePaperId
} = req.body;

const pdfBuffer = req.file ? req.file.buffer : null;

const parsedAuthors = JSON.parse(authors);

// Original PJMTR submitted paper
let sourcePaper = null;

if (sourcePaperId) {
  sourcePaper = await Paper.findById(sourcePaperId);

  if (!sourcePaper) {
    return res.status(404).json({
      message: "Original submitted paper not found"
    });
  }
}
    // Existing PJMTR volume/issue check first
    const volume = await Volume.findById(volumeId);
    if (!volume) return res.status(404).json({ message: "Volume not found" });

    const issue = volume.issues.id(issueId);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    // ======================================
// OJS CONNECTION
// ======================================

let ojsSubmissionId = null;
let ojsPublicationId = null;

try {

  // ======================================
  // APPROVED PJMTR PAPER
  // Reuse the OJS submission created when
  // the author originally submitted paper
  // ======================================

  if (sourcePaper) {

    if (
      sourcePaper.ojsSubmissionId &&
      sourcePaper.ojsPublicationId
    ) {

      ojsSubmissionId =
        sourcePaper.ojsSubmissionId;

      ojsPublicationId =
        sourcePaper.ojsPublicationId;

      console.log(
        "USING EXISTING OJS SUBMISSION:",
        sourcePaper.applicationId,
        ojsSubmissionId
      );

      // Update OJS metadata with final
      // Manage Volume data
      await updatePublication(
        ojsSubmissionId,
        ojsPublicationId,
        {
          title,
          abstract,
          keywords
        }
      );

    } else {

      // Source paper exists but initial
      // OJS sync did not complete.
      // Do NOT silently create duplicate here.
      console.log(
        "SOURCE PAPER HAS NO OJS SUBMISSION:",
        sourcePaper.applicationId
      );

    }

  } else {

    // ======================================
    // MANUAL PAPER ENTRY
    // Existing behavior retained
    // ======================================

    const ojsSubmission =
      await createSubmission({
        sectionId: 1
      });

    if (
      !ojsSubmission?.id ||
      !ojsSubmission?.currentPublicationId
    ) {
      throw new Error(
        "OJS submission creation failed"
      );
    }

    ojsSubmissionId =
      ojsSubmission.id;

    ojsPublicationId =
      ojsSubmission.currentPublicationId;

    await updatePublication(
      ojsSubmissionId,
      ojsPublicationId,
      {
        title,
        abstract,
        keywords
      }
    );

    for (const author of parsedAuthors) {

      // Manual Volume entry only has names.
      // addContributor requires email,
      // so existing behavior may skip authors
      // without email.
      await addContributor(
        ojsSubmissionId,
        ojsPublicationId,
        author
      );

    }

    if (pdfBuffer) {

      await uploadSubmissionFile(
        ojsSubmissionId,
        pdfBuffer,
        `${title}.pdf`
      );

    }

    await submitSubmission(
      ojsSubmissionId
    );

    console.log(
      "MANUAL PAPER OJS SYNC COMPLETED:",
      ojsSubmissionId
    );

  }

} catch (ojsError) {

  console.error(
    "OJS CONNECTION FAILED:",
    ojsError.response?.data ||
    ojsError.message
  );

}
    // Existing PJMTR save flow
    issue.papers.push({
      title,
      abstract,
      keywords,
      authors: parsedAuthors,
      publishedOn,
      publishedIn,
      country,
      researchArea: req.body.researchArea,
      language: req.body.language,
      affiliationAddress: req.body.affiliationAddress,
      correspondingEmail: req.body.correspondingEmail,
      timestampHistory,
     doi,

sourcePaperId: sourcePaper
  ? sourcePaper._id
  : null,

ojsSubmissionId,
ojsPublicationId,

pdf: pdfBuffer
    });

    await volume.save();
    res.json(volume);

  } catch (err) {
    console.error("ADD PAPER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get All Volumes
exports.getVolumes = async (req, res) => {
  try {
    const volumes = await Volume.find(
  {},
  {
    "issues.papers.pdf": 0,
  }
)
.sort({ volumeNumber: -1 })
.lean();
    res.json(volumes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Download Paper PDF
exports.downloadPaper = async (req, res) => {
  try {
    const { volumeId, issueId, paperId } = req.params;

    const volume = await Volume.findById(volumeId);
    if (!volume) return res.status(404).json({ message: "Volume not found" });

    const issue = volume.issues.id(issueId);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    const paper = issue.papers.id(paperId);
    if (!paper || !paper.pdf) {
  return res.status(404).json({ message: "PDF not found" });
}

const pdfBuffer = paper.pdf;

res.set({
  "Content-Type": "application/pdf",
  "Content-Disposition": `inline; filename="${paper.title}.pdf"`
});

res.end(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getPaper = async (req, res) => {
  try {
    const { volumeId, issueId, paperId } = req.params;

    const volume = await Volume.findById(volumeId);

    if (!volume) {
      return res.status(404).json({ message: "Volume not found" });
    }

    const issue = volume.issues.id(issueId);

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const paper = issue.papers.id(paperId);

    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }

    res.json(paper);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
// Delete Paper
exports.deletePaper = async (req, res) => {
  try {
    const { volumeId, issueId, paperId } = req.params;

    const volume = await Volume.findById(volumeId);
    if (!volume) return res.status(404).json({ message: "Volume not found" });

    const issue = volume.issues.id(issueId);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    const paper = issue.papers.id(paperId);
    if (!paper) return res.status(404).json({ message: "Paper not found" });
   

    // Remove paper
    issue.papers.pull(paperId);

    await volume.save();

    res.json({ message: "Paper deleted successfully", volume });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Update Paper
exports.updatePaper = async (req, res) => {
  try {
    const { volumeId, issueId, paperId } = req.params;

    const {
      title,
      abstract,
      keywords,
      authors,
      publishedOn,
      publishedIn,
      country,
      researchArea,
      language,
      affiliationAddress,
      correspondingEmail,
      timestampHistory,
      doi
    } = req.body;

    if (!Object.keys(req.body).length && !req.file) {
      return res.status(400).json({ message: "No data provided to update" });
    }

    const volume = await Volume.findById(volumeId);
    if (!volume) return res.status(404).json({ message: "Volume not found" });

    const issue = volume.issues.id(issueId);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    const paper = issue.papers.id(paperId);
    if (!paper) return res.status(404).json({ message: "Paper not found" });

    // OJS sync - secondary flow
    try {
      if (paper.ojsSubmissionId && paper.ojsPublicationId) {
        await updatePublication(
          paper.ojsSubmissionId,
          paper.ojsPublicationId,
          {
            title: title || paper.title,
            abstract: abstract !== undefined ? abstract : paper.abstract,
            keywords: keywords !== undefined ? keywords : paper.keywords
          }
        );

        if (req.file) {
          await uploadSubmissionFile(
            paper.ojsSubmissionId,
            req.file.buffer,
            `${title || paper.title}.pdf`
          );
        }
      }
    } catch (ojsError) {
      console.error(
        "OJS UPDATE SYNC FAILED:",
        ojsError.response?.data || ojsError.message
      );
    }

    // Existing PJMTR update flow
    if (title) paper.title = title;
    if (abstract) paper.abstract = abstract;
    if (keywords) paper.keywords = keywords;
    if (authors) paper.authors = JSON.parse(authors);
    if (publishedOn) paper.publishedOn = publishedOn;
    if (publishedIn) paper.publishedIn = publishedIn;
    if (country) paper.country = country;
    if (researchArea) paper.researchArea = researchArea;
    if (language) paper.language = language;
    if (affiliationAddress) paper.affiliationAddress = affiliationAddress;
    if (correspondingEmail) paper.correspondingEmail = correspondingEmail;
    if (timestampHistory !== undefined) paper.timestampHistory = timestampHistory;
    if (doi) paper.doi = doi;

    if (req.file) {
      paper.pdf = req.file.buffer;
    }

    await volume.save();

    res.json({ message: "Paper updated successfully", paper });

  } catch (err) {
    console.error("UPDATE PAPER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};
// View Paper PDF
exports.viewPaper = async (req, res) => {
  try {
    const { paperId } = req.params;

    const volume = await Volume.findOne({
      "issues.papers._id": paperId
    });

    if (!volume) {
      return res.status(404).json({ message: "Volume not found" });
    }

    let foundPaper = null;

    for (const issue of volume.issues) {
      const paper = issue.papers.id(paperId);

      if (paper) {
        foundPaper = paper;
        break;
      }
    }

    if (!foundPaper || !foundPaper.pdf) {
      return res.status(404).json({ message: "PDF not found" });
    }

    const pdfBuffer = foundPaper.pdf;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${foundPaper.title}.pdf"`
    });

    res.end(pdfBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
exports.getLatestVolume = async (req, res) => {

  try {

    const volumes = await Volume.find()
      .sort({ volumeNumber: -1 });

    if (!volumes || volumes.length === 0) {

      return res.status(404).json({
        message: "No issues found",
      });

    }

    let allIssues = [];

    volumes.forEach((volume) => {

      volume.issues.forEach((issue) => {

        allIssues.push({

          volumeNumber:
            volume.volumeNumber,

          issueNumber:
            issue.issueNumber,

          monthYear:
            `${issue.month} ${issue.year}`,

          createdAt:
            issue.createdAt ||
            volume.createdAt,

        });

      });

    });

   allIssues.sort((a, b) => {
  if (a.volumeNumber !== b.volumeNumber) {
    return b.volumeNumber - a.volumeNumber;
  }

  return b.issueNumber - a.issueNumber;
});
    res.json({

      latest:
        allIssues[0] || null,

      previous:
        allIssues[1] || null,

    });

  } catch (error) {

    res.status(500).json({

      message:
        "Failed to fetch latest issue",

    });

  }

};
