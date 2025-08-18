class ScrollCapturer {
  constructor(element, resolution = 72) {
    this.element = element;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.isCapturing = false;
    this.resolution = resolution;
    this.fixedElements = []; // 追随要素とその元のスタイルを保存する配列
    
    // OS判定を初期化時に一度だけ行う
    this.isWindows = /Windows/.test(navigator.userAgent);
  }

  async capture() {
    if (this.isCapturing) {
      throw new Error('キャプチャは既に実行中です');
    }
    
    this.isCapturing = true;
    const originalScrollTop = this.element.scrollTop;
    const totalHeight = this.element.scrollHeight;
    const viewportHeight = this.element.clientHeight;
    
    try {
      // キャンバスをクリア
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      
      // ズームレベルを取得
      const zoomLevel = await this.getZoomLevel();
      console.log('Current zoom level:', zoomLevel);
      
      // 解像度の倍率を計算（72dpiを基準とする）
      const resolutionScale = this.resolution / 72;
      
      // キャンバスのサイズを設定（ズームレベルと解像度を考慮）
      this.canvas.width = this.element.clientWidth * zoomLevel * resolutionScale;
      this.canvas.height = totalHeight * zoomLevel * resolutionScale;
      
      // スクロールに追随する要素を一時的に無効化（非表示にはしない）
      this.disableFixedElements();
      
      // スクロールしながらキャプチャ
      let currentScrollTop = 0;
      const lastScrollTop = totalHeight - viewportHeight;
      const overlapHeight = 50; // オーバーラップ領域の高さ（ピクセル）
      
      while (currentScrollTop <= lastScrollTop) {
        // スクロール位置を設定
        this.element.scrollTop = currentScrollTop;
        
        // スクロールの反映を待つ
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 現在の表示部分をキャプチャ
        const dataUrl = await this.captureVisibleTab();
        const img = await this.loadImage(dataUrl);
        
        // 要素の位置を取得
        const rect = this.element.getBoundingClientRect();
        
        // キャンバスに描画（ズームレベルと解像度を考慮）
        this.ctx.drawImage(
          img,
          rect.left * zoomLevel, rect.top * zoomLevel, 
          rect.width * zoomLevel, rect.height * zoomLevel, // ソースの切り抜き範囲
          0, currentScrollTop * zoomLevel, 
          rect.width * zoomLevel, rect.height * zoomLevel // 描画先の位置とサイズ
        );
        
        // 次のスクロール位置を計算
        if (currentScrollTop === lastScrollTop) {
          break; // 最後のスクロール位置に到達
        }
        
        // 次のスクロール位置を計算（viewportHeightの90%分進める）
        currentScrollTop = Math.min(
          lastScrollTop,
          currentScrollTop + Math.floor(viewportHeight * 0.9) - overlapHeight
        );
      }
      
      return this.canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Capture error:', error);
      throw error;
    } finally {
      // スクロール位置を元に戻す
      this.element.scrollTop = originalScrollTop;
      // 追随要素のスタイルを元に戻す
      this.restoreFixedElements();
      this.isCapturing = false;
    }
  }
  
  async captureVisibleTab() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, response => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response.dataUrl);
        }
      });
    });
  }
  
  loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  async getZoomLevel() {
    // Windowsの場合: devicePixelRatioを使用
    if (this.isWindows) {
      const devicePixelRatio = window.devicePixelRatio;
      if (devicePixelRatio && devicePixelRatio > 0) {
        console.log('Windows detected, using devicePixelRatio:', devicePixelRatio);
        return devicePixelRatio;
      } else {
        console.warn('devicePixelRatio not available, falling back to chrome.runtime.sendMessage');
      }
    }
    
    // Mac OSの場合、またはWindowsでdevicePixelRatioが取得できない場合: 既存の方法を使用
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getZoomLevel' }, response => {
        if (chrome.runtime.lastError) {
          console.error('Error getting zoom level:', chrome.runtime.lastError);
          resolve(1); // エラーの場合はデフォルトのズームレベル（1.0）を返す
        } else {
          resolve(response.zoomLevel);
        }
      });
    });
  }
  
  // スクロールに追随する要素を見つけてスタイルを一時的に変更するメソッド (非表示にはしない)
  disableFixedElements() {
    this.fixedElements = [];
    // キャプチャ対象要素の子孫要素を取得
    const allElements = this.element.querySelectorAll('*');
    
    allElements.forEach(el => {
      const style = window.getComputedStyle(el);
      const position = style.position;
      
      // 追随要素であり、かつ計算済みのpositionがfixedまたはstickyである要素を対象
      if (position === 'fixed' || position === 'sticky') {
        // 要素が表示されており、かつキャプチャ対象要素の表示領域に重なっているかを確認
        const rect = el.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        const elementRect = this.element.getBoundingClientRect();
        // キャプチャ対象要素の境界内に要素の中心点があるかでも判定
        const elementCenterIsInView = rect.left + rect.width / 2 > elementRect.left &&
                                      rect.left + rect.width / 2 < elementRect.right &&
                                      rect.top + rect.height / 2 > elementRect.top &&
                                      rect.top + rect.height / 2 < elementRect.bottom;
        
        if (isVisible && elementCenterIsInView) {
          this.fixedElements.push({
            element: el,
            // getComputedStyleではなくelement.styleから元の値を保存 (インラインスタイルがあればそれ、なければ空文字列)
            originalPosition: el.style.position,
            originalTop: el.style.top,
            originalLeft: el.style.left,
            originalRight: el.style.right,
            originalBottom: el.style.bottom,
            originalDisplay: el.style.display,
            originalTransform: el.style.transform
          });
          
          // スタイルを一時的に変更して追随を無効化
          el.style.position = 'static'; // positionをstaticに変更
          // 位置指定系のスタイルをクリア（staticの場合は効果がないが念のため）
          el.style.top = '';
          el.style.left = '';
          el.style.right = '';
          el.style.bottom = '';
          // display や transform は元のまま (非表示にしない)
        }
      }
    });
    console.log(`Found and modified ${this.fixedElements.length} fixed/sticky elements.`);
  }
  
  // 一時的に変更した追随要素のスタイルを元に戻すメソッド
  restoreFixedElements() {
    this.fixedElements.forEach(item => {
      // 元のスタイルを復元
      item.element.style.position = item.originalPosition;
      item.element.style.top = item.originalTop;
      item.element.style.left = item.originalLeft;
      item.element.style.right = item.originalRight;
      item.element.style.bottom = item.originalBottom;
      item.element.style.display = item.originalDisplay;
      item.element.style.transform = item.originalTransform;
    });
    this.fixedElements = []; // 配列をクリア
    console.log('Restored fixed/sticky elements.');
  }
}

