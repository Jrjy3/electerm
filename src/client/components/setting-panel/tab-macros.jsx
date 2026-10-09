import deepCopy from 'json-deep-copy'
import SettingCol from './col'
import MacroList from '../macros/macro-list'
import MacroForm from '../macros/macro-form'
import { settingMap } from '../../common/constants'
import '../macros/macros.styl'

export default function TabMacros (props) {
  const {
    settingTab,
    store,
    settingItem,
    listProps
  } = props
  if (settingTab !== settingMap.macros) {
    return null
  }
  return (
    <div
      className='setting-tabs-macros'
    >
      <SettingCol>
        <MacroList
          store={store}
          activeItemId={settingItem.id}
          onClickItem={item => listProps.onClickItem(deepCopy(item))}
        />
        <MacroForm
          store={store}
          formData={settingItem}
          key={settingItem.id}
        />
      </SettingCol>
    </div>
  )
}
