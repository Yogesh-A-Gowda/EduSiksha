import { jsPDF } from "jspdf";

/**
 * Generates a multi-page PDF Question Paper.
 * Connected to: StudentReport.tsx via generateQPMutation.onSuccess
 */
export const generateQuestionPaperPDF = (studentName, rawText) => {
  console.log("PDF: Starting generation for", studentName);
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxLineWidth = pageWidth - (margin * 2);
  let cursorY = 40; // Starting Y position

  // 1. Header (Only on Page 1)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("STUDENT ASSESSMENT: QUESTION PAPER", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Student: ${studentName}`, margin, 30);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, 30, { align: "right" });
  doc.line(margin, 35, pageWidth - margin, 35); // Divider line

  // 2. Body Text Logic
  const lineHeight = 8;
  doc.setFontSize(11);

  // Split text into lines that automatically wrap
  const lines = doc.splitTextToSize(rawText, maxLineWidth);

  lines.forEach((line) => {
    // Check if we reached the end of the current page
    // (pageHeight - margin) gives us a buffer at the bottom
    if (cursorY + lineHeight > pageHeight - margin) {
      console.log("PDF: Limit reached, adding new page...");
      doc.addPage();
      cursorY = 25; // Reset Y to the top of the NEW page
      
      // Optional: Add a small page number or header on new pages
      doc.setFontSize(8);
      doc.text(`- Page ${doc.internal.getNumberOfPages()} -`, pageWidth / 2, 10, { align: "center" });
      doc.setFontSize(11);
    }
    
    doc.text(line, margin, cursorY);
    cursorY += lineHeight;
  });

  console.log(`PDF: Generation complete. Total Pages: ${doc.internal.getNumberOfPages()}`);
  doc.save(`Exam_${studentName.replace(/\s+/g, '_')}.pdf`);
};