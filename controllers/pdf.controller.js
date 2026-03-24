import PDFDocument from "pdfkit";
import capitalizeFirstLetter from "../utils/utilsFunctions.js";
import Entry from "../models/entry.model.js";

export const getPDFFileofTransactions = async (req, res, next) => {
  try {
    const { id } = req.user;

    // 1. Extract from query or fallback to current date
    // Expected query format: /entry/pdf?month=3&year=2026 (Note: month 0-11 or 1-12)
    const now = new Date();
    const selectedMonth = req.query.month
      ? parseInt(req.query.month) - 1
      : now.getMonth();
    const selectedYear = req.query.year
      ? parseInt(req.query.year)
      : now.getFullYear();

    // 2. Define the date range for the specific month
    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    // 3. Fetch filtered data
    const transactions = await Entry.find({
      userId: id,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: -1 });

    // 4. Manual Calculations
    const totals = transactions.reduce(
      (acc, t) => {
        if (t.amount > 0) acc.income += t.amount;
        else acc.expense += t.amount;
        return acc;
      },
      { income: 0, expense: 0 },
    );

    const netBalance = totals.income + totals.expense;

    // --- PDF Generation Logic ---
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    let chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const result = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Report_${selectedMonth + 1}_${selectedYear}.pdf`,
      );
      res.send(result);
    });

    const displayMonth = startOfMonth.toLocaleString("en-US", {
      month: "long",
    });

    // --- Visual Styling ---
    doc.rect(0, 0, 612, 100).fill("#1A237E");
    doc.fillColor("#FFFFFF").fontSize(24).text("BUDGETFOLIO", 40, 35);
    doc
      .fontSize(10)
      .text(`Statement Period: ${displayMonth} ${selectedYear}`, 40, 65);
    doc
      .fontSize(12)
      .text(`${req.user.fullName}`, 10, 80, { align: "right", width: 530 });

    // Summary Section
    let summaryY = 120;
    doc.fillColor("#444444").fontSize(10).text("MONTHLY SUMMARY", 40, summaryY);

    // Income Card
    doc.rect(40, summaryY + 15, 160, 50).fill("#E8F5E9");
    doc
      .fillColor("#2E7D32")
      .fontSize(9)
      .text("TOTAL INCOME", 50, summaryY + 25);
    doc
      .fontSize(12)
      .text(`+${totals.income.toLocaleString()}`, 50, summaryY + 40);

    // Expense Card
    doc.rect(215, summaryY + 15, 160, 50).fill("#FFEBEE");
    doc
      .fillColor("#C62828")
      .fontSize(9)
      .text("TOTAL EXPENSES", 225, summaryY + 25);
    doc
      .fontSize(12)
      .text(`${totals.expense.toLocaleString()}`, 225, summaryY + 40);

    // Balance Card
    doc.rect(390, summaryY + 15, 160, 50).fill("#E3F2FD");
    doc
      .fillColor("#1565C0")
      .fontSize(9)
      .text("NET BALANCE", 400, summaryY + 25);
    doc.fontSize(12).text(`${netBalance.toLocaleString()}`, 400, summaryY + 40);

    // --- Table Rendering ---
    let y = 210;
    doc.rect(40, y, 532, 25).fill("#303F9F");
    doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica-Bold");
    doc.text("DATE", 50, y + 8);
    doc.text("DESCRIPTION", 130, y + 8);
    doc.text("CATEGORY", 350, y + 8);
    doc.text("AMOUNT", 480, y + 8, { width: 80, align: "right" });

    y += 25;
    doc.font("Helvetica");

    if (transactions.length === 0) {
      doc
        .fillColor("#999999")
        .text("No transactions found for this period.", 40, y + 20, {
          align: "center",
          width: 532,
        });
    } else {
      transactions.forEach((trx, index) => {
        if (index % 2 === 0) doc.rect(40, y, 532, 25).fill("#F9F9F9");

        doc.fillColor("#333333").fontSize(9);
        doc.text(new Date(trx.date).toLocaleDateString("en-GB"), 50, y + 8);
        doc.text(trx.description?.substring(0, 35) || "N/A", 130, y + 8);
        doc.text(trx.category || "General", 350, y + 8);

        const isExp = trx.amount < 0;
        doc
          .fillColor(isExp ? "#D32F2F" : "#388E3C")
          .font("Helvetica-Bold")
          .text(trx.amount.toLocaleString(), 480, y + 8, {
            width: 80,
            align: "right",
          });

        doc.font("Helvetica");
        y += 25;

        if (y > 750) {
          doc.addPage();
          y = 50;
        }
      });
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};
