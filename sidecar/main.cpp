/*
Few points:
- This function is not currentlt in use as extractPreamble in splitIntoChunks in compileParallel is not defined
- This function only works for UNIX system (example, sysconf to find host OS specifications). Make it cross-platform
- The server.js only intends to send files with multi-file structure to the sidecar. This should not be the case as this file is intended for all types of files.
*/

#include <iostream>
#include <string>
#include <vector>
#include <thread>
#include <mutex>
#include <atomic>
#include <algorithm>
#include <unistd.h>
#include <nlohmann/json.hpp>
#include <memory>

using json = nlohmann::json;

extern std::mutex output_mutex;
extern void compile_chunk(
    int chunk_id,
    int total_chunks,
    const std::string& preamble,
    const std::string& chunk_content,
    const std::string& job_dir,
    std::vector<std::string>& output_pdfs,
    bool& success
);
extern void merge_pdfs(const std::vector<std::string>& input_paths, const std::string& output_path);

int main() {
    // ─── What you learn: reading stdin as a protocol ──────────────────────
    // Node.js writes one JSON line to stdin, then closes it.
    // We read until EOF. This is a classic Unix IPC pattern.
    std::string input_line;
    std::string full_input;
    while (std::getline(std::cin, input_line)) {
        full_input += input_line;
    }

    json config = json::parse(full_input);

    std::string job_dir    = config["job_dir"];
    std::string preamble   = config["preamble"];
    std::string output_pdf = config["output_pdf"];
    auto chunks            = config["chunks"].get<std::vector<std::string>>();
    int total              = chunks.size();

    // ─── What you learn: adaptive concurrency ────────────────────────────
    // pdflatex is CPU + I/O bound. Spawning 16 workers on a 4-core machine
    // with 4GB RAM will thrash — each pdflatex instance needs ~200-400MB.
    // We read available RAM and cap workers accordingly.
    //
    // On Linux/macOS: sysconf gives pages * page_size = free bytes
    // We target: max_workers = free_ram_gb * 2, capped at hardware_concurrency
    
    long pages = sysconf(_SC_AVPHYS_PAGES);
    long page_size = sysconf(_SC_PAGE_SIZE);
    long free_ram_bytes = pages * page_size;
    long free_ram_gb = free_ram_bytes / (1024LL * 1024 * 1024);

    int hw_threads = std::thread::hardware_concurrency();
    int max_workers = std::max(1, (int)std::min(
        (long)hw_threads,
        std::max(1L, free_ram_gb * 2)  // 2 workers per GB of free RAM
    ));

    {
        std::lock_guard<std::mutex> lock(output_mutex);
        json meta = {{"event", "start"}, {"chunks", total}, {"workers", max_workers}};
        std::cout << meta.dump() << "\n";
        std::cout.flush();
    }

    // ─── What you learn: manual thread pool (no external library) ─────────
    // We process chunks in batches of max_workers.
    // Each batch: spawn N threads, join them all (wait for completion), repeat.
    // Simple and correct — no work-stealing queue needed at this scale.
    std::vector<std::string> output_pdfs(total);
    auto successes = std::make_unique<bool[]>(total);

    for (int i = 0; i < total; i += max_workers) {
        std::vector<std::thread> batch;
        int batch_end = std::min(i + max_workers, total);

        for (int j = i; j < batch_end; j++) {
            batch.emplace_back(compile_chunk,
                j, total,
                std::cref(preamble),
                std::cref(chunks[j]),
                std::cref(job_dir),
                std::ref(output_pdfs),
                std::ref(successes[j])
            );
        }

        // join() = "wait for this thread to finish before continuing"
        for (auto& t : batch) t.join();
    }

    // ─── QPDF merge (next section) ────────────────────────────────────────
    // Collect successful PDFs in order and merge them
    std::vector<std::string> valid_pdfs;
    for (auto& p : output_pdfs) {
        if (!p.empty()) valid_pdfs.push_back(p);
    }

    merge_pdfs(valid_pdfs, output_pdf);

    json result = {{"event", "complete"}, {"output", output_pdf}};
    std::cout << result.dump() << "\n";
    return 0;
}