const emailHtmlData = ({ user, firstDayPrevMonth }) => {
  const monthName = firstDayPrevMonth.toLocaleString("default", {
    month: "long",
  });
  const monthNum = firstDayPrevMonth.getMonth() + 1;
  const year = firstDayPrevMonth.getFullYear();

  return `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #111827; padding: 20px; text-align: center;">
                <h1 style="color: #22d3ee; margin: 0; font-size: 24px;">Stitché Finance</h1>
            </div>
            <div style="padding: 30px; color: #374151; line-height: 1.6;">
                <h2 style="color: #111827; margin-top: 0;">Monthly Activity Report</h2>
                <p>Hello <strong>${user.fullName}</strong>,</p>
                <p>Your financial summary for <strong>${monthName} ${year}</strong> is now ready. We have analyzed your transactions and compiled a detailed PDF report for your review.</p>
                
                <div style="background-color: #f9fafb; border-left: 4px solid #22d3ee; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">Attached Document:</p>
                    <p style="margin: 5px 0 0 0; font-weight: bold;">Stitche_Report_${monthNum}_${year}.pdf</p>
                </div>

                <p>This report includes:</p>
                <ul style="padding-left: 20px;">
                    <li>Income and Expense breakdown</li>
                    <li>Net cash flow analysis</li>
                    <li>Monthly debt tracking (Liabilities)</li>
                </ul>

                <p>If you notice any discrepancies or have questions regarding your transactions, please log in to your dashboard or reply to this email.</p>
                
                <p style="margin-top: 30px;">Best regards,<br>
                <strong>The Stitché Finance Team</strong></p>
            </div>
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
                <p style="margin: 0;">&copy; ${new Date().getFullYear()} Stitché Finance. All rights reserved.</p>
                <p style="margin: 5px 0 0 0;">This is an automated monthly report. Please do not share this PDF with unauthorized parties.</p>
            </div>
        </div>
        `;
};

export default emailHtmlData;
