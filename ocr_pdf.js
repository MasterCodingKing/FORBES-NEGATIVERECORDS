import React, { useRef } from "react";
import * as pdfjsLib from "pdfjs-dist/webpack";
import Tesseract from "tesseract.js";
import toast from "react-hot-toast";

let dateFiled = "";

const cleanString = (str) => {
  return str.replace(/^[.,'"]+|[.,'"]+$/g, "").trim();
};

// const parseName = (fullNameRaw) => {
//   let fullName = cleanString(fullNameRaw);
//   let alias = "";

//   // 1. Extract alias first
//   const aliasMatch = fullName.match(/\bALIAS\s+(.*)$/i);
//   if (aliasMatch) {
//     alias = cleanString(aliasMatch[1]);
//     fullName = fullName.replace(/\bALIAS\s+.*/i, "").trim(); // remove alias portion
//   }

//   // 2. Handle 'Y' as middle-last connector
//   const ySplit = fullName.split(/\s+Y\s+/i);
//   let mainPart = ySplit[0].trim();
//   let yPart = ySplit[1] ? cleanString(ySplit[1]) : "";

//   const parts = mainPart.split(/\s+/);
//   const namePrefixes = ["DEL", "DELA", "DE", "MC", "VON"];

//   let firstName = "";
//   let middleName = "";
//   let lastName = "";

//   if (parts.length >= 3) {
//     firstName = parts[0];
//     middleName = parts[1];

//     // Combine prefix+lastname (e.g., DEL ROSARIO)
//     const lastParts = parts.slice(2);
//     for (let i = 0; i < lastParts.length - 1; i++) {
//       if (namePrefixes.includes(lastParts[i].toUpperCase())) {
//         lastParts[i] = lastParts[i] + " " + lastParts[i + 1];
//         lastParts.splice(i + 1, 1);
//         break;
//       }
//     }
//     lastName = lastParts.join(" ");
//   } else if (parts.length === 2) {
//     firstName = parts[0];
//     lastName = parts[1];
//   } else {
//     firstName = parts[0];
//   }

//   // Use Y part as lastName if exists
//   if (yPart) {
//     lastName = yPart;
//   }

//   return {
//     firstName: cleanString(firstName),
//     middleName: cleanString(middleName),
//     lastName: cleanString(lastName),
//     alias,
//   };
// };

const parseName = (fullNameRaw) => {
  const namePrefixes = [
    "DEL",
    "DELA",
    "DELOS",
    "SAN",
    "SANTA",
    "STA.",
    "DE",
    "MC",
    "VON",
  ];
  let fullName = cleanString(fullNameRaw);
  let alias = "";

  // Step 1: Extract alias
  const aliasMatch = fullName.match(/(?:@|ALIAS)\s*(.*)$/i);
  if (aliasMatch) {
    alias = cleanString(aliasMatch[1]);
    fullName = fullName.replace(/(?:@|ALIAS)\s*.*$/i, "").trim();
  }

  // Step 2: Handle "Y" — treat as middle/last split
  const ySplit = fullName.split(/\s+Y\s+/i);
  let beforeY = fullName;
  let afterY = "";

  if (ySplit.length === 2) {
    beforeY = ySplit[0].trim();
    afterY = cleanString(ySplit[1]);
  }

  const parts = beforeY.split(/\s+/);
  let firstName = "";
  let middleName = "";
  let lastName = "";

  // Step 3: Middle initial detection (M., V., etc.)
  const middleDotIndex = parts.findIndex((p) => /^[A-Z]\.$/.test(p));
  if (middleDotIndex > 0) {
    firstName = parts.slice(0, middleDotIndex).join(" ");
    middleName = parts[middleDotIndex];
    lastName = parts.slice(middleDotIndex + 1).join(" ");
  } else {
    // Step 4: If "Y" present
    if (afterY) {
      if (parts.length >= 2) {
        firstName = parts[0];
        middleName = parts.slice(1).join(" ");
      } else {
        firstName = beforeY;
      }
      lastName = afterY;
    }
    // Step 5: No Y, fallback handling
    else if (parts.length === 2) {
      firstName = parts[0];
      lastName = parts[1];
    } else if (parts.length >= 3) {
      firstName = parts.slice(0, parts.length - 2).join(" ");
      middleName = parts[parts.length - 2];
      lastName = parts[parts.length - 1];
    } else {
      firstName = parts[0];
    }
  }

  // Step 6: Combine last name prefix (e.g. DEL ROSARIO)
  if (lastName) {
    const tokens = lastName.split(" ");
    for (let i = 0; i < tokens.length - 1; i++) {
      if (namePrefixes.includes(tokens[i].toUpperCase())) {
        tokens[i] = tokens[i] + " " + tokens[i + 1];
        tokens.splice(i + 1, 1);
        break;
      }
    }
    lastName = tokens.join(" ");
  }

  return {
    firstName: cleanString(firstName),
    middleName: cleanString(middleName),
    lastName: cleanString(lastName),
    alias: cleanString(alias),
  };
};

// const parseName = (fullNameRaw) => {
//   console.log("fullNameRaw", fullNameRaw);
//   const fullName = cleanString(fullNameRaw);

//   const namePrefixes = [
//     "DEL",
//     "DELA",
//     "DELOS",
//     "SAN",
//     "SANTA",
//     "STA.",
//     "DE",
//     "MC",
//     "VON",
//   ];
//   let alias = "";
//   let firstName = "";
//   let middleName = "";
//   let lastName = "";

//   let raw = fullName;

//   // --- Step 1: Extract alias ---
//   const aliasMatch = raw.match(/(?:@|ALIAS)\s*(.*)$/i);
//   if (aliasMatch) {
//     alias = cleanString(aliasMatch[1]);
//     raw = raw.replace(/(?:@|ALIAS)\s*(.*)$/i, "").trim();
//   }

//   // --- Step 2: Handle 'Y' separator (everything after is Last Name) ---
//   const ySplit = raw.split(/\s+Y\s+/i);
//   if (ySplit.length === 2) {
//     raw = ySplit[0].trim();
//     lastName = cleanString(ySplit[1]);
//   }

//   const parts = raw.split(/\s+/);

//   // --- Step 3: Detect Middle Initial (with .) ---
//   let middleInitialIndex = parts.findIndex((p) => /\w+\./.test(p));
//   if (middleInitialIndex > 0) {
//     middleName = parts[middleInitialIndex];

//     // First name = all before middle
//     firstName = parts.slice(0, middleInitialIndex).join(" ");

//     // Last name = all after middle
//     const afterMiddle = parts.slice(middleInitialIndex + 1);
//     if (!lastName && afterMiddle.length > 0) {
//       // Check for name prefixes
//       for (let i = 0; i < afterMiddle.length - 1; i++) {
//         if (namePrefixes.includes(afterMiddle[i].toUpperCase())) {
//           afterMiddle[i] = afterMiddle[i] + " " + afterMiddle[i + 1];
//           afterMiddle.splice(i + 1, 1);
//           break;
//         }
//       }
//       lastName = afterMiddle.join(" ");
//     }
//   }

//   // --- Step 4: Fallback if no middle initial ---
//   if (!firstName && !middleName) {
//     if (parts.length === 2) {
//       firstName = parts[0];
//       lastName = parts[1];
//     } else if (parts.length >= 3) {
//       firstName = parts[0];
//       middleName = parts.slice(1, parts.length - 1).join(" ");
//       lastName = parts[parts.length - 1];
//     } else {
//       firstName = parts[0];
//     }
//   }

//   return {
//     firstName: cleanString(firstName),
//     middleName: cleanString(middleName),
//     lastName: cleanString(lastName),
//     alias: cleanString(alias),
//   };
// };

function extractDate(ocrText) {
  // Find the "List of Raffled Cases" marker
  const marker = "List of Raffled Cases";
  const markerIndex = ocrText.indexOf(marker);

  if (markerIndex !== -1) {
    // Extract the portion of text after the marker
    const textAfterMarker = ocrText.slice(markerIndex + marker.length).trim();

    // Find the date using a regex pattern (e.g., "Month Day, Year" format)
    const datePattern = /([A-Za-z]+\s\d{2},\s\d{4})/;
    const dateMatch = textAfterMarker.match(datePattern);

    if (dateMatch) {
      return dateMatch[0]; // Return the matched date
    }
  }

  return null; // Return null if no date is found
}

function groupRowsByNumber(text) {
  const groupedRows = [];
  let currentRow = null;

  // Regular expression to find row numbers and their content
  const regex = /(\d+)\)(.*?)(?=\d+\)|$)/gs;
  let match;

  // Process each match
  while ((match = regex.exec(text)) !== null) {
    const rowNumber = match[1];
    const content = match[2].trim();

    // If there's an ongoing row and it's not the first one, push the accumulated content to results
    if (currentRow && currentRow.number === rowNumber) {
      currentRow.content += `\n${content}`;
    } else {
      if (currentRow) {
        groupedRows.push(currentRow.content);
      }
      currentRow = { number: rowNumber, content: content };
    }
  }

  // Push the content of the last row if it exists
  if (currentRow) {
    groupedRows.push(currentRow.content);
  }

  return groupedRows;
}

