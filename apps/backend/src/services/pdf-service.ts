import PDFDocument from "pdfkit";
import type { IReport } from "../models/Report";
import dayjs from "dayjs";
import path from "path";
import fs from "fs";

export class PDFService {
  static async generateReportPDF(report: any): Promise<typeof PDFDocument> {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    // Try to use a font that supports Greek characters
    try {
      // Try to find and use DejaVu Sans which supports Greek
      const fontPaths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/TTF/DejaVuSans.ttf',
        '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
      ];

      for (const fontPath of fontPaths) {
        if (fs.existsSync(fontPath)) {
          doc.registerFont('MainFont', fontPath);
          doc.font('MainFont');
          break;
        }
      }
    } catch (e) {
      // Fall back to default font
    }

    // Helper to format dates in European style
    const formatDateTime = (date: Date | string) => {
      return dayjs(date).format("D MMMM, YYYY HH:mm");
    };

    const formatTimeEntry = (date: Date | string) => {
      return dayjs(date).format("DD/MM/YYYY HH:mm");
    };

    // Helper to extract role title from role ID
    const getRoleTitle = (roleStr: string) => {
      if (!roleStr) return "";

      // Check if it's a role ID format like "supervisor_68cd894be6ea2b4bd65807e1"
      if (roleStr.includes("_")) {
        // Extract role name before the underscore
        const roleName = roleStr.split("_")[0];
        // Capitalize first letter
        return roleName.charAt(0).toUpperCase() + roleName.slice(1);
      }

      // If no underscore, just capitalize the role name
      return roleStr.charAt(0).toUpperCase() + roleStr.slice(1);
    };

    // Helper function to add section header
    const addSectionHeader = (title: string, y?: number) => {
      if (y) doc.y = y;
      doc.x = 50; // Ensure section headers are aligned to the left
      doc
        .fontSize(14)
        .fillColor("#1976d2")
        .text(title, { underline: true })
        .moveDown(0.5);
      doc.fillColor("#000000");
    };

    // Helper function to add key-value pair
    const addKeyValue = (key: string, value: string | number | undefined) => {
      if (value === undefined || value === null) return;
      doc
        .fontSize(10)
        .fillColor("#666666")
        .text(`${key}:`, { continued: true })
        .fillColor("#000000")
        .text(` ${value}`)
        .moveDown(0.3);
    };

    // Header - Company Logo Area
    doc
      .fontSize(20)
      .fillColor("#1976d2")
      .text("FIELD SERVICE REPORT", { align: "center" })
      .moveDown();

    doc
      .fontSize(12)
      .fillColor("#666666")
      .text(`Report ID: ${report._id}`, { align: "center" })
      .moveDown(1.5);

    // Report Overview Section
    addSectionHeader("Report Overview");

    addKeyValue("Type", report.type.toUpperCase());
    addKeyValue(
      "Status",
      report.status.charAt(0).toUpperCase() + report.status.slice(1)
    );
    addKeyValue(
      "Priority",
      report.priority.charAt(0).toUpperCase() + report.priority.slice(1)
    );
    addKeyValue("Report Date", formatDateTime(report.reportDate));

    // Location - MongoDB already stores as UTF-8, use directly
    if (report.location) {
      addKeyValue("Location", report.location);
    }

    if (report.weather) addKeyValue("Weather", report.weather);

    // Notes section
    if (report.notes) {
      doc
        .fontSize(10)
        .fillColor("#666666")
        .text("Notes:", { continued: false })
        .fillColor("#000000")
        .fontSize(9)
        .text(report.notes, { align: "left", paragraphGap: 5 })
        .moveDown(0.3);
    }

    doc.moveDown();

    // Client Information
    if (report.clientData) {
      addSectionHeader("Client Information");
      addKeyValue("Name", report.clientData.name);
      if (report.clientData.company)
        addKeyValue("Company", report.clientData.company);
      if (report.clientData.email) addKeyValue("Email", report.clientData.email);
      if (report.clientData.phone) addKeyValue("Phone", report.clientData.phone);
      if (report.clientData.address?.street) {
        const addressParts = [
          report.clientData.address.street,
          report.clientData.address.city,
          report.clientData.address.state,
          report.clientData.address.zipCode,
        ].filter(Boolean);

        // MongoDB stores as UTF-8, use directly
        const address = addressParts.join(", ");
        addKeyValue("Address", address);
      }
      doc.moveDown();
    }

    // Work Order Information
    if (report.workOrderData) {
      addSectionHeader("Work Order Information");
      addKeyValue("Work Order #", report.workOrderData.number);
      addKeyValue("Title", report.workOrderData.title);
      if (report.workOrderData.description)
        addKeyValue("Description", report.workOrderData.description);
      addKeyValue("Status", report.workOrderData.status);
      addKeyValue("Priority", report.workOrderData.priority);
      doc.moveDown();
    }

