const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generateInvoice = async (payment) => {
console.log("INVOICE GENERATION STARTED");
  return new Promise((resolve, reject) => {

    try {

      const invoiceDir = path.join(
        __dirname,
        "../uploads/invoices"
      );

      if (!fs.existsSync(invoiceDir)) {
        fs.mkdirSync(invoiceDir, {
          recursive: true,
        });
      }

      const fileName = `INV-${payment.applicationId}.pdf`;

      const filePath = path.join(
        invoiceDir,
        fileName
      );

      const doc = new PDFDocument({
        margin: 40,
      });

      const stream = fs.createWriteStream(
        filePath
      );

      doc.pipe(stream);

     doc.fontSize(20)
   .text("TAX INVOICE", {
      align: "center",
   });

doc.moveDown();

doc.fontSize(12);
doc.text("AG EDU HUB");
doc.text("HNO 1567, Maruti Kunj, Gurugram, Haryana");
doc.text("Website: www.ageduhub.in");
doc.text("GSTIN: 06ACJFA9018K1Z6");
doc.text("Phone: 8810605135");

doc.moveDown();

doc.fontSize(14)
   .text("CORRESPONDING AUTHOR DETAILS");

doc.moveDown(0.5);

doc.fontSize(12);

doc.text(`Application ID: ${payment.applicationId}`);
doc.text(`Paper Title: ${payment.title}`);
doc.text(`Payment ID: ${payment.paymentId}`);
doc.text(`Payment Date: ${new Date(payment.paymentDate).toLocaleString("en-IN")}`);

doc.moveDown();

const grossAmount =
  Number(payment.baseAmount || 0) +
  Number(payment.extraAuthorCharge || 0);



const cgst =
  Number(payment.cgstAmount || 0);

const sgst =
  Number(payment.sgstAmount || 0);

doc.moveDown();

doc.text("Description:");
doc.text("Application Process Charges for");
doc.text("Article/Research Publication");

doc.moveDown();

doc.text(`Base Fee: Rs. ${Number(payment.baseAmount || 0).toFixed(2)}`);
doc.text(`Extra Author Charge: Rs. ${Number(payment.extraAuthorCharge || 0).toFixed(2)}`);

if (Number(payment.waveOffAmount || 0) > 0) {
   doc.text(`Wave Off (-): Rs. ${Number(payment.waveOffAmount).toFixed(2)}`);
}

doc.text(`CGST @ 9%: Rs. ${cgst.toFixed(2)}`);
doc.text(`SGST @ 9%: Rs. ${sgst.toFixed(2)}`);

doc.moveDown();

doc.fontSize(14)
   doc.text(`Final Amount: Rs. ${Number(payment.finalAmount || 0).toFixed(2)}`);

doc.moveDown();

doc.fontSize(12)
   .text("Status : PAID");

doc.moveDown(2);

doc.text("For AG EDU HUB");

doc.moveDown(2);

doc.text("(Note - This is a system generated invoice and doesn't need signatures)");

      doc.end();

      stream.on("finish", () => {
        console.log("PDF CREATED:", fileName);
        resolve({
          fileName,
          filePath,
        });
      });

    } catch (error) {
      reject(error);
    }

  });

};

module.exports = generateInvoice;
