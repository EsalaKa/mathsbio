let mathsBioPyodidePromise;

async function getMathsBioPython() {
    if (!mathsBioPyodidePromise) {
        mathsBioPyodidePromise = loadPyodide();
    }
    return mathsBioPyodidePromise;
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".python-lab").forEach((lab) => {
        const editor = lab.querySelector(".python-editor");
        const output = lab.querySelector(".python-output");
        const runButton = lab.querySelector('[data-action="run"]');
        const resetButton = lab.querySelector('[data-action="reset"]');
        const copyButton = lab.querySelector('[data-action="copy"]');
        const originalCode = editor.value;

        runButton.addEventListener("click", async () => {
            runButton.disabled = true;
            runButton.textContent = "Loading Python…";
            output.classList.remove("error");
            output.textContent = "Preparing the Python environment…";

            try {
                const pyodide = await getMathsBioPython();
                let textOutput = "";

                pyodide.setStdout({
                    batched: (text) => {
                        textOutput += text + "\n";
                    }
                });

                pyodide.setStderr({
                    batched: (text) => {
                        textOutput += text + "\n";
                    }
                });

                runButton.textContent = "Loading required packages…";
                await pyodide.loadPackagesFromImports(editor.value);
                runButton.textContent = "Running…";
                await pyodide.runPythonAsync(editor.value);
                output.textContent = textOutput.trim() || "Code completed successfully.";
            } catch (error) {
                output.classList.add("error");
                output.textContent = error.message;
            } finally {
                runButton.disabled = false;
                runButton.textContent = "▶ Run code";
            }
        });

        resetButton.addEventListener("click", () => {
            editor.value = originalCode;
            output.classList.remove("error");
            output.textContent = "Run the code to see the result.";
        });

        copyButton.addEventListener("click", async () => {
            await navigator.clipboard.writeText(editor.value);
            const oldText = copyButton.textContent;
            copyButton.textContent = "Copied";
            setTimeout(() => {
                copyButton.textContent = oldText;
            }, 1200);
        });
    });
});