// グローバルなキャプチャ状態を管理
let isCapturing = false;

async function captureScrollableArea(element, resolution = 72) {
  if (isCapturing) {
    console.warn('キャプチャは既に実行中です');
    return;
  }
  
  try {
    isCapturing = true;
    const capturer = new ScrollCapturer(element, resolution);
    const dataUrl = await capturer.capture();
    
    // 画像をダウンロード
    const link = document.createElement('a');
    link.download = `scrollcap_${new Date().toISOString().replace(/[:.]/g, '')}.png`;
    link.href = dataUrl;
    link.click();
    
    // 完了を通知
    onCaptureComplete();
  } catch (error) {
    console.error('Capture error:', error);
    chrome.runtime.sendMessage({ 
      action: 'captureError',
      error: error.message
    });
  } finally {
    isCapturing = false;
  }
}

// キャプチャ完了時の処理
function onCaptureComplete() {
  // 選択された要素の枠を消す
  if (window.selectedElement) {
    window.selectedElement.classList.remove('scrollcap-hover');
    window.selectedElement.style.outline = '';
    window.selectedElement.style.outlineOffset = '';
    window.selectedElement.style.cursor = '';
    window.selectedElement.style.position = '';
    window.selectedElement.style.zIndex = '';
  }
  
  // キャプチャ完了を通知
  chrome.runtime.sendMessage({ action: 'captureComplete' });
  
  // 領域選択モードを解除
  if (window.ElementSelector) {
    const selector = window.ElementSelector.getInstance();
    selector.onCaptureComplete();
  }
} 