const Paper = require("./Models/Paper");
const { syncPaperToOJS } = require("./Services/ojsService");

const migrateAllPapers = async () => {
  const papers = await Paper.find({
  isDeleted: { $ne: true },
  applicationId: { $ne: "PJMTR8593" }
}).sort({ createdAt: 1 });

  const result = {
    total: papers.length,
    success: 0,
    failed: 0,
    failures: []
  };

  for (const paper of papers) {
    try {
      console.log(
        "OJS MIGRATING:",
        paper.applicationId,
        paper.title
      );

      await syncPaperToOJS(paper);

      result.success++;

      console.log(
        "OJS MIGRATION SUCCESS:",
        paper.applicationId
      );

    } catch (error) {
      result.failed++;

      const errorMessage =
        error.response?.data ||
        error.message ||
        "Unknown OJS error";
      paper.ojsSyncStatus = "failed";
paper.ojsSyncError =
  typeof errorMessage === "string"
    ? errorMessage
    : JSON.stringify(errorMessage);

await paper.save();

      result.failures.push({
        applicationId: paper.applicationId,
        error: errorMessage
      });

      console.error(
        "OJS MIGRATION FAILED:",
        paper.applicationId,
        errorMessage
      );
    }
  }

  return result;
};

module.exports = { migrateAllPapers };
