import PDFDocument from "pdfkit";
import Entry from "../models/entry.model.js";

export const getPDFFileofTransactions = async (req, res, next) => {
  try {
    const { id } = req.user;
    const { month, year } = req.query;

    const now = new Date();
    const selectedMonth = month ? parseInt(month) - 1 : now.getMonth();
    const selectedYear = year ? parseInt(year) : now.getFullYear();

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    const transactions = await Entry.find({
      userId: id,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: -1 });

    const totals = transactions.reduce(
      (acc, t) => {
        const absAmt = Math.abs(t.amount);
        if (t.transactionType === "Income") acc.income += absAmt;
        else if (t.transactionType === "Debt") acc.debt += absAmt;
        else acc.expense += absAmt;
        return acc;
      },
      { income: 0, expense: 0, debt: 0 },
    );

    const netBalance = totals.income + totals.debt - totals.expense;

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    let chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Stitche_Report_${selectedMonth + 1}_${selectedYear}.pdf`,
      );
      res.send(Buffer.concat(chunks));
    });

    // --- CUSTOM BRANDED HEADER (Stitché Finance) ---
    // Background Header Bar
    doc.rect(0, 0, 612, 100).fill("#111827"); // Dark background to match 'dark:text-white' vibe

    // "Stitché" - Main Heading
    doc
      .fillColor("#22D3EE") // cyan-400
      .fontSize(28)
      .font("Helvetica-Bold")
      .text("Stitché", 40, 30);

    // "FINANCE" - Subtitle
    doc
      .fillColor("#FFFFFF")
      .fontSize(10)
      .font("Helvetica")
      .text("FINANCE", 42, 60, { characterSpacing: 2 });

    const displayMonth = startOfMonth.toLocaleString("en-US", {
      month: "long",
    });
    doc
      .fillColor("#9CA3AF") // gray-400
      .fontSize(9)
      .text(`${displayMonth} ${selectedYear} Statement`, 40, 75);

    doc
      .fillColor("#FFFFFF")
      .fontSize(11)
      .text(`${req.user.fullName}`, 10, 50, { align: "right", width: 530 });

    // --- SUMMARY SECTION ---
    let summaryY = 120;
    doc
      .fillColor("#4B5563")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("MONTHLY SUMMARY", 40, summaryY);

    // Income (Cyan)
    doc.rect(40, summaryY + 15, 125, 50).fill("#ECFEFF");
    doc
      .fillColor("#0891B2")
      .fontSize(8)
      .text("INCOME", 45, summaryY + 25);
    doc
      .fontSize(10)
      .text(`+${totals.income.toLocaleString()}`, 45, summaryY + 40);

    // Debt (Amber)
    doc.rect(175, summaryY + 15, 125, 50).fill("#FFFBEB");
    doc
      .fillColor("#B45309")
      .fontSize(8)
      .text("DEBT/LOANS", 180, summaryY + 25);
    doc
      .fontSize(10)
      .text(`+${totals.debt.toLocaleString()}`, 180, summaryY + 40);

    // Expense (Red)
    doc.rect(310, summaryY + 15, 125, 50).fill("#FEF2F2");
    doc
      .fillColor("#B91C1C")
      .fontSize(8)
      .text("EXPENSES", 315, summaryY + 25);
    doc
      .fontSize(10)
      .text(`-${totals.expense.toLocaleString()}`, 315, summaryY + 40);

    // Net Balance
    doc.rect(445, summaryY + 15, 125, 50).fill("#EFF6FF");
    doc
      .fillColor("#1D4ED8")
      .fontSize(8)
      .text("NET BALANCE", 450, summaryY + 25);
    doc.fontSize(10).text(`${netBalance.toLocaleString()}`, 450, summaryY + 40);

    // --- TABLE ---
    let y = 210;
    doc.rect(40, y, 532, 25).fill("#111827");
    doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica-Bold");
    doc.text("DATE", 50, y + 8);
    doc.text("DESCRIPTION", 130, y + 8);
    doc.text("TYPE", 350, y + 8);
    doc.text("AMOUNT", 480, y + 8, { width: 80, align: "right" });

    y += 25;
    doc.font("Helvetica");

    if (transactions.length === 0) {
      doc
        .fillColor("#6B7280")
        .text("No records found.", 40, y + 20, { align: "center", width: 532 });
    } else {
      transactions.forEach((trx, index) => {
        if (index % 2 === 0) doc.rect(40, y, 532, 25).fill("#F9FAFB");

        doc.fillColor("#374151").fontSize(8);
        doc.text(new Date(trx.date).toLocaleDateString("en-GB"), 50, y + 8);
        doc.text(trx.description?.substring(0, 40) || "N/A", 130, y + 8);
        doc.text(trx.transactionType, 350, y + 8);

        let rowColor = "#0891B2"; // Cyan for Income
        let prefix = "+";

        if (trx.transactionType === "Expense") {
          rowColor = "#B91C1C"; // Red
          prefix = "-";
        } else if (trx.transactionType === "Debt") {
          rowColor = "#B45309"; // Amber
          prefix = "+";
        }

        doc
          .fillColor(rowColor)
          .font("Helvetica-Bold")
          .text(
            `${prefix}${Math.abs(trx.amount).toLocaleString()}`,
            480,
            y + 8,
            { width: 80, align: "right" },
          );

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
