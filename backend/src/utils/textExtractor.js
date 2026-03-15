const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const ExcelJS = require('exceljs');

exports.extractText = async (file) => {
  if (file.mimetype === 'application/pdf') {
    const data = await pdf(file.buffer);
    return data.text;
  }

  if (file.mimetype.includes('word')) {
    const { value } = await mammoth.extractRawText({ buffer: file.buffer });
    return value;
  }

if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    let fullText = "";
    workbook.eachSheet(sheet => {
        sheet.eachRow(row => {
            fullText += row.values.join(", ") + "\n";
        });
    });
    extractedText = fullText.slice(0, 10000); // Prevents LLM overload
    return this.extractText
}

  return '';
};
