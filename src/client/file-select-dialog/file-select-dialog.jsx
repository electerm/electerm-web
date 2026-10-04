/**
 * file/folder select dialog component
 */

import { Component } from 'react'
import {
  Spin,
  Pagination,
  Button,
  Input,
  ConfigProvider
} from 'antd'
import { SaveOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons'
import Modal from '../electerm-react/components/common/modal'
import { notification } from '../electerm-react/components/common/notification'
import FileItem from './file-item'
import AddressBar from '../electerm-react/components/sftp/address-bar'
import isValidPath from '../electerm-react/common/is-valid-path'
import {
  typeMap
} from '../electerm-react/common/constants'
import { resolve } from '../web-components/path'
import './file-select-dialog.styl'

const s = window.translate

export default class FileSelectDialog extends Component {
  constructor (props) {
    super(props)
    const p = window.localStorage.getItem(this.lsKey) || window.et.home
    this.state = {
      opts: null,
      isSaveDialog: false,
      saveFileName: '',
      loading: false,
      page: 1,
      localShowHiddenFile: false,
      localPathHistory: [],
      fileSelected: null,
      selectedFiles: [],
      lastClickedIndex: null,
      pageSize: 100,
      localInputFocus: false,
      list: [],
      localPathTemp: p,
      localPath: p
    }
  }

  componentDidMount () {
    window.addEventListener('message', this.handleMsg)
  }

  componentWillUnmount () {
    window.removeEventListener('message', this.handleMsg)
  }

  lsKey = 'dialog-start-path'

  fileInputRef = null

  handleBrowserUpload = () => {
    if (this.fileInputRef) {
      this.fileInputRef.click()
    }
  }

  handleBrowserFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const fileContent = evt.target.result
      const fileName = file.name
      this.setState({ opts: null })
      window.postMessage({
        type: 'handleDialog',
        data: { fileContent, fileName }
      }, '*')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  handleBrowserDownload = async () => {
    const { opts } = this.state
    const { filename, content } = opts
    // In the Android WebView blob-anchor downloads are a silent no-op, save
    // via the native MediaStore/Downloads path when available (see
    // web-components/native-file-save.js).
    try {
      if (window.et && window.et.canSaveNative && await window.et.canSaveNative()) {
        await window.et.saveTextNative(filename, content)
        notification.success({ message: 'Saved to Downloads: ' + filename })
        this.handleClose()
        return
      }
    } catch (e) {
      console.log('[electerm-android] native save failed:', e)
      notification.error({ message: 'Save failed: ' + (e && e.message) })
      return
    }
    // No native saver. The anchor fallback works on desktop browsers but is
    // a silent no-op in Android WebView — report instead of fake success.
    if (window.et && window.et.downloadDiag) {
      const diag = await window.et.downloadDiag()
      const inWebView = diag.isAndroidWebView || diag.isNativePlatform
      if (inWebView) {
        notification.error({ message: 'Download failed: native file saver unavailable' })
        return
      }
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    this.handleClose()
  }

  handleMsg = (e) => {
    if (e?.data?.type === 'openDialog') {
      this.setState({ opts: e.data.data, isSaveDialog: false, saveFileName: '' }, this.localList)
    } else if (e?.data?.type === 'saveDialog') {
      const opts = e.data.data || {}
      const defaultName = opts.defaultPath || ''
      this.setState({ opts, isSaveDialog: true, saveFileName: defaultName }, this.localList)
    }
  }

  handlePageChange = (page, pageSize) => {
    this.setState({ page, pageSize, lastClickedIndex: null })
  }

  handlePageSizeChange = (k, pageSize) => {
    this.setState({ pageSize })
  }

  handleLocalPathChange = (e) => {
    this.setState({ localPath: e.target.value })
  }

  handleClose = () => {
    const { isSaveDialog } = this.state
    if (isSaveDialog) {
      window.postMessage({
        type: 'closeSaveDialog'
      }, '*')
    } else {
      window.postMessage({
        type: 'closeDialog'
      }, '*')
    }
    this.setState({ opts: null })
  }

  isMultiSelectMode = () => {
    const { opts, isSaveDialog } = this.state
    const properties = opts?.properties || []
    return !isSaveDialog &&
      properties.includes('openFile') &&
      properties.includes('multiSelections')
  }

  handleSubmit = () => {
    const { selectedFiles, fileSelected, localPath, isSaveDialog, saveFileName } = this.state
    if (isSaveDialog) {
      const name = saveFileName.trim()
      if (!name) {
        return notification.warning({ message: 'Please enter a file name' })
      }
      const filePath = resolve(localPath, name)
      this.setState({ opts: null })
      window.postMessage({
        type: 'handleSaveDialog',
        data: { canceled: false, filePath }
      }, '*')
      return
    }
    if (selectedFiles.length) {
      const paths = selectedFiles.map(f => resolve(localPath, f.name))
      this.setState({ opts: null })
      window.postMessage({
        type: 'handleDialog',
        data: paths
      }, '*')
      return
    }
    const p = fileSelected
      ? resolve(localPath, fileSelected.name)
      : localPath
    this.setState({
      opts: null
    })
    window.postMessage({
      type: 'handleDialog',
      data: [p]
    }, '*')
  }

  localList = async () => {
    this.setState({
      loading: true,
      fileSelected: null,
      selectedFiles: [],
      lastClickedIndex: null
    })
    const {
      localPath,
      opts,
      isSaveDialog
    } = this.state
    const properties = opts?.properties || []
    const func = !isSaveDialog && properties.includes('openDirectory')
      ? window.fs.readdirOnly
      : window.fs.readdirAndFiles
    const list = await func(localPath)
      .catch((err) => {
        console.log(err)
        return []
      })
    this.updateLs(localPath)
    this.setState({ list, loading: false, page: 1 })
  }

  onChange = e => {
    this.setState({
      localPathTemp: e.target.value
    })
  }

  onInputBlur = (type) => {
    this.inputFocus = false
    this.timer4 = setTimeout(() => {
      this.setState({
        [type + 'InputFocus']: false
      })
    }, 200)
  }

  onInputFocus = (type) => {
    this.setState({
      [type + 'InputFocus']: true
    })
    this.inputFocus = true
  }

  onGoto = (type, e) => {
    e && e.preventDefault()
    const n = `${type}Path`
    const nt = n + 'Temp'
    const np = this.state[nt]
    if (!isValidPath(np)) {
      return notification.warning({
        message: 'path not valid'
      })
    }
    this.updateLs(np)
    this.setState({
      [n]: np
    }, this[`${type}List`])
  }

  updateLs = (np = this.state.localPath) => {
    window.localStorage.setItem(this.lsKey, np)
  }

  toggleShowHiddenFile = type => {
    const prop = `${type}ShowHiddenFile`
    const b = this.state[prop]
    this.setState({
      [prop]: !b
    })
  }

  onClickHistory = (type, path) => {
    const n = `${type}Path`
    this.setState({
      [n]: path,
      [`${n}Temp`]: path
    }, this[`${type}List`])
  }

  goParent = (type) => {
    const n = `${type}Path`
    const p = this.state[n]
    const np = resolve(p, '..')
    if (np !== p) {
      this.updateLs(np)
      this.setState({
        [n]: np,
        [n + 'Temp']: np
      }, this[`${type}List`])
    }
  }

  handleClickFile = (item, index, event) => {
    const { isSaveDialog } = this.state
    if (isSaveDialog) {
      if (!item.isDirectory) {
        this.setState({
          fileSelected: item,
          saveFileName: item.name,
          selectedFiles: [item]
        })
      } else {
        this.setState({
          fileSelected: item,
          selectedFiles: [item]
        })
      }
      return
    }
    if (!this.isMultiSelectMode()) {
      this.setState({
        fileSelected: item,
        selectedFiles: [item],
        lastClickedIndex: index
      })
      return
    }
    // multi-select file mode
    const { selectedFiles, lastClickedIndex, list } = this.state
    const shift = event?.shiftKey
    const meta = event?.metaKey || event?.ctrlKey
    if (shift && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, index)
      const end = Math.max(lastClickedIndex, index)
      const range = list.slice(start, end + 1)
      this.setState({
        selectedFiles: range,
        fileSelected: item
      })
      event?.preventDefault?.()
    } else if (meta) {
      const exists = selectedFiles.some(f => f.name === item.name)
      const next = exists
        ? selectedFiles.filter(f => f.name !== item.name)
        : [...selectedFiles, item]
      this.setState({
        selectedFiles: next,
        fileSelected: next.length ? item : null,
        lastClickedIndex: index
      })
      event?.preventDefault?.()
    } else {
      this.setState({
        selectedFiles: [item],
        fileSelected: item,
        lastClickedIndex: index
      })
    }
  }

  handleDbClickFile = (item) => {
    if (!item.isDirectory) {
      return false
    }
    const { localPath } = this.state
    const np = resolve(localPath, item.name)
    this.setState({
      localPath: np,
      localPathTemp: np
    }, this.localList)
  }

  renderSaveInput () {
    const {
      isSaveDialog,
      saveFileName
    } = this.state
    if (!isSaveDialog) {
      return null
    }
    return (
      <div className='pd1b'>
        <Input
          value={saveFileName}
          placeholder='File name'
          prefix={<SaveOutlined />}
          onChange={e => this.setState({ saveFileName: e.target.value })}
        />
      </div>
    )
  }

  renderHeader () {
    const {
      localPath,
      localPathTemp,
      loading,
      localPathHistory,
      localInputFocus,
      localShowHiddenFile
    } = this.state
    const props = {
      type: typeMap.local,
      onChange: this.onChange,
      onInputBlur: this.onInputBlur,
      onInputFocus: this.onInputFocus,
      onGoto: this.onGoto,
      localInputFocus,
      localPath,
      localShowHiddenFile,
      toggleShowHiddenFile: this.toggleShowHiddenFile,
      localPathTemp,
      onClickHistory: this.onClickHistory,
      goParent: this.goParent,
      localPathHistory,
      loadingSftp: loading
    }
    return (
      <div className='file-dialog-header'>
        <AddressBar
          {...props}
        />
      </div>
    )
  }

  renderFooter () {
    const e = window.translate
    const {
      isSaveDialog,
      selectedFiles
    } = this.state
    const opts = this.state.opts
    const properties = opts?.properties || []
    const disabled = !isSaveDialog &&
      properties.includes('openFile') &&
      selectedFiles.length === 0
    const noBrowserTransfer = opts?.noBrowserTransfer
    const showBrowserUpload = !noBrowserTransfer && !isSaveDialog && properties.includes('openFile')
    const showBrowserDownload = !noBrowserTransfer && !isSaveDialog && opts?.content
    return (
      <div className='file-select-dialog-footer'>
        <div className='file-select-dialog-footer-actions'>
          {this.renderPager()}
          {showBrowserUpload && (
            <Button
              onClick={this.handleBrowserUpload}
            >
              <UploadOutlined /> {e('uploadFromBrowser')}
            </Button>
          )}
          {showBrowserDownload && (
            <Button
              onClick={this.handleBrowserDownload}
            >
              <DownloadOutlined /> {e('downloadFromBrowser')}
            </Button>
          )}
        </div>
        <div className='file-select-dialog-footer-submit'>
          <Button
            type='primary'
            onClick={this.handleClose}
          >
            {s('cancel')}
          </Button>
          <Button
            type='primary'
            onClick={this.handleSubmit}
            disabled={disabled}
          >
            {s('submit')}
          </Button>
        </div>
      </div>
    )
  }

  renderList () {
    const { list, selectedFiles, page, pageSize } = this.state
    const all = list.slice((page - 1) * pageSize, page * pageSize)
    const offset = (page - 1) * pageSize
    const selectedNames = new Set(selectedFiles.map(f => f.name))
    return (
      <div className='file-dialog-list-wrap'>
        {
          all.map((item, i) => {
            const index = offset + i
            return (
              <FileItem
                file={item}
                key={item.name}
                selected={selectedNames.has(item.name)}
                onDbClick={this.handleDbClickFile}
                onClick={(file, ev) => this.handleClickFile(file, index, ev)}
              />
            )
          })
        }
      </div>
    )
  }

  renderPager () {
    const {
      page,
      pageSize,
      list
    } = this.state
    const len = list.length
    if (len <= pageSize) {
      return null
    }
    return (
      <Pagination
        total={len}
        page={page}
        pageSize={pageSize}
        onChange={this.handlePageChange}
        onShowSizeChange={this.handlePageSizeChange}
        className='file-dialog-pager'
      />
    )
  }

  renderContent = () => {
    const {
      opts,
      loading,
      isSaveDialog
    } = this.state
    const props = {
      maskClosable: false,
      open: true,
      width: 'min(800px, 90vw)',
      title: opts.title || (isSaveDialog ? 'Save As' : 'Open'),
      footer: this.renderFooter(),
      onCancel: this.handleClose,
      wrapClassName: 'file-select-modal'
    }
    return (
      <ConfigProvider theme={window.store.uiThemeConfig}>
        <input
          type='file'
          ref={r => { this.fileInputRef = r }}
          className='hide'
          onChange={this.handleBrowserFileChange}
        />
        <Modal {...props}>
          <Spin spinning={loading}>
            {this.renderSaveInput()}
            {this.renderHeader()}
            {this.renderList()}
          </Spin>
        </Modal>
      </ConfigProvider>
    )
  }

  render () {
    const {
      opts
    } = this.state
    if (!opts) {
      return null
    }
    return this.renderContent()
  }
}
