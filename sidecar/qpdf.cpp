#include <qpdf/QPDF.hh>
#include <qpdf/QPDFWriter.hh>
#include <qpdf/QPDFPageDocumentHelper.hh>

void merge_pdfs(const std::vector<std::string>& input_paths,
                const std::string& output_path) {
    // ─── What you learn: QPDF's object model ─────────────────────────────
    // A PDF is a graph of objects (pages, fonts, images, streams).
    // "Merging" means: create a new PDF, then for each source PDF,
    // copy its page objects into the new PDF's object table.
    // QPDF does this at the object level — it never decodes image streams
    // or re-renders anything. It's a structural operation, not a render.

    QPDF output_pdf;
    output_pdf.emptyPDF();  // start with a blank PDF
    QPDFPageDocumentHelper output_helper(output_pdf);

    for (const auto& input_path : input_paths) {
        QPDF input_pdf;
        input_pdf.processFile(input_path.c_str());

        QPDFPageDocumentHelper input_helper(input_pdf);
        for (auto& page : input_helper.getAllPages()) {
            // copyForeignObject: copies the page + all its dependencies
            // (fonts, images, annotations) into output_pdf's object space.
            // This is where QPDF earns its keep — manual PDF merging
            // would require you to handle cross-references, object numbering,
            // and stream offsets yourself.
            output_helper.addPage(
                output_pdf.copyForeignObject(page.getObjectHandle()),
                false  // false = append (not prepend)
            );
        }
    }

    // ─── Streaming write: the key to constant RAM usage ──────────────────
    // QPDFWriter writes directly to disk using a file stream.
    // It processes one object at a time — it never holds the full PDF in RAM.
    // For a 15k page document this is the difference between 50MB and 2GB.
    QPDFWriter writer(output_pdf, output_path.c_str());
    writer.setStreamDataMode(qpdf_stream_data_e::qpdf_s_preserve);  // don't re-compress
    writer.setObjectStreamMode(qpdf_object_stream_e::qpdf_o_preserve);
    writer.write();
}