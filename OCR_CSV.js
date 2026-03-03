// import React, { useRef, useState } from "react";
// import Papa from "papaparse";
// import * as XLSX from "xlsx";
// import toast from "react-hot-toast";

// function toCamelCase(str) {
//   return str
//     .toLowerCase()
//     .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase());
// }

// function convertToISO(input) {
//   // Split the input string by '/'
//   const [month, day, year] = input.split(".");

//   // Add '20' to the year to convert it from YY to YYYY
//   const fullYear = `20${year}`;

//   // Create a new Date object
//   const date = new Date(`${fullYear}-${month}-${day}`);

//   // Convert to the desired ISO string format
//   console.log("date", date);
//   const isoString = date?.toISOString();

//   return isoString;
// }

// const CsvUploader = ({ setImportedData, toggleModal }) => {
//   const handleFileUpload = (event) => {
//     const file = event.target.files[0];
//     if (!file) return;

//     const fileExtension = file.name.split(".").pop().toLowerCase();

//     if (fileExtension === "csv") {
//       Papa.parse(file, {
//         header: true, // Set to true if your CSV has headers
//         complete: (result) => {
//           const filteredData = result.data.filter((row) =>
//             Object.values(row).some((value) => value !== null && value !== "")
//           );
//           console.log("Parsed CSV Data:", filteredData);
//           setImportedData(filteredData);
//           toggleModal();
//         },
//         error: (error) => {
//           console.error("Error parsing CSV:", error);
//         },
//       });
//     } else if (fileExtension === "xlsx" || fileExtension === "xls") {
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         const binaryStr = e.target.result;
//         const workbook = XLSX.read(binaryStr, { type: "binary" });
//         const sheetName = workbook.SheetNames[0];
//         const sheet = workbook.Sheets[sheetName];
//         const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

//         const [keys, ...rows] = jsonData.filter((row) =>
//           row.some((value) => value !== null && value !== "")
//         );
//         const formattedKeys = keys.map(toCamelCase);
//         const parsedData = rows.map((row) =>
//           row.reduce((acc, value, index) => {
//             let formattedValue = value;
//             if (formattedKeys[index] === "dateFiled") {
//               formattedValue = convertToISO(value);
//             }
//             acc[formattedKeys[index]] = formattedValue;
//             return acc;
//           }, {})
//         );
//         console.log("Parsed Excel Data:", parsedData);
//         setImportedData(parsedData);
//         toggleModal();
//       };
//       reader.readAsArrayBuffer(file);
//     } else {
//       toast.error("Please upload a valid CSV or Excel file");
//     }
//   };

//   const inputRef = useRef();

//   return (
//     <div>
//       <input
//         type="file"
//         accept=".csv, .xlsx, .xls"
//         ref={inputRef}
//         style={{ display: "none" }}
//         onChange={handleFileUpload}
//       />
//       <button
//         className="btn btn-primary fw-medium"
//         style={{ fontSize: ".875rem" }}
//         onClick={() => inputRef.current.click()}
//       >
//         <i class="bi bi-upload pe-2"></i>
//         Import CSV
//       </button>
//     </div>
//   );
// };

// export default CsvUploader;
import React, { useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

// Convert column headers to camelCase
function toCamelCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase());
}

// Convert date string in MM.DD.YYYY format to ISO
function convertToISO(input) {
  if (!input || typeof input !== "string") return "";

  console.log("input", input);

  // Replace multiple dots with a single dot
  const cleaned = input.replace(/\.+/g, ".");

  const parts = cleaned.split(".");
  if (parts.length !== 3) return "";

  const [month, day, year] = parts;

  // Validate that all parts are numbers
  if (isNaN(month) || isNaN(day) || isNaN(year)) return "";

  try {
    const date = new Date(`${year}-${month}-${day}`);
    return date.toISOString();
  } catch (err) {
    return "";
  }
}

function convertToISO2(input) {
  if (!input || typeof input !== "string") return "";

  console.log("input", input);

  // Remove "input " prefix if present
  const cleaned = input.replace(/^input\s+/i, "").trim();

  try {
    // Parse the date string (handles formats like "Dec 16, 2024")
    const date = new Date(cleaned);

    // Check if date is valid
    if (isNaN(date.getTime())) return "";

    return date.toISOString();
  } catch (err) {
    return "";
  }
}

const CsvUploader = ({ setImportedData, toggleModal }) => {
  const inputRef = useRef();

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (fileExtension === "csv") {
      Papa.parse(file, {
        header: true,
        complete: (result) => {
          const filteredData = result.data.filter((row) =>
            Object.values(row).some((value) => value !== null && value !== "")
          );
          console.log("Parsed CSV Data:", filteredData);
          setImportedData(filteredData);
          toggleModal();
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
        },
      });
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const binaryStr = e.target.result;
        const workbook = XLSX.read(binaryStr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        console.log("jsonData", jsonData);

        const parsedData = jsonData.map((row) => {
          const formattedRow = {};
          for (let key in row) {
            const camelKey = toCamelCase(key);
            // console.log("camel", camelKey, row[key]);
            formattedRow[camelKey] =
              camelKey === "dateFiled" ? convertToISO2(row[key]) : row[key];
          }
          return formattedRow;
        });

        console.log("Parsed Excel Data:", parsedData);
        setImportedData(parsedData);
        toggleModal();
      };
      reader.readAsBinaryString(file);
    } else {
      toast.error("Please upload a valid CSV or Excel file");
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".csv, .xlsx, .xls"
        ref={inputRef}
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />
      <button
        className="btn btn-primary fw-medium"
        style={{ fontSize: ".875rem" }}
        onClick={() => inputRef.current.click()}
      >
        <i className="bi bi-upload pe-2"></i>
        Import CSV
      </button>
    </div>
  );
};

export default CsvUploader;
