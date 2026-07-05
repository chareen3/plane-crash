(function() {
  if (window.__cacWidgetInjected) {
    // Toggle visibility if already injected
    const widget = document.getElementById('cac-floating-widget');
    if (widget) {
      widget.style.display = widget.style.display === 'none' ? 'flex' : 'none';
    }
    return;
  }
  window.__cacWidgetInjected = true;

  // Create the floating container
  const container = document.createElement('div');
  container.id = 'cac-floating-widget';
  Object.assign(container.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '340px',
    height: '650px',
    zIndex: '2147483647', // Max z-index to stay on top
    backgroundColor: 'transparent',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    borderRadius: '16px',
    overflow: 'hidden'
  });

  // Create drag handle
  const header = document.createElement('div');
  Object.assign(header.style, {
    height: '30px',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'move',
    userSelect: 'none',
    color: '#94a3b8',
    fontSize: '12px',
    fontWeight: 'bold',
    fontFamily: 'sans-serif'
  });
  header.textContent = '≡ Drag to Move';

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('popup.html');
  Object.assign(iframe.style, {
    width: '100%',
    flex: '1',
    border: 'none',
    backgroundColor: 'transparent'
  });

  container.appendChild(header);
  container.appendChild(iframe);
  document.body.appendChild(container);

  // Drag Logic
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - container.getBoundingClientRect().left;
    offsetY = e.clientY - container.getBoundingClientRect().top;
    
    // Prevent iframe from swallowing mouse events during drag
    iframe.style.pointerEvents = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    container.style.left = `${x}px`;
    container.style.top = `${y}px`;
    container.style.right = 'auto'; // Disable initial right positioning
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      iframe.style.pointerEvents = 'auto';
    }
  });

})();
