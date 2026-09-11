const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generateCertificate = async (paper, author, volumeNumber, issueNumber) => {

  return new Promise((resolve, reject) => {

    try {

      // =========================
      // CREATE DIRECTORY
      // =========================

      const certificateDir = path.join(
        __dirname,
        "../uploads/certificates"
      );

      if (!fs.existsSync(certificateDir)) {

        fs.mkdirSync(certificateDir, {
          recursive: true,
        });

      }

     

      

     
     

      // =========================
      // AUTHOR NAME
      // =========================

      const authorName = author
  ? `${author.firstName || ""} ${author.lastName || ""}`.trim()
  : "N/A";

   
 // =========================
      // FILE NAME
      // =========================

      const safeAuthorName = authorName
  .replace(/\s+/g, "_")
  .replace(/[^a-zA-Z0-9_]/g, "");

const fileName =
  `${paper.applicationId}_${safeAuthorName}.pdf`;

      const outputPath = path.join(
        certificateDir,
        fileName
      );
      // =========================
      // PDF CONFIG
      // =========================

      const doc = new PDFDocument({

        layout: "landscape",

        size: "A4",

        margin: 0,

      });

      const stream =
        fs.createWriteStream(outputPath);

      doc.pipe(stream);
       // =========================
      // BACKGROUND CERTIFICATE
      // =========================

      const templatePath = path.join(
        __dirname,
        "../assets/certificate.png"
      );

      doc.image(

        templatePath,

        0,

        0,

        {

          width: 842,

          height: 595,

        }

      );
       // =========================
      // FONT PATHS
      // =========================

      const authorFont = path.join(

        __dirname,

        "../fonts/AlexBrush-Regular.ttf"

      );

      const textFont = path.join(

        __dirname,

        "../fonts/CormorantGaramond-VariableFont_wght.ttf"

      );
         doc

        .font(authorFont)

        .fontSize(46)

        .fillColor("#1F1F1F")

        .text(

          authorName,

          0,

          245,

          {

            width: 842,

            align: "center",

          }

        );

      // =========================
      // PAPER TITLE
      // =========================

 doc
  .font(textFont)
  .fontSize(18)          // pehle 26 tha
  .fillColor("#222222")
  .text(
    paper.title,
    120,
    338,                 // thoda upar
    {
      width: 600,
      align: "center",
      lineGap: -4         // line spacing reduce
    }
  );

      // =========================
      // PUBLISHED IN
      // =========================

      doc

        .font(textFont)

        .fontSize(15)

        .fillColor("#222222")

        .text(

         paper.publishedIn ||
         `Volume ${volumeNumber}, Issue ${issueNumber}`,

          300,

          393

        );

      // =========================
      // PAPER ID
      // =========================

      doc

        .font(textFont)

        .fontSize(15)

        .fillColor("#222222")

        .text(

          paper.applicationId,

          535,

          393

        );

      // =========================
      // COMPLETE PDF
      // =========================

      doc.end();

     stream.on("finish", () => {

  const pdfBuffer = fs.readFileSync(outputPath);

  resolve({

    fileName,

    outputPath,

    pdfBuffer,

  });

});

    } catch (error) {

      reject(error);

    }

  });

};

module.exports =
  generateCertificate;
