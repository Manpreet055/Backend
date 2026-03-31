import PDFDocument from "pdfkit";

/**
 * Generates a PDF buffer based on transaction data
 * @param {Object} user - User object containing fullName
 * @param {Array} transactions - Array of transaction objects
 * @param {Date} dateObj - The month/year being reported
 */
export const generateTransactionPDFBuffer = (user, transactions, dateObj) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    let chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

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

    // UPDATED LOGIC: Net Balance = Income - Expense (Debt excluded)
    const netBalance = totals.income - totals.expense;

    // --- PDF Header & Styling (Simplified for brevity) ---
    doc.rect(0, 0, 612, 100).fill("#111827");
    doc
      .fillColor("#22D3EE")
      .fontSize(28)
      .font("Helvetica-Bold")
      .text("Stitché", 40, 30);
    doc
      .fillColor("#FFFFFF")
      .fontSize(10)
      .font("Helvetica")
      .text("FINANCE", 42, 60, { characterSpacing: 2 });

    const displayMonth = dateObj.toLocaleString("en-US", { month: "long" });
    doc
      .fillColor("#9CA3AF")
      .fontSize(9)
      .text(`${displayMonth} ${dateObj.getFullYear()} Statement`, 40, 75);
    doc
      .fillColor("#FFFFFF")
      .fontSize(11)
      .text(`${user.fullName}`, 10, 50, { align: "right", width: 530 });

    // --- Summary Section ---
    let summaryY = 120;
    // Income
    doc.rect(40, summaryY + 15, 125, 50).fill("#ECFEFF");
    doc
      .fillColor("#0891B2")
      .fontSize(8)
      .text("INCOME", 45, summaryY + 25);
    doc
      .fontSize(10)
      .text(`+${totals.income.toLocaleString()}`, 45, summaryY + 40);

    // Debt (Liabilities)
    doc.rect(175, summaryY + 15, 125, 50).fill("#FFFBEB");
    doc
      .fillColor("#B45309")
      .fontSize(8)
      .text("MONTHLY DEBT", 180, summaryY + 25);
    doc
      .fontSize(10)
      .text(`+${totals.debt.toLocaleString()}`, 180, summaryY + 40);

    // Expense
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
      .text("NET CASH FLOW", 450, summaryY + 25);
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

          // redraw table header
          doc.rect(40, y, 532, 25).fill("#111827");
          doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica-Bold");
          doc.text("DATE", 50, y + 8);
          doc.text("DESCRIPTION", 130, y + 8);
          doc.text("TYPE", 350, y + 8);
          doc.text("AMOUNT", 480, y + 8, { width: 80, align: "right" });

          y += 25;
          doc.font("Helvetica");
        }
      });
    }

    doc.end();
  });
};