// const getName = (text) => {
//   const match = text.match(/VS\.\s*(.*?)\s+(MeTC BRANCH|Violation|Reckless|Unjust|Attempted|Physical|Other Laws|Regular Court|Tax Court)/i);

//   if (!match) return [];

//   const accusedPart = match[1].trim();

//   // Split by comma for multiple accused
//   return accusedPart
//     .split(",")
//     .map((name) => cleanString(name))
//     .filter(Boolean);
// };

// const getName = (text) => {
//   // Match only the part between "VS." and "BRANCH"
//   const match = text.match(
//     /VS\.\s*(.*?)\s+(Violation|Physical Injuries|Unjust|Other Laws|MeTC BRANCH|MTC BRANCH|Regular Court|Tax Court)/i
//   );

//   if (!match) return [];

//   const accusedPart = match[1].trim();

//   // Split by comma assuming multiple people
//   return accusedPart
//     .split(",")
//     .map((name) => cleanString(name))
//     .filter(Boolean);
// };

const getNatureOfCase = (text) => {
  // Define the regular expression to match the text between "VS." and "MeTC BRANCH"
  const matchRegex = /VS\.\s(.*?)\sMeTC BRANCH/;
  const matchResult = text.match(matchRegex);
  // Use the regular expression to find the match
  const match = matchResult
    ? matchResult[1]
        .replace(/[,.\s]+$/, "")
        .replace(/[\s,~.\-!;:?()]*\b[A-Z]+\b[\s,~.\-!;:?()]*\b/g, "")
        .trim()
    : "";
  console.warn("matchResult", matchResult);
  const continuation = text
    .split("\n")
    .slice(1)
    .join(" ")
    .split(/Manila City Hall|Excluded Division\/s:/)[0]
    .replace(/\b[A-Z]+\b/g, "") // Remove uppercase words
    .replace(/\s*@\s*/g, " ") // Replace @ with a single space
    .replace(/[,.\s]+$/, "") // Remove trailing commas, periods, and spaces
    .trim(); // Trim any leading or trailing spaces

  return `${match || ""} ${continuation || ""}`;
};

