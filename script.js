document.addEventListener('DOMContentLoaded', async () => {
  const summarizerTab = document.getElementById('summarizer-tab');
  const prompterTab = document.getElementById('prompter-tab');
  const summarizerSection = document.getElementById('summarizer-section');
  const prompterSection = document.getElementById('prompter-section');
  const pageSummarizeButton = document.getElementById('page-summarize-btn');
  const groupSummarizeButton = document.getElementById('group-summarize-btn');
  const pageSummaryDiv = document.getElementById('page-summary');
  const groupSummaryDiv = document.getElementById('group-summary');
  const prompterInput = document.getElementById('prompter-input');
  const pagePromptButton = document.getElementById('page-prompt-btn');
  const groupPromptButton = document.getElementById('group-prompt-btn');
  const outputDiv = document.getElementById('output');

  const cache = {};

  async function fetchCurrentTabGroupColor() {
    try {
      const currentTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
      if (currentTab.groupId === -1) return '#000';
      const group = await chrome.tabGroups.get(currentTab.groupId);
      return getGroupColor(group.color);
    } catch (error) {
      console.error('Error fetching tab group color:', error);
      return '#000';
    }
  }

  async function applyDynamicStyles() {
    const color = await fetchCurrentTabGroupColor();
    const buttons = [pageSummarizeButton, groupSummarizeButton, pagePromptButton, groupPromptButton];
    buttons.forEach(button => {
      button.style.backgroundColor = color;
      button.style.color = '#fff';
    });
    [pageSummaryDiv, groupSummaryDiv, prompterInput, outputDiv].forEach(el => {
      el.style.border = `2px solid ${color}`;
    });
  }
  await applyDynamicStyles();

  const activateTab = (tab, section) => {
    document.querySelectorAll('nav button').forEach(button => button.classList.remove('active'));
    document.querySelectorAll('section').forEach(sec => sec.classList.remove('active'));
    tab.classList.add('active');
    section.classList.add('active');
  };

  summarizerTab.addEventListener('click', () => activateTab(summarizerTab, summarizerSection));
  prompterTab.addEventListener('click', () => activateTab(prompterTab, prompterSection));

  function manualMarkdownFormatter(markdownText) {
    const lines = markdownText.split('\n');
    let formattedText = '';
  
    lines.forEach(line => {
      let trimmedLine = line.trim();
  
      // Headings
      if (/^##\s*(.*)/.test(trimmedLine)) {
        trimmedLine = trimmedLine.replace(/^##\s*(.*)/, '<h2>$1</h2>');
      } else if (/^#\s*(.*)/.test(trimmedLine)) {
        trimmedLine = trimmedLine.replace(/^#\s*(.*)/, '<h1>$1</h1>');
      }
  
      // Bold
      trimmedLine = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
      // Italics
      trimmedLine = trimmedLine.replace(/_(.*?)_/g, '<em>$1</em>');
  
      // Lists
      if (/^\*\s(.*)/.test(trimmedLine)) {
        trimmedLine = trimmedLine.replace(/^\*\s(.*)/, '<li>$1</li>');
      }
  
      // Links
      trimmedLine = trimmedLine.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
  
      // Images
      trimmedLine = trimmedLine.replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" />');
  
      formattedText += trimmedLine + '\n';
    });
  
    // Wrap lists in <ul> tags
    formattedText = formattedText.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
  
    return formattedText.trim();
  }
  

  function getGroupColor(groupColor) {
    const colorMap = {
      blue: '#4285f4',
      red: '#ea4335',
      yellow: '#fbbc04',
      green: '#34a853',
      pink: '#ff69e4',
      purple: '#800080',
      cyan: '#00ffff',
      grey: '#9e9e9e',
    };
    return colorMap[groupColor] || '#000';
  }

  async function generateSummary(title, content) {
    if (cache['currentPage']) {
      console.log('Using cached page summary.');
      pageSummaryDiv.innerHTML = manualMarkdownFormatter(cache['currentPage']);
      return cache['currentPage'];
    }
  
    try {
      const session = await ai.languageModel.create({
        systemPrompt: `Summarize the webpage content professionally, avoiding redundancy and highlighting key points.`,
      });
  
      let result = '';
      let previousChunk = '';
      const stream = await session.promptStreaming(content);
  
      for await (const chunk of stream) {
        const newChunk = chunk.startsWith(previousChunk)
          ? chunk.slice(previousChunk.length)
          : chunk;
        console.log('Streamed Chunk:', newChunk);
        result += newChunk;
        previousChunk = chunk;
        pageSummaryDiv.innerHTML = manualMarkdownFormatter(result);
      }
  
      session.destroy();
      cache['currentPage'] = result.trim(); // Store the result in cache
      return result.trim();
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Failed to generate summary.';
    }
  }
  

  async function generateGroupSummary(aggregatedSummary) {
    if (cache['currentGroup']) {
      console.log('Using cached group summary.');
      groupSummaryDiv.innerHTML = manualMarkdownFormatter(cache['currentGroup']);
      return cache['currentGroup'];
    }
  
    try {
      const session = await ai.languageModel.create({
        systemPrompt: `Summarize the combined content of multiple webpages into a cohesive and professional summary.`,
      });
  
      let result = '';
      let previousChunk = '';
      const stream = await session.promptStreaming(aggregatedSummary);
  
      for await (const chunk of stream) {
        const newChunk = chunk.startsWith(previousChunk)
          ? chunk.slice(previousChunk.length)
          : chunk;
        console.log('Streamed Chunk:', newChunk);
        result += newChunk;
        previousChunk = chunk;
        groupSummaryDiv.innerHTML = manualMarkdownFormatter(result);
      }
  
      session.destroy();
      cache['currentGroup'] = result.trim(); // Store the result in cache
      return result.trim();
    } catch (error) {
      console.error('Error generating group summary:', error);
      return 'Failed to generate group summary.';
    }
  }
  

  async function generatePromptResponse(title, inputText) {
    try {
      const session = await ai.languageModel.create({
        systemPrompt: `You are responding to prompts provided by the user. 
        - Process the input intelligently.
        - Deliver professional, accurate, and concise output.`,
      });
  
      let result = '';
      let previousChunk = '';
      const stream = await session.promptStreaming(inputText);
  
      for await (const chunk of stream) {
        const newChunk = chunk.startsWith(previousChunk)
          ? chunk.slice(previousChunk.length)
          : chunk;
        console.log('Streamed Chunk:', newChunk);
        result += newChunk;
        previousChunk = chunk;
        outputDiv.innerHTML = manualMarkdownFormatter(result);
      }
      session.destroy();
      return result.trim();
    } catch (error) {
      console.error('Error generating prompt response:', error);
      return 'Failed to generate prompt response.';
    }
  }
  
  // Handle Page Prompter
  pagePromptButton.addEventListener('click', async () => {
    const userInput = prompterInput.value.trim();
    if (!userInput) {
      outputDiv.textContent = 'Please enter a prompt.';
      return;
    }
    outputDiv.textContent = 'Processing your prompt...';
    const response = await generatePromptResponse('Page Prompt', userInput);
    outputDiv.innerHTML = response || 'No meaningful response available.';
  });
  
  // Handle Group Prompter
  groupPromptButton.addEventListener('click', async () => {
    const userInput = prompterInput.value.trim();
    if (!userInput) {
      outputDiv.textContent = 'Please enter a prompt.';
      return;
    }
    const group = await fetchCurrentTabGroup();
    if (group) {
      outputDiv.textContent = 'Processing your group prompt...';
      const aggregatedInput = group.tabs
        .map(tab => `Tab ${tab.id}: ${cache[tab.id] || 'No summary available.'}`)
        .join('\n\n');
      const response = await generatePromptResponse('Group Prompt', `${userInput}\n\n${aggregatedInput}`);
      outputDiv.innerHTML = response || 'No meaningful response available.';
    } else {
      outputDiv.textContent = 'No group information available.';
    }
  });
  
  async function fetchCurrentPageContent() {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id },
        func: () => document.body.innerText || '',
      });
      return result?.result || 'No content available.';
    } catch (error) {
      console.error('Error fetching page content:', error);
      return null;
    }
  }

  async function fetchCurrentTabGroup() {
    try {
      const currentTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
      const tabs = await chrome.tabs.query({});
      const groupTabs = tabs.filter(tab => tab.groupId === currentTab.groupId);
      if (!groupTabs.length) return null;
      const group = await chrome.tabGroups.get(currentTab.groupId);
      return { ...group, tabs: groupTabs };
    } catch (error) {
      console.error('Error fetching tab group:', error);
      return null;
    }
  }

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

  pageSummarizeButton.addEventListener('click', async () => {
    pageSummaryDiv.textContent = 'Fetching and summarizing page content...';
    const content = await fetchCurrentPageContent();
    if (content) {
      const summary = await generateSummary('Page Summary', content);
      cache['currentPage'] = summary;
      pageSummaryDiv.innerHTML = summary || 'No meaningful summary available.';
    }
  });

  groupSummarizeButton.addEventListener('click', async () => {
    groupSummaryDiv.textContent = 'Fetching and summarizing group content...';
    const group = await fetchCurrentTabGroup();
    if (group) {
      const cachedSummaries = await Promise.all(
        group.tabs.map(tab =>
          cache[tab.id]
            ? Promise.resolve(cache[tab.id]) // Use cached summary if available
            : fetchTabContent(tab.id).then(content => generateSummary('Tab Summary', content))
        )
      );
  
      cachedSummaries.forEach((summary, index) => {
        const tabId = group.tabs[index].id;
        cache[tabId] = summary; // Store individual tab summaries in cache
      });
  
      const aggregatedSummary = cachedSummaries.join('\n\n');
      const groupSummary = await generateGroupSummary(aggregatedSummary);
      groupSummaryDiv.innerHTML = groupSummary || 'No meaningful group summary available.';
    }
  });
  
});
