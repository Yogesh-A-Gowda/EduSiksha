import { jsPDF } from 'jspdf';

export const generateQuestionPaperPDF = (studentName: string, content: string) => {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString();

  // Header
  doc.setFontSize(20);
  doc.text("Question Paper", 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Student: ${studentName}`, 20, 40);
  doc.text(`Date: ${date}`, 20, 50);
  doc.line(20, 55, 190, 55); // Horizontal line

  // Content handling (Word Wrap)
  doc.setFontSize(11);
  const splitContent = doc.splitTextToSize(content, 170);
  doc.text(splitContent, 20, 65);

  // Download the file
  doc.save(`Question_Paper_${studentName.replace(/\s+/g, '_')}.pdf`);
};