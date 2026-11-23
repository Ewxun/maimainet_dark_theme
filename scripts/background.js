const CSS_FILE = "dark_mainet.css";
const MAIMAI_URL_PATTERN = "https://maimaidx-eng.com/maimai-mobile/*";
const STORAGE_KEY = "darkModeEnabled";

async function isEnabled() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] !== false;
}

async function setEnabled(enabled) {
    await chrome.storage.local.set({ [STORAGE_KEY]: enabled });
}

async function injectDarkMode(tabId) {
    await chrome.scripting.insertCSS({
        target: { tabId },
        files: [CSS_FILE]
    });
}

async function removeDarkMode(tabId) {
    await chrome.scripting.removeCSS({
        target: { tabId },
        files: [CSS_FILE]
    });
}

async function restoreOpenTabs() {
    if (!await isEnabled()) {
        return;
    }

    const tabs = await chrome.tabs.query({ url: MAIMAI_URL_PATTERN });
    await Promise.all(tabs.map(async tab => {
        try {
            await injectDarkMode(tab.id);
        } catch (error) {
            console.error("CSS injection failed:", error);
        }
    }));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getDarkModeState") {
        isEnabled()
            .then(enabled => sendResponse({ enabled }))
            .catch(() => sendResponse({ enabled: true }));
        return true;
    }

    if (message.type === "toggleDarkMode") {
        (async () => {
            const tabId = message.tabId;
            const enabled = await isEnabled();
            if (enabled) {
                await removeDarkMode(tabId);
                await setEnabled(false);
                sendResponse({ enabled: false });
            } else {
                await injectDarkMode(tabId);
                await setEnabled(true);
                sendResponse({ enabled: true });
            }
        })().catch(error => sendResponse({ enabled: false, error: error.message }));
        return true;
    }
});

chrome.webNavigation.onCommitted.addListener(async details => {
    if (await isEnabled()) {
        try {
            await injectDarkMode(details.tabId);
        } catch (error) {
            console.error("CSS injection failed:", error);
        }
    }
}, {
    url: [{ urlMatches: MAIMAI_URL_PATTERN }]
});

chrome.runtime.onStartup.addListener(restoreOpenTabs);

chrome.runtime.onInstalled.addListener(async () => {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    if (stored[STORAGE_KEY] === undefined) {
        await setEnabled(true);
    }
    await restoreOpenTabs();
});