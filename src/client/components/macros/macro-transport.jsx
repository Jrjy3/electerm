/**
 * macro import/export, follows quick command transport. The file holds
 * both tables: { macros, macroGroups }
 */
import BookmarkTransport from '../tree-list/bookmark-transport'
import download from '../../common/download'
import time from '../../common/time'
import message from '../common/message'

export default class MacroTransport extends BookmarkTransport {
  beforeUpload = async (file) => {
    const { store } = this.props
    const txt = file.fileContent !== undefined
      ? file.fileContent
      : await window.fs.readFile(file.filePath)
    try {
      const data = JSON.parse(txt)
      const macros = Array.isArray(data) ? data : data.macros
      if (!Array.isArray(macros)) {
        throw new Error('Not a macros file')
      }
      const count = store.importMacros({
        macros,
        macroGroups: Array.isArray(data.macroGroups) ? data.macroGroups : []
      })
      if (count) {
        message.success(`+${count}`)
      }
    } catch (err) {
      store.onError(err)
    }
    return false
  }

  handleDownload = () => {
    const { store } = this.props
    const txt = JSON.stringify({
      macros: store.macros || [],
      macroGroups: store.macroGroups || []
    }, null, 2)
    const stamp = time(undefined, 'YYYY-MM-DD-HH-mm-ss')
    download('electerm-macros-' + stamp + '.json', txt)
  }
}
