chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureComplete') {
    // キャプチャ完了時の処理
    console.log('Capture completed successfully');
  } else if (message.action === 'captureError') {
    // エラー発生時の処理
    console.error('Capture error:', message.error);
  } else if (message.action === 'captureVisibleTab') {
    // 現在のタブをキャプチャ
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, dataUrl => {
      sendResponse({ dataUrl });
    });
    return true; // 非同期レスポンスのために必要
  } else if (message.action === 'getZoomLevel') {
    // ズームレベルを取得
    chrome.tabs.getZoom(sender.tab.id, zoomLevel => {
      sendResponse({ zoomLevel });
    });
    return true; // 非同期レスポンスのために必要
  }
}); 