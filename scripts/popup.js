const statusText = document.getElementById("status");
const toggleButton = document.getElementById("toggle");

async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

function updateStatus(enabled) {
    statusText.textContent = enabled ? "Dark mode: ON" : "Dark mode: OFF";
    toggleButton.textContent = enabled ? "Disable dark mode" : "Enable dark mode";
}

async function initialize() {
    const tab = await getActiveTab();
    if (!tab || !tab.url || !tab.url.startsWith("https://maimaidx-eng.com/maimai-mobile/")) {
        statusText.textContent = "Available only on Maimai Net";
        toggleButton.disabled = true;
        return;
    }

    chrome.runtime.sendMessage(
        { type: "getDarkModeState", tabId: tab.id },
        response => updateStatus(response?.enabled === true)
    );

    toggleButton.addEventListener("click", () => {
        toggleButton.disabled = true;
        chrome.runtime.sendMessage(
            { type: "toggleDarkMode", tabId: tab.id },
            response => {
                toggleButton.disabled = false;
                if (response?.error) {
                    statusText.textContent = `Error: ${response.error}`;
                    return;
                }
                updateStatus(response?.enabled === true);
            }
        );
    });
}

initialize();