    // Personnel Information
    addSectionHeader("Personnel");
    if (report.createdByData) {
      addKeyValue("Created By", report.createdByData.name);
      if (report.createdByData.role) {
        const roleTitle = getRoleTitle(report.createdByData.role);
        addKeyValue("Role", roleTitle);
      }
    }
    if (report.assignedToData) {
      addKeyValue("Assigned To", report.assignedToData.name);
      if (report.assignedToData.role) {
        const roleTitle = getRoleTitle(report.assignedToData.role);
        addKeyValue("Assigned Role", roleTitle);
      }
    }
    doc.moveDown();

    // Materials Used Section
    if (report.materialsUsed && report.materialsUsed.length > 0) {
      addSectionHeader("Materials Used");

      // Table header
      const tableTop = doc.y;
      doc
        .fontSize(9)
        .fillColor("#666666")
        .text("Material", 50, tableTop, { width: 200 })
        .text("Quantity", 260, tableTop, { width: 70 })
        .text("Unit Cost", 340, tableTop, { width: 70 })
        .text("Total", 420, tableTop, { width: 100 });

      doc
        .moveTo(50, doc.y + 5)
        .lineTo(545, doc.y + 5)
        .stroke("#cccccc");

      doc.moveDown(0.5);

      // Table rows
      doc.fillColor("#000000");
      report.materialsUsed.forEach((material: any) => {
        const y = doc.y;
        doc
          .fontSize(9)
          .text(material.material.name, 50, y, { width: 200 })
          .text(
            `${material.quantityUsed} ${material.material.unit}`,
            260,
            y,
            { width: 70 }
          )
          .text(`€${material.unitCost.toFixed(2)}`, 340, y, { width: 70 })
          .text(`€${material.totalCost.toFixed(2)}`, 420, y, { width: 100 });
        doc.moveDown(0.5);
      });

      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .fillColor("#666666")
        .text("Total Material Cost:", 340, doc.y, { continued: true })
        .fillColor("#000000")
        .text(` €${report.totalMaterialCost.toFixed(2)}`);
      doc.moveDown(1);
    }

    // Time Entries Section
    if (report.timeEntries && report.timeEntries.length > 0) {
      // Check if we need a new page
      if (doc.y > 650) doc.addPage();

      addSectionHeader("Time Entries");

      // Table header - align to left at x=50
      const tableTop = doc.y;
      doc.x = 50;
      doc
        .fontSize(9)
        .fillColor("#666666")
        .text("Description", 50, tableTop, { width: 150 })
        .text("Start Time", 210, tableTop, { width: 100 })
        .text("End Time", 320, tableTop, { width: 100 })
        .text("Duration", 430, tableTop, { width: 60 })
        .text("Category", 500, tableTop, { width: 60 });

      doc
        .moveTo(50, doc.y + 5)
        .lineTo(545, doc.y + 5)
        .stroke("#cccccc");

      doc.moveDown(0.5);

      // Table rows
      doc.fillColor("#000000");
      report.timeEntries.forEach((entry: any) => {
        const y = doc.y;
        const startTime = formatTimeEntry(entry.startTime);
        const endTime = formatTimeEntry(entry.endTime);
        const durationHours = (entry.duration / 60).toFixed(1);

        doc
          .fontSize(8)
          .text(entry.description, 50, y, { width: 150, height: 30 })
          .text(startTime, 210, y, { width: 100 })
          .text(endTime, 320, y, { width: 100 })
          .text(`${durationHours}h`, 430, y, { width: 60 })
          .text(entry.category, 500, y, { width: 60 });

        doc.moveDown(0.8);
      });

      doc.moveDown(0.5);
      if (report.totalHours) {
        doc
          .fontSize(10)
          .fillColor("#666666")
          .text("Total Hours:", 430, doc.y, { continued: true })
          .fillColor("#000000")
          .text(` ${report.totalHours.toFixed(2)}h`);
      }
      doc.moveDown(1);
    }

    // Cost Summary
    if (doc.y > 650) doc.addPage();

    addSectionHeader("Cost Summary");

    doc
      .fontSize(12)
      .fillColor("#666666")
      .text("Material Cost:", { continued: true })
      .fillColor("#000000")
      .text(` €${report.totalMaterialCost.toFixed(2)}`)
      .moveDown(0.3);

    doc
      .fontSize(12)
      .fillColor("#666666")
      .text("Labor Cost:", { continued: true })
      .fillColor("#000000")
      .text(` €${report.totalLaborCost.toFixed(2)}`)
      .moveDown(0.3);

    doc
      .moveTo(50, doc.y + 5)
      .lineTo(545, doc.y + 5)
      .stroke("#cccccc");

    doc.moveDown(0.5);

    doc
      .fontSize(14)
      .fillColor("#1976d2")
      .text("Total Cost:", { continued: true })
      .fillColor("#000000")
      .text(` €${report.totalCost.toFixed(2)}`);

    doc.moveDown(1.5);

