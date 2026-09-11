const axios = require("axios");
const FormData = require("form-data");

const ojsApi = axios.create({
  baseURL: "https://ojs.pjmtr.in/index.php/pjmtr/api/v1",
  headers: {
    Authorization: `Bearer ${process.env.OJS_API_KEY}`,
    "Content-Type": "application/json"
  }
});

const createSubmission = async (paperData) => {
  const response = await ojsApi.post("/submissions", {
    locale: "en",
    sectionId: paperData.sectionId || 1
  });

  return response.data;
};

const updatePublication = async (
  submissionId,
  publicationId,
  paperData
) => {
  const response = await ojsApi.put(
    `/submissions/${submissionId}/publications/${publicationId}`,
    {
      title: {
        en: paperData.title || ""
      },

      abstract: {
        en: paperData.abstract || ""
      },

      keywords: {
        en: paperData.keywords
          ? paperData.keywords
              .split(",")
              .map((keyword) => keyword.trim())
              .filter(Boolean)
          : []
      }
    }
  );

  return response.data;
};

const addContributor = async (
  submissionId,
  publicationId,
  author
) => {
  const firstName =
    author.firstName?.trim() || "";

  const middleName =
    author.middleName?.trim() || "";

  const lastName =
    author.lastName?.trim() || "";

  const fullGivenName = [
    firstName,
    middleName
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!author.email?.trim()) {
    console.log(
      "OJS AUTHOR SKIPPED - EMAIL MISSING:",
      firstName,
      lastName
    );
    return null;
  }

  const contributorData = {
    givenName: {
      en: fullGivenName || lastName || "Author"
    },

    familyName: {
      en: lastName
    },

    email: author.email.trim(),

    affiliation: {
      en: [
        author.designation,
        author.department,
        author.organization
      ]
        .filter(Boolean)
        .join(", ")
    },
    includeInBrowse: true,

    userGroupId: 14
  };
  const response = await ojsApi.post(
    `/submissions/${submissionId}/publications/${publicationId}/contributors`,
    contributorData
  );

  return response.data;
};
const addArchiveContributor = async (
  submissionId,
  publicationId,
  author,
  fallbackEmail
) => {
  const fullName = author?.name?.trim() || "";

  if (!fullName) return null;

  const parts = fullName.split(/\s+/);

  const firstName = parts.shift() || "Author";
  const lastName = parts.length ? parts.pop() : "";
  const middleName = parts.join(" ");

  const response = await ojsApi.post(
    `/submissions/${submissionId}/publications/${publicationId}/contributors`,
    {
      givenName: {
        en: [firstName, middleName].filter(Boolean).join(" ")
      },

      familyName: {
        en: lastName
      },

      email: author.email?.trim() || fallbackEmail,

      affiliation: {
        en: author.affiliation || ""
      },

      includeInBrowse: true,
      userGroupId: 14
    }
  );

  return response.data;
};
const getPublication = async (
  submissionId,
  publicationId
) => {
  const response = await ojsApi.get(
    `/submissions/${submissionId}/publications/${publicationId}`
  );

  return response.data;
};
const getSubmissionFiles = async (submissionId) => {
  const response = await ojsApi.get(
    `/submissions/${submissionId}/files`
  );

  return response.data;
};
const uploadSubmissionFile = async (
  submissionId,
  fileBuffer,
  fileName,
  contentType = "application/pdf"
) => {
  if (!fileBuffer) {
    throw new Error("Manuscript file is missing");
  }

  const buffer = Buffer.isBuffer(fileBuffer)
    ? fileBuffer
    : Buffer.from(fileBuffer);

  const form = new FormData();

  form.append("file", buffer, {
    filename: fileName || "manuscript.pdf",
    contentType:
      contentType || "application/octet-stream"
  });

  // OJS Article Text / Submission file stage
  form.append("fileStage", "2");
  form.append("genreId", "1");

  const response = await ojsApi.post(
    `/submissions/${submissionId}/files`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${process.env.OJS_API_KEY}`
      }
    }
  );

  return response.data;
};
const getIssues = async () => {
  const response = await ojsApi.get("/issues", {
    params: {
      count: 100,
      offset: 0
    }
  });

  return response.data;
};

const createIssue = async ({
  volume,
  number,
  year,
  title
}) => {
  const response = await ojsApi.post("/issues", {
    volume: String(volume),
    number: String(number),
    year: Number(year),
    title: {
      en: title || `Volume ${volume}, Issue ${number}`
    }
  });

  return response.data;
};
const assignPublicationToIssue = async (
  submissionId,
  publicationId,
  issueId
) => {
  const response = await ojsApi.put(
    `/submissions/${submissionId}/publications/${publicationId}`,
    {
      issueId: Number(issueId)
    }
  );

  return response.data;
};
const updatePublishedArchiveMetadata = async (
  submissionId,
  publicationId,
  paper
) => {
  const data = {};

  // Existing publication date
  if (paper.publishedOn) {
    const date = new Date(paper.publishedOn);

    if (!isNaN(date.getTime())) {
      data.datePublished = date.toISOString().split("T")[0];
    }
  }

  // Existing DOI only - no Crossref deposit
  if (paper.doi?.trim()) {
    data.doi = paper.doi.trim();
  }

  if (Object.keys(data).length === 0) {
    return null;
  }

  const response = await ojsApi.put(
    `/submissions/${submissionId}/publications/${publicationId}`,
    data
  );

  return response.data;
};
const scheduleArchivePublication = async (
  submissionId,
  publicationId,
  issueId
) => {
  const response = await ojsApi.put(
    `/submissions/${submissionId}/publications/${publicationId}`,
    {
      issueId: Number(issueId)
    }
  );

  return response.data;
};
const publishArchivePublication = async (
  submissionId,
  publicationId
) => {
  const response = await ojsApi.put(
    `/submissions/${submissionId}/publications/${publicationId}/archive-publish`,
    {}
  );

  return response.data;
};
// ======================================
// FUTURE PAPER -> OJS PUBLISH
// ======================================

const publishPublication = async (
  submissionId,
  publicationId
) => {
  const response = await ojsApi.put(
    `/submissions/${submissionId}/publications/${publicationId}/publish`,
    {}
  );

  return response.data;
};


// ======================================
// GET DOI FROM OJS PUBLICATION
// ======================================

const getPublicationDoi = async (
  submissionId,
  publicationId
) => {
  const publication = await getPublication(
    submissionId,
    publicationId
  );

  if (!publication) {
    return null;
  }

  const doi =
    publication.doi ||
    publication["pub-id::doi"] ||
    publication.pubIdDoi ||
    null;

  if (!doi) {
    return null;
  }

  return String(doi)
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .trim();
};


// ======================================
// CHECK IF PUBLICATION ALREADY PUBLISHED
// ======================================

const isPublicationPublished = async (
  submissionId,
  publicationId
) => {
  const publication = await getPublication(
    submissionId,
    publicationId
  );

  if (!publication) {
    return {
      published: false,
      publication: null
    };
  }

  const published =
    Number(publication.status) === 3 ||
    Boolean(publication.datePublished);

  return {
    published,
    publication
  };
};
const submitSubmission = async (submissionId) => {
  const response = await ojsApi.put(
    `/submissions/${submissionId}/submit`,
    {}
  );

  return response.data;
};

// ======================================
// COMPLETE PAPER -> OJS SYNC
// ======================================

const syncPaperToOJS = async (paper) => {
  if (!paper) {
    throw new Error("Paper is required");
  }
if (paper.ojsSyncStatus === "synced") {
  console.log(
    "OJS ALREADY SYNCED:",
    paper.applicationId,
    paper.ojsSubmissionId
  );

  return {
    success: true,
    alreadySynced: true,
    submissionId: paper.ojsSubmissionId,
    publicationId: paper.ojsPublicationId
  };
}
  // Prevent duplicate OJS submission
  let submissionId = paper.ojsSubmissionId || null;
  let publicationId = paper.ojsPublicationId || null;

  if (!submissionId || !publicationId) {
    const submission = await createSubmission({
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

    // Save immediately so retry does not create duplicate
    paper.ojsSubmissionId = submissionId;
    paper.ojsPublicationId = publicationId;

    await paper.save();
  }

  console.log(
    "OJS SYNC:",
    paper.applicationId,
    submissionId
  );

  // Metadata
  await updatePublication(
    submissionId,
    publicationId,
    {
      title: paper.title,
      abstract: paper.abstract,
      keywords: paper.keywords
    }
  );
// Check whether contributors already exist in OJS
if (!paper.ojsContributorsSynced && submissionId && publicationId) {
  const existingPublication = await getPublication(
    submissionId,
    publicationId
  );

  const existingAuthors =
    existingPublication?.authors ||
    existingPublication?.contributors ||
    [];

  if (Array.isArray(existingAuthors) && existingAuthors.length > 0) {
    paper.ojsContributorsSynced = true;
    await paper.save();

    console.log(
      "OJS EXISTING CONTRIBUTORS FOUND - SKIPPING ADD:",
      paper.applicationId,
      existingAuthors.length
    );
  }
}
 // Authors - add only once
if (!paper.ojsContributorsSynced) {
  const authors = Array.isArray(paper.authors)
    ? paper.authors
    : [];

  for (const author of authors) {
    await addContributor(
      submissionId,
      publicationId,
      author
    );
  }

  paper.ojsContributorsSynced = true;
  await paper.save();

  console.log(
    "OJS CONTRIBUTORS SYNCED:",
    paper.applicationId
  );
} else {
  console.log(
    "OJS CONTRIBUTORS ALREADY EXIST - SKIPPING:",
    paper.applicationId
  );
}
  
// Check existing OJS files before uploading
if (!paper.ojsFileId && submissionId) {
  const existingFiles = await getSubmissionFiles(submissionId);

  const files = Array.isArray(existingFiles?.items)
    ? existingFiles.items
    : [];

  const existingArticleFile = files.find(
    (file) => Number(file.fileStage) === 2
  );

  if (existingArticleFile?.id) {
    paper.ojsFileId = existingArticleFile.id;
    await paper.save();

    console.log(
      "OJS EXISTING FILE FOUND:",
      paper.applicationId,
      existingArticleFile.id
    );
  }
}
 // Manuscript
if (!paper.file?.data) {
  throw new Error(
    "Paper manuscript file not found"
  );
}

// Upload only if this paper has not already uploaded a file to OJS
if (!paper.ojsFileId) {
  const uploadedFile = await uploadSubmissionFile(
    submissionId,
    paper.file.data,
    paper.file.filename ||
      `${paper.applicationId}-manuscript.pdf`,
    paper.file.contentType ||
      "application/octet-stream"
  );

  const uploadedFileId =
    uploadedFile?.id ||
    uploadedFile?.submissionFileId ||
    null;

  if (!uploadedFileId) {
    throw new Error(
      "OJS file uploaded but file ID was not returned"
    );
  }

  paper.ojsFileId = uploadedFileId;
  await paper.save();

  console.log(
    "OJS FILE UPLOADED:",
    paper.applicationId,
    uploadedFileId
  );
} else {
  console.log(
    "OJS FILE ALREADY EXISTS - SKIPPING:",
    paper.applicationId,
    paper.ojsFileId
  );
}

  // Complete submission
try {
  await submitSubmission(submissionId);
} catch (error) {
  const errorData = error.response?.data;

  const alreadySubmitted =
    errorData?.submissionProgress &&
    String(errorData.submissionProgress)
      .toLowerCase()
      .includes("already been submitted");

  if (!alreadySubmitted) {
    throw error;
  }

  console.log(
    "OJS ALREADY SUBMITTED - CONTINUING:",
    paper.applicationId,
    submissionId
  );
}

// Mark complete sync
paper.ojsSyncStatus = "synced";
paper.ojsSyncedAt = new Date();
paper.ojsSyncError = "";

await paper.save();

return {
  success: true,
  submissionId,
  publicationId
};
};

module.exports = {
  ojsApi,
  createSubmission,
  updatePublication,
  addContributor,
  addArchiveContributor,
  getPublication,
  getSubmissionFiles,
  getIssues,
  createIssue,
  assignPublicationToIssue,
  updatePublishedArchiveMetadata,
  scheduleArchivePublication,
  publishArchivePublication,
  publishPublication,
  getPublicationDoi,
  isPublicationPublished,
  uploadSubmissionFile,
  submitSubmission,
  syncPaperToOJS
};