// function extractCaseDetails(input, dateFiled) {
//   if (!input) return [];

//   const caseDataArray = [];

//   // GET NAMES
//   const names = getName(input);

//   if (!Array.isArray(names) || names.length === 0) return [];

//   // GET CASE NUMBER
//   const caseNumber = input.split(" ")[0];
//   const natureOfCase = getNatureOfCase(input);

//   // GET PLAINTIFF
//   const plaintiffRegex = /(?<=\b[\w-]+ )(.+?)(?= VS\.)/;
//   const plaintiffMatch = input.match(plaintiffRegex);
//   const plaintiff = plaintiffMatch ? plaintiffMatch[0] : "";

//   // GET BRANCH (Extract number after "MeTC BRANCH")
//   const branchRegex = /MeTC BRANCH (\d+)/;
//   const branchMatch = input.match(branchRegex);
//   const branch = branchMatch ? branchMatch[1] : "";

//   // GET COURT TYPE (Replace "MeTC" with "MTC")
//   const courtType = branchMatch ? "MTC" : "";

//   for (const name of names) {
//     caseDataArray.push({
//       ...parseName(name),
//       caseNumber,
//       plaintiff,
//       natureOfCase,
//       branch,
//       courtType,
//       dateFiled,
//     });
//   }

//   return caseDataArray;
// }

