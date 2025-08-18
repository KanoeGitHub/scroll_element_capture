// 要素選択機能の実装
class ElementSelector {
  constructor() {
    this.isSelecting = false;
    this.selectedElement = null;
    this.overlayElement = null;
  }

  static getInstance() {
    if (!window._elementSelector) {
      window._elementSelector = new ElementSelector();
    }
    return window._elementSelector;
  }

  start() {
    this.isSelecting = true;
    this.createOverlay();
    this.addEventListeners();
  }

  stop() {
    this.isSelecting = false;
    this.removeOverlay();
    this.removeEventListeners();
  }

  createOverlay() {
    this.overlayElement = document.createElement('div');
    this.overlayElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: transparent;
      z-index: 9998;
      pointer-events: none;
    `;
    document.body.appendChild(this.overlayElement);
  }

  removeOverlay() {
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
  }

  addEventListeners() {
    document.addEventListener('mouseover', this.handleMouseOver.bind(this));
    document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    document.addEventListener('click', this.handleClick.bind(this));
  }

  removeEventListeners() {
    document.removeEventListener('mouseover', this.handleMouseOver.bind(this));
    document.removeEventListener('mouseout', this.handleMouseOut.bind(this));
    document.removeEventListener('click', this.handleClick.bind(this));
  }

  handleMouseOver(e) {
    if (!this.isSelecting) return;
    
    // 現在の要素から親要素を辿って、スクロール可能な要素を探す
    let currentElement = e.target;
    let scrollableParent = null;
    
    while (currentElement && currentElement !== document.body) {
      if (this.isScrollable(currentElement)) {
        scrollableParent = currentElement;
        break;
      }
      currentElement = currentElement.parentElement;
    }
    
    // スクロール可能な親要素が見つかった場合
    if (scrollableParent) {
      console.log('マウスオーバー:', scrollableParent, 'スクロール可能: true');
      
      // オーバーレイ要素を作成
      const rect = scrollableParent.getBoundingClientRect();
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: absolute;
        top: ${rect.top}px;
        left: ${rect.left}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        background: rgba(76, 175, 80, 0.1);
        border: 2px solid #4CAF50;
        pointer-events: auto;
        cursor: pointer;
        z-index: 9999;
      `;
      
      // 既存のオーバーレイを削除
      this.removeOverlay();
      
      // 新しいオーバーレイを追加
      this.overlayElement = overlay;
      document.body.appendChild(overlay);
    }
  }

  handleMouseOut(e) {
    if (!this.isSelecting) return;
    
    // マウスアウトした要素から親要素を辿って、スクロール可能な要素を探す
    let currentElement = e.target;
    let scrollableParent = null;
    
    while (currentElement && currentElement !== document.body) {
      if (this.isScrollable(currentElement)) {
        scrollableParent = currentElement;
        break;
      }
      currentElement = currentElement.parentElement;
    }
    
    // スクロール可能な親要素が見つかった場合
    if (scrollableParent) {
      // マウスがオーバーレイから大きく外れた場合のみオーバーレイを削除
      const rect = scrollableParent.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // マウスが要素から一定以上離れた場合のみ削除
      const margin = 50; // マージン（ピクセル）
      if (
        mouseX < rect.left - margin ||
        mouseX > rect.right + margin ||
        mouseY < rect.top - margin ||
        mouseY > rect.bottom + margin
      ) {
        this.removeOverlay();
      }
    }
  }

  handleClick(e) {
    if (!this.isSelecting) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // オーバーレイをクリックした場合
    if (e.target === this.overlayElement) {
      // オーバーレイの位置からスクロール可能な要素を探す
      const rect = this.overlayElement.getBoundingClientRect();
      const elements = document.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      
      for (const element of elements) {
        if (this.isScrollable(element)) {
          this.selectedElement = element;
          this.stop();
          
          // キャプチャ開始
          if (typeof window.captureScrollableArea === 'function') {
            window.captureScrollableArea(element);
          }
          break;
        }
      }
    }
  }

  // キャプチャ完了時の処理
  onCaptureComplete() {
    this.isSelecting = false;
    this.removeOverlay();
    this.removeEventListeners();
  }

  isScrollable(element) {
    const style = window.getComputedStyle(element);
    return (
      (style.overflow === 'auto' || style.overflow === 'scroll' || style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      element.scrollHeight > element.clientHeight
    );
  }
}

// グローバルスコープに公開
window.ElementSelector = ElementSelector; 