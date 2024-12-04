document.addEventListener('DOMContentLoaded', () => {
    const groupSummarizeButton = document.getElementById('group-summarize-btn');
    const groupSummaryDiv = document.getElementById('group-summary');

    groupSummarizeButton.addEventListener('click', async () => {
        groupSummaryDiv.innerHTML = '<p>Fetching group and summarizing...</p>';

        // Get the active tab's group ID
        const group = await fetchCurrentTabGroup();
        if (!group) {
            groupSummaryDiv.innerHTML = '<p>No group available to summarize.</p>';
            return;
        }

        // Summarize the group
        const summary = await summarizeGroup(group);
        groupSummaryDiv.innerHTML = `
            <div class="group" style="border: 2px solid ${getGroupColor(group.color)};">
                <strong>${group.title || 'Untitled Group'}</strong>
                <p>${summary || 'No meaningful summary available.'}</p>
            </div>
        `;
    });
});

// Fetch the group details of the current active tab
async function fetchCurrentTabGroup() {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!activeTab || activeTab.groupId === -1) {
            console.warn('The current tab is not part of a group.');
            return null;
        }

        const group = await chrome.tabGroups.get(activeTab.groupId);
        const tabsInGroup = await chrome.tabs.query({ groupId: activeTab.groupId });

        const tabContents = await Promise.all(
            tabsInGroup.map(tab => fetchTabContent(tab.id))
        );

        return { ...group, content: tabContents.join('\n') };
    } catch (error) {
        console.error('Error fetching the current tab group:', error);
        return null;
    }
}

// Fetch the full content of a tab
async function fetchTabContent(tabId) {
    try {
        const [result] = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => document.body.innerText || '',
        });

        return result?.result || 'No content available.';
    } catch (error) {
        console.error(`Error fetching content for tab ${tabId}:`, error);
        return 'Failed to fetch content.';
    }
}

// Summarize a specific group
async function summarizeGroup(group) {
    const canSummarize = await ai.summarizer.capabilities();
    if (!canSummarize || canSummarize.available === 'no') {
        return 'Summarizer is not available.';
    }

    try {
        const summarizer = await ai.summarizer.create();
        const summary = await summarizer.summarize(group.content);
        summarizer.destroy(); // Clean up resources
        return summary.trim();
    } catch (error) {
        console.error(`Error summarizing group "${group.title}":`, error);
        return 'Failed to summarize group.';
    }
}

// Get Chrome tab group color as CSS color
function getGroupColor(groupColor) {
    const colorMap = {
        blue: '#4285f4',
        red: '#ea4335',
        yellow: '#fbbc04',
        green: '#34a853',
        pink: '#ff69b4',
        purple: '#800080',
        cyan: '#00ffff',
        grey: '#9e9e9e',
    };
    return colorMap[groupColor] || '#e0e0e0';
}
