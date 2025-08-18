// メッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startSelection') {
    console.log('選択モードを開始します');
    // ElementSelectorのインスタンスを取得して開始
    const selector = window.ElementSelector.getInstance();
    selector.start();
    console.log('ElementSelectorを開始しました');
    sendResponse({ isSelecting: true });
  } else if (message.action === 'stopSelection') {
    console.log('選択モードを停止します');
    const selector = window.ElementSelector.getInstance();
    selector.stop();
    console.log('ElementSelectorを停止しました');
    sendResponse({ isSelecting: false });
  } else if (message.action === 'checkSelectionState') {
    const selector = window.ElementSelector.getInstance();
    sendResponse({ isSelecting: selector.isSelecting });
  }
  return true; // 非同期レスポンスのために必要
});

// グローバルなキャプチャ関数
window.captureScrollableArea = function(element, resolution = 72) {
  const capturer = new ScrollCapturer(element, resolution);
  return capturer.capture();
};

function startElementSelection() {
  isSelecting = true;
  document.body.style.cursor = 'crosshair';
  
  // スクロール可能な要素にマウスオーバー時のハイライトを追加
  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);
  document.addEventListener('click', handleClick);
}

function handleMouseOver(e) {
  if (!isSelecting) return;
  
  const element = e.target;
  if (isScrollable(element)) {
    element.classList.add('scrollcap-hover');
  }
}

function handleMouseOut(e) {
  if (!isSelecting) return;
  
  const element = e.target;
  element.classList.remove('scrollcap-hover');
}

function handleClick(e) {
  if (!isSelecting) return;
  
  e.preventDefault();
  const element = e.target;
  
  if (isScrollable(element)) {
    captureScrollableArea(element);
    cleanup();
  }
}

function isScrollable(element) {
  const style = window.getComputedStyle(element);
  return (
    (style.overflow === 'auto' || style.overflow === 'scroll' || style.overflowY === 'auto' || style.overflowY === 'scroll') &&
    element.scrollHeight > element.clientHeight
  );
}

function cleanup() {
  isSelecting = false;
  document.body.style.cursor = 'default';
  document.removeEventListener('mouseover', handleMouseOver);
  document.removeEventListener('mouseout', handleMouseOut);
  document.removeEventListener('click', handleClick);
} 