// AG Typing Tutor - Universal Keyboard Visualizer (Windows Default / Mac Switchable)
export function renderKeyboard(activeKey = '') {
  let isMac = localStorage.getItem('ag-keyboard-os') === 'mac'

  const rowsWin = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'BACKSPACE'],
    ['TAB', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['CAPS', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'ENTER'],
    ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'SHIFT'],
    ['CTRL', 'WIN', 'ALT', 'Space', 'ALT', 'WIN', 'MENU', 'CTRL']
  ]

  const rowsMac = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'BACKSPACE'],
    ['TAB', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['CAPS', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'ENTER'],
    ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'SHIFT'],
    ['CTRL', 'OPTION', 'COMMAND', 'Space', 'COMMAND', 'OPTION', 'LEFT', 'RIGHT']
  ]

  const rows = isMac ? rowsMac : rowsWin
  const active = String(activeKey || '').trim().toLowerCase()

  return `<div class="virtual-keyboard">
    <div style="display:flex; justify-content:flex-end; margin-bottom:6px; padding-right:4px;">
      <label style="font-size:11px; color:#64748b; display:flex; align-items:center; gap:4px; cursor:pointer;">
        Keyboard Style: 
        <select id="ag-os-toggle" style="font-size:11px; padding:2px 6px; border-radius:4px; border:1px solid #cbd5e1; background:#fff;">
          <option value="win" ${!isMac ? 'selected' : ''}>Windows (Ctrl / Win / Alt)</option>
          <option value="mac" ${isMac ? 'selected' : ''}>Mac (Cmd / Option)</option>
        </select>
      </label>
    </div>
    ${rows.map(row => `
      <div class="keyboard-row">
        ${row.map(key => {
          const kLower = key.toLowerCase()
          const isActive = active === kLower || (active === ' ' && key === 'Space') || (active === 'enter' && key === 'ENTER') || (active === 'backspace' && key === 'BACKSPACE')
          const isWide = ['backspace', 'tab', 'caps', 'enter', 'shift', 'ctrl', 'win', 'alt', 'command', 'option', 'menu'].includes(kLower) || key === 'Space'
          return `<div class="virtual-key ${isActive ? 'active' : ''} ${isWide ? 'wide-' + kLower : ''}" data-key="${key}">
            <span>${key === 'Space' ? 'Space' : key}</span>
          </div>`
        }).join('')}
      </div>
    `).join('')}
  </div>`
}