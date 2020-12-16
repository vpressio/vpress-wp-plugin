import { forEach , trim  } from 'lodash';
import { csvParse } from 'd3';
// import { read, utils } from 'xlsx';

/**
 * Read CSV file as text, transform to JSON
 */
export const readCSV = (file) => {
  return new Promise(((resolve, reject) => {
    readFileAsText(file)
      .then(csv => {
        const json = csvParse(csv);
        resolve(json)
      })
      .catch(error => reject(error));
  }));
}
/**
 * Read Excel's compatible files, transform to JSON
 */
// export const readExcel = (file, sheet = 0) => {
//   return new Promise(((resolve, reject) => {
//     readFileAsBinary(file)
//       .then((excel) => {
//         const parsed = ExcelToJSON(excel, sheet);
//         return resolve(parsed);
//       })
//       .catch(error => reject(error));
//   }));
// }
/**
 * Read a file in client's side as text
 */
const readFileAsText = (file) => {
  return new Promise(((resolve, reject) => {
    const reader = new FileReader();
    if (file.size > 120000000) {
      reject('El archivo es demasiado grande')
    }
    // Closure to capture the file information.
    reader.onload = (function () {
      return function (e) {
        return resolve(e.target.result);
      };
    }(file));

    reader.onerror = function (error) {
      return reject(error);
    };
    reader.readAsText(file);
  }));
}
/**
 * Read a file in client's side as binary string
 */
// const readFileAsBinary = (file) => {
//   return new Promise(((resolve, reject) => {
//     const reader = new FileReader();
//     if (file.size > 15000000) {
//       reject('El archivo es demasiado grande')
//     }
//     // Closure to capture the file information.
//     reader.onload = (function () {
//       return function (e) {
//         return resolve(e.target.result);
//       };
//     }(file));

//     reader.onerror = function (error) {
//       return reject(error);
//     };

//     reader.readAsBinaryString(file);
//   }));
// }

/**
 * Transform CSV text to JSON object array
 */
export const CSVtoJSON = (csv) => {
  const lines = csv.split('\n');
  const result = [];
  const headers = lines[0].split(',');
  forEach(headers, function(value, index) {
    headers[index] = trim(value, '"');
  })
  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    const currentline = lines[i].split(',');
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = trim(currentline[j], '"');
    }
    result.push(obj);
  }
  // return result; //JavaScript object
  return JSON.parse(JSON.stringify(result)); // JSON
}
/**
 * Transform Excel's compatible files to JSON object array
 */
// const ExcelToJSON = (excel, sheet = 0) => {
//   const workbook = read(excel, {
//     type: 'binary',
//   });
//   /** Return selected sheet */
//   const selectedSheetName = workbook.SheetNames[sheet];
//   const XlRowObject = utils.sheet_to_json(
//     workbook.Sheets[selectedSheetName],
//   );
//   const result = JSON.parse(JSON.stringify(XlRowObject));
//   return result;

  /** Return whole book */
  // const wholeBook = []
  // workbook.SheetNames.forEach(function(sheetName, index) {
  //   // Here is your object
  //   const XlRowObject = XLSX.utils.sheet_to_row_object_array(
  //     workbook.Sheets[sheetName]
  //   )
  //   const json_object = JSON.stringify(XlRowObject)
  //   wholeBook.push(JSON.parse(json_object));
  // })
  // return wholeBook
// }
/**
 * Transform JSON to CSV text
 */
export const JSONtoCSV = (objArray) => {
  const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
  let str = '';
  for (let i = 0; i < array.length; i++) {
    let line = '';
    for (const index in array[i]) {
      if (line !== '') {
        line += ',';
      }
      line += array[i][index];
    }
    str += `${line}\r\n`;
  }
  return str;
}