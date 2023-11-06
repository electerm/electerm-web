import FileIcon from '../electerm-react/components/sftp/file-icon'
import classNames from 'classnames'
export default function FileItem (props) {
  const {
    file,
    selected
  } = props
  const handleClick = () => {
    props.onClick(file)
  }
  const handleDbClick = () => {
    props.onDbClick(file)
  }
  const cls = classNames(
    'dialog-file-item elli',
    {
      selected: selected?.name === file.name
    }
  )
  return (
    <div
      className={cls}
      onClick={handleClick}
      onDoubleClick={handleDbClick}
    >
      <FileIcon
        file={props.file}
      />
      <span className='mg1l'>{file.name}</span>
    </div>
  )
}