// function extractCaseDetails(input, dateFiled) {
//   if (!input) return [];

//   const names = getName(input); // now an array of person names
//   const caseNumber = input.split(" ")[0];
//   const natureOfCase = getNatureOfCase(input);

//   const plaintiffRegex = /(?<=\b[\w-]+ )(.+?)(?= VS\.)/;
//   const plaintiffMatch = input.match(plaintiffRegex);
//   const plaintiff = plaintiffMatch ? plaintiffMatch[0] : "";

//   const branchRegex = /MeTC BRANCH (\d+)/;
//   const branchMatch = input.match(branchRegex);
//   const branch = branchMatch ? branchMatch[1] : "";

//   const courtType = branchMatch ? "MTC" : "";

//   return names.map((name) => ({
//     ...parseName(name),
//     caseNumber,
//     plaintiff,
//     natureOfCase,
//     branch,
//     courtType,
//     dateFiled,
//   }));
// }

function extractCaseNumber(input) {
  const match = input.match(/\b([A-Z0-9-]{10,})\b/);
  return match ? match[1] : "";
}

function extractCaseTitle(input) {
  const match = input.match(
    /\b[A-Z0-9-]{10,}\b\s+(.*?)(?=\s+Collection|Forcible Entry|Violation|Other Laws|Alarms|Theft|DOING|MeTC BRANCH|\s+Regular Court|\s+Tax Court|$)/i
  );
  return match ? cleanString(match[1]) : "";
}

const natureOfCaseKeywords = [];

function extractNatureOfCase(text) {
  const matchRegex = /VS\.\s(.*?)\sMeTC BRANCH/;
  const matchResult = text.match(matchRegex);

  const match =
    matchResult && matchResult[1]
      ? matchResult[1]
          .replace(/[,.\s]+$/, "")
          .replace(/[\s,~.\-!;:?()]*\b[A-Z]+\b[\s,~.\-!;:?()]*\b/g, "")
          .trim()
      : "";

  const continuation = text
    .split("\n")
    .slice(1)
    .join(" ")
    .split(/Manila City Hall|Excluded Division\/s:/)[0]
    .replace(/\b[A-Z]+\b/g, "")
    .replace(/\s*@\s*/g, " ")
    .replace(/[,.\s]+$/, "")
    .trim();

  return `${match || ""} ${continuation || ""}`.trim();
}
function extractBranch(input) {
  const match = input.match(/MeTC BRANCH\s*(\d+)/i);
  return match ? match[1] : "";
}

function extractCourtType(input) {
  const match = input.match(/(Regular Court|Tax Court)/i);
  return match ? match[1] : "";
}

function extractCaseDetails(input, dateFiled) {
  if (!input) return [];
  const caseNumber = extractCaseNumber(input);
  const caseTitle = extractCaseTitle(input);
  const natureOfCase = extractNatureOfCase(input);
  const branch = extractBranch(input);
  const courtType = extractCourtType(input);

  let plaintiff = "";
  let accused = "";
  const vsMatch = caseTitle.match(/(.*?)\s+VS\.?\s+(.*)/i);
  if (vsMatch) {
    plaintiff = cleanString(vsMatch[1]);
    accused = cleanString(vsMatch[2]);
  } else {
    plaintiff = caseTitle;
  }

  const accusedNames = accused
    ? accused
        .split(/\s*,\s*|\s+AND\s+/i)
        .map(cleanString)
        .filter(Boolean)
    : [];

  const objects = (accusedNames.length === 0 ? [""] : accusedNames).map(
    (name) => {
      const parsed = parseName(name);
      return {
        ...parsed,
        caseNumber,
        plaintiff,
        natureOfCase,
        branch,
        courtType,
        dateFiled,
      };
    }
  );

  // Filter out objects with no firstName and no lastName
  return objects.filter(
    (obj) =>
      (obj.firstName && obj.firstName.length > 0) ||
      (obj.lastName && obj.lastName.length > 0)
  );
}

