/**
 * file/folder select dialog component
 */

import { Component } from '../electerm-react/components/common/react-subx'
import {
  Modal,
  Spin,
  notification,
  Pagination,
  Button,
  ConfigProvider
} from 'antd'
import FileItem from './file-item'
import AddressBar from '../electerm-react/components/sftp/address-bar'
import isValidPath from '../electerm-react/common/is-valid-path'
import {
  typeMap
} from '../electerm-react/common/constants'
import { resolve } from '../web-components/path'
import './file-select-dialog.styl'

const { prefix } = window
const s = prefix('sfp')

export default class FileSelectDialog extends Component {
  constructor (props) {
    super(props)
    const p = window.localStorage.getItem(this.lsKey) || window.et.home
    this.state = {
      opts: null,
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

  handleMsg = (e) => {
    if (e?.data?.type === 'openDialog') {
      this.setState({ opts: e.data.data }, this.localList)
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
    window.postMessage({
      type: 'closeDialog'
    }, '*')
    this.setState({ opts: null })
  }

  handleSubmit = () => {
    const { fileSelected, localPath } = this.state
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
      opts
    } = this.state
    const func = opts.properties.includes('openDirectory')
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
    this.setState({
      fileSelected: item
    })
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
    const {
      properties,
      fileSelected
    } = this.state.opts
    const disabled = properties.includes('openFile') && !fileSelected
    return (
      <div className='fix'>
        <div className='fleft'>
          {this.renderPager()}
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
      <div class='file-dialog-list-wrap'>
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
      loading
    } = this.state
    const props = {
      maskClosable: false,
      open: true,
      width: '80%',
      okText: s('submit'),
      title: opts.title,
      footer: this.renderFooter(),
      onOk: this.handleSubmit,
      onCancel: this.handleClose
    }
    return (
      <ConfigProvider theme={this.props.store.uiThemeConfig}>
        <Modal {...props}>
          <Spin spinning={loading}>
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
