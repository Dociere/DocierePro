// sidecar.cpp
#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <thread>
#include <mutex>
#include <atomic>
#include <filesystem>
#include <cstdlib>
#include <nlohmann/json.hpp>  // single-header JSON: github.com/nlohmann/json

namespace fs = std::filesystem;
using json = nlohmann::json;

// ─── What you learn: why these globals are safe ───────────────────────────
// std::mutex: only one thread can lock() it at a time. Without this,
// two threads printing to stdout simultaneously would interleave characters.
// std::atomic<int>: an integer that increments without a data race.
// These two primitives are all you need for safe shared state here.
std::mutex output_mutex;
std::atomic<int> completed_chunks{0};

void report_progress(int chunk_id, int total, const std::string& status) {
    std::lock_guard<std::mutex> lock(output_mutex);
    json progress = {
        {"chunk", chunk_id},
        {"total", total},
        {"status", status},
        {"completed", completed_chunks.load()}
    };
    // Each line = one JSON event. Node.js reads line by line.
    std::cout << progress.dump() << "\n";
    std::cout.flush();  // Critical: without this, buffering delays progress updates
}

// ─── What you learn: why we wrap pdflatex in a function ──────────────────
// system() is simpler but gives you no output capture and no return code control.
// popen() lets you read stdout. But for our purposes, we just need the exit code
// and to know it finished — pdflatex writes its own log file.
int run_pdflatex(const std::string& tex_path, const std::string& output_dir) {
    std::string cmd = "pdflatex"
        " -interaction=nonstopmode"
        " -file-line-error"
        " -output-directory=" + output_dir +
        " " + tex_path +
        " > /dev/null 2>&1";  // suppress output; log is in .log file
    return system(cmd.c_str());
}

// ─── The worker: one thread per chunk ────────────────────────────────────
void compile_chunk(
    int chunk_id,
    int total_chunks,
    const std::string& preamble,
    const std::string& chunk_content,
    const std::string& job_dir,
    std::vector<std::string>& output_pdfs,  // written by this thread at [chunk_id]
    bool& success
) {
    // Each chunk gets its own .tex file — no shared file system state
    std::string chunk_tex = job_dir + "/chunk_" + std::to_string(chunk_id) + ".tex";
    std::string chunk_out = job_dir + "/chunk_" + std::to_string(chunk_id) + ".pdf";

    // Write wrapped tex: preamble + chunk body + \end{document}
    // This is the key insight: each chunk IS a complete, valid LaTeX document
    {
        std::ofstream f(chunk_tex);
        f << preamble << "\n\\begin{document}\n";
        f << chunk_content;
        f << "\n\\end{document}\n";
    }

    report_progress(chunk_id, total_chunks, "compiling");

    int exit_code = run_pdflatex(chunk_tex, job_dir);

    if (exit_code == 0 && fs::exists(chunk_out)) {
        output_pdfs[chunk_id] = chunk_out;
        success = true;
        completed_chunks++;
        report_progress(chunk_id, total_chunks, "done");
    } else {
        success = false;
        report_progress(chunk_id, total_chunks, "error");
    }
}