    // Signatures Section - right after Cost Summary in a row
    if (report.signatures && report.signatures.length > 0) {
      if (doc.y > 600) doc.addPage();

      addSectionHeader("Signatures");

      // Display signatures in a horizontal row
      let signatureX = 50;
      const signatureWidth = (545 - 50) / Math.min(report.signatures.length, 3);
      const signatureY = doc.y;

      report.signatures.slice(0, 3).forEach((signature: any, index: number) => {
        const x = signatureX + index * signatureWidth;

        // Draw signature image if available
        if (signature.signatureData) {
          try {
            // The signatureData is base64 encoded image
            const base64Data = signature.signatureData.replace(
              /^data:image\/\w+;base64,/,
              ""
            );
            const imageBuffer = Buffer.from(base64Data, "base64");

            doc.image(imageBuffer, x, signatureY, {
              width: signatureWidth - 20,
              height: 60,
              fit: [signatureWidth - 20, 60],
            });

            doc.y = signatureY + 65;
          } catch (e) {
            // If image fails, just show text
            doc.y = signatureY;
          }
        }

        // Add signature details
        doc
          .fontSize(9)
          .fillColor("#666666")
          .text(signature.type.toUpperCase(), x, doc.y, {
            width: signatureWidth - 20,
          })
          .fontSize(8)
          .fillColor("#000000")
          .text(signature.signerName, x, doc.y + 2, {
            width: signatureWidth - 20,
          });

        if (signature.signerTitle) {
          doc
            .fontSize(7)
            .fillColor("#999999")
            .text(signature.signerTitle, x, doc.y + 2, {
              width: signatureWidth - 20,
            });
        }

        doc
          .fontSize(7)
          .fillColor("#999999")
          .text(`Signed: ${formatDateTime(signature.signedAt)}`, x, doc.y + 2, {
            width: signatureWidth - 20,
          });
      });

      // Move past the signatures
      doc.y = Math.max(doc.y, signatureY + 100);
      doc.moveDown(1);
    }

    // Attachments Section - with images (excluding signatures)
    if (report.attachments && report.attachments.length > 0) {
      // Filter out signature attachments as they're already displayed in the Signatures section
      const nonSignatureAttachments = report.attachments.filter(
        (att: any) => !att.originalName?.startsWith('signature-')
      );

      if (nonSignatureAttachments.length > 0) {
        if (doc.y > 650) doc.addPage();

        addSectionHeader("Attachments");

        // Ensure content is aligned to the left
        doc.x = 50;

        nonSignatureAttachments.forEach((attachment: any, index: number) => {
          // Check if this is an image attachment
          const isImage =
            attachment.mimetype?.startsWith("image/") ||
            /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.originalName);

        if (isImage && attachment.url) {
          try {
            // Extract the file path from the URL
            // URL format: http://localhost:3001/api/v1/uploads/{tenantId}/reports/{reportId}/{timestamp}-{filename}?token=...
            const url = new URL(attachment.url);
            const pathname = url.pathname; // Gets: /api/v1/uploads/{tenantId}/reports/{reportId}/{timestamp}-{filename}

            // Extract everything after /api/v1/uploads/
            const uploadsPrefix = '/api/v1/uploads/';
            let filePath = '';

            if (pathname.startsWith(uploadsPrefix)) {
              filePath = pathname.substring(uploadsPrefix.length);
            }

            // Now filePath should be: {tenantId}/reports/{reportId}/{timestamp}-{filename}
            const fullPath = path.join(process.cwd(), 'uploads', filePath);

            // Check if file exists
            if (fs.existsSync(fullPath)) {
              // Check if we need a new page for the image
              if (doc.y > 600) doc.addPage();

              doc
                .fontSize(9)
                .fillColor("#666666")
                .text(`${index + 1}. ${attachment.originalName}`)
                .moveDown(0.3);

              doc.image(fullPath, {
                width: 400,
                fit: [400, 300],
              });

              doc.moveDown(0.5);
            } else {
              // File doesn't exist, just show the name
              doc
                .fontSize(9)
                .fillColor("#666666")
                .text(`${index + 1}. ${attachment.originalName}`)
                .moveDown(0.2);
            }
          } catch (e) {
            // If image loading fails, just show the name
            doc
              .fontSize(9)
              .fillColor("#666666")
              .text(`${index + 1}. ${attachment.originalName}`)
              .moveDown(0.2);
          }
        } else {
          // Non-image file, just show the name
          doc
            .fontSize(9)
            .fillColor("#666666")
            .text(`${index + 1}. ${attachment.originalName}`)
            .moveDown(0.2);
        }
      });
      doc.moveDown(1);
      }
    }

    // Footer
    const pageHeight = doc.page.height;
    doc
      .fontSize(8)
      .fillColor("#999999")
      .text(
        `Generated on ${formatDateTime(new Date())}`,
        50,
        pageHeight - 50,
        { align: "center" }
      );

    // Finalize PDF
    doc.end();

    return doc;
  }
}
