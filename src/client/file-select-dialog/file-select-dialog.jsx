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

  handleBrowserDownload = () => {
    const { opts } = this.state
    const { filename, content } = opts._browserDownload
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
    this.setState({ page, pageSize })
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

  handleSubmit = () => {
    const { fileSelected, localPath, isSaveDialog, saveFileName } = this.state
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
    this.setState({ loading: true, fileSelected: null })
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

  handleClickFile = item => {
    const { isSaveDialog } = this.state
    if (isSaveDialog && !item.isDirectory) {
      this.setState({
        fileSelected: item,
        saveFileName: item.name
      })
    } else {
      this.setState({
        fileSelected: item
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
      fileSelected
    } = this.state
    const opts = this.state.opts
    const properties = opts?.properties || []
    const disabled = !isSaveDialog && properties.includes('openFile') && !fileSelected
    const showBrowserUpload = !isSaveDialog && properties.includes('openFile')
    const showBrowserDownload = !isSaveDialog && properties.includes('openDirectory')
    return (
      <div className='fix'>
        <div className='fleft'>
          {this.renderPager()}
          {showBrowserUpload && (
            <Button
              className='iblock mg1r'
              onClick={this.handleBrowserUpload}
            >
              <UploadOutlined /> {e('uploadFromBrowser')}
            </Button>
          )}
          {showBrowserDownload && (
            <Button
              className='iblock mg1r'
              onClick={this.handleBrowserDownload}
            >
              <DownloadOutlined /> {e('downloadFromBrowser')}
            </Button>
          )}
        </div>
        <div className='fright'>
          <Button
            type='primary'
            className='iblock mg1r'
            onClick={this.handleClose}
          >
            {s('cancel')}
          </Button>
          <Button
            type='primary'
            className='iblock'
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
    const { list, fileSelected, page, pageSize } = this.state
    const all = list.slice((page - 1) * pageSize, page * pageSize)
    return (
      <div className='file-dialog-list-wrap'>
        {
          all.map((item, i) => {
            return (
              <FileItem
                file={item}
                key={item.name}
                selected={fileSelected}
                onDbClick={this.handleDbClickFile}
                onClick={this.handleClickFile}
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
