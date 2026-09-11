const Volume = require("./Models/Volume");

const {
  createSubmission,
  updatePublication,
  addArchiveContributor,
  getSubmissionFiles,
  getIssues,
  createIssue,
  assignPublicationToIssue,
  updatePublishedArchiveMetadata,
  scheduleArchivePublication,
  publishArchivePublication,
  uploadSubmissionFile,
  submitSubmission
} = require("./Services/ojsService");

// ==========================================
// MIGRATE ALL ARCHIVED/PUBLISHED PAPERS
// ==========================================

const migratePublishedToOJS = async () => {
  const volumes = await Volume.find({}).sort({
    volumeNumber: 1
  });

  const result = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    failures: []
  };

  for (const volume of volumes) {
    for (const issue of volume.issues || []) {
      for (const paper of issue.papers || []) {
      
        result.total++;

        try {
          console.log(
            "ARCHIVE OJS MIGRATING:",
            `Volume ${volume.volumeNumber}`,
            `Issue ${issue.issueNumber}`,
            paper.title
          );

          // ======================================
          // 1. Already fully synced -> skip
          // ======================================

         if (
            paper.ojsSyncStatus === "synced" &&
            paper.ojsSubmissionId
          ) {
            result.skipped++;

          console.log(
          "ARCHIVE ALREADY SYNCED:",
           paper.title,
          paper.ojsSubmissionId
          );

          continue;
          }
          // ======================================
// OJS ISSUE - FIND OR CREATE
// ======================================

const issuesResponse = await getIssues();

const ojsIssues = Array.isArray(issuesResponse?.items)
  ? issuesResponse.items
  : [];

let ojsIssue = ojsIssues.find(
  (ojsItem) =>
    String(ojsItem.volume) === String(volume.volumeNumber) &&
    String(ojsItem.number) === String(issue.issueNumber)
);

if (!ojsIssue) {
  ojsIssue = await createIssue({
    volume: volume.volumeNumber,
    number: issue.issueNumber,
    year: issue.year,
    title: `Volume ${volume.volumeNumber}, Issue ${issue.issueNumber}`
  });

  console.log(
    "OJS ISSUE CREATED:",
    volume.volumeNumber,
    issue.issueNumber,
    ojsIssue.id
  );
} else {
  console.log(
    "OJS ISSUE FOUND:",
    volume.volumeNumber,
    issue.issueNumber,
    ojsIssue.id
  );
}

const ojsIssueId = ojsIssue.id;

if (!ojsIssueId) {
  throw new Error("OJS Issue ID not found");
}

          // ======================================
          // 2. Existing OJS IDs reuse
          // ======================================

          let submissionId =
            paper.ojsSubmissionId || null;

          let publicationId =
            paper.ojsPublicationId || null;

          // ======================================
          // 3. Create OJS submission if required
          // ======================================

          if (!submissionId || !publicationId) {
            const submission =
              await createSubmission({
                sectionId: 1
              });

            if (
              !submission?.id ||
              !submission?.currentPublicationId
            ) {
              throw new Error(
                "OJS submission creation failed"
              );
            }

            submissionId = submission.id;

            publicationId =
              submission.currentPublicationId;

            // Save immediately.
            // Retry will reuse same OJS submission.
            paper.ojsSubmissionId =
              submissionId;

            paper.ojsPublicationId =
              publicationId;

            await volume.save();

            console.log(
              "ARCHIVE OJS SUBMISSION CREATED:",
              paper.title,
              submissionId
            );
          }

          // ======================================
          // 4. Metadata
          // ======================================

          await updatePublication(
            submissionId,
            publicationId,
            {
              title: paper.title,
              abstract: paper.abstract || "",
              keywords: paper.keywords || ""
            }
          );
          // Assign archived paper to correct OJS Volume/Issue
await assignPublicationToIssue(
  submissionId,
  publicationId,
  ojsIssueId
);
await updatePublishedArchiveMetadata(
  submissionId,
  publicationId,
  paper
);
console.log(
  "ARCHIVE ISSUE ASSIGNED:",
  paper.title,
  `Volume ${volume.volumeNumber}`,
  `Issue ${issue.issueNumber}`,
  ojsIssueId
);

          // ======================================
          // 5. Authors
          // ======================================
          //
          // Archive schema:
          // authors: [{ name: String }]
          //
          // Current addContributor() expects
          // firstName / middleName / lastName / email.
          //
          // We convert archive author here.
          // correspondingEmail is used when available.
          // ======================================

         if (!paper.ojsContributorsSynced) {
  const authors = Array.isArray(paper.authors)
    ? paper.authors
    : [];

  for (let index = 0; index < authors.length; index++) {
    const archiveAuthor = authors[index];

    if (!archiveAuthor?.name?.trim()) {
      continue;
    }

    await addArchiveContributor(
      submissionId,
      publicationId,
      {
        name: archiveAuthor.name,
        email: archiveAuthor.email || "",
        affiliation:
          archiveAuthor.affiliation ||
          paper.affiliationAddress ||
          ""
      },
      paper.correspondingEmail || ""
    );
  }

  paper.ojsContributorsSynced = true;
  await volume.save();

  console.log(
    "ARCHIVE CONTRIBUTORS SYNCED:",
    paper.title
  );
}

          // ======================================
          // 6. Detect existing Article Text file
          // ======================================

          if (
            !paper.ojsFileId &&
            submissionId
          ) {
            const existingFiles =
              await getSubmissionFiles(
                submissionId
              );

            const files =
              Array.isArray(
                existingFiles?.items
              )
                ? existingFiles.items
                : [];

            const existingArticleFile =
              files.find(
                (file) =>
                  Number(file.fileStage) === 2
              );

            if (existingArticleFile?.id) {
              paper.ojsFileId =
                existingArticleFile.id;

              await volume.save();

              console.log(
                "ARCHIVE EXISTING FILE FOUND:",
                paper.title,
                existingArticleFile.id
              );
            }
          }

          // ======================================
          // 7. Upload PDF only once
          // ======================================

          if (
            !paper.ojsFileId &&
            paper.pdf
          ) {
            const pdfBuffer =
              Buffer.isBuffer(paper.pdf)
                ? paper.pdf
                : Buffer.from(paper.pdf);

            const uploadedFile =
              await uploadSubmissionFile(
                submissionId,
                pdfBuffer,
                `${paper.title || "paper"}.pdf`,
                "application/pdf"
              );

            const uploadedFileId =
              uploadedFile?.id ||
              uploadedFile?.submissionFileId ||
              null;

            if (!uploadedFileId) {
              throw new Error(
                "OJS PDF uploaded but file ID was not returned"
              );
            }

            paper.ojsFileId =
              uploadedFileId;

            await volume.save();

            console.log(
              "ARCHIVE PDF UPLOADED:",
              paper.title,
              uploadedFileId
            );
          }

          if (!paper.ojsFileId) {
            throw new Error(
              "Published paper PDF not found"
            );
          }

          // ======================================
          // 8. Submit OJS submission
          // ======================================

          try {
            await submitSubmission(
              submissionId
            );
          } catch (submitError) {
            const errorData =
              submitError.response?.data;

            const alreadySubmitted =
              errorData?.submissionProgress &&
              String(
                errorData.submissionProgress
              )
                .toLowerCase()
                .includes(
                  "already been submitted"
                );

            if (!alreadySubmitted) {
              throw submitError;
            }

            console.log(
              "ARCHIVE ALREADY SUBMITTED:",
              paper.title,
              submissionId
            );
          }
                  await scheduleArchivePublication(
  submissionId,
  publicationId,
  ojsIssueId
);

console.log(
  "ARCHIVE PAPER SCHEDULED:",
  paper.title,
  ojsIssueId
);
          

          // ======================================
          // 9. Mark successful
          // ======================================

          paper.ojsSyncStatus = "scheduled";
          paper.ojsSyncError = "";
          paper.ojsSyncedAt = new Date();

          await volume.save();

          result.success++;

          console.log(
            "ARCHIVE OJS SUCCESS:",
            paper.title,
            submissionId
          );
        } catch (error) {
          result.failed++;

          const errorData =
            error.response?.data ||
            error.message ||
            "Unknown OJS error";

          const errorMessage =
            typeof errorData === "string"
              ? errorData
              : JSON.stringify(errorData);

          paper.ojsSyncStatus = "failed";
          paper.ojsSyncError =
            errorMessage;

          await volume.save();

          result.failures.push({
            volumeNumber:
              volume.volumeNumber,

            issueNumber:
              issue.issueNumber,

            paperId:
              paper._id?.toString(),

            title:
              paper.title,

            error:
              errorData
          });

          console.error(
            "ARCHIVE OJS FAILED:",
            paper.title,
            errorData
          );
        }
      }
    }
  }

  return result;
};

module.exports = {
  migratePublishedToOJS
};
