exports.docDefinition = {
  content: [
    { text: "Monthly Transaction Report", style: "header" },
    {
      table: {
        headerRows: 1,
        widths: ["auto", "*", "auto", "auto"],
        body: tableBody,
      },
      layout: "lightHorizontalLines",
    },
  ],
  styles: {
    header: {
      fontSize: 20,
      bold: true,
      margin: [0, 0, 0, 20],
      alignment: "center",
    },
    tableHeader: {
      bold: true,
      fontSize: 12,
      color: "black",
      fillColor: "#eeeeee",
    },
  },
};
