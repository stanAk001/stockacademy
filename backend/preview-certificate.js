import PDFDocument from 'pdfkit';
import fs from 'fs';

// Sample data for preview
const cert = {
  full_name: 'Akeem Gbolahan',
  certificate_number: 'SA-2026-000001',
  verification_token: 'sample1234567890abcdef',
  issued_at: new Date(),
};

const CLIENT_URL = 'https://stocklearning-phi.vercel.app';

function generatePDF(cert) {
  const doc = new PDFDocument({
    layout: 'landscape',
    size: 'A4',
    margin: 0,
  });

  const stream = fs.createWriteStream('certificate-preview.pdf');
  doc.pipe(stream);

  const W = doc.page.width;
  const H = doc.page.height;

  doc.rect(0, 0, W, H).fill('#FDF8F0');
  doc.rect(30, 30, W - 60, H - 60).lineWidth(2).stroke('#0F1419');
  doc.rect(45, 45, W - 90, H - 90).lineWidth(0.5).stroke('#0F1419');
  doc.rect(45, 45, W - 90, 8).fill('#FBBF24');
  doc.rect(45, H - 53, W - 90, 8).fill('#FB7185');

  doc
    .fillColor('#0F1419')
    .font('Helvetica-Bold')
    .fontSize(20)
    .text('StockAcademia', 0, 90, { align: 'center', width: W });

  doc
    .fillColor('#0F1419')
    .font('Helvetica')
    .fontSize(10)
    .text('CERTIFICATE OF COMPLETION', 0, 115, { align: 'center', width: W, characterSpacing: 4 });

  doc
    .moveTo(W / 2 - 80, 150)
    .lineTo(W / 2 + 80, 150)
    .lineWidth(1)
    .stroke('#FBBF24');

  doc
    .fillColor('#0F1419')
    .font('Helvetica-Oblique')
    .fontSize(14)
    .text('This is to certify that', 0, 175, { align: 'center', width: W });

  doc
    .fillColor('#0F1419')
    .font('Helvetica-Bold')
    .fontSize(42)
    .text(cert.full_name, 0, 210, { align: 'center', width: W });

  const nameWidth = doc.widthOfString(cert.full_name);
  const nameX = (W - nameWidth) / 2;
  doc
    .moveTo(nameX - 20, 270)
    .lineTo(nameX + nameWidth + 20, 270)
    .lineWidth(1)
    .stroke('#0F1419');

  doc
    .fillColor('#0F1419')
    .font('Helvetica')
    .fontSize(13)
    .text('has successfully completed all 6 courses and quizzes in the', 0, 295, { align: 'center', width: W });

  doc
    .fillColor('#FB7185')
    .font('Helvetica-Bold')
    .fontSize(22)
    .text('Complete Stock Market Education Program', 0, 320, { align: 'center', width: W });

  doc
    .fillColor('#0F1419')
    .font('Helvetica')
    .fontSize(11)
    .fillOpacity(0.6)
    .text('covering Market Basics · Earning from Stocks · Fundamental Analysis ·', 0, 360, { align: 'center', width: W });
  doc
    .text('Technical Analysis · Risk Management · Trading Strategies', 0, 376, { align: 'center', width: W });

  doc.fillOpacity(1);

  const date = new Date(cert.issued_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const colY = H - 130;

  doc
    .fillColor('#0F1419')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('DATE OF ISSUE', 100, colY, { characterSpacing: 2 });
  doc
    .font('Helvetica')
    .fontSize(12)
    .text(date, 100, colY + 18);
  doc
    .moveTo(100, colY + 38)
    .lineTo(220, colY + 38)
    .lineWidth(0.5)
    .stroke('#0F1419');

  doc
    .fillColor('#0F1419')
    .font('Helvetica-Oblique')
    .fontSize(18)
    .text('Akeem Gbolahan', W / 2 - 60, colY - 5);
  doc
    .moveTo(W / 2 - 80, colY + 28)
    .lineTo(W / 2 + 100, colY + 28)
    .lineWidth(0.5)
    .stroke('#0F1419');
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('FOUNDER, STOCKACADEMIA', W / 2 - 80, colY + 35, { characterSpacing: 2 });

  doc
    .fillColor('#0F1419')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('CERTIFICATE NUMBER', W - 220, colY, { characterSpacing: 2 });
  doc
    .font('Courier')
    .fontSize(11)
    .text(cert.certificate_number, W - 220, colY + 18);
  doc
    .moveTo(W - 220, colY + 38)
    .lineTo(W - 100, colY + 38)
    .lineWidth(0.5)
    .stroke('#0F1419');

  const verifyUrl = `${CLIENT_URL.replace(/^https?:\/\//, '')}/verify/${cert.verification_token}`;
  doc
    .fillColor('#0F1419')
    .fillOpacity(0.5)
    .font('Helvetica')
    .fontSize(8)
    .text(`Verify authenticity at: ${verifyUrl}`, 0, H - 70, { align: 'center', width: W });

  doc.fillOpacity(1);
  doc.end();

  stream.on('finish', () => {
    console.log('✅ Certificate preview saved as: certificate-preview.pdf');
    console.log('📂 Open it from your backend folder.');
  });
}

generatePDF(cert);