function extractCaseData(text) {
  dateFiled = extractDate(text) || dateFiled;
  const rows = groupRowsByNumber(text);

  const extractCaseData = rows.map((row) => {
    return extractCaseDetails(row, dateFiled);
  });

  return extractCaseData;
}

// const processPDF = (file) => {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();

//     reader.onload = async (e) => {
//       const typedarray = new Uint8Array(e.target.result);
//       const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
//       const numPages = pdf.numPages;
//       const data = [];

//       for (let i = 1; i <= numPages; i++) {
//         const page = await pdf.getPage(i);
//         const ops = await page.getOperatorList();

//         for (let j = 0; j < ops.fnArray.length; j++) {
//           if (
//             ops.fnArray[j] === pdfjsLib.OPS.paintJpegXObject ||
//             ops.fnArray[j] === pdfjsLib.OPS.paintImageXObject
//           ) {
//             const imgObjId = ops.argsArray[j][0];
//             const img = await page.objs.get(imgObjId);
//             if (img && img.bitmap instanceof ImageBitmap) {
//               const canvas = document.createElement("canvas");
//               const context = canvas.getContext("2d");
//               canvas.width = img.width;
//               canvas.height = img.height;
//               context.drawImage(img.bitmap, 0, 0);
//               const imgUrl = canvas.toDataURL();

//               const text = await Tesseract.recognize(imgUrl, "eng");

//               const flattenedData = extractCaseData(text.data.text).flatMap(
//                 (item) => item
//               );
//               data.push(...flattenedData);
//             } else {
//               console.warn(
//                 `Invalid image data or unsupported format for operation at index ${j} on page ${i}`
//               );
//             }
//           }
//         }
//       }

//       resolve(data);
//     };

//     reader.onerror = (error) => {
//       reject(error);
//     };

//     reader.readAsArrayBuffer(file);
//   });
// };

const processPDF = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      const typedarray = new Uint8Array(e.target.result);
      const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
      const numPages = pdf.numPages;
      const data = [];

      console.warn("page", pdf);
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Join all strings from the page
        const pageText = textContent.items.map((item) => item.str).join(" ");
        console.log(`PAGE ${i} TEXT:`, pageText);

        const flattenedData = extractCaseData(pageText).flatMap((item) => item);
        data.push(...flattenedData);
      }

      resolve(data);
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
};

function OCR({ setImportedData, setProgress, toggleModal }) {
  const onChange = (e) => {
    const file = e.target.files[0];

    toast.promise(
      processPDF(file).then((data) => {
        setImportedData(data);
        setProgress(100);
        toggleModal();
      }),
      {
        loading: "Importing Data...",
        success: "Imported successfully",
        error: "Error importing",
      },
      { position: "top-right" }
    );
  };

  const inputRef = useRef();

  return (
    <div className="App">
      <input
        type="file"
        accept=".pdf"
        ref={inputRef}
        style={{ display: "none" }}
        onChange={onChange}
      />
      <button
        className="btn btn-secondary fw-medium"
        style={{ fontSize: ".875rem" }}
        onClick={() => inputRef.current.click()}
      >
        <i class="bi bi-upload pe-2"></i>
        Import PDF
      </button>
    </div>
  );
}

export default OCR;

// GET COURT TYPE
// const courtTypeRegex = /MeTC BRANCH \d+ (.*?)\s*\n/;
// const courtTypeMatch = input.match(courtTypeRegex);
// const courtType = courtTypeMatch ? courtTypeMatch[1] : "";
