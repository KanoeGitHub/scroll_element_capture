document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('startCapture');
  const statusDiv = document.getElementById('status');
  const resolutionSelect = document.getElementById('resolution');

  // 解像度設定を保存
  function saveResolutionSetting(dpi) {
    chrome.storage.local.set({ resolution: dpi });
  }

  // 解像度設定を読み込み
  function loadResolutionSetting() {
    chrome.storage.local.get(['resolution'], (result) => {
      if (result.resolution) {
        resolutionSelect.value = result.resolution;
      }
    });
  }

  // 初期設定を読み込み
  loadResolutionSetting();

  // 解像度設定が変更されたとき
  resolutionSelect.addEventListener('change', () => {
    saveResolutionSetting(resolutionSelect.value);
  });

  // 現在の選択状態を確認
  async function checkSelectionState() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        statusDiv.textContent = chrome.i18n.getMessage('tabNotFound');
        return;
      }

      // Chromeウェブストアなどの制限されたページをチェック
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || 
          tab.url.startsWith('https://chromewebstore.google.com/')) {
        statusDiv.textContent = chrome.i18n.getMessage('pageNotAvailable');
        startButton.disabled = true;
        return;
      }
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkSelectionState' });
      
      if (response && response.isSelecting) {
        startButton.textContent = chrome.i18n.getMessage('buttonTextCancel');
        startButton.style.backgroundColor = '#f44336';
        statusDiv.textContent = chrome.i18n.getMessage('selecting');
      } else {
        startButton.textContent = chrome.i18n.getMessage('buttonTextSelect');
        startButton.style.backgroundColor = '#4CAF50';
        statusDiv.textContent = '';
      }
    } catch (error) {
      console.error('Error checking selection state:', error);
      if (error.message.includes('Receiving end does not exist')) {
        statusDiv.textContent = chrome.i18n.getMessage('pageNotAvailable');
        startButton.disabled = true;
      } else {
        statusDiv.textContent = chrome.i18n.getMessage('captureError');
        startButton.textContent = chrome.i18n.getMessage('buttonTextSelect');
        startButton.style.backgroundColor = '#4CAF50';
      }
    }
  }

  // 初期状態を確認
  checkSelectionState();

  startButton.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        statusDiv.textContent = chrome.i18n.getMessage('tabNotFound');
        return;
      }

      // Chromeウェブストアなどの制限されたページをチェック
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || 
          tab.url.startsWith('https://chromewebstore.google.com/')) {
        statusDiv.textContent = chrome.i18n.getMessage('pageNotAvailable');
        return;
      }
      
      // 現在の選択状態を確認
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkSelectionState' });
      
      if (response && response.isSelecting) {
        // 選択モードを停止
        await chrome.tabs.sendMessage(tab.id, { action: 'stopSelection' });
        startButton.textContent = chrome.i18n.getMessage('buttonTextSelect');
        startButton.style.backgroundColor = '#4CAF50';
        statusDiv.textContent = '';
      } else {
        // 選択モードを開始
        startButton.textContent = chrome.i18n.getMessage('buttonTextCancel');
        startButton.style.backgroundColor = '#f44336';
        statusDiv.textContent = chrome.i18n.getMessage('selectArea');

        // 解像度設定を送信
        await chrome.tabs.sendMessage(tab.id, { 
          action: 'startSelection',
          resolution: parseInt(resolutionSelect.value)
        });
      }
    } catch (error) {
      console.error('Error:', error);
      if (error.message.includes('Receiving end does not exist')) {
        statusDiv.textContent = chrome.i18n.getMessage('pageNotAvailable');
      } else {
        statusDiv.textContent = chrome.i18n.getMessage('captureError');
      }
      startButton.textContent = chrome.i18n.getMessage('buttonTextSelect');
      startButton.style.backgroundColor = '#4CAF50';
    }
  });

  // メッセージリスナー
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'captureComplete') {
      startButton.textContent = chrome.i18n.getMessage('buttonTextSelect');
      startButton.style.backgroundColor = '#4CAF50';
      statusDiv.textContent = chrome.i18n.getMessage('captureComplete');
    } else if (message.action === 'captureError') {
      startButton.textContent = chrome.i18n.getMessage('buttonTextSelect');
      startButton.style.backgroundColor = '#4CAF50';
      statusDiv.textContent = chrome.i18n.getMessage('captureError');
    }
  });
}); 