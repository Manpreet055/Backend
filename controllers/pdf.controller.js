import { generateTransactionPDFBuffer } from "../utils/generatePDFBuffer.js";
import Entry from "../models/entry.model.js";
import User from "../models/user.model.js";
import { getPreviousMonthRange } from "../utils/utilsFunctions.js";
import nodemailer from "nodemailer";
import emailHtmlData from "../utils/emailHtmlData.js";
import { configDotenv } from "dotenv";
configDotenv();

export const getPDFFileofTransactions = async (req, res, next) => {
  try {
    const { id } = req.user;
    const { month, year } = req.query;
    const now = new Date();
    const selectedMonth = month ? parseInt(month) - 1 : now.getMonth();
    const selectedYear = year ? parseInt(year) : now.getFullYear();

    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    const transactions = await Entry.find({
      userId: id,
      createdAt: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    // Call the utility
    const pdfBuffer = await generateTransactionPDFBuffer(
      req.user,
      transactions,
      start,
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Stitche_Report_${selectedMonth + 1}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

export const sendMonthlyEmailWithPDF = async () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email credentials are missing in environment variables");
  }
  const verify = await transporter.verify();
  console.log(verify);

  try {
    console.log("⏰ Cron process started...");

    const { firstDayPrevMonth, lastDayPrevMonth } = getPreviousMonthRange();
    const monthName = firstDayPrevMonth.toLocaleString("default", {
      month: "long",
    });
    const monthNum = firstDayPrevMonth.getMonth() + 1;
    const year = firstDayPrevMonth.getFullYear();
    const users = await User.find({});

    for (const user of users) {
      console.log(user.id);

      const transactions = await Entry.find({
        userId: user.id,
        createdAt: { $gte: firstDayPrevMonth, $lte: lastDayPrevMonth },
      }).sort({ date: -1 });

      console.log(transactions);

      // // Use the SHARED utility to get the PDF buffer
      // const pdfBuffer = await generateTransactionPDFBuffer(user, transactions, firstDayPrevMonth);

      // try {
      //   const info = await transporter.sendMail({
      //     from: process.env.EMAIL_USER,
      //     to: user.email,
      //     replyTo: process.env.EMAIL_USER, // This ensures replies go to your actual email
      //     subject: `Monthly Financial Statement - ${monthName} ${year}`,
      //     html: emailHtmlData({ user, firstDayPrevMonth }),
      //     attachments: [
      //       {
      //         filename: `Stitché Finance_Report_${monthNum}_${year}.pdf`,
      //         content: pdfBuffer,
      //         contentType: 'application/pdf'
      //       }
      //     ]
      //   });

      //   console.log(info)
      // } catch (error) {
      //   console.error(`Failed for ${user.email}`, error.message);

      // }
      // console.log("Cron process end.");
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.error("Cron Process Failed:", error.message);
  }
};
