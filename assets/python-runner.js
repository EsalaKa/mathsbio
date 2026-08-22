let mathsBioPyodidePromise;
let mathsBioLoaderPromise;

const mathsBioPyodideSources = [
    {
        script: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js",
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/"
    },
    {
        script: "https://unpkg.com/pyodide@0.27.7/pyodide.js",
        indexURL: "https://unpkg.com/pyodide@0.27.7/"
    }
];

function loadMathsBioScript(source) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = source;
        script.async = true;

        const timeout = setTimeout(() => {
            script.remove();
            reject(new Error("The Python loader timed out."));
        }, 20000);

        script.addEventListener("load", () => {
            clearTimeout(timeout);
            resolve();
        }, { once: true });

        script.addEventListener("error", () => {
            clearTimeout(timeout);
            script.remove();
            reject(new Error("The Python loader could not be downloaded."));
        }, { once: true });

        document.head.appendChild(script);
    });
}

async function getMathsBioLoader() {
    if (typeof window.loadPyodide === "function") {
        return mathsBioPyodideSources[0].indexURL;
    }

    if (!mathsBioLoaderPromise) {
        mathsBioLoaderPromise = (async () => {
            for (const source of mathsBioPyodideSources) {
                try {
                    await loadMathsBioScript(source.script);
                    if (typeof window.loadPyodide === "function") {
                        return source.indexURL;
                    }
                } catch (error) {
                    // Try the next trusted CDN source.
                }
            }

            throw new Error(
                "Python could not be loaded. Check your internet connection, " +
                "allow cdn.jsdelivr.net or unpkg.com, then try again."
            );
        })();
    }

    try {
        return await mathsBioLoaderPromise;
    } catch (error) {
        mathsBioLoaderPromise = undefined;
        throw error;
    }
}

async function getMathsBioPython() {
    if (!mathsBioPyodidePromise) {
        mathsBioPyodidePromise = (async () => {
            const indexURL = await getMathsBioLoader();
            return window.loadPyodide({ indexURL });
        })();
    }

    try {
        return await mathsBioPyodidePromise;
    } catch (error) {
        mathsBioPyodidePromise = undefined;
        throw error;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".python-lab").forEach((lab) => {
        const editor = lab.querySelector(".python-editor");
        const output = lab.querySelector(".python-output");
        const runButton = lab.querySelector('[data-action="run"]');
        const resetButton = lab.querySelector('[data-action="reset"]');
        const copyButton = lab.querySelector('[data-action="copy"]');
        const imageArea = lab.querySelector(".python-output-images");
        const originalCode = editor.value;

        editor.setAttribute("aria-label", "Editable Python code");
        output.setAttribute("role", "status");
        output.setAttribute("aria-live", "polite");
        output.setAttribute("aria-atomic", "true");
        if (imageArea) {
            imageArea.setAttribute("aria-live", "polite");
            imageArea.setAttribute("aria-label", "Python-generated graphs");
        }

        runButton.addEventListener("click", async () => {
            runButton.disabled = true;
            runButton.textContent = "Loading Python…";
            output.classList.remove("error");
            output.textContent = "Preparing the Python environment…";
            if (imageArea) imageArea.innerHTML = "";

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

                if (imageArea && editor.value.includes("matplotlib")) {
                    const imageJson = await pyodide.runPythonAsync(`
import io
import base64
import json
import matplotlib.pyplot as _mathsbio_plt

_mathsbio_images = []
for _mathsbio_number in _mathsbio_plt.get_fignums():
    _mathsbio_figure = _mathsbio_plt.figure(_mathsbio_number)
    _mathsbio_buffer = io.BytesIO()
    _mathsbio_figure.savefig(
        _mathsbio_buffer,
        format="png",
        dpi=120,
        bbox_inches="tight"
    )
    _mathsbio_images.append(
        base64.b64encode(_mathsbio_buffer.getvalue()).decode("ascii")
    )
json.dumps(_mathsbio_images)
`);
                    JSON.parse(imageJson).forEach((encodedImage, index) => {
                        const img = document.createElement("img");
                        img.src = "data:image/png;base64," + encodedImage;
                        img.alt = "Python-generated result graph " + (index + 1);
                        imageArea.appendChild(img);
                    });
                    await pyodide.runPythonAsync("import matplotlib.pyplot as plt; plt.close('all')");
                }
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
            if (imageArea) imageArea.innerHTML = "";
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
