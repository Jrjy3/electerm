import { isWin } from '../../common/constants'

// Windows can blur behind a framed window, so the system title bar no longer
// rules out see-through there; other platforms keep the stock tip
export function systemTitleBarTip () {
  return isWin
    ? 'Restart electerm to apply. With the system title bar, opacity and blur use a Windows 11 backdrop (Acrylic/Mica).'
    : window.translate('useSystemTitleBarTip')
}
