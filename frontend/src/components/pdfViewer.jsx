// import { useState } from "react";
// import { Document, Page, pdfjs } from "react-pdf";
// import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.js";

// pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// export default function PdfViewer({ pdfUrl }) {
//   const [numPages, setNumPages] = useState(null);

//   if (!pdfUrl) return <div>Loading PDF...</div>;

//   const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);

//   return (
//     <div className="w-full h-full overflow-auto">
//       <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
//         {Array.from({ length: numPages || 0 }, (_, index) => (
//           <Page key={index} pageNumber={index + 1} width={800} />
//         ))}
//       </Document>
//     </div>
//   );
// }
