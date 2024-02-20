document
  .getElementById("repo-form")
  .addEventListener("submit", handleFormSubmit);

async function handleFormSubmit(event) {
  event.preventDefault();
  const repoInput = document.getElementById("repo-url").value;
  const isGithub = repoInput.includes("github.com/");
  const apiUrl = constructApiUrl(repoInput, isGithub);

  try {
    const fileTree = await fetchData(apiUrl, isGithub);
    displayFileTree(fileTree, isGithub);
  } catch (error) {
    alert(error.message);
  }
}

function constructApiUrl(repoInput, isGithub) {
  if (isGithub) {
    const repoUrl = repoInput.split("github.com/")[1];
    return `https://api.github.com/repos/${repoUrl}/contents`;
  } else {
    const repoPath = encodeURIComponent(repoInput);
    return `http://localhost:3000/repo/${repoPath}/contents`;
  }
}

async function fetchData(apiUrl, isGithub) {
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(
      isGithub ? "GitHub API request failed" : "Local server request failed"
    );
  }
  return response.json();
}

async function displayFileTree(
  fileTree,
  isGithub,
  parentElement = null,
  indentLevel = 0
) {
  if (!parentElement) {
    parentElement = document.getElementById("file-tree");
    parentElement.innerHTML = "";
  }

  fileTree.forEach((file) =>
    createFileElement(file, isGithub, parentElement, indentLevel)
  );
}

function createFileElement(file, isGithub, parentElement, indentLevel) {
  const fileElement = document.createElement("div");
  fileElement.className = indentLevel > 0 ? "indent" : "";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = file.name;
  checkbox.setAttribute("data-url", isGithub ? file.url : file.path);
  checkbox.setAttribute("data-type", file.type);

  const label = document.createElement("label");
  label.htmlFor = file.name;
  label.textContent = file.name;

  fileElement.append(checkbox, label);
  parentElement.appendChild(fileElement);

  if (file.type === "dir") {
    checkbox.addEventListener("change", () =>
      handleDirectoryChange(checkbox, isGithub, fileElement, indentLevel)
    );
  } else {
    checkbox.addEventListener("change", updateMergedFilesPreview);
  }
}

async function handleDirectoryChange(
  checkbox,
  isGithub,
  fileElement,
  indentLevel
) {
  if (checkbox.checked) {
    const apiUrl = isGithub
      ? checkbox.getAttribute("data-url")
      : constructApiUrl(checkbox.getAttribute("data-url"), isGithub);
    try {
      const childFileTree = await fetchData(apiUrl, isGithub);
      await displayFileTree(
        childFileTree,
        isGithub,
        fileElement,
        indentLevel + 1
      );
    } catch (error) {
      alert(
        `Unable to fetch ${isGithub ? "GitHub" : "local"} directory contents: ${
          error.message
        }`
      );
    }
  } else {
    const childDivs = fileElement.querySelectorAll(":scope > div");
    childDivs.forEach((child) => child.remove());
  }
}

async function updateMergedFilesPreview() {
  const checkboxes = document.querySelectorAll(
    '#file-tree input[type="checkbox"]:checked[data-type="file"]'
  );
  const outputTextarea = document.getElementById("output");
  outputTextarea.value = "";

  for (const checkbox of checkboxes) {
    let fileUrl = checkbox.getAttribute("data-url");
    fileUrl = fileUrl.includes("github.com/")
      ? fileUrl
      : `http://localhost:3000/file/${encodeURIComponent(fileUrl)}`;

    try {
      const fileContent = await fetchData(
        fileUrl,
        fileUrl.includes("github.com/")
      );
      const decodedContent = atob(fileContent.content); // Assuming content is base64 encoded
      outputTextarea.value += `######## ${fileContent.path}\n\n${decodedContent}\n\n`;
    } catch (error) {
      alert(`Unable to fetch file: ${error.message}`);
    }
  }
}

function saveApiKey() {
  const apiKeyInput = document.getElementById("openai-key");
  localStorage.setItem("openai-api-key", apiKeyInput.value);
}

function loadSavedApiKey() {
  const savedApiKey = localStorage.getItem("openai-api-key");
  if (savedApiKey) {
    document.getElementById("openai-key").value = savedApiKey;
  }
}

async function sendInstructionToOpenAI() {
  const apiKey =
    localStorage.getItem("openai-api-key") ||
    document.getElementById("openai-key").value;
  if (!apiKey) {
    alert("Please enter an API key.");
    return;
  }

  const instruction = document.getElementById("instruction").value;
  const outputTextarea = document.getElementById("output");
  const openaiResponseTextarea = document.getElementById("openai-response");
  const model = document.getElementById("models").value;
  const messages = outputTextarea.value
    .split("########")
    .map((content) => ({ role: "user", content: "######## " + content }));
  messages.push({ role: "user", content: instruction });

  const sendButton = document.getElementById("send-to-openai");
  sendButton.disabled = true;
  sendButton.textContent = "Loading...";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0,
      }),
    });

    const completion = await response.json();
    openaiResponseTextarea.value = completion.choices[0].message.content;
  } catch (error) {
    console.error("Error sending instruction to OpenAI:", error);
    alert("Failed to send instruction to OpenAI.");
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "Send to OpenAI";
  }
}

function initEventListeners() {
  document.getElementById("save-api-key").addEventListener("click", saveApiKey);
  document
    .getElementById("send-to-openai")
    .addEventListener("click", sendInstructionToOpenAI);
}

loadSavedApiKey();
initEventListeners();
